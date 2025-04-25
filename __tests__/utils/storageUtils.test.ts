import AsyncStorage from '@react-native-async-storage/async-storage'
import {
	clearIncompleteUploads,
	clearUploadHistory,
	getIncompleteUploads,
	getUploadHistory,
	saveIncompleteUploads,
	saveToUploadHistory,
} from '../../utils/storageUtils'

jest.mock('@react-native-async-storage/async-storage', () => ({
	getItem: jest.fn(),
	setItem: jest.fn(),
	removeItem: jest.fn(),
}))

jest.mock('../../utils/constants', () => ({
	IS_WEB: false,
}))

describe('storageUtils', () => {
	beforeEach(() => {
		jest.clearAllMocks()
	})

	describe('saveToUploadHistory', () => {
		it('should not save if file status is not completed', async () => {
			const mockFile = {
				id: 'test-id',
				name: 'test.jpg',
				size: 1024,
				mimeType: 'image/jpeg',
				uri: 'file://test.jpg',
				uploadedChunks: 0,
				totalChunks: 1,
				status: 'uploading' as const,
			}

			saveToUploadHistory(mockFile)

			expect(AsyncStorage.getItem).not.toHaveBeenCalled()
			expect(AsyncStorage.setItem).not.toHaveBeenCalled()
		})

		it('should add file to empty history', async () => {
			const mockFile = {
				id: 'test-id',
				name: 'test.jpg',
				size: 1024,
				mimeType: 'image/jpeg',
				uri: 'file://test.jpg',
				uploadedChunks: 1,
				totalChunks: 1,
				status: 'completed' as const,
			}

			;(AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null)

			saveToUploadHistory(mockFile)

			await new Promise(resolve => setTimeout(resolve, 0))

			expect(AsyncStorage.getItem).toHaveBeenCalledWith('upload_history')
			expect(AsyncStorage.setItem).toHaveBeenCalledWith(
				'upload_history',
				expect.stringContaining('test-id')
			)

			const setItemCall = (AsyncStorage.setItem as jest.Mock).mock
				.calls[0][1]
			const savedData = JSON.parse(setItemCall)
			expect(savedData[0].id).toBe('test-id')
			expect(savedData[0].completedAt).toBeDefined()
		})

		it('should add file to existing history', async () => {
			const existingFile = {
				id: 'existing-id',
				name: 'existing.jpg',
				size: 1024,
				mimeType: 'image/jpeg',
				uri: 'file://existing.jpg',
				uploadedChunks: 1,
				totalChunks: 1,
				status: 'completed',
				completedAt: new Date().toISOString(),
			}

			const mockFile = {
				id: 'test-id',
				name: 'test.jpg',
				size: 1024,
				mimeType: 'image/jpeg',
				uri: 'file://test.jpg',
				uploadedChunks: 1,
				totalChunks: 1,
				status: 'completed' as const,
			}

			;(AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
				JSON.stringify([existingFile])
			)

			saveToUploadHistory(mockFile)

			await new Promise(resolve => setTimeout(resolve, 0))

			expect(AsyncStorage.getItem).toHaveBeenCalledWith('upload_history')

			const setItemCall = (AsyncStorage.setItem as jest.Mock).mock
				.calls[0][1]
			const savedData = JSON.parse(setItemCall)

			expect(savedData[0].id).toBe('test-id')
			expect(savedData[1].id).toBe('existing-id')
		})

		it('should not add duplicate files', async () => {
			const existingFile = {
				id: 'test-id',
				name: 'test.jpg',
				size: 1024,
				mimeType: 'image/jpeg',
				uri: 'file://test.jpg',
				uploadedChunks: 1,
				totalChunks: 1,
				status: 'completed',
				completedAt: new Date().toISOString(),
			}

			const mockFile = {
				id: 'test-id',
				name: 'test.jpg',
				size: 1024,
				mimeType: 'image/jpeg',
				uri: 'file://test.jpg',
				uploadedChunks: 1,
				totalChunks: 1,
				status: 'completed' as const,
			}

			;(AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
				JSON.stringify([existingFile])
			)

			saveToUploadHistory(mockFile)

			await new Promise(resolve => setTimeout(resolve, 0))

			expect(AsyncStorage.getItem).toHaveBeenCalledWith('upload_history')
			expect(AsyncStorage.setItem).not.toHaveBeenCalled()
		})

		it('should limit history to 100 items', async () => {
			const existingFiles = Array.from({ length: 101 }, (_, i) => ({
				id: `existing-id-${i}`,
				name: `existing-${i}.jpg`,
				size: 1024,
				mimeType: 'image/jpeg',
				uri: `file://existing-${i}.jpg`,
				uploadedChunks: 1,
				totalChunks: 1,
				status: 'completed',
				completedAt: new Date().toISOString(),
			}))

			const mockFile = {
				id: 'test-id',
				name: 'test.jpg',
				size: 1024,
				mimeType: 'image/jpeg',
				uri: 'file://test.jpg',
				uploadedChunks: 1,
				totalChunks: 1,
				status: 'completed' as const,
			}

			;(AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
				JSON.stringify(existingFiles)
			)

			saveToUploadHistory(mockFile)

			await new Promise(resolve => setTimeout(resolve, 0))

			const setItemCall = (AsyncStorage.setItem as jest.Mock).mock
				.calls[0][1]
			const savedData = JSON.parse(setItemCall)

			expect(savedData.length).toBe(100)
			expect(savedData[0].id).toBe('test-id')
			expect(savedData[100].id).toBe('existing-id-100')
			expect(
				savedData.find(f => f.id === 'existing-id-100')
			).toBeUndefined()
		})

		it('should handle errors when saving', async () => {
			const mockFile = {
				id: 'test-id',
				name: 'test.jpg',
				size: 1024,
				mimeType: 'image/jpeg',
				uri: 'file://test.jpg',
				uploadedChunks: 1,
				totalChunks: 1,
				status: 'completed' as const,
			}

			const error = new Error('Storage error')
			;(AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(error)

			const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

			saveToUploadHistory(mockFile)

			await new Promise(resolve => setTimeout(resolve, 0))

			expect(consoleSpy).toHaveBeenCalledWith(
				'Error saving to upload history:',
				error
			)

			consoleSpy.mockRestore()
		})
	})

	describe('getUploadHistory', () => {
		it('should return empty array if no history exists', async () => {
			;(AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null)

			const result = await getUploadHistory()

			expect(AsyncStorage.getItem).toHaveBeenCalledWith('upload_history')
			expect(result).toEqual([])
		})

		it('should return parsed history if exists', async () => {
			const mockHistory = [
				{
					id: 'test-id',
					name: 'test.jpg',
					status: 'completed',
					completedAt: new Date().toISOString(),
				},
			]

			;(AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
				JSON.stringify(mockHistory)
			)

			const result = await getUploadHistory()

			expect(AsyncStorage.getItem).toHaveBeenCalledWith('upload_history')
			expect(result).toEqual(mockHistory)
		})

		it('should handle errors', async () => {
			const error = new Error('Storage error')
			;(AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(error)

			const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

			const result = await getUploadHistory()

			expect(consoleSpy).toHaveBeenCalledWith(
				'Error retrieving upload history:',
				error
			)
			expect(result).toEqual([])

			consoleSpy.mockRestore()
		})
	})

	describe('clearUploadHistory', () => {
		it('should remove upload history from storage', async () => {
			await clearUploadHistory()

			expect(AsyncStorage.removeItem).toHaveBeenCalledWith(
				'upload_history'
			)
		})

		it('should handle errors', async () => {
			const error = new Error('Storage error')
			;(AsyncStorage.removeItem as jest.Mock).mockRejectedValueOnce(error)

			const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

			await clearUploadHistory()

			expect(consoleSpy).toHaveBeenCalledWith(
				'Error clearing upload history:',
				error
			)

			consoleSpy.mockRestore()
		})
	})

	describe('saveIncompleteUploads', () => {
		it('should save only incomplete files', async () => {
			const files = [
				{
					id: 'queued-id',
					name: 'queued.jpg',
					status: 'queued' as const,
					uri: 'file://queued.jpg',
					size: 1024,
					mimeType: 'image/jpeg',
					uploadedChunks: 0,
					totalChunks: 1,
				},
				{
					id: 'uploading-id',
					name: 'uploading.jpg',
					status: 'uploading' as const,
					uri: 'file://uploading.jpg',
					size: 1024,
					mimeType: 'image/jpeg',
					uploadedChunks: 0,
					totalChunks: 1,
				},
				{
					id: 'paused-id',
					name: 'paused.jpg',
					status: 'paused' as const,
					uri: 'file://paused.jpg',
					size: 1024,
					mimeType: 'image/jpeg',
					uploadedChunks: 0,
					totalChunks: 1,
				},
				{
					id: 'error-id',
					name: 'error.jpg',
					status: 'error' as const,
					uri: 'file://error.jpg',
					size: 1024,
					mimeType: 'image/jpeg',
					uploadedChunks: 0,
					totalChunks: 1,
				},
				{
					id: 'completed-id',
					name: 'completed.jpg',
					status: 'completed' as const,
					uri: 'file://completed.jpg',
					size: 1024,
					mimeType: 'image/jpeg',
					uploadedChunks: 1,
					totalChunks: 1,
				},
			]

			await saveIncompleteUploads(files)

			expect(AsyncStorage.setItem).toHaveBeenCalledWith(
				'incomplete_uploads',
				expect.any(String)
			)

			const setItemCall = (AsyncStorage.setItem as jest.Mock).mock
				.calls[0][1]
			const savedData = JSON.parse(setItemCall)

			expect(savedData.length).toBe(4)
			expect(savedData.some(f => f.id === 'completed-id')).toBe(false)
			expect(savedData.some(f => f.id === 'queued-id')).toBe(true)
			expect(savedData.some(f => f.id === 'uploading-id')).toBe(true)
			expect(savedData.some(f => f.id === 'paused-id')).toBe(true)
			expect(savedData.some(f => f.id === 'error-id')).toBe(true)
		})

		it('should handle errors', async () => {
			const files = [
				{
					id: 'queued-id',
					name: 'queued.jpg',
					status: 'queued' as const,
					uri: 'file://queued.jpg',
					size: 1024,
					mimeType: 'image/jpeg',
					uploadedChunks: 0,
					totalChunks: 1,
				},
			]

			const error = new Error('Storage error')
			;(AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(error)

			const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

			await saveIncompleteUploads(files)

			expect(consoleSpy).toHaveBeenCalledWith(
				'Error saving incomplete uploads:',
				error
			)

			consoleSpy.mockRestore()
		})
	})

	describe('getIncompleteUploads', () => {
		it('should return empty array if no incomplete uploads exist', async () => {
			;(AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null)

			const result = await getIncompleteUploads()

			expect(AsyncStorage.getItem).toHaveBeenCalledWith(
				'incomplete_uploads'
			)
			expect(result).toEqual([])
		})

		it('should return parsed incomplete uploads if they exist', async () => {
			const mockUploads = [
				{
					id: 'paused-id',
					name: 'paused.jpg',
					status: 'paused',
					uri: 'file://paused.jpg',
				},
			]

			;(AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
				JSON.stringify(mockUploads)
			)

			const result = await getIncompleteUploads()

			expect(AsyncStorage.getItem).toHaveBeenCalledWith(
				'incomplete_uploads'
			)
			expect(result).toEqual(mockUploads)
		})

		it('should handle errors', async () => {
			const error = new Error('Storage error')
			;(AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(error)

			const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

			const result = await getIncompleteUploads()

			expect(consoleSpy).toHaveBeenCalledWith(
				'Error retrieving incomplete uploads:',
				error
			)
			expect(result).toEqual([])

			consoleSpy.mockRestore()
		})
	})

	describe('clearIncompleteUploads', () => {
		it('should remove incomplete uploads from storage', async () => {
			await clearIncompleteUploads()

			expect(AsyncStorage.removeItem).toHaveBeenCalledWith(
				'incomplete_uploads'
			)
		})

		it('should handle errors', async () => {
			const error = new Error('Storage error')
			;(AsyncStorage.removeItem as jest.Mock).mockRejectedValueOnce(error)

			const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

			await clearIncompleteUploads()

			expect(consoleSpy).toHaveBeenCalledWith(
				'Error clearing incomplete uploads:',
				error
			)

			consoleSpy.mockRestore()
		})
	})

	describe('Web environment tests', () => {
		let originalLocalStorage

		beforeAll(() => {
			originalLocalStorage = global.localStorage

			global.localStorage = {
				getItem: jest.fn(),
				setItem: jest.fn(),
				removeItem: jest.fn(),
				length: 0,
				clear: jest.fn(),
				key: jest.fn(),
			}

			jest.resetModules()

			jest.mock('../../utils/constants', () => ({
				IS_WEB: true,
			}))
		})

		afterAll(() => {
			global.localStorage = originalLocalStorage
		})

		it('should use localStorage for web environment', async () => {
			const { saveToUploadHistory } = require('../../utils/storageUtils')

			const mockFile = {
				id: 'test-id',
				name: 'test.jpg',
				size: 1024,
				mimeType: 'image/jpeg',
				uri: 'blob:test',
				uploadedChunks: 1,
				totalChunks: 1,
				status: 'completed' as const,
			}

			;(global.localStorage.getItem as jest.Mock).mockReturnValueOnce(
				null
			)

			saveToUploadHistory(mockFile)

			await new Promise(resolve => setTimeout(resolve, 0))

			expect(global.localStorage.getItem).toHaveBeenCalledWith(
				'upload_history'
			)
			expect(global.localStorage.setItem).toHaveBeenCalledWith(
				'upload_history',
				expect.stringContaining('test-id')
			)
		})

		it('should handle server-side rendering (no window)', async () => {
			const originalWindow = global.window

			// @ts-expect-error Intentionally removing window for SSR testing
			global.window = undefined

			const {
				saveToUploadHistory,
				getUploadHistory,
			} = require('../../utils/storageUtils')

			const mockFile = {
				id: 'test-id',
				name: 'test.jpg',
				size: 1024,
				mimeType: 'image/jpeg',
				uri: 'blob:test',
				uploadedChunks: 1,
				totalChunks: 1,
				status: 'completed' as const,
			}

			saveToUploadHistory(mockFile)
			await getUploadHistory()

			expect(global.localStorage.getItem).not.toHaveBeenCalled()
			expect(global.localStorage.setItem).not.toHaveBeenCalled()

			global.window = originalWindow
		})
	})
})
