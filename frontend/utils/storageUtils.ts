import { UploadFile } from '@/types/fileType'

const UPLOAD_HISTORY_KEY = 'upload_history'

export const saveToUploadHistory = (file: UploadFile): void => {
	if (typeof window === 'undefined') return

	try {
		if (file.status !== 'completed') return

		const historyString = localStorage.getItem(UPLOAD_HISTORY_KEY)
		const history: UploadFile[] = historyString
			? JSON.parse(historyString)
			: []

		if (!history.some(existingFile => existingFile.id === file.id)) {
			const fileWithTimestamp = {
				...file,
				completedAt: new Date().toISOString(),
			}

			history.unshift(fileWithTimestamp)

			const limitedHistory = history.slice(0, 100)

			localStorage.setItem(
				UPLOAD_HISTORY_KEY,
				JSON.stringify(limitedHistory)
			)
		}
	} catch (error) {
		console.error('Error saving to upload history:', error)
	}
}

export const getUploadHistory = (): UploadFile[] => {
	if (typeof window === 'undefined') return []

	try {
		const historyString = localStorage.getItem(UPLOAD_HISTORY_KEY)
		return historyString ? JSON.parse(historyString) : []
	} catch (error) {
		console.error('Error retrieving upload history:', error)
		return []
	}
}

export const clearUploadHistory = (): void => {
	if (typeof window === 'undefined') return

	try {
		localStorage.removeItem(UPLOAD_HISTORY_KEY)
	} catch (error) {
		console.error('Error clearing upload history:', error)
	}
}
