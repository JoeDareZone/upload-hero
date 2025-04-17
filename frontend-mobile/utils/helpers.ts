export const convertBytesToMB = (bytes: number) => {
	return (bytes / 1024 / 1024).toFixed(2)
}

export const convertUploadedChunksToPercentage = (
	uploadedChunks: number,
	totalChunks: number
) => {
	return Math.round((uploadedChunks / totalChunks) * 100)
}
