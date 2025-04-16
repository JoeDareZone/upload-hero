import { MAX_FILES } from '@/utils/Constants'
import { pickDocuments, validateFiles } from '@/utils/fileutils'
import { useState } from 'react'
import {
	ActivityIndicator,
	Image,
	Text,
	TouchableOpacity,
	View,
} from 'react-native'

export default function HomeScreen() {
	const [files, setFiles] = useState<any[]>([])
	const [errors, setErrors] = useState<string[]>([])
	const [isLoading, setIsLoading] = useState(false)

	const pickDocument = async () => {
		setErrors([])
		setIsLoading(true)

		try {
			const result = await pickDocuments()

			if (result.canceled) return

			if (result.assets) {
				if (result.assets.length > MAX_FILES) {
					setErrors([`You can select up to ${MAX_FILES} files.`])
					return
				}

				const { errors: newErrors, validFiles } = await validateFiles(
					result.assets
				)

				if (newErrors.length) setErrors(newErrors)
				setFiles(validFiles)
			}
		} catch (error) {
			console.error('Error picking documents:', error)
			setErrors(['Something went wrong while picking files.'])
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<View className='flex-1 items-center justify-center p-4'>
			<TouchableOpacity
				className='bg-blue-500 p-4 rounded-md mb-4 min-w-32'
				onPress={pickDocument}
				disabled={isLoading}
			>
				{isLoading ? (
					<ActivityIndicator size='small' color='#fff' />
				) : (
					<Text className='text-white text-center'>Pick files</Text>
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
					<View key={index} className='mt-4 bg-black/20 p-2 rounded'>
						<Text className='text-white'>Name: {file.name}</Text>
						<Text className='text-white'>
							Type: {file.mimeType}
						</Text>
						<Text className='text-white'>
							Size: {file.size} bytes
						</Text>

						{file.mimeType?.startsWith('image/') && (
							<Image
								source={{ uri: file.uri }}
								style={{
									width: 150,
									height: 150,
									marginTop: 8,
									borderRadius: 8,
								}}
								resizeMode='cover'
							/>
						)}

						{file.mimeType?.startsWith('video/') &&
						file.thumbnailUri ? (
							<Image
								source={{ uri: file.thumbnailUri }}
								style={{
									width: 150,
									height: 150,
									marginTop: 8,
									borderRadius: 8,
								}}
								resizeMode='cover'
							/>
						) : (
							file.mimeType?.startsWith('video/') && (
								<Text className='text-white mt-2'>
									🎥 Video (thumbnail unavailable)
								</Text>
							)
						)}
					</View>
				))}
			</View>
		</View>
	)
}
