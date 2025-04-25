import { UploadFile } from '@/types/fileType'
import { IS_WEB } from '@/utils/constants'
import React from 'react'
import NativeFilesList from './FilesList.native'
import WebFilesList from './FilesList.web'

export interface FilesListProps {
	files: UploadFile[]
	pauseUpload: (fileId: string) => void
	resumeUpload: (fileId: string) => void
	cancelUpload: (fileId: string) => void
}

export default function FilesList(props: FilesListProps) {
	return IS_WEB ? <WebFilesList {...props} /> : <NativeFilesList {...props} />
}
