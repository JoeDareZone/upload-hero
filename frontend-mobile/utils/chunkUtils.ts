import { UploadChunk, UploadFile } from '@/types/fileType'
import { CHUNK_SIZE } from '@/utils/constants'

export const createChunks = (file: UploadFile): UploadChunk[] => {
	const totalChunks = Math.ceil(file.size / CHUNK_SIZE)
	const chunks: UploadChunk[] = []

	for (let i = 0; i < totalChunks; i++) {
		const start = i * CHUNK_SIZE
		const end = Math.min(file.size, start + CHUNK_SIZE)
		chunks.push({
			fileId: file.id,
			chunkIndex: i + 1,
			start,
			end,
			status: 'queued',
			retries: 0,
			uri: file.uri,
		})
	}

	return chunks
}
