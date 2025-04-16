import { MAX_FILES, MAX_FILE_SIZE } from '@/utils/Constants'
import * as DocumentPicker from 'expo-document-picker'
import * as VideoThumbnails from 'expo-video-thumbnails'
import { useState } from 'react'
import { Image, Text, TouchableOpacity, View } from 'react-native'

export default function HomeScreen() {
	const [files, setFiles] = useState<
		(DocumentPicker.DocumentPickerAsset & { thumbnailUri?: string })[]
	>([])
	const [errors, setErrors] = useState<string[]>([])

	const pickDocument = async () => {
		setErrors([])

		let result = await DocumentPicker.getDocumentAsync({
			type: ['image/*', 'video/*'],
			copyToCacheDirectory: true,
			multiple: true,
		})

		if (result.canceled) return

		if (result.assets) {
			if (result.assets.length > MAX_FILES) {
				setErrors([`You can select up to ${MAX_FILES} files.`])
				return
			}

			const newErrors: string[] = []
			const validFiles: any[] = []

			for (const file of result.assets) {
				if (
					!file.mimeType?.startsWith('image/') &&
					!file.mimeType?.startsWith('video/')
				) {
					newErrors.push(`${file.name} is not an image or video.`)
					continue
				}

				if (file.size && file.size > MAX_FILE_SIZE) {
					newErrors.push(`${file.name} exceeds the 50MB size limit.`)
					continue
				}

				let thumbnailUri = null
				if (file.mimeType?.startsWith('video/')) {
					try {
						const { uri } = await VideoThumbnails.getThumbnailAsync(
							file.uri,
							{ time: 1000 }
						)
						thumbnailUri = uri
					} catch (e) {
						console.warn('Thumbnail generation failed', e)
					}
				}

				validFiles.push({ ...file, thumbnailUri })
			}

			if (newErrors.length) {
				setErrors(newErrors)
			}

			setFiles(validFiles)
		}
	}

	return (
		<View className='flex-1 items-center justify-center p-4'>
			<TouchableOpacity
				className='bg-blue-500 p-4 rounded-md mb-4'
				onPress={pickDocument}
			>
				<Text className='text-white text-center'>Pick files</Text>
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
							<Text className='text-white mt-2'>
								🎥 Video (thumbnail unavailable)
							</Text>
						)}
					</View>
				))}
			</View>
		</View>
	)
}
