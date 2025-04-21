import { UploadFile } from '@/types/fileType'
import React from 'react'
import { Platform } from 'react-native'
import NativeFilesList from './FilesList.native'
import WebFilesList from './FilesList.web'

export interface FilesListProps {
	files: UploadFile[]
	pauseUpload: (fileId: string) => void
	resumeUpload: (fileId: string) => void
	cancelUpload: (fileId: string) => void
}

export default function FilesList(props: FilesListProps) {
	return Platform.OS === 'web' ? (
		<WebFilesList {...props} />
	) : (
		<NativeFilesList {...props} />
	)
}
