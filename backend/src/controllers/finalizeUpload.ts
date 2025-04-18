import fileType from 'file-type'
import fs from 'fs'
import path from 'path'
import { UPLOAD_DIR } from '../constants'

export const reassembleFile = async (
	uploadId: string,
	totalChunks: number,
	fileName: string,
	expectedMimeType?: string
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
		const readStream = fs.createReadStream(chunkFilePath)

		readStream.pipe(writeStream, { end: false })

		await new Promise<void>((resolve, reject) => {
			readStream.on('end', () => resolve())
			readStream.on('error', reject)
		})
	}

	writeStream.end()

	await new Promise<void>(resolve => {
		writeStream.on('finish', () => resolve())
	})

	if (expectedMimeType) {
		const buffer = fs.readFileSync(finalFilePath)
		const detectedType = await fileType.fromBuffer(buffer)

		if (!detectedType) {
			fs.unlinkSync(finalFilePath)
			throw new Error(
				'File type validation failed: unable to detect file type'
			)
		}

		if (detectedType.mime !== expectedMimeType) {
			fs.unlinkSync(finalFilePath)
			throw new Error(
				`File type validation failed: expected ${expectedMimeType} but got ${detectedType.mime}`
			)
		}
	}

	chunkFiles.forEach(chunkFilePath => {
		fs.unlinkSync(chunkFilePath)
	})

	return finalFilePath
}
