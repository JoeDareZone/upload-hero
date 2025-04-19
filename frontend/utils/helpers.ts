import axios from 'axios'

export const convertBytesToMB = (bytes: number) => {
	return (bytes / 1024 / 1024).toFixed(2)
}

export const convertUploadedChunksToPercentage = (
	uploadedChunks: number,
	totalChunks: number
) => {
	return Math.round((uploadedChunks / totalChunks) * 100)
}

export const generateFileId = () => `${Date.now()}-${Math.random()}`

export const getUserFriendlyErrorMessage = (error: any): string => {
	if (error?.message?.includes('File already exists')) {
		return 'This file already exists in your uploads.'
	}

	if (axios.isAxiosError(error)) {
		if (!error.response) {
			return 'Network error. Please check your connection and try again.'
		}

		switch (error.response.status) {
			case 400:
				return 'Invalid request. Please try again.'
			case 401:
				return 'Authentication error. Please log in again.'
			case 403:
				return "You don't have permission to upload this file."
			case 413:
				return 'File too large. Please select a smaller file.'
			case 500:
				return 'Server error. Please try again later.'
			default:
				return `Upload failed (${error.response.status}). Please try again later.`
		}
	}

	return 'An unexpected error occurred. Please try again.'
}
