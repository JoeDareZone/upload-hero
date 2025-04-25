import {
	pickDocuments,
	pickImageFromCamera,
	validateFiles,
} from '@/utils/fileUtils'
import * as DocumentPicker from 'expo-document-picker'
import * as ImagePicker from 'expo-image-picker'
import * as VideoThumbnails from 'expo-video-thumbnails'

jest.mock('@/utils/constants', () => ({
	MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024, // 10MB
	MAX_FILE_SIZE_MB: 10,
}))

jest.mock('expo-document-picker', () => ({
	getDocumentAsync: jest.fn(),
}))

jest.mock('expo-image-picker', () => ({
	launchCameraAsync: jest.fn(),
	getCameraPermissionsAsync: jest.fn(),
	requestCameraPermissionsAsync: jest.fn(),
	PermissionStatus: {
		GRANTED: 'granted',
		DENIED: 'denied',
		UNDETERMINED: 'undetermined',
	},
}))

jest.mock('expo-video-thumbnails', () => ({
	getThumbnailAsync: jest.fn(),
}))

describe('fileUtils', () => {
	describe('validateFiles', () => {
		beforeEach(() => {
			jest.clearAllMocks()
		})

		test('validates image files correctly', async () => {
			const mockFiles = [
				{
					uri: 'file://valid-image.jpg',
					name: 'valid-image.jpg',
					mimeType: 'image/jpeg',
					size: 5 * 1024 * 1024, // 5MB
				},
			] as DocumentPicker.DocumentPickerAsset[]

			const result = await validateFiles(mockFiles)

			expect(result.errors).toEqual([])
			expect(result.validFiles).toEqual([
				{
					uri: 'file://valid-image.jpg',
					name: 'valid-image.jpg',
					mimeType: 'image/jpeg',
					size: 5 * 1024 * 1024,
					status: 'queued',
				},
			])
		})

		test('validates video files and generates thumbnails', async () => {
			const mockVideoFile = {
				uri: 'file://valid-video.mp4',
				name: 'valid-video.mp4',
				mimeType: 'video/mp4',
				size: 5 * 1024 * 1024, // 5MB
			} as DocumentPicker.DocumentPickerAsset

			const mockThumbnailUri = 'file://thumbnail.jpg'

			;(VideoThumbnails.getThumbnailAsync as jest.Mock).mockResolvedValue(
				{
					uri: mockThumbnailUri,
				}
			)

			const result = await validateFiles([mockVideoFile])

			expect(VideoThumbnails.getThumbnailAsync).toHaveBeenCalledWith(
				mockVideoFile.uri,
				{ time: 1000 }
			)

			expect(result.errors).toEqual([])
			expect(result.validFiles).toEqual([
				{
					uri: mockThumbnailUri,
					name: 'valid-video.mp4',
					mimeType: 'video/mp4',
					size: 5 * 1024 * 1024,
					status: 'queued',
				},
			])
		})

		test('handles thumbnail generation failure', async () => {
			const mockVideoFile = {
				uri: 'file://valid-video.mp4',
				name: 'valid-video.mp4',
				mimeType: 'video/mp4',
				size: 5 * 1024 * 1024, // 5MB
			} as DocumentPicker.DocumentPickerAsset

			const mockError = new Error('Thumbnail generation failed')

			const originalWarn = console.warn
			console.warn = jest.fn()
			;(VideoThumbnails.getThumbnailAsync as jest.Mock).mockRejectedValue(
				mockError
			)

			const result = await validateFiles([mockVideoFile])

			expect(console.warn).toHaveBeenCalledWith(
				'Thumbnail generation failed',
				mockError
			)

			expect(result.errors).toEqual([])
			expect(result.validFiles).toEqual([
				{
					uri: mockVideoFile.uri,
					name: 'valid-video.mp4',
					mimeType: 'video/mp4',
					size: 5 * 1024 * 1024,
					status: 'queued',
				},
			])

			console.warn = originalWarn
		})

		test('rejects files with invalid mime types', async () => {
			const mockFiles = [
				{
					uri: 'file://document.pdf',
					name: 'document.pdf',
					mimeType: 'application/pdf',
					size: 1000,
				},
			] as DocumentPicker.DocumentPickerAsset[]

			const result = await validateFiles(mockFiles)

			expect(result.errors).toEqual([
				'document.pdf is not an image or video.',
			])
			expect(result.validFiles).toEqual([])
		})

		test('rejects files exceeding size limit', async () => {
			const mockFiles = [
				{
					uri: 'file://large-image.jpg',
					name: 'large-image.jpg',
					mimeType: 'image/jpeg',
					size: 20 * 1024 * 1024,
				},
			] as DocumentPicker.DocumentPickerAsset[]

			const result = await validateFiles(mockFiles)

			expect(result.errors).toEqual([
				'large-image.jpg exceeds the 10MB size limit.',
			])
			expect(result.validFiles).toEqual([])
		})

		test('handles multiple files with mixed validity', async () => {
			const mockFiles = [
				{
					uri: 'file://valid-image.jpg',
					name: 'valid-image.jpg',
					mimeType: 'image/jpeg',
					size: 5 * 1024 * 1024, // 5MB
				},
				{
					uri: 'file://large-image.jpg',
					name: 'large-image.jpg',
					mimeType: 'image/jpeg',
					size: 20 * 1024 * 1024,
				},
				{
					uri: 'file://document.pdf',
					name: 'document.pdf',
					mimeType: 'application/pdf',
					size: 1000,
				},
			] as DocumentPicker.DocumentPickerAsset[]

			const result = await validateFiles(mockFiles)

			expect(result.errors).toContain(
				'document.pdf is not an image or video.'
			)
			expect(result.errors).toContain(
				'large-image.jpg exceeds the 10MB size limit.'
			)
			expect(result.errors.length).toBe(2)

			expect(result.validFiles).toEqual([
				{
					uri: 'file://valid-image.jpg',
					name: 'valid-image.jpg',
					mimeType: 'image/jpeg',
					size: 5 * 1024 * 1024,
					status: 'queued',
				},
			])
		})
	})

	describe('pickDocuments', () => {
		beforeEach(() => {
			jest.clearAllMocks()
		})

		test('returns document picker result', async () => {
			const mockResult = {
				assets: [
					{
						uri: 'file://image.jpg',
						name: 'image.jpg',
						size: 1000,
						mimeType: 'image/jpeg',
					},
				],
				canceled: false,
			}

			;(DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue(
				mockResult
			)

			const result = await pickDocuments()

			expect(DocumentPicker.getDocumentAsync).toHaveBeenCalledWith({
				type: ['image/*', 'video/*'],
				copyToCacheDirectory: true,
				multiple: true,
			})

			expect(result).toEqual(mockResult)
		})
	})

	describe('pickImageFromCamera', () => {
		beforeEach(() => {
			jest.clearAllMocks()
		})

		test('returns null when camera picking is canceled', async () => {
			;(
				ImagePicker.getCameraPermissionsAsync as jest.Mock
			).mockResolvedValue({
				status: 'granted',
				granted: true,
			})
			;(ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValue({
				canceled: true,
				assets: [],
			})

			const result = await pickImageFromCamera()

			expect(result).toBeNull()
		})

		test('returns file when camera picking is successful', async () => {
			;(
				ImagePicker.getCameraPermissionsAsync as jest.Mock
			).mockResolvedValue({
				status: 'granted',
				granted: true,
			})

			const mockAsset = {
				uri: 'file://camera.jpg',
				fileName: 'camera.jpg',
				mimeType: 'image/jpeg',
				fileSize: 1000,
			}

			;(ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValue({
				canceled: false,
				assets: [mockAsset],
			})

			const result = await pickImageFromCamera()

			expect(result).toEqual({
				uri: mockAsset.uri,
				name: mockAsset.fileName,
				mimeType: mockAsset.mimeType,
				size: mockAsset.fileSize,
				status: 'pending',
			})
		})

		test('handles missing fileName, mimeType, or fileSize', async () => {
			;(
				ImagePicker.getCameraPermissionsAsync as jest.Mock
			).mockResolvedValue({
				status: 'granted',
				granted: true,
			})

			const mockAsset = {
				uri: 'file://camera.jpg',
			}

			;(ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValue({
				canceled: false,
				assets: [mockAsset],
			})

			const result = await pickImageFromCamera()

			expect(result).toEqual({
				uri: mockAsset.uri,
				name: 'Camera Image',
				mimeType: 'image/jpeg',
				size: 0,
				status: 'pending',
			})
		})

		test('requests camera permission if undetermined', async () => {
			;(
				ImagePicker.getCameraPermissionsAsync as jest.Mock
			).mockResolvedValue({
				status: 'undetermined',
				granted: false,
			})
			;(
				ImagePicker.requestCameraPermissionsAsync as jest.Mock
			).mockResolvedValue({
				status: 'granted',
				granted: true,
			})
			;(ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValue({
				canceled: true,
				assets: [],
			})

			await pickImageFromCamera()

			expect(ImagePicker.requestCameraPermissionsAsync).toHaveBeenCalled()
		})

		test('throws error when camera permission is denied', async () => {
			;(
				ImagePicker.getCameraPermissionsAsync as jest.Mock
			).mockResolvedValue({
				status: 'undetermined',
				granted: false,
			})
			;(
				ImagePicker.requestCameraPermissionsAsync as jest.Mock
			).mockResolvedValue({
				status: 'denied',
				granted: false,
			})

			await expect(pickImageFromCamera()).rejects.toThrow(
				'Permission to access the camera was denied.'
			)
		})
	})
})
