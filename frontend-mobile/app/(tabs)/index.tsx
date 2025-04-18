import { ActionButton } from '@/components/ui/ActionButton'
import { IconSymbol } from '@/components/ui/IconSymbol'
import { FileItem } from '@/components/upload/FileItem'
import { useUploadActionSheet } from '@/components/upload/UploadActionSheet'
import { calculateUploadStats, useFileSelection } from '@/hooks/uploadHooks'
import { useUploadManager } from '@/hooks/useUploadManager'
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
					disabled={isUploading || isLoading}
					style={{ opacity: isUploading || isLoading ? 0.5 : 1 }}
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
								Supported formats: JPG, PNG (up to 10MB)
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
					onPress={processQueue}
					label='Upload'
					disabled={!hasQueuedFiles || isUploading}
					isLoading={isLoading}
					isUploading={isUploading}
				/>
			</View>
		</SafeAreaView>
	)
}
