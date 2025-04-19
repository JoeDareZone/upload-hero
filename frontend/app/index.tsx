import { ActionButton } from '@/components/ui/ActionButton'
import { IconSymbol } from '@/components/ui/IconSymbol'
import { FileItem } from '@/components/upload/FileItem'
import { useUploadActionSheet } from '@/components/upload/UploadActionSheet'
import {
	calculateUploadStats,
	createUploadFile,
	useFileSelection,
} from '@/hooks/uploadHooks'
import { useUploadManager } from '@/hooks/useUploadManager'
import { UploadFile } from '@/types/fileType'
import { MAX_FILE_SIZE_MB } from '@/utils/constants'
import {
	ActivityIndicator,
	FlatList,
	Platform,
	SafeAreaView,
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from 'react-native'
import * as Progress from 'react-native-progress'

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

	const { errors, isLoading, handlePickDocuments, handleTakePhoto } =
		useFileSelection(enqueueFile, isUploading)

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

	const isWeb = Platform.OS === 'web'
	const styles = StyleSheet.create({
		webContainer: {
			maxWidth: 1200,
			marginHorizontal: 'auto',
			padding: 16,
		},
		webCursor: {
			cursor: 'pointer',
		},
		defaultCursor: {
			cursor: 'default',
		},
	})

	const handleWebFileSelect = (e: any) => {
		if (!e.target.files || e.target.files.length === 0) return

		const webFiles = Array.from(e.target.files)
		webFiles.forEach((file: any) => {
			const blobUrl = URL.createObjectURL(file)

			const webFile = {
				uri: blobUrl,
				name: file.name,
				mimeType: file.type,
				size: file.size,
				status: 'queued',
				file: file,
			}
			enqueueFile(createUploadFile(webFile))
		})
	}

	const FilesList = isWeb ? WebFilesList : NativeFilesList

	return (
		<SafeAreaView className='flex-1 bg-gray-900'>
			<View
				className='flex-1 p-4'
				style={isWeb ? styles.webContainer : undefined}
			>
				<TouchableOpacity
					onPress={showActionSheet}
					className={`min-h-48 my-4 justify-center items-center bg-gray-800 py-10 rounded-xl ${
						isWeb ? 'hover-highlight' : ''
					}`}
					disabled={isUploading || isLoading || isAllFilesUploaded}
					style={{
						opacity:
							isUploading || isLoading || isAllFilesUploaded
								? 0.5
								: 1,
						...(isWeb &&
						!isUploading &&
						!isLoading &&
						!isAllFilesUploaded
							? styles.webCursor
							: {}),
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
									: isWeb
									? 'Click here to upload files'
									: 'Press here to upload files'}
							</Text>
							<Text className='text-gray-300 text-sm'>
								Supported formats: JPG, PNG, mp4 (up to{' '}
								{MAX_FILE_SIZE_MB}MB)
							</Text>

							{/* Web-specific file input */}
							{isWeb && (
								<View className='mt-4 custom-file-input-web'>
									<TouchableOpacity
										className='bg-blue-600 px-6 py-2 rounded-lg hover-highlight'
										disabled={
											isUploading ||
											isLoading ||
											isAllFilesUploaded
										}
									>
										<Text className='text-white font-medium'>
											Browse Files
										</Text>
										{/* @ts-ignore - Web-only input element */}
										{Platform.OS === 'web' && (
											<input
												type='file'
												accept='image/jpeg,image/png,video/mp4'
												multiple
												onChange={handleWebFileSelect}
												style={{
													position: 'absolute',
													opacity: 0,
													width: '100%',
													height: '100%',
												}}
											/>
										)}
									</TouchableOpacity>
								</View>
							)}
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
									isWeb ? 'hover-highlight' : ''
								}`}
								disabled={isUploading}
								style={{
									opacity: isUploading ? 0.5 : 1,
									...(isWeb && !isUploading
										? styles.webCursor
										: {}),
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
		<ScrollView style={{ flex: 1 }}>
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
