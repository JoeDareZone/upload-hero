import { ActionButton } from '@/components/ui/ActionButton'
import { IconSymbol } from '@/components/ui/IconSymbol'
import { FileItem } from '@/components/upload/FileItem'
import { useUploadActionSheet } from '@/components/upload/UploadActionSheet'
import { calculateUploadStats, useFileSelection } from '@/hooks/uploadHooks'
import { useUploadManager } from '@/hooks/useUploadManager'
import { MAX_FILE_SIZE_MB } from '@/utils/constants'
import {
	ActivityIndicator,
	FlatList,
	SafeAreaView,
	Text,
	TouchableOpacity,
	View,
} from 'react-native'
import * as Progress from 'react-native-progress'

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

	const { errors, isLoading, handlePickDocuments, handleTakePhoto } =
		useFileSelection(enqueueFile, isUploading)

	const { showActionSheet, ActionSheetComponent } = useUploadActionSheet({
		onPickDocuments: handlePickDocuments,
		onTakePhoto: handleTakePhoto,
	})

	const {
		hasQueuedFiles,
		totalChunks,
		overallUploadProgress,
		isAllFilesUploaded,
	} = calculateUploadStats(files)

	return (
		<SafeAreaView className='flex-1 bg-gray-900'>
			<View className='flex-1 p-4'>
				<TouchableOpacity
					onPress={showActionSheet}
					className='min-h-48 my-4 justify-center items-center bg-gray-800 py-10 rounded-xl'
					disabled={isUploading || isLoading || isAllFilesUploaded}
					style={{
						opacity:
							isUploading || isLoading || isAllFilesUploaded
								? 0.5
								: 1,
					}}
				>
					{isLoading ? (
						<ActivityIndicator size='large' color='#fff' />
					) : (
						<View className='items-center gap-y-2'>
							<IconSymbol
								name='doc.badge.arrow.up.fill'
								size={32}
								color={isUploading ? 'gray' : 'white'}
							/>
							<Text className='text-white text-lg font-semibold'>
								{isUploading
									? 'Upload in progress...'
									: 'Press here to upload files'}
							</Text>
							<Text className='text-gray-300 text-sm'>
								Supported formats: JPG, PNG, mp4 (up to{' '}
								{MAX_FILE_SIZE_MB}MB)
							</Text>
						</View>
					)}
				</TouchableOpacity>

				<ActionSheetComponent />

				{errors.length > 0 && (
					<View className='bg-yellow-400 p-3 rounded-xl mb-6 w-full shadow-sm'>
						{errors.map((error, idx) => (
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
								? 'All files uploaded successfully!'
								: 'Overall Progress'}
						</Text>
						<Progress.Bar
							progress={overallUploadProgress}
							width={null}
							height={10}
							color={isAllFilesUploaded ? 'green' : 'lightblue'}
							borderWidth={0}
							unfilledColor='rgba(255,255,255,0.1)'
						/>
					</View>
				)}

				<View className='flex-1'>
					{files.length > 0 && (
						<View className='flex-row justify-end mb-2'>
							<TouchableOpacity
								onPress={clearAllFiles}
								className='bg-red-600 px-3 py-1.5 rounded-lg'
								disabled={isUploading}
								style={{ opacity: isUploading ? 0.5 : 1 }}
							>
								<Text className='text-white font-medium'>
									Clear All
								</Text>
							</TouchableOpacity>
						</View>
					)}
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
		</SafeAreaView>
	)
}
