import crypto from 'crypto'
import { Request, RequestHandler, Response, Router } from 'express'
import fs from 'fs-extra'
import multer from 'multer'
import os from 'os'
import path from 'path'
import { UPLOAD_DIR, getUserStoragePath } from '../constants'
import { reassembleFile } from '../controllers/finalizeUpload'
import { findFileByChecksum, storeFileChecksum } from '../models/FileChecksum'
import redisService from '../services/redisService'
import logger from '../utils/logger'

const router = Router()
const upload = multer({ dest: 'uploads/' })

let metrics = {
	activeUploads: 0,
	successfulUploads: 0,
	failedUploads: 0,
}

export const getMetricsHandler = (req: Request, res: Response) => {
	res.json({
		...metrics,
		cpuLoad: os.loadavg(),
		memory: {
			free: os.freemem(),
			total: os.totalmem(),
		},
	})
}

router.get('/metrics', getMetricsHandler)

export const initiateUploadHandler = async (req: Request, res: Response) => {
	const { fileName, fileSize, mimeType, userId } = req.body

	if (!fileName || !fileSize) {
		return res.status(400).json({
			success: false,
			message: 'Missing required file information',
		})
	}

	try {
		await redisService.connect()
		const uploadId = crypto.randomUUID()

		const uploadDir = path.join(UPLOAD_DIR, uploadId)
		fs.ensureDirSync(uploadDir)

		const metaData = {
			fileName,
			fileSize,
			mimeType,
			userId: userId || 'anonymous',
			createdAt: new Date().toISOString(),
			chunks: {
				received: 0,
				total: 0,
			},
		}

		fs.writeJSONSync(path.join(uploadDir, 'metadata.json'), metaData)

		await redisService.storeUploadMetadata(uploadId, metaData)
		await redisService.updateChunksReceived(uploadId, 0)

		return res.json({
			success: true,
			uploadId,
			message: 'Upload initialized successfully',
		})
	} catch (err) {
		logger.error(`Error in initiate-upload: ${err}`)
		return res.status(500).json({
			success: false,
			message: err instanceof Error ? err.message : 'Unknown error',
		})
	}
}

router.post('/initiate-upload', function (req: Request, res: Response) {
	initiateUploadHandler(req, res)
} as RequestHandler)

export const uploadStatusHandler = async (req: Request, res: Response) => {
	const { uploadId } = req.params

	if (!uploadId) {
		return res.status(400).json({
			success: false,
			message: 'Missing uploadId',
		})
	}

	try {
		await redisService.connect()

		const metadata = await redisService.getUploadMetadata(uploadId)
		const chunkIndices = await redisService.getChunksList(uploadId)
		const chunksReceived = await redisService.getChunksReceived(uploadId)

		if (metadata) {
			return res.json({
				success: true,
				uploadId,
				metadata,
				chunksReceived,
				chunkIndices,
			})
		}

		const uploadDir = path.join(UPLOAD_DIR, uploadId)

		if (!fs.pathExistsSync(uploadDir)) {
			return res.status(404).json({
				success: false,
				message: 'Upload not found',
			})
		}

		const readMetadata = () => {
			const metadataPath = path.join(uploadDir, 'metadata.json')
			let metadata: Record<string, any> = {}
			if (fs.pathExistsSync(metadataPath)) {
				metadata = fs.readJSONSync(metadataPath)
			}
			return metadata
		}

		const fsMetadata = readMetadata()

		const countChunks = () => {
			const files = fs.readdirSync(uploadDir)
			const chunks = files.filter(file => file.startsWith('chunk_'))
			return chunks
		}

		const chunksArr = countChunks()

		await redisService.storeUploadMetadata(uploadId, fsMetadata)
		await redisService.updateChunksReceived(uploadId, chunksArr.length)

		const fsChunkIndices = chunksArr.map(chunk =>
			parseInt(chunk.split('_')[1], 10)
		)
		for (const index of fsChunkIndices) {
			await redisService.updateChunksList(uploadId, index)
		}

		return res.json({
			success: true,
			uploadId,
			metadata: fsMetadata,
			chunksReceived: chunksArr.length,
			chunkIndices: fsChunkIndices,
		})
	} catch (err) {
		logger.error(`Error in upload-status: ${err}`)
		return res.status(500).json({
			success: false,
			message: err instanceof Error ? err.message : 'Unknown error',
		})
	}
}

router.get('/upload-status/:uploadId', function (req: Request, res: Response) {
	uploadStatusHandler(req, res)
} as RequestHandler)

export const uploadChunkHandler = async (req: Request, res: Response) => {
	const { uploadId, chunkIndex } = req.body
	if (!uploadId || chunkIndex === undefined) {
		res.status(400).json({
			success: false,
			message: 'Missing uploadId or chunkIndex',
		})
		return
	}

	try {
		await redisService.connect()

		const uploadDir = path.join(UPLOAD_DIR, uploadId)
		await fs.ensureDir(uploadDir)

		if (!req.file) {
			res.status(400).json({
				success: false,
				message: 'No chunk file received',
			})
			return
		}

		const destPath = path.join(uploadDir, `chunk_${chunkIndex}`)
		if (await fs.pathExists(destPath)) {
			await fs.remove(destPath)
		}
		await fs.move(req.file.path, destPath)

		await redisService.setChunkStatus(
			uploadId,
			parseInt(chunkIndex, 10),
			'completed'
		)
		await redisService.updateChunksList(uploadId, parseInt(chunkIndex, 10))

		const currentChunks = await redisService.getChunksList(uploadId)
		await redisService.updateChunksReceived(uploadId, currentChunks.length)

		let metadata = await redisService.getUploadMetadata(uploadId)
		if (metadata) {
			if (metadata.chunks) {
				metadata.chunks.received = currentChunks.length
				await redisService.storeUploadMetadata(uploadId, metadata)
			}
		}

		const metadataPath = path.join(uploadDir, 'metadata.json')
		if (await fs.pathExists(metadataPath)) {
			try {
				const fsMetadata = await fs.readJSON(metadataPath)
				if (fsMetadata.chunks) {
					fsMetadata.chunks.received = currentChunks.length
					await fs.writeJSON(metadataPath, fsMetadata)
				}
			} catch (error) {
				logger.error('Error updating metadata:')
			}
		}

		res.json({
			success: true,
			message: `Chunk ${chunkIndex} received.`,
		})
	} catch (error) {
		logger.error(`Error uploading chunk: ${error}`)
		res.status(500).json({
			success: false,
			message: error instanceof Error ? error.message : 'Unknown error',
		})
	}
}

router.post('/upload-chunk', upload.single('chunk'), uploadChunkHandler)

export const finalizeUploadHandler = async (req: Request, res: Response) => {
	const { uploadId, totalChunks, fileName, userId } = req.body

	if (!uploadId || !totalChunks || !fileName) {
		return res.status(400).json({
			success: false,
			message: 'Missing uploadId, totalChunks, or fileName',
		})
	}

	metrics.activeUploads++

	try {
		await redisService.connect()
		const uploadDir = path.join(UPLOAD_DIR, uploadId)
		await fs.ensureDir(uploadDir)

		const updateMetadataWithTotalChunks = async () => {
			const metadataPath = path.join(uploadDir, 'metadata.json')
			if (await fs.pathExists(metadataPath)) {
				try {
					const metadata = await fs.readJSON(metadataPath)
					if (metadata.chunks) {
						metadata.chunks.total = parseInt(totalChunks, 10)
						await fs.writeJSON(metadataPath, metadata)
					}
				} catch (error) {
					logger.error('Error updating metadata:', error)
				}
			}
		}

		await updateMetadataWithTotalChunks()

		try {
			const finalFilePath = await reassembleFile(
				uploadId,
				fileName,
				userId || 'anonymous'
			)

			if (!finalFilePath.success) {
				metrics.failedUploads++
				return res.status(500).json({
					success: false,
					message:
						finalFilePath.message || 'Failed to reassemble file',
				})
			}

			const buffer = await fs.readFile(finalFilePath.filePath)
			const md5 = crypto.createHash('md5').update(buffer).digest('hex')

			const existing = await findFileByChecksum(
				md5,
				userId || 'anonymous'
			)

			if (existing) {
				await fs.remove(finalFilePath.filePath)
				await fs.remove(uploadDir)
				await redisService.clearUploadData(uploadId)

				return res.json({
					success: true,
					message: 'File already exists',
					filePath: existing,
					isDuplicate: true,
				})
			}

			const userPath = getUserStoragePath(userId || 'anonymous')
			await fs.ensureDir(userPath)

			const ext = path.extname(fileName)
			const base = path.basename(fileName, ext)
			const unique = `${base}_${md5}${ext}`
			const dest = path.join(userPath, unique)
			await fs.move(finalFilePath.filePath, dest)

			await storeFileChecksum(md5, dest, userId || 'anonymous')
			await fs.remove(uploadDir)
			await redisService.clearUploadData(uploadId)

			metrics.successfulUploads++
			return res.json({
				success: true,
				message: 'Upload finalized successfully.',
				filePath: dest,
				checksum: md5,
			})
		} catch (err) {
			metrics.failedUploads++
			logger.error(`Error in finalize-upload: ${err}`)
			return res.status(500).json({
				success: false,
				message: err instanceof Error ? err.message : 'Unknown error',
			})
		}
	} finally {
		metrics.activeUploads--
	}
}

// @ts-ignore
router.post('/finalize-upload', finalizeUploadHandler)

export const deleteUploadHandler = async (req: Request, res: Response) => {
	const { uploadId } = req.params

	if (!uploadId) {
		return res.status(400).json({
			success: false,
			message: 'Missing uploadId',
		})
	}

	try {
		await redisService.connect()
		await redisService.clearUploadData(uploadId)

		const uploadDir = path.join(UPLOAD_DIR, uploadId)
		if (await fs.pathExists(uploadDir)) {
			await fs.remove(uploadDir)
		}

		return res.json({
			success: true,
			message: 'Upload deleted successfully',
		})
	} catch (err) {
		logger.error(`Error deleting upload: ${err}`)
		return res.status(500).json({
			success: false,
			message: err instanceof Error ? err.message : 'Unknown error',
		})
	}
}

router.delete('/delete-upload/:uploadId', function (
	req: Request,
	res: Response
) {
	deleteUploadHandler(req, res)
} as RequestHandler)

export default router
