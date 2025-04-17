import { IconSymbol } from '@/components/ui/IconSymbol'
import { useUploadManager } from '@/hooks/useUploadManager'
import { UploadFile } from '@/types/fileType'
import { CHUNK_SIZE, MAX_FILES } from '@/utils/constants'
import {
	pickDocuments,
	pickImageFromCamera,
	validateFiles,
} from '@/utils/fileUtils'
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

export default function HomeScreen() {
	const [errors, setErrors] = useState<string[]>([])
	const [isLoading, setIsLoading] = useState(false)

	const { enqueueFile, files, processQueue, removeFile } = useUploadManager()

	const handleError = (msg: string) => setErrors([msg])

	const hasQueuedFiles = files.some(file => file.status === 'queued')

	const handlePickDocuments = async () => {
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

	const handleUploadSelectedFiles = () => processQueue()

	const generateFileId = () => `${Date.now()}-${Math.random()}`

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
			disabled={disabled}
			style={{ opacity: isLoading ? 0.5 : 1 }}
		>
			{isLoading ? (
				<ActivityIndicator size='small' color='#fff' />
			) : (
				<Text className='text-white text-center text-lg font-medium'>
					{label}
				</Text>
			)}
		</TouchableOpacity>
	)

	return (
		<SafeAreaView className='flex-1 bg-gray-900 p-4'>
			<View className='m-4'>
				<TouchableOpacity
					onPress={handlePickDocuments}
					className=' min-h-48 my-4 justify-center items-center bg-gray-800 py-10 rounded-xl'
				>
					{isLoading ? (
						<ActivityIndicator size='large' color='#fff' />
					) : (
						<View className='items-center gap-y-2'>
							<IconSymbol
								name='doc.badge.arrow.up.fill'
								size={32}
								color='white'
							/>
							<Text className='text-white text-lg font-semibold'>
								Press here to upload files
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

				<FlatList
					data={files}
					keyExtractor={item => item.id}
					numColumns={2}
					contentContainerStyle={{ paddingBottom: 16 }}
					columnWrapperStyle={{
						justifyContent: 'space-between',
						gap: 8,
						marginBottom: 12,
					}}
					renderItem={({ item }) => (
						<View className='bg-white/10 p-2 rounded-2xl w-[48%] shadow-md'>
							{item.uri && (
								<Image
									source={{ uri: item.uri }}
									className='w-full h-36 rounded-lg'
									resizeMode='cover'
								/>
							)}
							<View className='p-3 gap-y-1'>
								<Text
									className='text-white text-md font-semibold'
									numberOfLines={1}
								>
									{item.name}
								</Text>
								<Text
									className='text-gray-300 text-sm'
									numberOfLines={1}
								>
									{item.mimeType}
								</Text>
								<Text className='text-gray-400 text-sm'>
									{item.size} bytes
								</Text>
							</View>

							<View className='p-3 mt-2 rounded-xl border border-gray-700 bg-gray-800 shadow-sm'>
								<Text className='text-gray-400'>
									Status: {item.status}
								</Text>

								{/* {item.status === 'uploading' && ( */}
								<Text className='text-gray-400'>
									Progress: {item.uploadedChunks} /{' '}
									{item.totalChunks}
								</Text>
								{/* )} */}

								{item.status === 'completed' && (
									<Text className='text-green-400 font-semibold'>
										Done ✅
									</Text>
								)}
							</View>
						</View>
					)}
				/>
			</View>
			<View className='m-4'>
				<ActionButton
					onPress={handleUploadSelectedFiles}
					label='Upload'
					disabled={!hasQueuedFiles}
				/>
			</View>
		</SafeAreaView>
	)
}
