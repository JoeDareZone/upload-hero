import { FileType, UploadChunk, UploadFile } from '@/types/fileType'

describe('FileType types', () => {
	test('FileType can be instantiated with proper properties', () => {
		const file: FileType = {
			status: 'active',
			uri: 'file:///example.jpg',
			name: 'example.jpg',
			mimeType: 'image/jpeg',
			size: 1024,
		}

		expect(file.status).toBe('active')
		expect(file.uri).toBe('file:///example.jpg')
		expect(file.name).toBe('example.jpg')
		expect(file.mimeType).toBe('image/jpeg')
		expect(file.size).toBe(1024)
	})

	test('UploadFile can be instantiated with proper properties', () => {
		const uploadFile: UploadFile = {
			id: 'file-123',
			status: 'uploading',
			uri: 'file:///example.jpg',
			name: 'example.jpg',
			mimeType: 'image/jpeg',
			size: 1024,
			totalChunks: 5,
			uploadedChunks: 2,
			errorMessage: undefined,
		}

		expect(uploadFile.id).toBe('file-123')
		expect(uploadFile.status).toBe('uploading')
		expect(uploadFile.totalChunks).toBe(5)
		expect(uploadFile.uploadedChunks).toBe(2)
	})

	test('UploadChunk can be instantiated with proper properties', () => {
		const chunk: UploadChunk = {
			fileId: 'file-123',
			chunkIndex: 2,
			start: 1024,
			end: 2048,
			status: 'queued',
			retries: 0,
			uri: 'file:///chunk2.jpg',
		}

		expect(chunk.fileId).toBe('file-123')
		expect(chunk.chunkIndex).toBe(2)
		expect(chunk.start).toBe(1024)
		expect(chunk.end).toBe(2048)
		expect(chunk.status).toBe('queued')
		expect(chunk.retries).toBe(0)
	})
})
