import { useUploadManager } from '@/hooks/useUploadManager'
import * as uploadService from '@/services/uploadService'
import { UploadFile } from '@/types/fileType'
import * as chunkUtils from '@/utils/chunkUtils'
import * as storageUtils from '@/utils/storageUtils'
import { act, renderHook } from '@testing-library/react-hooks'

jest.mock('@/services/uploadService')
jest.mock('@/utils/storageUtils')
jest.mock('@/utils/chunkUtils')
jest.mock('@/utils/constants', () => ({
	CHUNK_SIZE: 1024 * 1024, // 1MB
	MAX_CONCURRENT_UPLOADS: 3,
	ARTIFICIAL_DELAY: 0,
	IS_WEB: true,
}))

describe('useUploadManager', () => {
	const mockFile = {
		name: 'test.jpg',
		type: 'image/jpeg',
		size: 1024 * 1024 * 2, // 2MB
	} as File

	const mockUploadFile: UploadFile = {
		id: 'test-id-1',
		name: 'test.jpg',
		size: 1024 * 1024 * 2,
		file: mockFile,
		mimeType: 'image/jpeg',
		uri: 'blob:test',
		uploadedChunks: 0,
		totalChunks: 2,
		status: 'queued'
	}

	beforeEach(() => {
		jest.clearAllMocks()

		;(uploadService.initiateUpload as jest.Mock).mockResolvedValue({
			uploadId: 'mock-upload-id',
			chunksReceived: 0,
		})
		;(uploadService.uploadChunk as jest.Mock).mockResolvedValue({})
		;(uploadService.finalizeUpload as jest.Mock).mockResolvedValue({})
		;(uploadService.checkUploadStatus as jest.Mock).mockResolvedValue({
			chunksReceived: 0,
			isCompleted: false,
		})
		;(storageUtils.getIncompleteUploads as jest.Mock).mockResolvedValue([])
		;(storageUtils.saveIncompleteUploads as jest.Mock).mockResolvedValue(
			undefined
		)
		;(storageUtils.saveToUploadHistory as jest.Mock).mockImplementation(
			() => {}
		)
		;(storageUtils.clearIncompleteUploads as jest.Mock).mockResolvedValue(
			undefined
		)
		;(chunkUtils.createChunks as jest.Mock).mockImplementation(() => [
			new Blob(['chunk1']),
			new Blob(['chunk2']),
		])
	})

	test('initial state should be empty', async () => {
		const { result } = renderHook(() => useUploadManager())

		expect(result.current.files).toEqual([])
		expect(result.current.isUploading).toBe(false)
	})

	test('should load incomplete uploads on initialization', async () => {
		const incompleteUploads = [
			{ ...mockUploadFile, id: 'incomplete-1', status: 'paused' },
			{ ...mockUploadFile, id: 'incomplete-2', status: 'error' },
		]

		;(storageUtils.getIncompleteUploads as jest.Mock).mockResolvedValue(
			incompleteUploads
		)

		const { result, waitForNextUpdate } = renderHook(() =>
			useUploadManager()
		)

		act(() => {
			result.current.loadIncompleteUploads(false)
		})

		await waitForNextUpdate()

		expect(result.current.files.length).toBe(2)
		expect(result.current.files[0].id).toBe('incomplete-1')
		expect(result.current.files[1].id).toBe('incomplete-2')
	})

	test('should enqueue a file correctly', async () => {
		const { result } = renderHook(() => useUploadManager())

		act(() => {
			result.current.enqueueFile(mockUploadFile)
		})

		expect(result.current.files.length).toBe(1)
		expect(result.current.files[0].id).toBe(mockUploadFile.id)
		expect(result.current.files[0].status).toBe('queued')
	})

	test('should start uploading when processQueue is called', async () => {
		const { result } = renderHook(() => useUploadManager())

		act(() => {
			result.current.enqueueFile(mockUploadFile)
		})

		act(() => {
			result.current.processQueue()
		})

		expect(result.current.isUploading).toBe(true)

		expect(uploadService.initiateUpload).toHaveBeenCalled()
	})

	test('should pause an upload', async () => {
		const { result } = renderHook(() => useUploadManager())

		act(() => {
			result.current.enqueueFile(mockUploadFile)
			result.current.processQueue()
		})

		act(() => {
			result.current.pauseUpload(mockUploadFile.id)
		})

		const pausedFile = result.current.files.find(
			f => f.id === mockUploadFile.id
		)
		expect(pausedFile?.status).toBe('paused')
	})

	test('should resume a paused upload', async () => {
		const pausedFile = {
			...mockUploadFile,
			status: 'paused',
			uploadedChunks: 1,
		}

		;(storageUtils.getIncompleteUploads as jest.Mock).mockResolvedValue([
			pausedFile,
		])

		const { result, waitForNextUpdate } = renderHook(() =>
			useUploadManager()
		)

		act(() => {
			result.current.loadIncompleteUploads(false)
		})

		await waitForNextUpdate()

		;(uploadService.checkUploadStatus as jest.Mock).mockResolvedValue({
			chunksReceived: 1,
			isCompleted: false,
			uploadId: 'mock-upload-id',
		})

		await act(async () => {
			result.current.resumeUpload(pausedFile.id)
			await new Promise(resolve => setTimeout(resolve, 0))
		})

		expect(uploadService.checkUploadStatus).toHaveBeenCalled()

		expect(
			result.current.files.find(f => f.id === pausedFile.id)
		).toBeDefined()
	})

	test('should cancel an upload', async () => {
		const { result } = renderHook(() => useUploadManager())

		act(() => {
			result.current.enqueueFile(mockUploadFile)
		})

		act(() => {
			result.current.cancelUpload(mockUploadFile.id)
		})

		expect(
			result.current.files.find(f => f.id === mockUploadFile.id)
		).toBeUndefined()
	})

	test('should clear all files', async () => {
		const { result } = renderHook(() => useUploadManager())

		act(() => {
			result.current.enqueueFile(mockUploadFile)
			result.current.enqueueFile({ ...mockUploadFile, id: 'test-id-2' })
		})

		await act(async () => {
			result.current.clearAllFiles()
			await new Promise(resolve => setTimeout(resolve, 0))
		})

		expect(result.current.files).toEqual([])

		expect(storageUtils.clearIncompleteUploads).toHaveBeenCalled()
	})
})
