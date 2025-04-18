import { IconSymbol } from '@/components/ui/IconSymbol'
import { useUploadManager } from '@/hooks/useUploadManager'
import { UploadFile } from '@/types/fileType'
import { CHUNK_SIZE, MAX_FILES } from '@/utils/constants'
import {
	pickDocuments,
	pickImageFromCamera,
	validateFiles,
} from '@/utils/fileUtils'
import {
	convertBytesToMB,
	convertUploadedChunksToPercentage,
	generateFileId,
} from '@/utils/helpers'
import { useState } from 'react'
import {
	ActivityIndicator,
	FlatList,
	Image,
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
	const [errors, setErrors] = useState<string[]>([])
	const [isLoading, setIsLoading] = useState(false)

	const hasQueuedFiles = files.some(file => file.status === 'queued')

	const totalUploadedChunks = files.reduce(
		(sum, file) => sum + file.uploadedChunks,
		0
	)
	const totalChunks = files.reduce((sum, file) => sum + file.totalChunks, 0)
	const overallUploadProgress =
		totalChunks > 0 ? totalUploadedChunks / totalChunks : 0

	const isAllFilesUploaded = overallUploadProgress === 1

	const handleError = (msg: string) => setErrors([msg])
	const handleUploadSelectedFiles = () => processQueue()

	const handlePickDocuments = async () => {
		if (isUploading) return

		setErrors([])
		setIsLoading(true)
		try {
			const result = await pickDocuments()
			if (result.canceled) return

			if (result.assets.length > MAX_FILES)
				return handleError(
					`You can upload a maximum of ${MAX_FILES} files.`
				)

			const { errors: newErrors, validFiles } = await validateFiles(
				result.assets
			)
			if (newErrors.length) setErrors(newErrors)

			validFiles.forEach(file => {
				const uploadFile: UploadFile = {
					...file,
					id: generateFileId(),
					status: 'queued',
					totalChunks: Math.ceil(file.size / CHUNK_SIZE),
					uploadedChunks: 0,
				}
				enqueueFile(uploadFile)
			})
		} catch (error) {
			console.error(error)
			handleError('Something went wrong while picking files.')
		} finally {
			setIsLoading(false)
		}
	}

	const handleTakePhoto = async () => {
		setErrors([])
		setIsLoading(true)
		try {
			const file = await pickImageFromCamera()
			if (file) {
				const uploadFile: UploadFile = {
					...file,
					id: generateFileId(),
					status: 'queued',
					totalChunks: Math.ceil(file.size / CHUNK_SIZE),
					uploadedChunks: 0,
				}
				enqueueFile(uploadFile)
			}
		} catch (error: any) {
			console.error(error)
			handleError(
				error.message || 'Something went wrong while picking an image.'
			)
		} finally {
			setIsLoading(false)
		}
	}

	const ActionButton = ({
		onPress,
		label,
		disabled,
	}: {
		onPress: () => void
		label: string
		disabled?: boolean
	}) => (
		<TouchableOpacity
			className={`${
				disabled ? 'bg-gray-500' : 'bg-blue-600'
			} p-4 rounded-xl mb-4 min-w-40 min-h-14 shadow-md active:opacity-80`}
			onPress={onPress}
			disabled={disabled || isUploading}
			style={{ opacity: isLoading || isUploading || disabled ? 0.5 : 1 }}
		>
			{isLoading ? (
				<ActivityIndicator size='small' color='#fff' />
			) : (
				<Text className='text-white text-center text-lg font-medium'>
					{isUploading && label === 'Upload' ? 'Uploading...' : label}
				</Text>
			)}
		</TouchableOpacity>
	)

	return (
		<SafeAreaView className='flex-1 bg-gray-900 '>
			<View className='flex-1 p-4'>
				<TouchableOpacity
					onPress={handlePickDocuments}
					className=' min-h-48 my-4 justify-center items-center bg-gray-800 py-10 rounded-xl'
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
				{/* <View className='flex-row justify-between items-center'>
					<ActionButton
						onPress={handlePickDocuments}
					label='Pick files'
					disabled={isLoading}
				/>
				<ActionButton
					onPress={handleTakePhoto}
					label='Take photo'
						disabled={isLoading}
					/>
				</View> */}
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
							<View className='bg-white/10 p-4 rounded-xl shadow-md flex-row gap-x-6 items-center'>
								{item.uri && (
									<Image
										source={{ uri: item.uri }}
										className='w-24 h-24 rounded-lg'
										resizeMode='cover'
									/>
								)}
								<View className='flex-1'>
									<View className='flex-row justify-between mb-3'>
										<Text
											className='text-white text-lg font-semibold'
											numberOfLines={1}
										>
											{item.name}
										</Text>
										<View className='flex-row gap-x-3'>
											{(item.status == 'uploading' ||
												item.status === 'paused') && (
												<TouchableOpacity
													onPress={() =>
														item.status ===
														'uploading'
															? pauseUpload(
																	item.id
															  )
															: resumeUpload(
																	item.id
															  )
													}
												>
													<IconSymbol
														name={
															item.status ===
															'uploading'
																? 'pause'
																: 'play'
														}
														size={20}
														color='gray'
													/>
												</TouchableOpacity>
											)}
											{item.status === 'completed' ? (
												<IconSymbol
													name='checkmark.circle.fill'
													size={22}
													color='green'
												/>
											) : (
												<TouchableOpacity
													onPress={() =>
														cancelUpload(item.id)
													}
												>
													<IconSymbol
														name='trash'
														size={20}
														color='red'
													/>
												</TouchableOpacity>
											)}
										</View>
									</View>
									<Progress.Bar
										progress={
											item.uploadedChunks /
											item.totalChunks
										}
										width={null}
										height={8}
										color={
											item.status === 'uploading'
												? 'lightblue'
												: item.uploadedChunks ===
												  item.totalChunks
												? 'green'
												: 'grey'
										}
										borderWidth={0}
										style={{ marginBottom: 16 }}
										unfilledColor='rgba(255, 255, 255, 0.2)'
									/>

									<View className='flex-row justify-between mb-2'>
										{item.status === 'completed' ? (
											<Text className='text-gray-200'>
												Upload Successful!
											</Text>
										) : (
											<View className='flex-row gap-x-2'>
												<Text className='text-gray-300 text-md'>
													{convertBytesToMB(
														item.size
													)}{' '}
													MB
												</Text>
												<Text
													className='text-gray-400 text-sm'
													numberOfLines={1}
												>
													{item.mimeType}
												</Text>
											</View>
										)}

										{item.status !== 'queued' && (
											<Text className='text-gray-200'>
												{convertUploadedChunksToPercentage(
													item.uploadedChunks,
													item.totalChunks
												)}
												%
											</Text>
										)}
									</View>
								</View>
							</View>
						)}
					/>
				</View>
				<ActionButton
					onPress={handleUploadSelectedFiles}
					label='Upload'
					disabled={!hasQueuedFiles || isUploading}
				/>
			</View>
		</SafeAreaView>
	)
}
