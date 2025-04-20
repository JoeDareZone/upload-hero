import { UploadFile } from '@/types/fileType'
import { Platform } from 'react-native'

// Import platform-specific implementations
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

// Export a real component that selects the right implementation
export default function FilePicker(props: FilePickerProps) {
	return Platform.OS === 'web' ? (
		<WebPicker {...props} />
	) : (
		<NativePicker {...props} />
	)
}
