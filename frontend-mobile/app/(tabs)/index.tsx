import { FileType } from '@/types/fileType'
import { MAX_FILES } from '@/utils/Constants'
import { pickDocuments, validateFiles } from '@/utils/fileutils'
import * as ImagePicker from 'expo-image-picker'
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
	const [status, requestPermission] = ImagePicker.useCameraPermissions()

	const pickDocument = async () => {
		setErrors([])
		setIsLoading(true)

		try {
			const result = await pickDocuments()

			if (result.canceled) return

			if (result.assets) {
				console.log(result.assets)
				if (result.assets.length > MAX_FILES) {
					setErrors([`You can select up to ${MAX_FILES} files.`])
					return
				}

				const { errors: newErrors, validFiles } = await validateFiles(
					result.assets
				)

				if (newErrors.length) setErrors(newErrors)
				setFiles([...files, ...validFiles])
			}
		} catch (error) {
			console.error('Error picking documents:', error)
			setErrors(['Something went wrong while picking files.'])
		} finally {
			setIsLoading(false)
		}
	}

	const pickImage = async () => {
		setIsLoading(true)
		try {
			if (
				!status ||
				status.status === ImagePicker.PermissionStatus.UNDETERMINED
			) {
				const permission = await requestPermission()
				if (permission.status === ImagePicker.PermissionStatus.DENIED) {
					alert(
						'Permission required. Please grant permission to access the camera.'
					)
					return
				}
			}
			let result = await ImagePicker.launchCameraAsync({
				mediaTypes: ['images', 'videos'],
			})

			if (!result.canceled) {
				const file = result.assets[0]

				setFiles([
					...files,
					{
						uri: file.uri,
						name: file.fileName ?? 'Camera Image',
						mimeType: file.mimeType ?? 'image/jpeg',
						size: file.fileSize ?? 0,
					},
				])
			}
		} catch (error) {
			console.error('Error picking image:', error)
			setErrors(['Something went wrong while picking an image.'])
		} finally {
			setIsLoading(false)
		}
	}

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
				<TouchableOpacity
					className='bg-blue-500 p-4 rounded-md mb-4 min-w-32'
					onPress={pickDocument}
					disabled={isLoading}
				>
					{isLoading ? (
						<ActivityIndicator size='small' color='#fff' />
					) : (
						<Text className='text-white text-center'>
							Pick files
						</Text>
					)}
				</TouchableOpacity>

				<TouchableOpacity
					className='bg-blue-500 p-4 rounded-md mb-4 min-w-32'
					onPress={pickImage}
					disabled={isLoading}
				>
					{isLoading ? (
						<ActivityIndicator size='small' color='#fff' />
					) : (
						<Text className='text-white text-center'>
							Pick image
						</Text>
					)}
				</TouchableOpacity>
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
					{files.map((file, index) => (
						<View
							key={index}
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

							<Image
								className='w-[150px] h-[150px] mt-2 rounded-md'
								source={{ uri: file.uri }}
								resizeMode='cover'
							/>
						</View>
					))}
				</View>
			</ScrollView>
		</View>
	)
}
