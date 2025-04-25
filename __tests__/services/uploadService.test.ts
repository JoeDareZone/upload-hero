import axios from 'axios'
import * as FileSystem from 'expo-file-system'
import {
	checkUploadStatus,
	finalizeUpload,
	initiateUpload,
	uploadChunk,
} from '../../services/uploadService'
import { API_BASE_URL } from '../../utils/constants'

jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

jest.mock('expo-file-system', () => ({
	cacheDirectory: 'file://test-cache-directory/',
	makeDirectoryAsync: jest.fn().mockResolvedValue(undefined),
	getInfoAsync: jest.fn().mockResolvedValue({ exists: true }),
	readAsStringAsync: jest.fn().mockResolvedValue('base64data'),
	writeAsStringAsync: jest.fn().mockResolvedValue(undefined),
	EncodingType: {
		Base64: 'base64',
	},
}))

global.FormData = jest.fn().mockImplementation(() => ({
	append: jest.fn(),
}))

global.Blob = jest.fn().mockImplementation((content, options) => ({
	content,
	options,
}))

jest.mock('expo-task-manager', () => ({
	defineTask: jest.fn(),
}))

jest.mock('expo-background-fetch', () => ({
	registerTaskAsync: jest.fn(),
	getStatusAsync: jest.fn().mockResolvedValue('Available'),
	BackgroundFetchResult: {
		NewData: 'newData',
		NoData: 'noData',
		Failed: 'failed',
	},
	BackgroundFetchStatus: {
		Available: 'Available',
		Unavailable: 'Unavailable',
		Restricted: 'Restricted',
		Denied: 'Denied',
	},
}))

jest.mock('../../utils/constants', () => ({
	API_BASE_URL: 'https://api.example.com',
	IS_WEB: false,
}))

describe('uploadService', () => {
	beforeEach(() => {
		jest.clearAllMocks()
	})

	describe('background task handler', () => {
		it('should return NewData on successful execution', async () => {
			const TaskManager = require('expo-task-manager')
			const BackgroundFetch = require('expo-background-fetch')

			const taskName = TaskManager.defineTask.mock.calls[0][0]
			const taskHandler = TaskManager.defineTask.mock.calls[0][1]

			expect(taskName).toBe('background-upload-task')

			const result = await taskHandler()

			expect(result).toBe(BackgroundFetch.BackgroundFetchResult.NewData)
		})

		it('should return Failed when task encounters an error', async () => {
			const TaskManager = require('expo-task-manager')
			const BackgroundFetch = require('expo-background-fetch')

			const taskHandler = TaskManager.defineTask.mock.calls[0][1]

			const consoleErrorSpy = jest
				.spyOn(console, 'error')
				.mockImplementation(() => {})

			const mockError = new Error('Background task error')
			jest.spyOn(global, 'Promise').mockImplementationOnce(() => {
				return {
					then: () => {
						throw mockError
					},
				} as any
			})

			const result = await taskHandler()

			expect(consoleErrorSpy).toHaveBeenCalledWith(
				'Error in background task',
				mockError
			)

			expect(result).toBe(BackgroundFetch.BackgroundFetchResult.Failed)

			consoleErrorSpy.mockRestore()
		})
	})

	describe('initiateUpload', () => {
		it('should successfully initiate an upload', async () => {
			const mockFile = {
				name: 'test.jpg',
				size: 1024,
				mimeType: 'image/jpeg',
				uri: 'file://test.jpg',
				id: '',
				uploadedChunks: 0,
				totalChunks: 0,
				status: 'queued' as const,
			}

			const mockResponse = {
				data: {
					success: true,
					uploadId: 'test-upload-id',
				},
			}

			mockedAxios.post.mockResolvedValueOnce(mockResponse)

			const result = await initiateUpload(mockFile)

			expect(mockedAxios.post).toHaveBeenCalledWith(
				`${API_BASE_URL}/initiate-upload`,
				{
					fileName: mockFile.name,
					fileSize: mockFile.size,
					mimeType: mockFile.mimeType,
					userId: 'anonymous',
				}
			)

			expect(result).toBe('test-upload-id')
		})

		it('should throw an error when initiate upload fails', async () => {
			const mockFile = {
				name: 'test.jpg',
				size: 1024,
				mimeType: 'image/jpeg',
				uri: 'file://test.jpg',
				id: '',
				uploadedChunks: 0,
				totalChunks: 0,
				status: 'queued' as const,
			}

			const mockResponse = {
				data: {
					success: false,
					message: 'Failed to initiate upload',
				},
			}

			mockedAxios.post.mockResolvedValueOnce(mockResponse)

			await expect(initiateUpload(mockFile)).rejects.toThrow(
				/Failed to initiate upload/
			)
		})

		it('should handle network errors', async () => {
			const mockFile = {
				name: 'test.jpg',
				size: 1024,
				mimeType: 'image/jpeg',
				uri: 'file://test.jpg',
				id: '',
				uploadedChunks: 0,
				totalChunks: 0,
				status: 'queued' as const,
			}

			const networkError = new Error('Network error')
			mockedAxios.post.mockRejectedValueOnce(networkError)

			await expect(initiateUpload(mockFile)).rejects.toThrow(
				/error occurred/
			)
		})
	})

	describe('checkUploadStatus', () => {
		it('should successfully check upload status', async () => {
			const mockResponse = {
				data: {
					success: true,
					chunksReceived: 2,
					chunkIndices: [1, 2],
				},
			}

			mockedAxios.get.mockResolvedValueOnce(mockResponse)

			const result = await checkUploadStatus('test-upload-id')

			expect(mockedAxios.get).toHaveBeenCalledWith(
				`${API_BASE_URL}/upload-status/test-upload-id`
			)
			expect(result).toEqual({
				chunksReceived: 2,
				chunkIndices: [1, 2],
			})
		})

		it('should throw an error when check upload status fails', async () => {
			const mockResponse = {
				data: {
					success: false,
					message: 'Failed to check upload status',
				},
			}

			mockedAxios.get.mockResolvedValueOnce(mockResponse)

			await expect(checkUploadStatus('test-upload-id')).rejects.toThrow(
				/Failed to check upload status/
			)
		})

		it('should handle network errors', async () => {
			const networkError = new Error('Network error')
			mockedAxios.get.mockRejectedValueOnce(networkError)

			await expect(checkUploadStatus('test-upload-id')).rejects.toThrow(
				/error occurred/
			)
		})
	})

	describe('uploadChunk', () => {
		it('should return true if chunk is marked as resume', async () => {
			const mockChunk = {
				fileId: 'test-upload-id',
				chunkIndex: 1,
				start: 0,
				end: 1024,
				status: 'queued' as const,
				retries: 0,
				uri: 'file://test.jpg',
				isResume: true,
			}

			const result = await uploadChunk(mockChunk)
			expect(result).toBe(true)
			expect(mockedAxios.post).not.toHaveBeenCalled()
		})

		it('should upload a chunk successfully on mobile', async () => {
			const mockChunk = {
				fileId: 'test-upload-id',
				chunkIndex: 1,
				start: 0,
				end: 1024,
				status: 'queued' as const,
				retries: 0,
				uri: 'file://test.jpg',
				isResume: false,
			}

			const mockResponse = {
				data: {
					success: true,
				},
			}

			mockedAxios.post.mockResolvedValueOnce(mockResponse)

			const result = await uploadChunk(mockChunk)

			expect(FileSystem.makeDirectoryAsync).toHaveBeenCalled()
			expect(FileSystem.getInfoAsync).toHaveBeenCalledWith(
				'file://test.jpg'
			)
			expect(FileSystem.readAsStringAsync).toHaveBeenCalled()
			expect(FileSystem.writeAsStringAsync).toHaveBeenCalled()
			expect(mockedAxios.post).toHaveBeenCalledWith(
				`${API_BASE_URL}/upload-chunk`,
				expect.any(FormData),
				expect.objectContaining({
					headers: {
						'Content-Type': 'multipart/form-data',
					},
				})
			)

			expect(result).toBe(true)
		})

		it('should handle errors when reading file', async () => {
			const mockChunk = {
				fileId: 'test-upload-id',
				chunkIndex: 1,
				start: 0,
				end: 1024,
				status: 'queued' as const,
				retries: 0,
				uri: 'file://test.jpg',
				isResume: false,
			}

			;(FileSystem.getInfoAsync as jest.Mock).mockRejectedValueOnce(
				new Error('File read error')
			)

			await expect(uploadChunk(mockChunk)).rejects.toThrow(
				/Failed to process chunk 1|Upload chunk 1 failed/
			)
		})

		it('should handle network errors', async () => {
			const mockChunk = {
				fileId: 'test-upload-id',
				chunkIndex: 1,
				start: 0,
				end: 1024,
				status: 'queued' as const,
				retries: 0,
				uri: 'file://test.jpg',
				isResume: false,
			}

			const networkError = new Error('Network error')
			;(FileSystem.getInfoAsync as jest.Mock).mockResolvedValueOnce({
				exists: true,
			})
			mockedAxios.post.mockRejectedValueOnce(networkError)

			await expect(uploadChunk(mockChunk)).rejects.toThrow(
				/Upload chunk 1 failed/
			)
		})

		it('should register background task on mobile', async () => {
			const mockChunk = {
				fileId: 'test-upload-id',
				chunkIndex: 1,
				start: 0,
				end: 1024,
				status: 'queued' as const,
				retries: 0,
				uri: 'file://test.jpg',
				isResume: false,
			}

			const mockResponse = {
				data: {
					success: true,
				},
			}

			const BackgroundFetch = require('expo-background-fetch')
			BackgroundFetch.getStatusAsync.mockResolvedValueOnce('Available')
			const registerTaskAsyncMock = jest.spyOn(
				BackgroundFetch,
				'registerTaskAsync'
			)

			mockedAxios.post.mockResolvedValueOnce(mockResponse)

			await uploadChunk(mockChunk)

			expect(BackgroundFetch.getStatusAsync).toHaveBeenCalled()
			expect(registerTaskAsyncMock).toHaveBeenCalledWith(
				'background-upload-task',
				{
					minimumInterval: 60 * 15,
					stopOnTerminate: false,
					startOnBoot: true,
				}
			)
		})

		describe('web platform', () => {
			const originalFetch = global.fetch
			const mockFetch = jest.fn()
			const mockBlob = jest.fn()
			let formDataAppendSpy: jest.SpyInstance

			beforeEach(() => {
				jest.resetModules()
				jest.doMock('../../utils/constants', () => ({
					API_BASE_URL: 'https://api.example.com',
					IS_WEB: true,
				}))

				global.fetch = mockFetch
				mockBlob.mockResolvedValue(
					new Blob(['test data'], { type: 'image/jpeg' })
				)
				mockFetch.mockResolvedValue({
					blob: mockBlob,
				})

				formDataAppendSpy = jest.spyOn(FormData.prototype, 'append')
			})

			afterEach(() => {
				global.fetch = originalFetch
				formDataAppendSpy.mockRestore()
			})

			it('should upload a chunk successfully using File object on web', async () => {
				const { uploadChunk } = require('../../services/uploadService')

				const mockFile = new File(['test data'], 'test.jpg', {
					type: 'image/jpeg',
				})
				const mockChunk = {
					fileId: 'test-upload-id',
					chunkIndex: 1,
					start: 0,
					end: 1024,
					status: 'queued' as const,
					retries: 0,
					uri: 'blob:test.jpg',
					isResume: false,
					file: mockFile,
				}

				const mockResponse = {
					data: {
						success: true,
					},
				}

				mockedAxios.post.mockResolvedValueOnce(mockResponse)

				const result = await uploadChunk(mockChunk)

				expect(formDataAppendSpy).toHaveBeenCalledWith(
					'chunk',
					mockFile
				)
				expect(formDataAppendSpy).toHaveBeenCalledWith(
					'uploadId',
					'test-upload-id'
				)
				expect(formDataAppendSpy).toHaveBeenCalledWith(
					'chunkIndex',
					'1'
				)

				expect(mockedAxios.post).toHaveBeenCalledWith(
					`${API_BASE_URL}/upload-chunk`,
					expect.any(FormData),
					expect.objectContaining({
						headers: {
							'Content-Type': 'multipart/form-data',
						},
					})
				)

				expect(result).toBe(true)
			})

			it('should upload a chunk successfully using Blob from URI on web', async () => {
				const { uploadChunk } = require('../../services/uploadService')

				const mockChunk = {
					fileId: 'test-upload-id',
					chunkIndex: 1,
					start: 0,
					end: 1024,
					status: 'queued' as const,
					retries: 0,
					uri: 'blob:test.jpg',
					isResume: false,
				}

				const mockResponse = {
					data: {
						success: true,
					},
				}

				mockedAxios.post.mockResolvedValueOnce(mockResponse)

				const result = await uploadChunk(mockChunk)

				expect(mockFetch).toHaveBeenCalledWith('blob:test.jpg')
				expect(mockBlob).toHaveBeenCalled()

				expect(formDataAppendSpy).toHaveBeenCalledWith(
					'chunk',
					expect.anything()
				)
				expect(formDataAppendSpy).toHaveBeenCalledWith(
					'uploadId',
					'test-upload-id'
				)
				expect(formDataAppendSpy).toHaveBeenCalledWith(
					'chunkIndex',
					'1'
				)

				expect(mockedAxios.post).toHaveBeenCalledWith(
					`${API_BASE_URL}/upload-chunk`,
					expect.any(FormData),
					expect.objectContaining({
						headers: {
							'Content-Type': 'multipart/form-data',
						},
					})
				)

				expect(result).toBe(true)
			})

			it('should handle fetch errors on web', async () => {
				const { uploadChunk } = require('../../services/uploadService')

				const mockChunk = {
					fileId: 'test-upload-id',
					chunkIndex: 1,
					start: 0,
					end: 1024,
					status: 'queued' as const,
					retries: 0,
					uri: 'blob:test.jpg',
					isResume: false,
				}

				mockFetch.mockRejectedValueOnce(new Error('Fetch failed'))

				await expect(uploadChunk(mockChunk)).rejects.toThrow(
					/Upload chunk 1 failed/
				)
			})
		})
	})

	describe('finalizeUpload', () => {
		it('should successfully finalize an upload', async () => {
			const mockFile = {
				name: 'test.jpg',
				size: 1024,
				mimeType: 'image/jpeg',
				uri: 'file://test.jpg',
				id: 'test-upload-id',
				uploadedChunks: 3,
				totalChunks: 3,
				status: 'uploading' as const,
			}

			const mockResponse = {
				data: {
					success: true,
					message: 'Upload finalized successfully',
				},
			}

			mockedAxios.post.mockResolvedValueOnce(mockResponse)

			const result = await finalizeUpload(mockFile)

			expect(mockedAxios.post).toHaveBeenCalledWith(
				`${API_BASE_URL}/finalize-upload`,
				{
					uploadId: mockFile.id,
					totalChunks: mockFile.totalChunks,
					fileName: mockFile.name,
					fileSize: mockFile.size,
					mimeType: mockFile.mimeType,
				}
			)

			expect(result).toEqual({
				success: true,
				message: 'Upload successful',
			})
		})

		it('should handle duplicate file error', async () => {
			const mockFile = {
				name: 'test.jpg',
				size: 1024,
				mimeType: 'image/jpeg',
				uri: 'file://test.jpg',
				id: 'test-upload-id',
				uploadedChunks: 3,
				totalChunks: 3,
				status: 'uploading' as const,
			}

			const mockResponse = {
				data: {
					isDuplicate: true,
				},
			}

			mockedAxios.post.mockResolvedValueOnce(mockResponse)

			const result = await finalizeUpload(mockFile)

			expect(result).toEqual(
				expect.objectContaining({
					success: false,
					message: expect.stringMatching(/already exists/),
				})
			)
		})

		it('should handle network errors', async () => {
			const mockFile = {
				name: 'test.jpg',
				size: 1024,
				mimeType: 'image/jpeg',
				uri: 'file://test.jpg',
				id: 'test-upload-id',
				uploadedChunks: 3,
				totalChunks: 3,
				status: 'uploading' as const,
			}

			const networkError = new Error('Network error')
			mockedAxios.post.mockRejectedValueOnce(networkError)

			const result = await finalizeUpload(mockFile)

			expect(result).toEqual(
				expect.objectContaining({
					success: false,
					message: expect.any(String),
				})
			)
		})
	})
})
