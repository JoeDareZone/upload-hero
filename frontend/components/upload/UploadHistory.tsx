import { UploadFile } from '@/types/fileType'
import { IS_WEB } from '@/utils/constants'
import { clearUploadHistory, getUploadHistory } from '@/utils/storageUtils'
import React, { useEffect, useState } from 'react'
import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native'

interface UploadHistoryProps {
	isVisible: boolean
	onClose: () => void
}

export default function UploadHistory({
	isVisible,
	onClose,
}: UploadHistoryProps) {
	const [history, setHistory] = useState<UploadFile[]>([])

	useEffect(() => {
		if (isVisible) {
			getUploadHistory().then(setHistory)
		}
	}, [isVisible])

	const handleClearHistory = () => {
		clearUploadHistory()
		setHistory([])
	}

	if (!isVisible) return null

	return (
		<View
			className={`fixed top-0 left-0 w-full h-full flex items-center justify-center bg-black bg-opacity-60 z-50 ${
				IS_WEB ? 'web-modal' : ''
			}`}
		>
			<View className='bg-gray-800 rounded-xl w-full max-w-lg p-5 m-4'>
				<View className='flex-row justify-between items-center mb-4'>
					<Text className='text-white text-xl font-bold'>
						Upload History
					</Text>
					<TouchableOpacity onPress={onClose}>
						<Text className='text-gray-400 text-xl'>×</Text>
					</TouchableOpacity>
				</View>

				{history.length === 0 ? (
					<View className='py-8 flex items-center'>
						<Text className='text-gray-400 text-center'>
							No upload history found
						</Text>
					</View>
				) : (
					<>
						<ScrollView className='max-h-96'>
							{history.map(file => (
								<View
									key={`${file.id}-${file.completedAt}`}
									className='mb-3 p-3 bg-gray-700 rounded-lg'
								>
									<View className='flex-row items-center'>
										{file.mimeType.startsWith('image/') && (
											<Image
												source={{ uri: file.uri }}
												className='w-12 h-12 rounded-md mr-3 bg-gray-600'
												resizeMode='cover'
											/>
										)}
										<View className='flex-1'>
											<Text
												className='text-white font-medium'
												numberOfLines={1}
											>
												{file.name}
											</Text>
											{file.completedAt && (
												<Text className='text-gray-400 text-xs'>
													{new Date(
														file.completedAt
													).toLocaleString()}
												</Text>
											)}
										</View>
									</View>
								</View>
							))}
						</ScrollView>

						<TouchableOpacity
							onPress={handleClearHistory}
							className='mt-4 bg-red-600 py-2 px-4 rounded-lg self-end'
						>
							<Text className='text-white font-medium'>
								Clear History
							</Text>
						</TouchableOpacity>
					</>
				)}
			</View>
		</View>
	)
}
