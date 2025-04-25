import { UploadFile } from '@/types/fileType'

import { IS_WEB } from '@/utils/constants'
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
	return IS_WEB ? <WebPicker {...props} /> : <NativePicker {...props} />
}
