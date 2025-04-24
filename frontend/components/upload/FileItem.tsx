import { IconSymbol } from '@/components/ui/IconSymbol'
import { UploadFile } from '@/types/fileType'
import {
	convertBytesToMB,
	convertUploadedChunksToPercentage,
} from '@/utils/helpers'
import { Image, Platform, Text, TouchableOpacity, View } from 'react-native'
import * as Progress from 'react-native-progress'

type FileItemProps = {
	item: UploadFile
	pauseUpload: (id: string) => void
	resumeUpload: (id: string) => void
	cancelUpload: (id: string) => void
}

export const FileItem = ({
	item,
	pauseUpload,
	resumeUpload,
	cancelUpload,
}: FileItemProps) => {
	const isWeb = Platform.OS === 'web'
	const {
		id,
		uri,
		name,
		status,
		uploadedChunks,
		totalChunks,
		size,
		mimeType,
		errorMessage,
	} = item

	const getProgressColor = () => {
		if (status === 'uploading') return 'lightblue'
		if (status === 'error') return 'orange'
		return uploadedChunks === totalChunks ? 'green' : 'grey'
	}

	const renderStatusIcon = () => {
		if (status === 'completed') {
			return (
				<IconSymbol
					name={`checkmark.circle.fill`}
					size={22}
					color='green'
				/>
			)
		}

		if (status === 'error') {
			return (
				<IconSymbol
					name='exclamationmark.triangle.fill'
					size={22}
					color='orange'
				/>
			)
		}

		return (
			<TouchableOpacity
				onPress={() => cancelUpload(id)}
				className={isWeb ? 'hover-highlight' : ''}
				style={{ cursor: isWeb ? 'pointer' : undefined }}
			>
				<IconSymbol name='trash' size={20} color='red' />
			</TouchableOpacity>
		)
	}

	const renderFileInfo = () => {
		if (status === 'completed') {
			return (
				<Text className='text-gray-200 mr-1'>Upload Successful!</Text>
			)
		}

		if (status === 'error') {
			return <Text className='text-orange-300'>{errorMessage}</Text>
		}

		return (
			<View className='flex-row gap-x-2 items-center justify-center'>
				<Text className='text-gray-300 text-md'>
					{convertBytesToMB(size)} MB
				</Text>
				<Text className='text-gray-400 text-sm' numberOfLines={1}>
					{mimeType}
				</Text>
			</View>
		)
	}

	return (
		<View
			className={`bg-white/10 p-4 rounded-xl shadow-md flex-row gap-x-6 items-center ${
				isWeb ? 'file-item-web' : ''
			}`}
		>
			{uri && (
				<Image
					source={{ uri }}
					className='w-24 h-24 rounded-lg'
					resizeMode='cover'
				/>
			)}
			<View className='flex-1'>
				<View className='flex-row justify-between mb-3 pt-2 gap-x-1'>
					<Text
						className='text-white text-lg font-semibold'
						numberOfLines={1}
					>
						{name}
					</Text>
					<View className='flex-row gap-x-3 items-center'>
						{(status === 'uploading' || status === 'paused') && (
							<TouchableOpacity
								onPress={() =>
									status === 'uploading'
										? pauseUpload(id)
										: resumeUpload(id)
								}
								className={isWeb ? 'hover-highlight' : ''}
								style={{
									cursor: isWeb ? 'pointer' : undefined,
								}}
							>
								<IconSymbol
									name={
										status === 'uploading'
											? 'pause'
											: 'play'
									}
									size={20}
									color='white'
								/>
							</TouchableOpacity>
						)}
						{renderStatusIcon()}
					</View>
				</View>

				<View className={isWeb ? 'progress-bar-web' : ''}>
					<Progress.Bar
						progress={uploadedChunks / totalChunks}
						width={null}
						height={isWeb ? 10 : 8}
						color={getProgressColor()}
						borderWidth={0}
						style={{ marginBottom: 16 }}
						unfilledColor='rgba(255, 255, 255, 0.2)'
					/>
				</View>

				<View className='flex-row justify-between mb-2 mt-2'>
					<View className='max-w-64'>{renderFileInfo()}</View>

					{status !== 'queued' && (
						<Text className='text-gray-200'>
							{convertUploadedChunksToPercentage(
								uploadedChunks,
								totalChunks
							)}
							%
						</Text>
					)}
				</View>
			</View>
		</View>
	)
}
