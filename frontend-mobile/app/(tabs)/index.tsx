import { FileType } from '@/types/fileType'
import { MAX_FILES } from '@/utils/constants'
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

			if (files.length + result.assets.length > MAX_FILES)
				return handleError(
					`You can upload a maximum of ${MAX_FILES} files.`
				)

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
			className='bg-blue-600 p-4 rounded-xl mb-4 min-w-40 shadow-md active:opacity-80'
			onPress={onPress}
			disabled={isLoading}
		>
			{isLoading ? (
				<ActivityIndicator size='small' color='#fff' />
			) : (
				<Text className='text-white text-center text-base font-medium'>
					{label}
				</Text>
			)}
		</TouchableOpacity>
	)

	return (
		<SafeAreaView className='flex-1 bg-gray-900 p-4'>
			<ActionButton onPress={handlePickDocuments} label='Pick files' />
			<ActionButton onPress={handleTakePhoto} label='Take photo' />

			{errors.length > 0 && (
				<View className='bg-yellow-400 p-3 rounded-xl mb-6 w-full shadow-sm'>
					{errors.map((error, idx) => (
						<Text
							key={idx}
							className='text-black text-sm leading-relaxed'
						>
							⚠️ {error}
						</Text>
					))}
				</View>
			)}

			<Text className='text-white text-lg font-medium p-4'>
				Files: {files.length} / {MAX_FILES}
			</Text>

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
						<Text
							className='text-white text-sm mt-2 font-semibold'
							numberOfLines={1}
						>
							{item.name}
						</Text>
						<Text
							className='text-gray-300 text-xs'
							numberOfLines={1}
						>
							{item.mimeType}
						</Text>
						<Text className='text-gray-400 text-xs'>
							{item.size} bytes
						</Text>
					</View>
				)}
			/>
		</SafeAreaView>
	)
}
