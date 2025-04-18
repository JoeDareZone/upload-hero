import { UploadChunk, UploadFile } from '@/types/fileType'
import axios from 'axios'
import { Platform } from 'react-native'

const API_BASE_URL =
	Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://localhost:4000'

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
		await axios.post(`${API_BASE_URL}/upload-chunk`, formData, {
			headers: {
				'Content-Type': 'multipart/form-data',
			},
		})
	} catch (error) {
		console.error('Upload chunk failed', error)
		throw error
	}
}

export type FinalizeResult = {
	success: boolean
	isDuplicate: boolean
	message: string
}

export const finalizeUpload = async (
	file: UploadFile
): Promise<FinalizeResult> => {
	try {
		const response = await axios.post(`${API_BASE_URL}/finalize-upload`, {
			uploadId: file.id,
			totalChunks: file.totalChunks,
			fileName: file.name,
		})

		if (response.data.isDuplicate) {
			console.log(`⚠️ Duplicate file detected: ${file.name}`)
			return {
				success: false,
				isDuplicate: true,
				message: 'File already exists',
			}
		} else {
			console.log(`✅ Finalized upload: ${file.name}`)
			return {
				success: true,
				isDuplicate: false,
				message: 'Upload completed successfully',
			}
		}
	} catch (err) {
		const errorMessage = `❌ Finalize upload failed for file: ${file.name}, Error: ${err}`
		console.error(errorMessage)
		return {
			success: false,
			isDuplicate: false,
			message: errorMessage,
		}
	}
}

export const checkFileMD5 = async (file: UploadFile): Promise<boolean> => {
	try {
		const response = await axios.post(`${API_BASE_URL}/check-duplicate`, {
			fileName: file.name,
			fileSize: file.size,
			mimeType: file.mimeType,
		})

		return response.data.isDuplicate || false
	} catch (error) {
		console.error('Error checking file MD5:', error)
		return false
	}
}
