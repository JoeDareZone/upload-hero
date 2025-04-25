import { UploadChunk, UploadFile } from '@/types/fileType'
import { API_BASE_URL, IS_WEB } from '@/utils/constants'
import { getUserFriendlyErrorMessage } from '@/utils/helpers'
import axios from 'axios'
import * as BackgroundFetch from 'expo-background-fetch'
import * as FileSystem from 'expo-file-system'
import * as TaskManager from 'expo-task-manager'

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
		if (IS_WEB) {
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
			try {
				const tempDir = `${FileSystem.cacheDirectory}upload-chunks/`
				const tempChunkPath = `${tempDir}chunk_${chunk.fileId}_${chunk.chunkIndex}`

				await FileSystem.makeDirectoryAsync(tempDir, {
					intermediates: true,
				}).catch(() => {})

				if (chunk.uri.startsWith('file://')) {
					const info = await FileSystem.getInfoAsync(chunk.uri)
					if (!info.exists) {
						throw new Error(
							`Source file doesn't exist: ${chunk.uri}`
						)
					}

					const length = chunk.end - chunk.start
					console.log(
						`Reading ${length} bytes from ${chunk.uri} at position ${chunk.start}`
					)

					const options = {
						encoding: FileSystem.EncodingType.Base64,
						position: chunk.start,
						length: length,
					}

					const base64Data = await FileSystem.readAsStringAsync(
						chunk.uri,
						options
					)
					await FileSystem.writeAsStringAsync(
						tempChunkPath,
						base64Data,
						{
							encoding: FileSystem.EncodingType.Base64,
						}
					)

					formData.append('chunk', {
						uri: tempChunkPath,
						type: 'application/octet-stream',
						name: `chunk_${chunk.chunkIndex}`,
					} as any)
				} else {
					formData.append('chunkStart', chunk.start.toString())
					formData.append('chunkEnd', chunk.end.toString())
					formData.append('chunk', {
						uri: chunk.uri,
						type: 'application/octet-stream',
						name: `chunk_${chunk.chunkIndex}`,
					} as any)
				}
			} catch (err: any) {
				console.error('Error processing mobile chunk:', err)
				throw new Error(
					`Failed to process chunk ${chunk.chunkIndex}: ${err.message}`
				)
			}
		}

		formData.append('uploadId', chunk.fileId)
		formData.append('chunkIndex', chunk.chunkIndex.toString())

		const response = await axios.post(
			`${API_BASE_URL}/upload-chunk`,
			formData,
			{
				headers: {
					'Content-Type': 'multipart/form-data',
				},
			}
		)

		if (!IS_WEB) {
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
