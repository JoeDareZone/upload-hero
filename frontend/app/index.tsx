import { ActionButton } from '@/components/ui/ActionButton'
import { ErrorDisplay } from '@/components/ui/ErrorDisplay'
import FilePicker from '@/components/upload/FilePicker'
import { FilesList } from '@/components/upload/FilesList'
import { useUploadActionSheet } from '@/components/upload/UploadActionSheet'
import UploadHistory from '@/components/upload/UploadHistory'
import { OverallProgress } from '@/components/upload/UploadProgress'
import { calculateUploadStats, useFileSelection } from '@/hooks/uploadHooks'
import { useUploadManager } from '@/hooks/useUploadManager'
import { UploadFile } from '@/types/fileType'
import React, { useState } from 'react'
import {
	Platform,
	SafeAreaView,
	Text,
	TouchableOpacity,
	View,
} from 'react-native'
import '../web-styles.css'

export default function HomeScreen() {
	const {
		enqueueFile,
		files,
		processQueue,
		pauseUpload,
		resumeUpload,
		cancelUpload,
		isUploading,
		clearAllFiles,
	} = useUploadManager()

	const {
		errors,
		isLoading,
		handlePickDocuments,
		handleTakePhoto,
		clearErrors,
	} = useFileSelection(enqueueFile, isUploading)

	const { showActionSheet, ActionSheetComponent } = useUploadActionSheet({
		onPickDocuments: handlePickDocuments,
		onTakePhoto: handleTakePhoto,
	})

	const {
		hasQueuedFiles,
		hasErrorFiles,
		totalChunks,
		overallUploadProgress,
		isAllFilesUploaded,
	} = calculateUploadStats(files)

	const [dragDropErrors, setDragDropErrors] = useState<string[]>([])
	const [isHistoryVisible, setIsHistoryVisible] = useState(false)

	const allErrors = [...errors, ...dragDropErrors]
	const isWeb = Platform.OS === 'web'

	const handleFilesSelected = (selectedFiles: UploadFile[]) => {
		clearErrors()
		setDragDropErrors([])
		selectedFiles.forEach(file => enqueueFile(file))
	}

	const onPickerError = (errorMsg: string) =>
		setDragDropErrors(prev => [...prev, errorMsg])

	return (
		<SafeAreaView className='flex-1 bg-gray-900'>
			<View className={`flex-1 p-4 ${isWeb && 'web-container'}`}>
				<View className='flex-row justify-between items-center mb-4 mt-4'>
					<Text className='text-white text-xl font-bold'>
						Upload Hero
					</Text>
					{isWeb && (
						<TouchableOpacity
							onPress={() => setIsHistoryVisible(true)}
							className='px-3 py-1.5 bg-blue-600 rounded-lg hover-highlight web-clickable'
						>
							<Text className='text-white font-medium'>
								History
							</Text>
						</TouchableOpacity>
					)}
				</View>

				<FilePicker
					onFilesSelected={handleFilesSelected}
					isUploading={isUploading}
					isLoading={isLoading}
					isAllFilesUploaded={isAllFilesUploaded}
					onError={onPickerError}
					onPressNative={showActionSheet}
				/>

				<ActionSheetComponent />

				<ErrorDisplay errors={allErrors} />

				<OverallProgress
					totalChunks={totalChunks}
					overallUploadProgress={overallUploadProgress}
					isAllFilesUploaded={isAllFilesUploaded}
					hasErrorFiles={hasErrorFiles}
				/>

				<View className='flex-1'>
					{files.length > 0 && (
						<View className='flex-row justify-end mb-2'>
							<TouchableOpacity
								onPress={clearAllFiles}
								className={`bg-red-600 px-3 py-1.5 rounded-lg ${
									isWeb ? 'hover-highlight web-clickable' : ''
								}`}
								disabled={isUploading}
								style={{
									opacity: isUploading ? 0.5 : 1,
								}}
							>
								<Text className='text-white font-medium'>
									Clear All
								</Text>
							</TouchableOpacity>
						</View>
					)}

					<FilesList
						files={files}
						pauseUpload={pauseUpload}
						resumeUpload={resumeUpload}
						cancelUpload={cancelUpload}
					/>
				</View>

				<ActionButton
					onPress={isAllFilesUploaded ? clearAllFiles : processQueue}
					disabled={
						(!hasQueuedFiles || isUploading) && !isAllFilesUploaded
					}
					isLoading={isLoading}
					isUploading={isUploading}
					isAllFilesUploaded={isAllFilesUploaded}
				/>
			</View>

			<UploadHistory
				isVisible={isHistoryVisible}
				onClose={() => setIsHistoryVisible(false)}
			/>
		</SafeAreaView>
	)
}
