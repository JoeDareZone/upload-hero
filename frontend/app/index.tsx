import { ActionButton } from '@/components/ui/ActionButton'
import { ClearAllButton } from '@/components/ui/ClearAllButton'
import { ErrorDisplay } from '@/components/ui/ErrorDisplay'
import { RedisTestPanel } from '@/components/ui/RedisTestPanel'
import FilePicker from '@/components/upload/FilePicker'
import FilesList from '@/components/upload/FilesList'
import { useUploadActionSheet } from '@/components/upload/UploadActionSheet'
import UploadHistory from '@/components/upload/UploadHistory'
import { OverallProgress } from '@/components/upload/UploadProgress'
import { calculateUploadStats, useFileSelection } from '@/hooks/uploadHooks'
import { useUploadManager } from '@/hooks/useUploadManager'
import { UploadFile } from '@/types/fileType'
import React, { useEffect, useState } from 'react'
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
	const [recentUploadIds, setRecentUploadIds] = useState<string[]>([])
	const [savedUploadId, setSavedUploadId] = useState('')
	const [showTestPanel, setShowTestPanel] = useState(false)

	const allErrors = [...errors, ...dragDropErrors]
	const isWeb = Platform.OS === 'web'

	useEffect(() => {
		const trackUploadIds = () => {
			const newIds = files
				.filter(file => file.id && !recentUploadIds.includes(file.id))
				.map(file => file.id)
				.filter(Boolean) as string[]

			if (newIds.length > 0) {
				setRecentUploadIds(prev => [...newIds, ...prev].slice(0, 5))
			}
		}

		trackUploadIds()
	}, [files])

	const handleFilesSelected = (selectedFiles: UploadFile[]) => {
		clearErrors()
		setDragDropErrors([])
		selectedFiles.forEach(file => enqueueFile(file))
	}

	const onPickerError = (errorMsg: string) =>
		setDragDropErrors(prev => [...prev, errorMsg])

	const handleClearAllFiles = () => {
		clearAllFiles()
		clearErrors()
		setDragDropErrors([])
	}

	return (
		<SafeAreaView className='flex-1 bg-gray-900'>
			<View className={`flex-1 p-4 ${isWeb && 'web-container'}`}>
				<View className='flex-row justify-between items-center mb-4 mt-4'>
					<Text className='text-white text-xl font-bold'>
						Upload Hero
					</Text>
					<View className='flex-row'>
						<TouchableOpacity
							onPress={() => setShowTestPanel(!showTestPanel)}
							className='px-3 py-1.5 bg-purple-600 rounded-lg mr-2'
						>
							<Text className='text-white font-medium'>
								{showTestPanel
									? 'Hide Test Tools'
									: 'Test Tools'}
							</Text>
						</TouchableOpacity>
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
				</View>

				{showTestPanel && (
					<RedisTestPanel
						recentUploadIds={recentUploadIds}
						savedUploadId={savedUploadId}
						setSavedUploadId={setSavedUploadId}
					/>
				)}

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

				{files.length > 0 && (
					<ClearAllButton
						isUploading={isUploading}
						onClearAll={handleClearAllFiles}
					/>
				)}

				<FilesList
					files={files}
					pauseUpload={pauseUpload}
					resumeUpload={resumeUpload}
					cancelUpload={cancelUpload}
				/>

				<ActionButton
					onPress={() =>
						isAllFilesUploaded
							? handleClearAllFiles()
							: processQueue()
					}
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
