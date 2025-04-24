import { ActionButton } from '@/components/ui/ActionButton'
import { ErrorDisplay } from '@/components/ui/ErrorDisplay'
import FilePicker from '@/components/upload/FilePicker'
import FilesList from '@/components/upload/FilesList'
import { useUploadActionSheet } from '@/components/upload/UploadActionSheet'
import UploadHistory from '@/components/upload/UploadHistory'
import { OverallProgress } from '@/components/upload/UploadProgress'
import { calculateUploadStats, useFileSelection } from '@/hooks/uploadHooks'
import { useUploadManager } from '@/hooks/useUploadManager'
import { UploadFile } from '@/types/fileType'
import { API_BASE_URL } from '@/utils/constants'
import AsyncStorage from '@react-native-async-storage/async-storage'
import React, { useEffect, useState } from 'react'
import {
	Alert,
	Platform,
	SafeAreaView,
	ScrollView,
	Text,
	TextInput,
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

	const handleClearStorage = async () => {
		console.log('Clearing storage')
		await AsyncStorage.clear().then(() => {
			console.log('Storage cleared')
		})
	}

	// Test with specific upload ID
	const testRedisChunks = async () => {
		try {
			if (!savedUploadId) {
				showAlert('Please enter an upload ID to test')
				return
			}

			const endpoint = `${API_BASE_URL}/upload-status/${savedUploadId}`
			console.log(`Testing Redis chunks at: ${endpoint}`)

			const response = await fetch(endpoint)
			const data = await response.json()

			showAlert(
				`Redis Test Results`,
				`Upload ID: ${savedUploadId}\n` +
					`Success: ${data.success}\n` +
					`Chunks received: ${data.chunksReceived || 'N/A'}\n` +
					`Chunk indices: ${
						(data.chunkIndices || []).join(', ') || 'None'
					}`
			)
		} catch (error) {
			showAlert(
				'Error',
				`Failed to test Redis: ${
					error instanceof Error ? error.message : String(error)
				}`
			)
		}
	}

	// Show alert based on platform
	const showAlert = (title: string, message?: string) => {
		if (Platform.OS === 'web') {
			alert(message ? `${title}\n\n${message}` : title)
		} else {
			Alert.alert(title, message)
		}
	}

	// Copy ID to clipboard
	const copyToClipboard = (id: string) => {
		setSavedUploadId(id)
		if (Platform.OS === 'web' && navigator.clipboard) {
			navigator.clipboard.writeText(id)
			showAlert('Copied to clipboard')
		}
	}

	return (
		<SafeAreaView className='flex-1 bg-gray-900'>
			<ScrollView className={`flex-1 ${isWeb && 'web-container'}`}>
				<View className='p-4'>
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
						<View className='bg-gray-800 p-4 mb-4 rounded-lg'>
							<Text className='text-white font-bold mb-2'>
								Redis Testing Tools
							</Text>

							<View className='mb-3'>
								<Text className='text-white text-sm mb-1'>
									Recent Upload IDs (tap to use):
								</Text>
								<View className='flex-row flex-wrap'>
									{recentUploadIds.map((id, index) => (
										<TouchableOpacity
											key={index}
											className='bg-gray-700 px-2 py-1 rounded mr-2 mb-1'
											onPress={() => copyToClipboard(id)}
										>
											<Text className='text-blue-300 text-xs'>
												{id.substring(0, 8)}...
											</Text>
										</TouchableOpacity>
									))}
								</View>
							</View>

							<View className='flex-row items-center mb-3'>
								<TextInput
									className='bg-gray-700 text-white px-2 py-1 rounded flex-1 mr-2'
									value={savedUploadId}
									onChangeText={setSavedUploadId}
									placeholder='Enter upload ID here'
									placeholderTextColor='#888'
								/>
								<TouchableOpacity
									onPress={testRedisChunks}
									className='px-3 py-1.5 bg-green-600 rounded-lg'
									disabled={!savedUploadId}
									style={{ opacity: savedUploadId ? 1 : 0.5 }}
								>
									<Text className='text-white font-medium'>
										Test ID
									</Text>
								</TouchableOpacity>
							</View>

							<TouchableOpacity
								onPress={handleClearStorage}
								className='px-3 py-1.5 bg-red-600 rounded-lg self-start'
							>
								<Text className='text-white font-medium'>
									Clear Storage
								</Text>
							</TouchableOpacity>
						</View>
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

					<View className='flex-1'>
						{files.length > 0 && (
							<View className='flex-row justify-end mb-2'>
								<TouchableOpacity
									onPress={handleClearAllFiles}
									className={`bg-red-600 px-3 py-1.5 rounded-lg ${
										isWeb
											? 'hover-highlight web-clickable'
											: ''
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
						onPress={() => {
							if (isAllFilesUploaded) {
								handleClearAllFiles()
							} else {
								processQueue()
							}
						}}
						disabled={
							(!hasQueuedFiles || isUploading) &&
							!isAllFilesUploaded
						}
						isLoading={isLoading}
						isUploading={isUploading}
						isAllFilesUploaded={isAllFilesUploaded}
					/>
				</View>
			</ScrollView>

			<UploadHistory
				isVisible={isHistoryVisible}
				onClose={() => setIsHistoryVisible(false)}
			/>
		</SafeAreaView>
	)
}
