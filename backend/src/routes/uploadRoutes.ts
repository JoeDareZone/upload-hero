import { Router } from 'express'
import fs from 'fs-extra'
import multer from 'multer'
import path from 'path'
import { FINAL_DIR, UPLOAD_DIR } from '../constants'
import { reassembleFile } from '../controllers/finalizeUpload'

const router = Router()

const upload = multer({ dest: 'uploads/' })

router.post('/upload-chunk', upload.single('chunk'), async (req, res) => {
	console.log('Received chunk:', req.file)

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

	if (req.file) {
		const destPath = path.join(uploadDir, `chunk_${chunkIndex}`)
		await fs.move(req.file.path, destPath)
		res.json({
			success: true,
			message: `Chunk ${chunkIndex} received.`,
		})
	} else {
		res.status(400).json({
			success: false,
			message: 'No chunk file received',
		})
	}
})

router.post('/finalize-upload', async (req, res) => {
	const { uploadId, totalChunks, fileName } = req.body

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
			fileName
		)

		const finalFileDest = path.join(FINAL_DIR, fileName)
		await fs.move(finalFilePath, finalFileDest)

		await fs.remove(uploadDir)

		res.json({
			success: true,
			message: 'Upload finalized successfully.',
			filePath: finalFileDest,
		})
	} catch (error) {
		console.error('Error finalizing upload:', error)
		res.status(500).json({
			success: false,
			message: 'Error finalizing upload',
		})
	}
})

export default router
