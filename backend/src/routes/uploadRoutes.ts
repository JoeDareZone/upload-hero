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

		res.json({
			success: true,
			message: `Chunk ${chunkIndex} received.`,
		})
	}
)

// @ts-ignore - Express type definition issue
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

		const userPath = getUserStoragePath(userId)
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
