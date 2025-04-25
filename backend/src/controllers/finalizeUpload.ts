import fileType from 'file-type'
import fs from 'fs'
import path from 'path'
import { UPLOAD_DIR } from '../constants'

export function getAndSortChunkFiles(
	tempDir: string,
	totalChunks: number
): string[] {
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

export async function streamChunk(
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

export async function combineChunksIntoSingleFile(
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

export async function validateFileType(
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

export function cleanupChunks(chunkFiles: string[]): void {
	chunkFiles.forEach(chunkFilePath => {
		fs.unlinkSync(chunkFilePath)
	})
}

export function cleanupUploadDirectory(uploadDir: string): void {
	if (fs.existsSync(uploadDir)) {
		fs.rmSync(uploadDir, { recursive: true, force: true })
	}
}

export const reassembleFile = async (
	uploadId: string,
	fileName: string,
	userId: string
): Promise<{ success: boolean; filePath: string; message?: string }> => {
	const tempDir = path.join(UPLOAD_DIR, uploadId)
	const finalDir = path.join(UPLOAD_DIR, 'final')
	const finalFilePath = path.join(finalDir, fileName)

	if (!fs.existsSync(tempDir)) {
		return {
			success: false,
			filePath: '',
			message: `Upload directory does not exist: ${tempDir}`,
		}
	}

	if (!fs.existsSync(finalDir)) {
		fs.mkdirSync(finalDir, { recursive: true })
	}

	try {
		const chunkFiles = fs
			.readdirSync(tempDir)
			.filter(file => file.startsWith('chunk_'))
			.map(file => path.join(tempDir, file))
			.sort((a, b) => {
				const chunkA = parseInt(path.basename(a).split('_')[1], 10)
				const chunkB = parseInt(path.basename(b).split('_')[1], 10)
				return chunkA - chunkB
			})

		if (chunkFiles.length === 0) {
			return {
				success: false,
				filePath: '',
				message: 'No chunks found for this upload',
			}
		}

		const writeStream = fs.createWriteStream(finalFilePath)

		for (const chunkFilePath of chunkFiles) {
			await streamChunk(chunkFilePath, writeStream)
		}

		writeStream.end()

		await new Promise<void>((resolve, reject) => {
			writeStream.on('finish', resolve)
			writeStream.on('error', reject)
		})

		cleanupChunks(chunkFiles)

		cleanupUploadDirectory(tempDir)

		return {
			success: true,
			filePath: finalFilePath,
		}
	} catch (error) {
		if (fs.existsSync(finalFilePath)) {
			fs.unlinkSync(finalFilePath)
		}

		return {
			success: false,
			filePath: '',
			message: error instanceof Error ? error.message : 'Unknown error',
		}
	}
}
