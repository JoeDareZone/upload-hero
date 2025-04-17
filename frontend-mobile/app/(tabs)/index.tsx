import { useUploadManager } from '@/hooks/useUploadManager' // Make sure this path is correct
import { FileType, UploadFile } from '@/types/fileType'
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
	const [files, setFiles] = useState<UploadFile[]>([]) // Use UploadFile[] type here
	const [errors, setErrors] = useState<string[]>([])
	const [isLoading, setIsLoading] = useState(false)

	const { enqueueFile } = useUploadManager()

	const handleError = (msg: string) => setErrors([msg])

	const handlePickDocuments = async () => {
		setErrors([])
		setIsLoading(true)
		try {
			const result = await pickDocuments()
			if (result.canceled) return

			if (files.length + result.assets.length > MAX_FILES)
				return handleError(
					`You can upload a maximum of ${MAX_FILES} files.`
				)

			const { errors: newErrors, validFiles } = await validateFiles(
				result.assets
			)
			if (newErrors.length) setErrors(newErrors)

			// Enqueue files to be uploaded
			validFiles.forEach((file: FileType) => {
				const uploadFile: UploadFile = {
					...file,
					id: generateFileId(),
					status: 'queued',
					totalChunks: Math.ceil(file.size / CHUNK_SIZE),
					uploadedChunks: 0,
				}
				enqueueFile(uploadFile)
				setFiles(prev => [...prev, uploadFile])
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
				setFiles(prev => [...prev, uploadFile])
			}
		} catch (error: any) {
			console.error(error)
			setErrors([
				error.message || 'Something went wrong while picking an image.',
			])
		} finally {
			setIsLoading(false)
		}
	}

	const generateFileId = () => `${Date.now()}-${Math.random()}`

	const ActionButton = ({
		onPress,
		label,
	}: {
		onPress: () => void
		label: string
	}) => (
		<TouchableOpacity
			className='bg-blue-600 p-4 rounded-xl mb-4 min-w-40 min-h-14 shadow-md active:opacity-80'
			onPress={onPress}
			disabled={isLoading}
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
				<ActionButton
					onPress={handlePickDocuments}
					label='Pick files'
				/>
				<ActionButton onPress={handleTakePhoto} label='Take photo' />
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
					keyExtractor={item => item.uri}
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
							<View className='p-4 gap-y-0.5'>
								<Text
									className='text-white text-md mt-2 font-semibold'
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
							<View
								key={item.id}
								className='p-4 mb-4 rounded-xl border-2 gap-y-2 border-gray-700 bg-gray-800 shadow-sm'
							>
								<Text className='text-gray-400'>
									Status: {item.status}
								</Text>
								<Text className='text-gray-400'>
									Progress: {item.uploadedChunks} /{' '}
									{item.totalChunks}
								</Text>
							</View>
						</View>
					)}
				/>
			</View>
		</SafeAreaView>
	)
}
