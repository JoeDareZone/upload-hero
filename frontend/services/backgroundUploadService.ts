import { UploadFile } from '@/types/fileType'
import { Platform } from 'react-native'
import Upload from 'react-native-background-upload'

const API_BASE_URL =
	Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://localhost:4000'

// For testing - set to true to simulate slower uploads
const USE_ARTIFICIAL_DELAY = true
const ARTIFICIAL_DELAY_MS = 6000

export const startBackgroundUpload = async (
	file: UploadFile,
	onProgress?: (progress: number) => void
) => {
	try {
		// Artificial delay for testing if enabled
		if (USE_ARTIFICIAL_DELAY) {
			console.log('Using artificial delay for background upload testing')
		}

		const options = {
			url: `${API_BASE_URL}/upload-file`,
			path: file.uri,
			method: 'POST' as const,
			type: 'multipart' as const,
			field: 'file',
			headers: {
				'Content-Type': file.mimeType,
			},
			parameters: {
				fileName: file.name,
				fileSize: file.size.toString(),
				mimeType: file.mimeType,
				userId: 'anonymous',
				// Adding delay parameter for testing
				useDelay: USE_ARTIFICIAL_DELAY ? 'true' : 'false',
			},
			notification: {
				enabled: Platform.OS === 'android',
				onProgressTitle: 'Uploading',
				onProgressMessage: `Uploading ${file.name}`,
				onCompleteTitle: 'Upload complete',
				onCompleteMessage: `${file.name} uploaded successfully`,
				onErrorTitle: 'Upload error',
				onErrorMessage: 'An error occurred during upload',
				autoClear: true,
			},
		}

		const uploadId = await Upload.startUpload(options)

		// If we're using the artificial delay, we need to throttle our progress updates
		if (USE_ARTIFICIAL_DELAY && onProgress) {
			// Simulate gradual progress for testing
			let simulatedProgress = 0
			const progressInterval = setInterval(() => {
				simulatedProgress += 10
				if (simulatedProgress <= 100) {
					onProgress(simulatedProgress)
				}
				if (simulatedProgress >= 100) {
					clearInterval(progressInterval)
				}
			}, ARTIFICIAL_DELAY_MS / 10)
		}

		Upload.addListener('progress', uploadId, data => {
			const progress = data.progress
			if (onProgress && !USE_ARTIFICIAL_DELAY) {
				onProgress(progress)
			}
			console.log(`Progress: ${progress}%`)
		})

		return uploadId
	} catch (error) {
		console.error('Failed to start background upload', error)
		throw error
	}
}

export const cancelBackgroundUpload = (uploadId: string) => {
	try {
		Upload.cancelUpload(uploadId)
	} catch (error) {
		console.error('Failed to cancel background upload', error)
	}
}

export const isBackgroundUploadSupported = () => {
	return Platform.OS !== 'web'
}
