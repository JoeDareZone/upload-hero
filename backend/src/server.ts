import cors from 'cors'
import express from 'express'
import fs from 'fs-extra'
import multer from 'multer'
import path from 'path'

const app = express()

app.use(cors())
app.use(express.json())

app.listen(4000, () => console.log('Server running on port 4000'))

const upload = multer({ dest: 'uploads/' })

app.post('/upload-chunk', upload.single('chunk'), async (req, res) => {
	console.log('Received chunk:', req.file)

	const { uploadId, chunkIndex } = req.body

	if (!uploadId || chunkIndex === undefined) {
		res.status(400).json({
			success: false,
			message: 'Missing uploadId or chunkIndex',
		})
		return
	}

	const uploadDir = path.join(__dirname, '..', 'uploads', uploadId)
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
