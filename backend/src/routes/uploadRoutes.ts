import crypto from 'crypto'
import { Request, Response, Router } from 'express'
import fs from 'fs-extra'
import multer from 'multer'
import path from 'path'
import { UPLOAD_DIR, getUserStoragePath } from '../constants'
import { reassembleFile } from '../controllers/finalizeUpload'
import { findFileByChecksum, storeFileChecksum } from '../models/FileChecksum'

const router = Router()
const upload = multer({ dest: 'uploads/' })

// @ts-ignore
router.post('/initiate-upload', (req: Request, res: Response) => {
	const { fileName, fileSize, mimeType, userId } = req.body

	if (!fileName || !fileSize) {
		return res.status(400).json({
			success: false,
			message: 'Missing required file information',
		})
	}

	try {
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

		return res.json({
			success: true,
			uploadId,
			message: 'Upload initialized successfully',
		})
	} catch (err) {
		console.error('Error in initiate-upload:', err)
		return res.status(500).json({
			success: false,
			message: err instanceof Error ? err.message : 'Unknown error',
		})
	}
})

// @ts-ignore
router.get('/upload-status/:uploadId', (req: Request, res: Response) => {
	const { uploadId } = req.params

	if (!uploadId) {
		return res.status(400).json({
			success: false,
			message: 'Missing uploadId',
		})
	}

	try {
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

		const metadata = readMetadata()

		const countChunks = () => {
			const files = fs.readdirSync(uploadDir)
			const chunks = files.filter(file => file.startsWith('chunk_'))
			return chunks
		}

		const chunksArr = countChunks()

		const updateChunkCountInMetadata = () => {
			if (metadata.chunks) {
				metadata.chunks.received = chunksArr.length
			}
		}

		updateChunkCountInMetadata()

		return res.json({
			success: true,
			uploadId,
			metadata,
			chunksReceived: chunksArr.length,
			chunkIndices: chunksArr.map(chunk =>
				parseInt(chunk.split('_')[1], 10)
			),
		})
	} catch (err) {
		console.error('Error in upload-status:', err)
		return res.status(500).json({
			success: false,
			message: err instanceof Error ? err.message : 'Unknown error',
		})
	}
})

router.post(
	'/upload-chunk',
	upload.single('chunk'),
	async (req: Request, res: Response) => {
		const { uploadId, chunkIndex } = req.body
		if (!uploadId || chunkIndex === undefined) {
			res.status(400).json({
				success: false,
				message: 'Missing uploadId or chunkIndex',
			})
			return
		}

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

		const metadataPath = path.join(uploadDir, 'metadata.json')
		if (await fs.pathExists(metadataPath)) {
			try {
				const metadata = await fs.readJSON(metadataPath)
				if (metadata.chunks) {
					const countCurrentChunks = async () => {
						const files = await fs.readdir(uploadDir)
						return files.filter(file => file.startsWith('chunk_'))
							.length
					}
					metadata.chunks.received = await countCurrentChunks()
					await fs.writeJSON(metadataPath, metadata)
				}
			} catch (error) {
				console.error('Error updating metadata:', error)
			}
		}

		res.json({
			success: true,
			message: `Chunk ${chunkIndex} received.`,
		})
	}
)

// @ts-ignore
router.post('/finalize-upload', async (req: Request, res: Response) => {
	const { uploadId, totalChunks, fileName, mimeType, userId } = req.body
	if (!uploadId || !totalChunks || !fileName) {
		res.status(400).json({
			success: false,
			message: 'Missing uploadId, totalChunks, or fileName',
		})
		return
	}

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
				console.error('Error updating metadata:', error)
			}
		}
	}

	updateMetadataWithTotalChunks()

	try {
		const finalFilePath = await reassembleFile(
			uploadId,
			totalChunks,
			fileName,
			mimeType
		)

		const buffer = await fs.readFile(finalFilePath)
		const md5 = crypto.createHash('md5').update(buffer).digest('hex')

		const existing = await findFileByChecksum(md5, userId || 'anonymous')

		if (existing) {
			await fs.remove(finalFilePath)
			await fs.remove(uploadDir)
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
		await fs.move(finalFilePath, dest)

		await storeFileChecksum(md5, dest, userId || 'anonymous')
		await fs.remove(uploadDir)

		return res.json({
			success: true,
			message: 'Upload finalized successfully.',
			filePath: dest,
			checksum: md5,
		})
	} catch (err) {
		console.error('Error in finalize-upload:', err)
		return res.status(500).json({
			success: false,
			message: err instanceof Error ? err.message : 'Unknown error',
		})
	}
})

export default router
