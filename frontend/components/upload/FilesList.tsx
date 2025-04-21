import { UploadFile } from '@/types/fileType'
import React from 'react'
import { Platform } from 'react-native'
import { NativeFilesList } from './FilesList.native'
import { WebFilesList } from './FilesList.web'

export interface FilesListProps {
	files: UploadFile[]
	pauseUpload: (fileId: string) => void
	resumeUpload: (fileId: string) => void
	cancelUpload: (fileId: string) => void
}

export const FilesList = ({
	files,
	pauseUpload,
	resumeUpload,
	cancelUpload,
}: FilesListProps) => {
	const isWeb = Platform.OS === 'web'

	if (isWeb) {
		return (
			<WebFilesList
				files={files}
				pauseUpload={pauseUpload}
				resumeUpload={resumeUpload}
				cancelUpload={cancelUpload}
			/>
		)
	}

	return (
		<NativeFilesList
			files={files}
			pauseUpload={pauseUpload}
			resumeUpload={resumeUpload}
			cancelUpload={cancelUpload}
		/>
	)
}
