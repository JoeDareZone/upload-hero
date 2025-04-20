import { ActionButton } from '@/components/ui/ActionButton'
import { FileItem } from '@/components/upload/FileItem'
import { useUploadActionSheet } from '@/components/upload/UploadActionSheet'
import UploadHistory from '@/components/upload/UploadHistory'
import { calculateUploadStats, useFileSelection } from '@/hooks/uploadHooks'
import { useUploadManager } from '@/hooks/useUploadManager'
import { UploadFile } from '@/types/fileType'
import React, { useState } from 'react'
import {
	FlatList,
	Platform,
	SafeAreaView,
	ScrollView,
	Text,
	TouchableOpacity,
	View,
} from 'react-native'
import * as Progress from 'react-native-progress'

import FilePicker from '@/components/upload/FilePicker'
import '../web-styles.css'

interface FilesListProps {
	files: UploadFile[]
	pauseUpload: (fileId: string) => void
	resumeUpload: (fileId: string) => void
	cancelUpload: (fileId: string) => void
}

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
	const FilesList = isWeb ? WebFilesList : NativeFilesList

	const addError = (errorMsg: string) => {
		setDragDropErrors(prev => [...prev, errorMsg])
	}
	const clearDragDropErrors = () => setDragDropErrors([])
	const onPickerError = (errorMsg: string) => addError(errorMsg)

	const handleFilesSelected = (selectedFiles: UploadFile[]) => {
		clearErrors()
		clearDragDropErrors()

		selectedFiles.forEach(file => enqueueFile(file))
	}

	const showHistory = () => setIsHistoryVisible(true)
	const hideHistory = () => setIsHistoryVisible(false)

	return (
		<SafeAreaView className='flex-1 bg-gray-900'>
			<View className={`flex-1 p-4 ${isWeb ? 'web-container' : ''}`}>
				<View className='flex-row justify-between items-center mb-4 mt-4'>
					<Text className='text-white text-xl font-bold'>
						Upload Hero
					</Text>
					{isWeb && (
						<TouchableOpacity
							onPress={showHistory}
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

				{allErrors.length > 0 && (
					<View className='bg-yellow-400 p-3 rounded-xl mb-6 w-full shadow-sm'>
						{allErrors.map((error, idx) => (
							<Text
								key={idx}
								className='text-yellow-800 font-semibold text-base'
							>
								{error}
							</Text>
						))}
					</View>
				)}

				{totalChunks > 0 && (
					<View className='mb-4'>
						<Text className='text-gray-200 text-base font-semibold mb-2'>
							{isAllFilesUploaded
								? hasErrorFiles
									? 'Files uploaded with errors'
									: 'All files uploaded successfully!'
								: 'Overall Progress'}
						</Text>
						<View className={isWeb ? 'progress-bar-web' : ''}>
							<Progress.Bar
								progress={overallUploadProgress}
								width={null}
								height={isWeb ? 12 : 10}
								color={
									isAllFilesUploaded
										? hasErrorFiles
											? 'orange'
											: 'green'
										: 'lightblue'
								}
								borderWidth={0}
								unfilledColor='rgba(255,255,255,0.1)'
							/>
						</View>
					</View>
				)}

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

			<UploadHistory isVisible={isHistoryVisible} onClose={hideHistory} />
		</SafeAreaView>
	)
}

const WebFilesList = ({
	files,
	pauseUpload,
	resumeUpload,
	cancelUpload,
}: FilesListProps) => {
	if (files.length === 0) return null

	return (
		<ScrollView style={{ flex: 1, padding: 10 }}>
			<View className='files-grid-web'>
				{files.map(item => (
					<View key={item.id} className='file-item-web'>
						<FileItem
							item={item}
							pauseUpload={pauseUpload}
							resumeUpload={resumeUpload}
							cancelUpload={cancelUpload}
						/>
					</View>
				))}
			</View>
		</ScrollView>
	)
}

const NativeFilesList = ({
	files,
	pauseUpload,
	resumeUpload,
	cancelUpload,
}: FilesListProps) => {
	return (
		<FlatList
			data={files}
			keyExtractor={item => item.id}
			contentContainerStyle={{ paddingBottom: 16, gap: 12 }}
			renderItem={({ item }) => (
				<FileItem
					item={item}
					pauseUpload={pauseUpload}
					resumeUpload={resumeUpload}
					cancelUpload={cancelUpload}
				/>
			)}
		/>
	)
}
