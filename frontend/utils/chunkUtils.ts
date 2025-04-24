import { UploadChunk, UploadFile } from '@/types/fileType'
import { CHUNK_SIZE } from '@/utils/constants'
import { Platform } from 'react-native'

export const createChunks = (file: UploadFile): UploadChunk[] => {
	const totalChunks = Math.ceil(file.size / CHUNK_SIZE)
	const chunks: UploadChunk[] = []

	const isResumed = file.uploadedChunks > 0

	for (let i = 0; i < totalChunks; i++) {
		const start = i * CHUNK_SIZE
		const end = Math.min(file.size, start + CHUNK_SIZE)
		const chunkIndex = i + 1

		const isChunkAlreadyUploaded =
			isResumed && chunkIndex <= file.uploadedChunks

		const chunk: UploadChunk = {
			fileId: file.id,
			chunkIndex,
			start,
			end,
			status: 'queued',
			retries: 0,
			uri: file.uri,
			isResume: isChunkAlreadyUploaded,
		}

		if (Platform.OS === 'web') {
			if (file.file instanceof File) {
				const blobSlice = file.file.slice(start, end)
				chunk.uri = URL.createObjectURL(blobSlice)
				chunk.file = new File([blobSlice], `chunk_${chunkIndex}`, {
					type: file.file.type,
				})

				if (isChunkAlreadyUploaded) {
					chunk.isResume = true
				}
			} else {
				chunk.isResume = true
			}
		}

		chunks.push(chunk)
	}

	return chunks
}
