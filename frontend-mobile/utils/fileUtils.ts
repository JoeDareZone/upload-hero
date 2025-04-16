import * as DocumentPicker from 'expo-document-picker'
import * as VideoThumbnails from 'expo-video-thumbnails'
import { MAX_FILE_SIZE } from './Constants'

export const pickDocuments = async () => {
	const result = await DocumentPicker.getDocumentAsync({
		type: ['image/*', 'video/*'],
		copyToCacheDirectory: true,
		multiple: true,
	})
	return result
}

export const validateFiles = async (
	files: DocumentPicker.DocumentPickerAsset[]
) => {
	const errors: string[] = []
	const validFiles: (DocumentPicker.DocumentPickerAsset & {
		thumbnailUri?: string
	})[] = []

	for (const file of files) {
		if (
			!file.mimeType?.startsWith('image/') &&
			!file.mimeType?.startsWith('video/')
		) {
			errors.push(`${file.name} is not an image or video.`)
			continue
		}

		if (file.size && file.size > MAX_FILE_SIZE) {
			errors.push(`${file.name} exceeds the ${MAX_FILE_SIZE} size limit.`)
			continue
		}

		let thumbnailUri: string | undefined = undefined
		if (file.mimeType?.startsWith('video/')) {
			try {
				const { uri } = await VideoThumbnails.getThumbnailAsync(
					file.uri,
					{ time: 1000 }
				)
				thumbnailUri = uri
			} catch (e) {
				console.warn('Thumbnail generation failed', e)
			}
		}

		validFiles.push({ ...file, thumbnailUri })
	}

	return { errors, validFiles }
}
