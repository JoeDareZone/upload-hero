import { MAX_FILE_SIZE_BYTES } from '../../utils/constants'
import { validateFiles } from '../../utils/fileUtils'

jest.mock('expo-video-thumbnails', () => ({
	getThumbnailAsync: jest
		.fn()
		.mockResolvedValue({ uri: 'file://thumbnail.jpg' }),
}))

describe('fileUtils', () => {
	describe('validateFiles', () => {
		test('validates image files correctly', async () => {
			const mockFiles = [
				{
					uri: 'file://image.jpg',
					name: 'image.jpg',
					mimeType: 'image/jpeg',
					size: 1024,
				},
			]

			const result = await validateFiles(mockFiles as any)

			expect(result).toHaveProperty('errors')
			expect(result).toHaveProperty('validFiles')
			expect(Array.isArray(result.errors)).toBe(true)
			expect(Array.isArray(result.validFiles)).toBe(true)
			expect(result.errors.length).toBe(0)
			expect(result.validFiles.length).toBe(1)
		})

		test('validates video files correctly', async () => {
			const mockFiles = [
				{
					uri: 'file://video.mp4',
					name: 'video.mp4',
					mimeType: 'video/mp4',
					size: 1024,
				},
			]

			const result = await validateFiles(mockFiles as any)

			expect(result.errors.length).toBe(0)
			expect(result.validFiles.length).toBe(1)
			expect(result.validFiles[0].uri).toBe('file://thumbnail.jpg')
		})

		test('rejects non-image/video files', async () => {
			const mockFiles = [
				{
					uri: 'file://document.pdf',
					name: 'document.pdf',
					mimeType: 'application/pdf',
					size: 1024,
				},
			]

			const result = await validateFiles(mockFiles as any)

			expect(result.errors.length).toBe(1)
			expect(result.validFiles.length).toBe(0)
		})

		test('rejects files that exceed size limit', async () => {
			const mockFiles = [
				{
					uri: 'file://large-image.jpg',
					name: 'large-image.jpg',
					mimeType: 'image/jpeg',
					size: MAX_FILE_SIZE_BYTES + 1,
				},
			]

			const result = await validateFiles(mockFiles as any)

			expect(result.errors.length).toBe(1)
			expect(result.validFiles.length).toBe(0)
		})
	})
})
