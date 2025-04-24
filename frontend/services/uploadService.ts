import { UploadChunk, UploadFile } from '@/types/fileType'
import { API_BASE_URL } from '@/utils/constants'
import { getUserFriendlyErrorMessage } from '@/utils/helpers'
import axios from 'axios'
import * as BackgroundFetch from 'expo-background-fetch'
import * as TaskManager from 'expo-task-manager'
import { Platform } from 'react-native'

export const initiateUpload = async (file: UploadFile): Promise<string> => {
	try {
		const response = await axios.post(`${API_BASE_URL}/initiate-upload`, {
			fileName: file.name,
			fileSize: file.size,
			mimeType: file.mimeType,
			userId: 'anonymous',
		})

		if (response.data.success) {
			return response.data.uploadId
		} else {
			throw new Error(
				response.data.message || 'Failed to initiate upload'
			)
		}
	} catch (error) {
		console.error('Failed to initiate upload', error)
		throw getUserFriendlyErrorMessage(error)
	}
}

export const checkUploadStatus = async (
	uploadId: string
): Promise<{
	chunksReceived: number
	chunkIndices: number[]
}> => {
	try {
		const response = await axios.get(
			`${API_BASE_URL}/upload-status/${uploadId}`
		)

		if (response.data.success) {
			return {
				chunksReceived: response.data.chunksReceived,
				chunkIndices: response.data.chunkIndices,
			}
		} else {
			throw new Error(
				response.data.message || 'Failed to check upload status'
			)
		}
	} catch (error) {
		console.error('Failed to check upload status', error)
		throw getUserFriendlyErrorMessage(error)
	}
}

const BACKGROUND_FETCH_TASK = 'background-upload-task'

TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
	try {
		return BackgroundFetch.BackgroundFetchResult.NewData
	} catch (error) {
		console.error('Error in background task', error)
		return BackgroundFetch.BackgroundFetchResult.Failed
	}
})

async function registerBackgroundUploadTask() {
	await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
		minimumInterval: 60 * 15,
		stopOnTerminate: false,
		startOnBoot: true,
	})
}

export const uploadChunk = async (chunk: UploadChunk) => {
	if (chunk.isResume) {
		console.log(
			`Chunk ${chunk.chunkIndex} for file ${chunk.fileId} is already uploaded (marked as isResume=true)`
		)
		return true
	}

	const formData = new FormData()

	try {
		if (Platform.OS === 'web') {
			if (chunk.file instanceof File) {
				formData.append('chunk', chunk.file)
			} else {
				console.warn(
					`Chunk ${chunk.chunkIndex} has no file object, using blob from URI`
				)
				const response = await fetch(chunk.uri)
				const blob = await response.blob()
				formData.append('chunk', blob)
			}
		} else {
			formData.append('chunk', {
				uri: chunk.uri,
				type: 'application/octet-stream',
				name: `chunk_${chunk.chunkIndex}`,
			} as any)
		}

		formData.append('uploadId', chunk.fileId)
		formData.append('chunkIndex', chunk.chunkIndex.toString())

		await axios.post(`${API_BASE_URL}/upload-chunk`, formData, {
			headers: {
				'Content-Type': 'multipart/form-data',
			},
		})

		if (Platform.OS !== 'web') {
			const status = await BackgroundFetch.getStatusAsync()
			if (status === BackgroundFetch.BackgroundFetchStatus.Available) {
				await registerBackgroundUploadTask()
			}
		}

		return true
	} catch (error) {
		console.error(`Upload chunk ${chunk.chunkIndex} failed:`, error)
		throw new Error(
			`Upload chunk ${
				chunk.chunkIndex
			} failed: ${getUserFriendlyErrorMessage(error)}`
		)
	}
}

export type FinalizeResult = {
	success: boolean
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
			fileSize: file.size,
			mimeType: file.mimeType,
		})

		if (response.data.isDuplicate) {
			throw new Error('File already exists')
		} else {
			return {
				success: true,
				message: 'Upload successful',
			}
		}
	} catch (err) {
		return {
			success: false,
			message: getUserFriendlyErrorMessage(err),
		}
	}
}
