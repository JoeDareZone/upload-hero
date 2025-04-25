import { UploadFile } from '@/types/fileType'
import { createChunks } from '@/utils/chunkUtils'
import { CHUNK_SIZE } from '@/utils/constants'

jest.mock('@/utils/constants', () => ({
	IS_WEB: false,
	CHUNK_SIZE: 1024 * 1024,
}))

describe('chunkUtils', () => {
	const mockFile: UploadFile = {
		id: 'test-file-1',
		name: 'test-file.jpg',
		uri: 'file://test/test-file.jpg',
		size: 5 * 1024 * 1024,
		mimeType: 'image/jpeg',
		status: 'queued',
		uploadedChunks: 0,
		totalChunks: 5,
	}

	describe('createChunks', () => {
		test('should create correct number of chunks', () => {
			const chunks = createChunks(mockFile)

			expect(chunks.length).toBe(5)
		})

		test('should set correct chunk properties', () => {
			const chunks = createChunks(mockFile)

			expect(chunks[0]).toEqual(
				expect.objectContaining({
					fileId: mockFile.id,
					chunkIndex: 1,
					start: 0,
					end: CHUNK_SIZE,
					status: 'queued',
					retries: 0,
					uri: mockFile.uri,
					isResume: false,
				})
			)

			expect(chunks[4]).toEqual(
				expect.objectContaining({
					fileId: mockFile.id,
					chunkIndex: 5,
					start: 4 * CHUNK_SIZE,
					end: 5 * CHUNK_SIZE,
					status: 'queued',
					retries: 0,
					uri: mockFile.uri,
					isResume: false,
				})
			)
		})

		test('should handle partial chunks', () => {
			const partialFile: UploadFile = {
				...mockFile,
				size: 4.5 * 1024 * 1024,
				totalChunks: 5,
			}

			const chunks = createChunks(partialFile)

			expect(chunks.length).toBe(5)

			expect(chunks[4].start).toBe(4 * CHUNK_SIZE)
			expect(chunks[4].end).toBe(partialFile.size)
			expect(chunks[4].end - chunks[4].start).toBe(0.5 * 1024 * 1024)
		})

		test('should handle small files', () => {
			const smallFile: UploadFile = {
				...mockFile,
				size: CHUNK_SIZE / 2,
				totalChunks: 1,
			}

			const chunks = createChunks(smallFile)

			expect(chunks.length).toBe(1)
			expect(chunks[0].start).toBe(0)
			expect(chunks[0].end).toBe(smallFile.size)
		})

		test('should mark chunks as resume when uploadedChunks > 0', () => {
			const resumeFile: UploadFile = {
				...mockFile,
				uploadedChunks: 2,
			}

			const chunks = createChunks(resumeFile)

			expect(chunks[0].isResume).toBe(true)
			expect(chunks[1].isResume).toBe(true)

			expect(chunks[2].isResume).toBe(false)
			expect(chunks[3].isResume).toBe(false)
			expect(chunks[4].isResume).toBe(false)
		})
	})
})
