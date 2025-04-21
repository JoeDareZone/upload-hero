import fileType from 'file-type'
import fs from 'fs'
import path from 'path'
import { UPLOAD_DIR } from '../constants'

function getAndSortChunkFiles(tempDir: string, totalChunks: number): string[] {
	const chunkFiles = []

	for (let i = 1; i <= totalChunks; i++) {
		const chunkFilePath = path.join(tempDir, `chunk_${i}`)
		if (!fs.existsSync(chunkFilePath)) {
			throw new Error(`Missing chunk ${i}`)
		}
		chunkFiles.push(chunkFilePath)
	}

	return chunkFiles.sort((a, b) => {
		const chunkA = parseInt(path.basename(a).split('_')[1], 10)
		const chunkB = parseInt(path.basename(b).split('_')[1], 10)
		return chunkA - chunkB
	})
}

async function streamChunk(
	chunkFilePath: string,
	writeStream: fs.WriteStream
): Promise<void> {
	const readStream = fs.createReadStream(chunkFilePath)

	readStream.pipe(writeStream, { end: false })

	return new Promise<void>((resolve, reject) => {
		readStream.on('end', resolve)
		readStream.on('error', reject)
	})
}

async function combineChunksIntoSingleFile(
	chunkFiles: string[],
	finalFilePath: string
): Promise<void> {
	const writeStream = fs.createWriteStream(finalFilePath)

	for (const chunkFilePath of chunkFiles) {
		await streamChunk(chunkFilePath, writeStream)
	}

	writeStream.end()

	await new Promise<void>((resolve, reject) => {
		writeStream.on('finish', resolve)
		writeStream.on('error', reject)
	})
}

async function validateFileType(
	filePath: string,
	expectedMimeType: string
): Promise<void> {
	const buffer = fs.readFileSync(filePath)
	const detectedType = await fileType.fromBuffer(buffer)

	if (!detectedType) {
		throw new Error(
			'File type validation failed: unable to detect file type'
		)
	}

	if (detectedType.mime !== expectedMimeType) {
		throw new Error(
			`File type validation failed: expected ${expectedMimeType} but got ${detectedType.mime}`
		)
	}
}

function cleanupChunks(chunkFiles: string[]): void {
	chunkFiles.forEach(chunkFilePath => {
		fs.unlinkSync(chunkFilePath)
	})
}

export const reassembleFile = async (
	uploadId: string,
	totalChunks: number,
	fileName: string,
	expectedMimeType?: string
): Promise<string> => {
	const tempDir = path.join(UPLOAD_DIR, uploadId)
	const finalDir = path.join(UPLOAD_DIR, 'final')
	const finalFilePath = path.join(finalDir, fileName)

	if (!fs.existsSync(tempDir)) {
		throw new Error(`Upload directory does not exist: ${tempDir}`)
	}

	if (!fs.existsSync(finalDir)) {
		fs.mkdirSync(finalDir, { recursive: true })
	}

	try {
		const chunkFiles = getAndSortChunkFiles(tempDir, totalChunks)

		await combineChunksIntoSingleFile(chunkFiles, finalFilePath)

		if (expectedMimeType) {
			await validateFileType(finalFilePath, expectedMimeType)
		}

		cleanupChunks(chunkFiles)

		return finalFilePath
	} catch (error) {
		if (fs.existsSync(finalFilePath)) {
			fs.unlinkSync(finalFilePath)
		}
		throw error
	}
}
