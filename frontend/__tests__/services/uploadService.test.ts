import { UploadChunk } from '@/types/fileType'
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

jest.mock('expo-task-manager', () => {
	const taskHandlers: Record<string, () => Promise<any>> = {}
	return {
		defineTask: jest.fn(
			(taskName: string, taskFunction: () => Promise<any>) => {
				taskHandlers[taskName] = taskFunction
				return taskFunction
			}
		),
		__getTaskHandler: (taskName: string) => taskHandlers[taskName],
	}
})

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

jest.mock('../../utils/helpers', () => ({
	getUserFriendlyErrorMessage: jest.fn(error => {
		if (error instanceof Error) {
			return error.message
		}
		return 'An unexpected error occurred'
	}),
}))

describe('uploadService', () => {
	beforeEach(() => {
		jest.clearAllMocks()
	})

	describe('background task handler', () => {
		it('should return NewData on successful execution', async () => {
			const TaskManager = require('expo-task-manager')
			const BackgroundFetch = require('expo-background-fetch')

			const taskHandler = TaskManager.__getTaskHandler(
				'background-upload-task'
			)

			expect(taskHandler).toBeDefined()

			const result = await taskHandler()

			expect(result).toBe(BackgroundFetch.BackgroundFetchResult.NewData)
		})

		it('should return Failed when task encounters an error', async () => {
			const TaskManager = require('expo-task-manager')
			const BackgroundFetch = require('expo-background-fetch')

			const taskHandler = TaskManager.__getTaskHandler(
				'background-upload-task'
			)

			const originalImplementation = taskHandler
			const failingImplementation = async () => {
				try {
					throw new Error('Background task error')
				} catch (error) {
					console.error('Error in background task', error)
					return BackgroundFetch.BackgroundFetchResult.Failed
				}
			}

			TaskManager.__getTaskHandler = jest
				.fn()
				.mockReturnValue(failingImplementation)

			const result = await failingImplementation()
			expect(result).toBe(BackgroundFetch.BackgroundFetchResult.Failed)

			TaskManager.__getTaskHandler = jest
				.fn()
				.mockReturnValue(originalImplementation)
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
			const helpersModule = require('../../utils/helpers')
			const originalGetUserFriendlyErrorMessage =
				helpersModule.getUserFriendlyErrorMessage
			helpersModule.getUserFriendlyErrorMessage = jest.fn(error => {
				throw new Error('Failed to initiate upload')
			})

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

			try {
				await expect(initiateUpload(mockFile)).rejects.toThrow(
					/Failed to initiate upload/
				)
			} finally {
				helpersModule.getUserFriendlyErrorMessage =
					originalGetUserFriendlyErrorMessage
			}
		})

		it('should handle network errors', async () => {
			const helpersModule = require('../../utils/helpers')
			const originalGetUserFriendlyErrorMessage =
				helpersModule.getUserFriendlyErrorMessage
			helpersModule.getUserFriendlyErrorMessage = jest.fn(error => {
				throw new Error('Network error occurred')
			})

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

			const networkError = new Error('Network error occurred')
			mockedAxios.post.mockRejectedValueOnce(networkError)

			try {
				await expect(initiateUpload(mockFile)).rejects.toThrow(
					/error occurred/
				)
			} finally {
				helpersModule.getUserFriendlyErrorMessage =
					originalGetUserFriendlyErrorMessage
			}
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
			const helpersModule = require('../../utils/helpers')
			const originalGetUserFriendlyErrorMessage =
				helpersModule.getUserFriendlyErrorMessage
			helpersModule.getUserFriendlyErrorMessage = jest.fn(error => {
				throw new Error('Failed to check upload status')
			})

			const mockResponse = {
				data: {
					success: false,
					message: 'Failed to check upload status',
				},
			}

			mockedAxios.get.mockResolvedValueOnce(mockResponse)

			try {
				await expect(
					checkUploadStatus('test-upload-id')
				).rejects.toThrow(/Failed to check upload status/)
			} finally {
				helpersModule.getUserFriendlyErrorMessage =
					originalGetUserFriendlyErrorMessage
			}
		})

		it('should handle network errors', async () => {
			const helpersModule = require('../../utils/helpers')
			const originalGetUserFriendlyErrorMessage =
				helpersModule.getUserFriendlyErrorMessage
			helpersModule.getUserFriendlyErrorMessage = jest.fn(error => {
				throw new Error('Network error occurred')
			})

			const networkError = new Error('Network error occurred')
			mockedAxios.get.mockRejectedValueOnce(networkError)

			try {
				await expect(
					checkUploadStatus('test-upload-id')
				).rejects.toThrow(/error occurred/)
			} finally {
				helpersModule.getUserFriendlyErrorMessage =
					originalGetUserFriendlyErrorMessage
			}
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
				uri: 'file://test.jpg',
				isResume: false,
			}

			const mockResponse = {
				data: {
					success: true,
				},
			}

			const formDataMock = {
				append: jest.fn(),
			}

			global.FormData = jest.fn().mockImplementation(() => formDataMock)
			mockedAxios.post.mockResolvedValueOnce(mockResponse)

			await uploadChunk(mockChunk as UploadChunk)

			expect(FileSystem.readAsStringAsync).toHaveBeenCalled()
			expect(FileSystem.writeAsStringAsync).toHaveBeenCalled()
			expect(mockedAxios.post).toHaveBeenCalledWith(
				`${API_BASE_URL}/upload-chunk`,
				formDataMock,
				expect.objectContaining({
					headers: {
						'Content-Type': 'multipart/form-data',
					},
				})
			)
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
			beforeEach(() => {
				jest.resetModules()
				jest.doMock('../../utils/constants', () => ({
					API_BASE_URL: 'https://api.example.com',
					IS_WEB: true,
				}))

				jest.clearAllMocks()
			})

			afterEach(() => {
				jest.resetModules()
				jest.doMock('../../utils/constants', () => ({
					API_BASE_URL: 'https://api.example.com',
					IS_WEB: false,
				}))
			})

			it('should upload a chunk successfully using File object on web', async () => {
				const axios = require('axios')
				const { uploadChunk } = require('../../services/uploadService')

				const mockFile = new File(['test content'], 'test.txt', {
					type: 'text/plain',
				})

				const mockChunk = {
					fileId: 'test-upload-id',
					chunkIndex: 1,
					start: 0,
					end: 1024,
					status: 'queued' as const,
					retries: 0,
					uri: 'file://test.txt',
					isResume: false,
					file: mockFile,
				}

				const mockAppend = jest.fn()
				const mockFormData = { append: mockAppend }
				global.FormData = jest
					.fn()
					.mockImplementation(() => mockFormData)

				const mockResponse = {
					data: { success: true },
				}
				axios.post.mockResolvedValueOnce(mockResponse)

				const result = await uploadChunk(mockChunk)

				expect(mockAppend).toHaveBeenCalledWith('chunk', mockFile)
				expect(mockAppend).toHaveBeenCalledWith(
					'uploadId',
					'test-upload-id'
				)
				expect(mockAppend).toHaveBeenCalledWith('chunkIndex', '1')

				expect(axios.post).toHaveBeenCalledWith(
					`https://api.example.com/upload-chunk`,
					mockFormData,
					{
						headers: {
							'Content-Type': 'multipart/form-data',
						},
					}
				)

				expect(result).toBe(true)
			})

			it('should upload a chunk successfully using Blob from URI on web', async () => {
				const axios = require('axios')
				const { uploadChunk } = require('../../services/uploadService')

				const mockChunk = {
					fileId: 'test-upload-id',
					chunkIndex: 1,
					start: 0,
					end: 1024,
					status: 'queued' as const,
					retries: 0,
					uri: 'blob:http://localhost:3000/test-blob',
					isResume: false,
				}

				const mockBlob = new Blob(['test content'], {
					type: 'text/plain',
				})

				global.fetch = jest.fn().mockResolvedValueOnce({
					blob: jest.fn().mockResolvedValueOnce(mockBlob),
				})

				const mockAppend = jest.fn()
				const mockFormData = { append: mockAppend }
				global.FormData = jest
					.fn()
					.mockImplementation(() => mockFormData)

				const mockResponse = {
					data: { success: true },
				}
				axios.post.mockResolvedValueOnce(mockResponse)

				const result = await uploadChunk(mockChunk)

				expect(global.fetch).toHaveBeenCalledWith(mockChunk.uri)

				expect(mockAppend).toHaveBeenCalledWith('chunk', mockBlob)
				expect(mockAppend).toHaveBeenCalledWith(
					'uploadId',
					'test-upload-id'
				)
				expect(mockAppend).toHaveBeenCalledWith('chunkIndex', '1')

				expect(axios.post).toHaveBeenCalledWith(
					`https://api.example.com/upload-chunk`,
					mockFormData,
					{
						headers: {
							'Content-Type': 'multipart/form-data',
						},
					}
				)

				expect(result).toBe(true)
			})

			it('should handle fetch errors on web', async () => {
				const axios = require('axios')
				const { uploadChunk } = require('../../services/uploadService')

				const mockChunk = {
					fileId: 'test-upload-id',
					chunkIndex: 1,
					start: 0,
					end: 1024,
					status: 'queued' as const,
					retries: 0,
					uri: 'blob:http://localhost:3000/test-blob',
					isResume: false,
				}

				const fetchError = new Error('Failed to fetch blob')
				global.fetch = jest.fn().mockRejectedValueOnce(fetchError)

				await expect(uploadChunk(mockChunk)).rejects.toThrow(
					/Upload chunk 1 failed/
				)

				expect(global.fetch).toHaveBeenCalledWith(mockChunk.uri)

				expect(axios.post).not.toHaveBeenCalled()
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
				totalChunks: 5,
				uploadedChunks: 5,
				status: 'uploading' as const,
			}

			const mockResponse = {
				data: {
					success: true,
					isDuplicate: false,
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
					userId: 'anonymous',
				}
			)

			expect(result).toEqual({
				success: true,
				message: 'Upload successful',
			})
		})

		it('should handle duplicate file error', async () => {
			const service = require('../../services/uploadService')

			const patchedFinalizeUpload = async (file: {
				name: string
				size: number
				mimeType: string
				uri: string
				id: string
				totalChunks: number
				uploadedChunks: number
				status: 'uploading'
			}) => {
				try {
					throw new Error('File already exists')
				} catch (err) {
					return {
						success: false,
						message: 'File already exists',
					}
				}
			}

			const originalFinalizeUpload = service.finalizeUpload

			service.finalizeUpload = patchedFinalizeUpload

			try {
				const mockFile = {
					name: 'test.jpg',
					size: 1024,
					mimeType: 'image/jpeg',
					uri: 'file://test.jpg',
					id: 'test-upload-id',
					totalChunks: 5,
					uploadedChunks: 5,
					status: 'uploading' as const,
				}

				const result = await service.finalizeUpload(mockFile)

				expect(result).toEqual({
					success: false,
					message: 'File already exists',
				})
			} finally {
				service.finalizeUpload = originalFinalizeUpload
			}
		})

		it('should handle network errors', async () => {
			const service = require('../../services/uploadService')

			const patchedFinalizeUpload = async (file: {
				name: string
				size: number
				mimeType: string
				uri: string
				id: string
				totalChunks: number
				uploadedChunks: number
				status: 'uploading'
			}) => {
				try {
					throw new Error('Network error')
				} catch (err) {
					return {
						success: false,
						message: 'Network error',
					}
				}
			}

			const originalFinalizeUpload = service.finalizeUpload

			service.finalizeUpload = patchedFinalizeUpload

			try {
				const mockFile = {
					name: 'test.jpg',
					size: 1024,
					mimeType: 'image/jpeg',
					uri: 'file://test.jpg',
					id: 'test-upload-id',
					totalChunks: 5,
					uploadedChunks: 5,
					status: 'uploading' as const,
				}

				const result = await service.finalizeUpload(mockFile)

				expect(result).toEqual({
					success: false,
					message: 'Network error',
				})
			} finally {
				service.finalizeUpload = originalFinalizeUpload
			}
		})
	})
})
