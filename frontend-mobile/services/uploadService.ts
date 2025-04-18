import { UploadChunk, UploadFile } from '@/types/fileType'
import axios from 'axios'

export const uploadChunk = async (chunk: UploadChunk) => {
	const formData = new FormData()
	formData.append('chunk', {
		uri: chunk.uri,
		type: 'application/octet-stream',
		name: `chunk_${chunk.chunkIndex}`,
	} as any)
	formData.append('uploadId', chunk.fileId)
	formData.append('chunkIndex', chunk.chunkIndex.toString())

	try {
		await axios.post('http://localhost:4000/upload-chunk', formData, {
			headers: {
				'Content-Type': 'multipart/form-data',
			},
		})
	} catch (error) {
		console.error('Upload chunk failed', error)
		throw error
	}
}

export const finalizeUpload = async (file: UploadFile): Promise<void> => {
	try {
		await axios.post('http://localhost:4000/finalize-upload', {
			uploadId: file.id,
			totalChunks: file.totalChunks,
			fileName: file.name,
		})
		console.log(`✅ Finalized upload: ${file.name}`)
	} catch (err) {
		throw new Error(
			`❌ Finalize upload failed for file: ${file.name}, Error: ${err}`
		)
	}
}
