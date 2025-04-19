import { IconSymbol } from '@/components/ui/IconSymbol'
import { UploadFile } from '@/types/fileType'
import {
	convertBytesToMB,
	convertUploadedChunksToPercentage,
} from '@/utils/helpers'
import { Image, Text, TouchableOpacity, View } from 'react-native'
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
}: FileItemProps) => (
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
					{(item.status === 'uploading' ||
						item.status === 'paused') && (
						<TouchableOpacity
							onPress={() =>
								item.status === 'uploading'
									? pauseUpload(item.id)
									: resumeUpload(item.id)
							}
						>
							<IconSymbol
								name={
									item.status === 'uploading'
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
					) : item.status === 'error' ? (
						<IconSymbol
							name='exclamationmark.triangle.fill'
							size={22}
							color='orange'
						/>
					) : (
						<TouchableOpacity onPress={() => cancelUpload(item.id)}>
							<IconSymbol name='trash' size={20} color='red' />
						</TouchableOpacity>
					)}
				</View>
			</View>
			<Progress.Bar
				progress={item.uploadedChunks / item.totalChunks}
				width={null}
				height={8}
				color={
					item.status === 'uploading'
						? 'lightblue'
						: item.status === 'error'
						? 'orange'
						: item.uploadedChunks === item.totalChunks
						? 'green'
						: 'grey'
				}
				borderWidth={0}
				style={{ marginBottom: 16 }}
				unfilledColor='rgba(255, 255, 255, 0.2)'
			/>

			<View className='flex-row justify-between mb-2'>
				<View className='max-w-64'>
					{item.status === 'completed' ? (
						<Text className='text-gray-200'>Upload Successful!</Text>
					) : item.status === 'error' ? (
						<Text className='text-orange-300'>{item.errorMessage}</Text>
					) : (
						<View className='flex-row gap-x-2'>
							<Text className='text-gray-300 text-md'>
								{convertBytesToMB(item.size)} MB
							</Text>
							<Text
								className='text-gray-400 text-sm'
								numberOfLines={1}
							>
								{item.mimeType}
							</Text>
						</View>
					)}
				</View>

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
)
