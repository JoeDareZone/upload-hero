import { FileType } from '@/types/fileType'
import { MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB } from '@/utils/constants'
import * as DocumentPicker from 'expo-document-picker'
import * as ImagePicker from 'expo-image-picker'
import * as VideoThumbnails from 'expo-video-thumbnails'

export const pickDocuments = async () => {
	const result = await DocumentPicker.getDocumentAsync({
		type: ['image/*', 'video/*'],
		copyToCacheDirectory: true,
		multiple: true,
	})
	return result
}

export const pickImageFromCamera = async () => {
	const status = await ImagePicker.getCameraPermissionsAsync()

	if (status.status === ImagePicker.PermissionStatus.UNDETERMINED) {
		const permission = await ImagePicker.requestCameraPermissionsAsync()
		if (permission.status === ImagePicker.PermissionStatus.DENIED) {
			throw new Error('Permission to access the camera was denied.')
		}
	}

	const result = await ImagePicker.launchCameraAsync()

	if (result.canceled) return null

	const file = result.assets[0]

	return {
		uri: file.uri,
		name: file.fileName ?? 'Camera Image',
		mimeType: file.mimeType ?? 'image/jpeg',
		size: file.fileSize ?? 0,
		status: 'pending',
	}
}

export const validateFiles = async (
	files: DocumentPicker.DocumentPickerAsset[]
) => {
	const errors: string[] = []
	const validFiles: (FileType & {
		mimeType?: string
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

		if (file.size && file.size > MAX_FILE_SIZE_BYTES) {
			errors.push(
				`${file.name} exceeds the ${MAX_FILE_SIZE_MB}MB size limit.`
			)
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

		validFiles.push({
			uri: thumbnailUri ?? file.uri,
			name: file.name,
			mimeType: file.mimeType,
			size: file.size || 0,
			status: 'queued',
		})
	}

	return { errors, validFiles }
}
