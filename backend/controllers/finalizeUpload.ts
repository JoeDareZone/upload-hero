import fs from 'fs'
import path from 'path'
import { UPLOAD_DIR } from '../constants'

export const reassembleFile = async (
	uploadId: string,
	totalChunks: number,
	fileName: string
) => {
	const tempDir = path.join(UPLOAD_DIR, uploadId)

	if (!fs.existsSync(tempDir)) {
		throw new Error('Upload directory does not exist.')
	}

	const chunkFiles = []

	for (let i = 1; i <= totalChunks; i++) {
		const chunkFilePath = path.join(tempDir, `chunk_${i}`)
		if (!fs.existsSync(chunkFilePath)) {
			throw new Error(`Missing chunk ${i}`)
		}
		chunkFiles.push(chunkFilePath)
	}

	chunkFiles.sort((a, b) => {
		const chunkA = parseInt(path.basename(a).split('_')[1], 10)
		const chunkB = parseInt(path.basename(b).split('_')[1], 10)
		return chunkA - chunkB
	})

	const finalFilePath = path.join(UPLOAD_DIR, 'final', fileName)
	const writeStream = fs.createWriteStream(finalFilePath)

	for (const chunkFilePath of chunkFiles) {
		const chunkBuffer = fs.readFileSync(chunkFilePath)
		writeStream.write(chunkBuffer)
	}

	writeStream.end()

	chunkFiles.forEach(chunkFilePath => {
		fs.unlinkSync(chunkFilePath)
	})

	return finalFilePath
}
