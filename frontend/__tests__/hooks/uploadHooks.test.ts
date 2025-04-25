import {
	calculateUploadStats,
	createUploadFile,
	useFileSelection,
} from '@/hooks/uploadHooks'
import { MAX_FILES } from '@/utils/constants'
import {
	pickDocuments,
	pickImageFromCamera,
	validateFiles,
} from '@/utils/fileUtils'
import { act, renderHook } from '@testing-library/react'

jest.mock('@/utils/constants', () => ({
	CHUNK_SIZE: 1024 * 1024, // 1MB
	MAX_FILES: 5,
}))

jest.mock('@/utils/helpers', () => ({
	generateFileId: jest.fn().mockReturnValue('test-file-id'),
}))

jest.mock('@/utils/fileUtils', () => ({
	pickDocuments: jest.fn(),
	pickImageFromCamera: jest.fn(),
	validateFiles: jest.fn(),
}))

describe('createUploadFile', () => {
	test('creates new upload file with generated ID', () => {
		const mockFile = {
			name: 'test.jpg',
			size: 2 * 1024 * 1024, // 2MB
			type: 'image/jpeg',
			uri: 'file://test.jpg',
		}

		const result = createUploadFile(mockFile)

		expect(result).toEqual({
			...mockFile,
			id: 'test-file-id',
			status: 'queued',
			totalChunks: 2, // 2MB / 1MB
			uploadedChunks: 0,
		})
	})

	test('preserves existing upload metadata if available', () => {
		const mockFile = {
			name: 'test.jpg',
			size: 2 * 1024 * 1024,
			type: 'image/jpeg',
			uri: 'file://test.jpg',
			id: 'existing-id',
			uploadedChunks: 1,
			status: 'paused',
		}

		const result = createUploadFile(mockFile)

		expect(result).toEqual({
			...mockFile,
			totalChunks: 2,
		})
	})

	test('calculates total chunks correctly for partial chunks', () => {
		const mockFile = {
			name: 'test.jpg',
			size: 1.5 * 1024 * 1024, // 1.5MB
			type: 'image/jpeg',
			uri: 'file://test.jpg',
		}

		const result = createUploadFile(mockFile)

		expect(result.totalChunks).toBe(2) // Ceiling of 1.5
	})
})

describe('useFileSelection', () => {
	const mockEnqueueFile = jest.fn()

	beforeEach(() => {
		jest.clearAllMocks()
	})

	test('initial state has no errors and is not loading', () => {
		const { result } = renderHook(() =>
			useFileSelection(mockEnqueueFile, false)
		)

		expect(result.current.errors).toEqual([])
		expect(result.current.isLoading).toBe(false)
	})

	test('clearErrors clears the error array', () => {
		const { result } = renderHook(() =>
			useFileSelection(mockEnqueueFile, false)
		)

		act(() => {
			;(pickDocuments as jest.Mock).mockRejectedValueOnce(
				new Error('Test error')
			)
			result.current.handlePickDocuments()
		})

		act(() => {
			result.current.clearErrors()
		})

		expect(result.current.errors).toEqual([])
	})

	test('handlePickDocuments calls pickDocuments and enqueues valid files', async () => {
		const mockAssets = [
			{
				name: 'file1.jpg',
				size: 1000,
				type: 'image/jpeg',
				uri: 'file://file1.jpg',
			},
			{
				name: 'file2.jpg',
				size: 2000,
				type: 'image/jpeg',
				uri: 'file://file2.jpg',
			},
		]

		;(pickDocuments as jest.Mock).mockResolvedValueOnce({
			canceled: false,
			assets: mockAssets,
		})
		;(validateFiles as jest.Mock).mockResolvedValueOnce({
			errors: [],
			validFiles: mockAssets,
		})

		const { result } = renderHook(() =>
			useFileSelection(mockEnqueueFile, false)
		)

		await act(async () => {
			await result.current.handlePickDocuments()
		})

		expect(pickDocuments).toHaveBeenCalled()
		expect(validateFiles).toHaveBeenCalledWith(mockAssets)
		expect(mockEnqueueFile).toHaveBeenCalledTimes(2)
		expect(result.current.isLoading).toBe(false)
	})

	test('handlePickDocuments does nothing if already uploading', async () => {
		const { result } = renderHook(() =>
			useFileSelection(mockEnqueueFile, true)
		)

		await act(async () => {
			await result.current.handlePickDocuments()
		})

		expect(pickDocuments).not.toHaveBeenCalled()
	})

	test('handlePickDocuments handles canceled selection', async () => {
		;(pickDocuments as jest.Mock).mockResolvedValueOnce({
			canceled: true,
			assets: [],
		})

		const { result } = renderHook(() =>
			useFileSelection(mockEnqueueFile, false)
		)

		await act(async () => {
			await result.current.handlePickDocuments()
		})

		expect(validateFiles).not.toHaveBeenCalled()
		expect(mockEnqueueFile).not.toHaveBeenCalled()
	})

	test('handlePickDocuments handles too many files error', async () => {
		const tooManyFiles = Array(MAX_FILES + 1)
			.fill(null)
			.map((_, index) => ({
				name: `file${index}.jpg`,
				size: 1000,
				type: 'image/jpeg',
				uri: `file://file${index}.jpg`,
			}))

		;(pickDocuments as jest.Mock).mockResolvedValueOnce({
			canceled: false,
			assets: tooManyFiles,
		})

		const { result } = renderHook(() =>
			useFileSelection(mockEnqueueFile, false)
		)

		await act(async () => {
			await result.current.handlePickDocuments()
		})

		expect(result.current.errors).toEqual([
			`You can upload a maximum of ${MAX_FILES} files.`,
		])
		expect(validateFiles).not.toHaveBeenCalled()
	})

	test('handlePickDocuments handles validation errors', async () => {
		const mockAssets = [
			{
				name: 'file1.jpg',
				size: 1000,
				type: 'image/jpeg',
				uri: 'file://file1.jpg',
			},
		]

		const mockErrors = ['File too large']

		;(pickDocuments as jest.Mock).mockResolvedValueOnce({
			canceled: false,
			assets: mockAssets,
		})
		;(validateFiles as jest.Mock).mockResolvedValueOnce({
			errors: mockErrors,
			validFiles: [],
		})

		const { result } = renderHook(() =>
			useFileSelection(mockEnqueueFile, false)
		)

		await act(async () => {
			await result.current.handlePickDocuments()
		})

		expect(result.current.errors).toEqual(mockErrors)
	})

	test('handleTakePhoto calls pickImageFromCamera and enqueues the file', async () => {
		const mockFile = {
			name: 'photo.jpg',
			size: 1000,
			type: 'image/jpeg',
			uri: 'file://photo.jpg',
		}

		;(pickImageFromCamera as jest.Mock).mockResolvedValueOnce(mockFile)

		const { result } = renderHook(() =>
			useFileSelection(mockEnqueueFile, false)
		)

		await act(async () => {
			await result.current.handleTakePhoto()
		})

		expect(pickImageFromCamera).toHaveBeenCalled()
		expect(mockEnqueueFile).toHaveBeenCalledTimes(1)
		expect(result.current.isLoading).toBe(false)
	})

	test('handleTakePhoto handles errors', async () => {
		const errorMessage = 'Camera permission denied'

		;(pickImageFromCamera as jest.Mock).mockRejectedValueOnce(
			new Error(errorMessage)
		)

		const { result } = renderHook(() =>
			useFileSelection(mockEnqueueFile, false)
		)

		await act(async () => {
			await result.current.handleTakePhoto()
		})

		expect(result.current.errors).toEqual([errorMessage])
		expect(mockEnqueueFile).not.toHaveBeenCalled()
	})

	test('handlePickDocuments handles unexpected errors', async () => {
		const errorMessage = 'Something went wrong'
		;(pickDocuments as jest.Mock).mockRejectedValueOnce(
			new Error(errorMessage)
		)

		const { result } = renderHook(() =>
			useFileSelection(mockEnqueueFile, false)
		)

		await act(async () => {
			await result.current.handlePickDocuments()
		})

		expect(result.current.errors).toEqual([
			'Something went wrong while picking files.',
		])
		expect(mockEnqueueFile).not.toHaveBeenCalled()
		expect(result.current.isLoading).toBe(false)
	})
})

describe('calculateUploadStats', () => {
	test('calculates stats for empty files array', () => {
		const result = calculateUploadStats([])

		expect(result).toEqual({
			hasQueuedFiles: false,
			hasErrorFiles: false,
			totalUploadedChunks: 0,
			totalChunks: 0,
			overallUploadProgress: 0,
			isAllFilesUploaded: false,
		})
	})

	test('calculates stats for files with mixed statuses', () => {
		const files = [
			{ id: '1', status: 'queued', uploadedChunks: 0, totalChunks: 2 },
			{ id: '2', status: 'uploading', uploadedChunks: 1, totalChunks: 2 },
			{ id: '3', status: 'completed', uploadedChunks: 3, totalChunks: 3 },
			{ id: '4', status: 'error', uploadedChunks: 0, totalChunks: 1 },
		] as any[]

		const result = calculateUploadStats(files)

		expect(result).toEqual({
			hasQueuedFiles: true,
			hasErrorFiles: true,
			totalUploadedChunks: 4,
			totalChunks: 8,
			overallUploadProgress: 0.5, // 4/8
			isAllFilesUploaded: false,
		})
	})

	test('identifies when all files are uploaded', () => {
		const files = [
			{ id: '1', status: 'completed', uploadedChunks: 2, totalChunks: 2 },
			{ id: '2', status: 'completed', uploadedChunks: 3, totalChunks: 3 },
		] as any[]

		const result = calculateUploadStats(files)

		expect(result.overallUploadProgress).toBe(1)
		expect(result.isAllFilesUploaded).toBe(true)
	})
})
