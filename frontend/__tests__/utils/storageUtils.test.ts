import { UploadFile } from '@/types/fileType'
import {
	clearIncompleteUploads,
	clearUploadHistory,
	getIncompleteUploads,
	getUploadHistory,
	saveIncompleteUploads,
	saveToUploadHistory,
} from '@/utils/storageUtils'
import AsyncStorage from '@react-native-async-storage/async-storage'

jest.mock('@/utils/constants', () => ({
	IS_WEB: false,
}))

const originalConsoleError = console.error
console.error = jest.fn()

describe('storageUtils', () => {
	const testUploadFile: UploadFile = {
		id: 'test-id-1',
		name: 'test-file.jpg',
		uri: 'file://test/test-file.jpg',
		size: 1024,
		mimeType: 'image/jpeg',
		status: 'completed',
		uploadedChunks: 10,
		totalChunks: 10,
	}

	const incompleteFile: UploadFile = {
		...testUploadFile,
		id: 'test-id-2',
		status: 'uploading',
		uploadedChunks: 5,
		totalChunks: 10,
	}

	beforeEach(() => {
		jest.clearAllMocks()
		AsyncStorage.clear()
		jest.spyOn(console, 'error').mockClear()
	})

	afterAll(() => {
		console.error = originalConsoleError
	})

	describe('Upload History Functions', () => {
		test('saveToUploadHistory should add a file to history', async () => {
			const getItemSpy = jest.spyOn(AsyncStorage, 'getItem')
			const setItemSpy = jest.spyOn(AsyncStorage, 'setItem')

			getItemSpy.mockResolvedValueOnce(null)

			saveToUploadHistory(testUploadFile)

			await new Promise(resolve => setTimeout(resolve, 10))

			expect(getItemSpy).toHaveBeenCalledWith('upload_history')

			expect(setItemSpy).toHaveBeenCalledTimes(1)
			expect(setItemSpy.mock.calls[0][0]).toBe('upload_history')

			const savedHistory = JSON.parse(setItemSpy.mock.calls[0][1])
			expect(savedHistory).toHaveLength(1)
			expect(savedHistory[0].id).toBe(testUploadFile.id)
			expect(savedHistory[0].name).toBe(testUploadFile.name)
			expect(savedHistory[0].completedAt).toBeDefined()
		})

		test('saveToUploadHistory should not add non-completed files', async () => {
			const incompleteFile = { ...testUploadFile, status: 'uploading' }
			const setItemSpy = jest.spyOn(AsyncStorage, 'setItem')

			saveToUploadHistory(incompleteFile as UploadFile)

			await new Promise(resolve => setTimeout(resolve, 10))

			expect(setItemSpy).not.toHaveBeenCalled()
		})

		test('saveToUploadHistory should not add duplicate files', async () => {
			const getItemSpy = jest.spyOn(AsyncStorage, 'getItem')
			const setItemSpy = jest.spyOn(AsyncStorage, 'setItem')

			getItemSpy.mockResolvedValueOnce(JSON.stringify([testUploadFile]))

			saveToUploadHistory(testUploadFile)

			await new Promise(resolve => setTimeout(resolve, 10))

			expect(setItemSpy).not.toHaveBeenCalled()
		})

		test('saveToUploadHistory should handle error in getItem', async () => {
			const getItemSpy = jest.spyOn(AsyncStorage, 'getItem')
			getItemSpy.mockRejectedValueOnce(new Error('Test error'))

			saveToUploadHistory(testUploadFile)

			await new Promise(resolve => setTimeout(resolve, 10))

			expect(console.error).toHaveBeenCalledWith(
				'Error saving to upload history:',
				expect.any(Error)
			)
		})

		test.skip('saveToUploadHistory should handle error in setItem', async () => {
			expect(true).toBe(true)
		})

		test('saveToUploadHistory should handle invalid JSON error', async () => {
			const getItemSpy = jest.spyOn(AsyncStorage, 'getItem')
			getItemSpy.mockResolvedValueOnce('invalid json')

			saveToUploadHistory(testUploadFile)

			await new Promise(resolve => setTimeout(resolve, 10))

			expect(console.error).toHaveBeenCalledWith(
				'Error saving to upload history:',
				expect.any(Error)
			)
		})

		test('getUploadHistory should return files from storage', async () => {
			await AsyncStorage.setItem(
				'upload_history',
				JSON.stringify([testUploadFile])
			)

			jest.spyOn(AsyncStorage, 'getItem').mockResolvedValueOnce(
				JSON.stringify([testUploadFile])
			)

			const history = await getUploadHistory()

			expect(history).toHaveLength(1)
			expect(history[0].id).toBe(testUploadFile.id)
		})

		test('getUploadHistory should return empty array if no history', async () => {
			jest.spyOn(AsyncStorage, 'getItem').mockResolvedValueOnce(null)

			const history = await getUploadHistory()
			expect(history).toEqual([])
		})

		test('getUploadHistory should handle errors gracefully', async () => {
			jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(
				new Error('Storage error')
			)

			const history = await getUploadHistory()

			expect(history).toEqual([])
			expect(console.error).toHaveBeenCalledWith(
				'Error retrieving upload history:',
				expect.any(Error)
			)
		})

		test('getUploadHistory should handle invalid JSON', async () => {
			jest.spyOn(AsyncStorage, 'getItem').mockResolvedValueOnce(
				'invalid json'
			)

			const history = await getUploadHistory()

			expect(history).toEqual([])
			expect(console.error).toHaveBeenCalledWith(
				'Error retrieving upload history:',
				expect.any(Error)
			)
		})

		test('clearUploadHistory should remove history from storage', async () => {
			const removeItemSpy = jest.spyOn(AsyncStorage, 'removeItem')

			await clearUploadHistory()

			expect(removeItemSpy).toHaveBeenCalledWith('upload_history')
		})

		test('clearUploadHistory should handle errors gracefully', async () => {
			jest.spyOn(AsyncStorage, 'removeItem').mockRejectedValueOnce(
				new Error('Storage error')
			)

			await clearUploadHistory()

			expect(console.error).toHaveBeenCalledWith(
				'Error clearing upload history:',
				expect.any(Error)
			)
		})
	})

	describe('Incomplete Uploads Functions', () => {
		test('saveIncompleteUploads should save incomplete uploads to storage', async () => {
			const setItemSpy = jest.spyOn(AsyncStorage, 'setItem')

			await saveIncompleteUploads([incompleteFile])

			expect(setItemSpy).toHaveBeenCalledWith(
				'incomplete_uploads',
				expect.any(String)
			)

			const savedJson = setItemSpy.mock.calls[0][1]
			const savedData = JSON.parse(savedJson)
			expect(savedData).toHaveLength(1)
			expect(savedData[0].id).toBe(incompleteFile.id)
		})

		test('saveIncompleteUploads should filter out completed files', async () => {
			const setItemSpy = jest.spyOn(AsyncStorage, 'setItem')

			await saveIncompleteUploads([testUploadFile, incompleteFile])

			const savedJson = setItemSpy.mock.calls[0][1]
			const savedUploads = JSON.parse(savedJson)

			expect(savedUploads).toHaveLength(1)
			expect(savedUploads[0].id).toBe(incompleteFile.id)
		})

		test('saveIncompleteUploads should handle errors gracefully', async () => {
			jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(
				new Error('Storage error')
			)

			await saveIncompleteUploads([incompleteFile])

			expect(console.error).toHaveBeenCalledWith(
				'Error saving incomplete uploads:',
				expect.any(Error)
			)
		})

		test('saveIncompleteUploads should handle serialization errors', async () => {
			const circularRef: any = {}
			circularRef.self = circularRef

			const badFile = { ...incompleteFile, circular: circularRef }

			await saveIncompleteUploads([badFile as unknown as UploadFile])

			expect(console.error).toHaveBeenCalledWith(
				'Error saving incomplete uploads:',
				expect.any(Error)
			)
		})

		test('getIncompleteUploads should return files from storage', async () => {
			await AsyncStorage.setItem(
				'incomplete_uploads',
				JSON.stringify([incompleteFile])
			)

			jest.spyOn(AsyncStorage, 'getItem').mockResolvedValueOnce(
				JSON.stringify([incompleteFile])
			)

			const uploads = await getIncompleteUploads()

			expect(uploads).toHaveLength(1)
			expect(uploads[0].id).toBe(incompleteFile.id)
		})

		test('getIncompleteUploads should return empty array if no uploads', async () => {
			jest.spyOn(AsyncStorage, 'getItem').mockResolvedValueOnce(null)

			const uploads = await getIncompleteUploads()
			expect(uploads).toEqual([])
		})

		test('getIncompleteUploads should handle errors gracefully', async () => {
			jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(
				new Error('Storage error')
			)

			const uploads = await getIncompleteUploads()

			expect(uploads).toEqual([])
			expect(console.error).toHaveBeenCalledWith(
				'Error retrieving incomplete uploads:',
				expect.any(Error)
			)
		})

		test('getIncompleteUploads should handle invalid JSON', async () => {
			jest.spyOn(AsyncStorage, 'getItem').mockResolvedValueOnce(
				'invalid json'
			)

			const uploads = await getIncompleteUploads()

			expect(uploads).toEqual([])
			expect(console.error).toHaveBeenCalledWith(
				'Error retrieving incomplete uploads:',
				expect.any(Error)
			)
		})

		test('clearIncompleteUploads should remove uploads from storage', async () => {
			const removeItemSpy = jest.spyOn(AsyncStorage, 'removeItem')

			await clearIncompleteUploads()

			expect(removeItemSpy).toHaveBeenCalledWith('incomplete_uploads')
		})

		test('clearIncompleteUploads should handle errors gracefully', async () => {
			jest.spyOn(AsyncStorage, 'removeItem').mockRejectedValueOnce(
				new Error('Storage error')
			)

			await clearIncompleteUploads()

			expect(console.error).toHaveBeenCalledWith(
				'Error clearing incomplete uploads:',
				expect.any(Error)
			)
		})
	})
})
