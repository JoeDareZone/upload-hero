import { UploadChunk, UploadFile } from '@/types/fileType'
import { CHUNK_SIZE } from '@/utils/constants'
import { Platform } from 'react-native'

export const createChunks = (file: UploadFile): UploadChunk[] => {
	const totalChunks = Math.ceil(file.size / CHUNK_SIZE)
	const chunks: UploadChunk[] = []

	for (let i = 0; i < totalChunks; i++) {
		const start = i * CHUNK_SIZE
		const end = Math.min(file.size, start + CHUNK_SIZE)

		const chunk: UploadChunk = {
			fileId: file.id,
			chunkIndex: i + 1,
			start,
			end,
			status: 'queued',
			retries: 0,
			uri: file.uri,
		}

		if (Platform.OS === 'web' && file.file instanceof File) {
			const blobSlice = file.file.slice(start, end)
			chunk.uri = URL.createObjectURL(blobSlice)
			chunk.file = new File([blobSlice], `chunk_${i + 1}`, {
				type: file.file.type,
			})
		}

		chunks.push(chunk)
	}

	return chunks
}
