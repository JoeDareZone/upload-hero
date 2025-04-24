import { UploadFile } from '@/types/fileType'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Platform } from 'react-native'

const UPLOAD_HISTORY_KEY = 'upload_history'
const INCOMPLETE_UPLOADS_KEY = 'incomplete_uploads'

const getStorage = () => (Platform.OS === 'web' ? localStorage : AsyncStorage)

const isWebAndServerSide =
	Platform.OS === 'web' && typeof window === 'undefined'

export const saveToUploadHistory = (file: UploadFile): void => {
	if (isWebAndServerSide) return

	try {
		if (file.status !== 'completed') return

		const storage = getStorage()

		const getItem = async () => await storage.getItem(UPLOAD_HISTORY_KEY)

		const setItem = async (key: string, value: string) =>
			await storage.setItem(key, value)

		getItem()
			.then(historyString => {
				const history: UploadFile[] = historyString
					? JSON.parse(historyString)
					: []

				if (
					!history.some(existingFile => existingFile.id === file.id)
				) {
					const fileWithTimestamp = {
						...file,
						completedAt: new Date().toISOString(),
					}

					history.unshift(fileWithTimestamp)
					const limitedHistory = history.slice(0, 100)

					setItem(UPLOAD_HISTORY_KEY, JSON.stringify(limitedHistory))
				}
			})
			.catch(error =>
				console.error('Error saving to upload history:', error)
			)
	} catch (error) {
		console.error('Error saving to upload history:', error)
	}
}

export const getUploadHistory = async (): Promise<UploadFile[]> => {
	if (isWebAndServerSide) return []

	try {
		const storage = getStorage()

		const historyString = await storage.getItem(UPLOAD_HISTORY_KEY)

		return historyString ? JSON.parse(historyString) : []
	} catch (error) {
		console.error('Error retrieving upload history:', error)
		return []
	}
}

export const clearUploadHistory = async (): Promise<void> => {
	if (isWebAndServerSide) return

	try {
		const storage = getStorage()

		await storage.removeItem(UPLOAD_HISTORY_KEY)
	} catch (error) {
		console.error('Error clearing upload history:', error)
	}
}

export const saveIncompleteUploads = async (
	files: UploadFile[]
): Promise<void> => {
	if (isWebAndServerSide) return

	try {
		const incompleteFiles = files.filter(file =>
			['queued', 'uploading', 'paused', 'error'].includes(file.status)
		)

		const serializableFiles =
			Platform.OS === 'web'
				? incompleteFiles.map(({ file, ...rest }) => rest)
				: incompleteFiles

		const serialized = JSON.stringify(serializableFiles)

		const storage = getStorage()

		await storage.setItem(INCOMPLETE_UPLOADS_KEY, serialized)
	} catch (error) {
		console.error('Error saving incomplete uploads:', error)
	}
}

export const getIncompleteUploads = async (): Promise<UploadFile[]> => {
	if (isWebAndServerSide) return []

	try {
		const storage = getStorage()

		const uploadsString = await storage.getItem(INCOMPLETE_UPLOADS_KEY)

		const uploads = uploadsString ? JSON.parse(uploadsString) : []

		return uploads
	} catch (error) {
		console.error('Error retrieving incomplete uploads:', error)
		return []
	}
}

export const clearIncompleteUploads = async (): Promise<void> => {
	if (isWebAndServerSide) return

	try {
		const storage = getStorage()

		await storage.removeItem(INCOMPLETE_UPLOADS_KEY)
	} catch (error) {
		console.error('Error clearing incomplete uploads:', error)
	}
}
