import { createChunks } from '../../utils/chunkUtils'
import { CHUNK_SIZE } from '../../utils/constants'

jest.mock('../../utils/constants', () => ({
	CHUNK_SIZE: 1024,
	IS_WEB: false,
}))

describe('chunkUtils', () => {
	describe('createChunks', () => {
		it('should create chunks for a file with exact chunk size division', () => {
			const mockFile = {
				id: 'test-id',
				name: 'test.jpg',
				size: CHUNK_SIZE * 3,
				mimeType: 'image/jpeg',
				uri: 'file://test.jpg',
				uploadedChunks: 0,
				totalChunks: 3,
				status: 'queued' as const,
			}

			const chunks = createChunks(mockFile)

			expect(chunks).toHaveLength(3)

			expect(chunks[0]).toEqual({
				fileId: 'test-id',
				chunkIndex: 1,
				start: 0,
				end: CHUNK_SIZE,
				status: 'queued',
				retries: 0,
				uri: 'file://test.jpg',
				isResume: false,
			})

			expect(chunks[1]).toEqual({
				fileId: 'test-id',
				chunkIndex: 2,
				start: CHUNK_SIZE,
				end: CHUNK_SIZE * 2,
				status: 'queued',
				retries: 0,
				uri: 'file://test.jpg',
				isResume: false,
			})

			expect(chunks[2]).toEqual({
				fileId: 'test-id',
				chunkIndex: 3,
				start: CHUNK_SIZE * 2,
				end: CHUNK_SIZE * 3,
				status: 'queued',
				retries: 0,
				uri: 'file://test.jpg',
				isResume: false,
			})
		})

		it('should create chunks for a file with partial last chunk', () => {
			const mockFile = {
				id: 'test-id',
				name: 'test.jpg',
				size: CHUNK_SIZE * 2.5,
				mimeType: 'image/jpeg',
				uri: 'file://test.jpg',
				uploadedChunks: 0,
				totalChunks: 3,
				status: 'queued' as const,
			}

			const chunks = createChunks(mockFile)

			expect(chunks).toHaveLength(3)

			expect(chunks[2]).toEqual({
				fileId: 'test-id',
				chunkIndex: 3,
				start: CHUNK_SIZE * 2,
				end: CHUNK_SIZE * 2.5,
				status: 'queued',
				retries: 0,
				uri: 'file://test.jpg',
				isResume: false,
			})
		})

		it('should handle resumed uploads and mark chunks as already uploaded', () => {
			const mockFile = {
				id: 'test-id',
				name: 'test.jpg',
				size: CHUNK_SIZE * 3,
				mimeType: 'image/jpeg',
				uri: 'file://test.jpg',
				uploadedChunks: 2,
				totalChunks: 3,
				status: 'queued' as const,
			}

			const chunks = createChunks(mockFile)

			expect(chunks).toHaveLength(3)

			expect(chunks[0].isResume).toBe(true)

			expect(chunks[1].isResume).toBe(true)

			expect(chunks[2].isResume).toBe(false)
		})

		it('should handle web uploads with file objects', () => {
			jest.resetModules()
			jest.mock('../../utils/constants', () => ({
				CHUNK_SIZE: 1024,
				IS_WEB: true,
			}))

			const { createChunks } = require('../../utils/chunkUtils')

			const mockBlob = new Blob(['test data'], { type: 'image/jpeg' })
			const mockFile = {
				id: 'test-id',
				name: 'test.jpg',
				size: CHUNK_SIZE * 2,
				mimeType: 'image/jpeg',
				uri: 'file://test.jpg',
				file: new File([mockBlob], 'test.jpg', { type: 'image/jpeg' }),
				uploadedChunks: 0,
				totalChunks: 2,
				status: 'queued' as const,
			}

			global.URL.createObjectURL = jest.fn(() => 'blob:test')

			const chunks = createChunks(mockFile)

			expect(chunks).toHaveLength(2)

			expect(chunks[0].uri).toBe('blob:test')
			expect(chunks[0].file instanceof File).toBe(true)
		})

		it('should handle web uploads with resumed chunks', () => {
			jest.resetModules()
			jest.mock('../../utils/constants', () => ({
				CHUNK_SIZE: 1024,
				IS_WEB: true,
			}))

			const { createChunks } = require('../../utils/chunkUtils')

			const mockBlob = new Blob(['test data'], { type: 'image/jpeg' })
			const mockFile = {
				id: 'test-id',
				name: 'test.jpg',
				size: CHUNK_SIZE * 2,
				mimeType: 'image/jpeg',
				uri: 'file://test.jpg',
				file: new File([mockBlob], 'test.jpg', { type: 'image/jpeg' }),
				uploadedChunks: 1,
				totalChunks: 2,
				status: 'queued' as const,
			}

			global.URL.createObjectURL = jest.fn(() => 'blob:test')

			const chunks = createChunks(mockFile)

			expect(chunks).toHaveLength(2)

			expect(chunks[0].isResume).toBe(true)
		})

		it('should handle web uploads where file is not a File object', () => {
			jest.resetModules()
			jest.mock('../../utils/constants', () => ({
				CHUNK_SIZE: 1024,
				IS_WEB: true,
			}))

			const { createChunks } = require('../../utils/chunkUtils')

			const mockFile = {
				id: 'test-id',
				name: 'test.jpg',
				size: CHUNK_SIZE * 2,
				mimeType: 'image/jpeg',
				uri: 'file://test.jpg',
				file: null,
				uploadedChunks: 0,
				totalChunks: 2,
				status: 'queued' as const,
			}

			const chunks = createChunks(mockFile)

			expect(chunks).toHaveLength(2)

			expect(chunks[0].isResume).toBe(true)
			expect(chunks[1].isResume).toBe(true)
		})
	})
})
