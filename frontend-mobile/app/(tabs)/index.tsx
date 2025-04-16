import { FileType } from '@/types/fileType'
import { MAX_FILES } from '@/utils/Constants'
import {
	pickDocuments,
	pickImageFromCamera,
	validateFiles,
} from '@/utils/fileUtils'
import { useState } from 'react'
import {
	ActivityIndicator,
	Image,
	ScrollView,
	Text,
	TouchableOpacity,
	View,
} from 'react-native'

export default function HomeScreen() {
	const [files, setFiles] = useState<FileType[]>([])
	const [errors, setErrors] = useState<string[]>([])
	const [isLoading, setIsLoading] = useState(false)

	const handleError = (msg: string) => setErrors([msg])

	const handlePickDocuments = async () => {
		setErrors([])
		setIsLoading(true)
		try {
			const result = await pickDocuments()
			if (result.canceled) return

			if (result.assets.length > MAX_FILES)
				return handleError(`You can select up to ${MAX_FILES} files.`)

			const { errors: newErrors, validFiles } = await validateFiles(
				result.assets
			)
			if (newErrors.length) setErrors(newErrors)
			setFiles(prev => [...prev, ...validFiles])
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
			if (file) setFiles(prev => [...prev, file])
		} catch (error: any) {
			console.error(error)
			setErrors([
				error.message || 'Something went wrong while picking an image.',
			])
		} finally {
			setIsLoading(false)
		}
	}

	const ActionButton = ({
		onPress,
		label,
	}: {
		onPress: () => void
		label: string
	}) => (
		<TouchableOpacity
			className='bg-blue-500 p-4 rounded-md mb-4 min-w-32'
			onPress={onPress}
			disabled={isLoading}
		>
			{isLoading ? (
				<ActivityIndicator size='small' color='#fff' />
			) : (
				<Text className='text-white text-center'>{label}</Text>
			)}
		</TouchableOpacity>
	)

	return (
		<View className='flex-1 items-center justify-center p-4'>
			<ScrollView
				className='flex-1'
				contentContainerStyle={{
					flexGrow: 1,
					justifyContent: 'center',
					alignItems: 'center',
				}}
			>
				<ActionButton
					onPress={handlePickDocuments}
					label='Pick files'
				/>
				<ActionButton onPress={handleTakePhoto} label='Pick image' />

				{errors.length > 0 && (
					<View className='bg-yellow-400 p-2 rounded mb-4'>
						{errors.map((error, idx) => (
							<Text key={idx} className='text-black'>
								⚠️ {error}
							</Text>
						))}
					</View>
				)}

				<View className='w-full'>
					{files.map((file, idx) => (
						<View
							key={idx}
							className='mt-4 bg-black/20 p-2 rounded'
						>
							<Text className='text-white'>
								Name: {file.name}
							</Text>
							<Text className='text-white'>
								Type: {file.mimeType}
							</Text>
							<Text className='text-white'>
								Size: {file.size} bytes
							</Text>
							{file.uri && (
								<Image
									source={{ uri: file.uri }}
									className='w-[150px] h-[150px] mt-2 rounded-md'
									resizeMode='cover'
								/>
							)}
						</View>
					))}
				</View>
			</ScrollView>
		</View>
	)
}
