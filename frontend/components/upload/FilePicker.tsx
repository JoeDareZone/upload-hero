import { UploadFile } from '@/types/fileType'
import { Platform } from 'react-native'

import NativePicker from './FilePicker.native'
import WebPicker from './FilePicker.web'

export interface FilePickerProps {
	onFilesSelected: (files: UploadFile[]) => void
	isUploading: boolean
	isLoading: boolean
	isAllFilesUploaded: boolean
	onError: (error: string) => void
	onPressNative?: () => void
}

export default function FilePicker(props: FilePickerProps) {
	return Platform.OS === 'web' ? (
		<WebPicker {...props} />
	) : (
		<NativePicker {...props} />
	)
}
