import { IconSymbol } from '@/components/ui/IconSymbol'
import { MAX_FILE_SIZE_MB } from '@/utils/constants'
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native'
import { FilePickerProps } from './FilePicker'

export default function FilePicker({
	isUploading,
	isLoading,
	isAllFilesUploaded,
	onPressNative,
}: FilePickerProps) {
	return (
		<TouchableOpacity
			onPress={onPressNative}
			className='min-h-48 my-4 justify-center items-center bg-gray-800 py-10 rounded-xl'
			disabled={isUploading || isLoading || isAllFilesUploaded}
			style={{
				opacity:
					isUploading || isLoading || isAllFilesUploaded ? 0.5 : 1,
			}}
		>
			{isLoading ? (
				<ActivityIndicator size='large' color='#fff' />
			) : (
				<View className='items-center gap-y-2'>
					<IconSymbol
						name='doc.badge.arrow.up.fill'
						size={32}
						color={isUploading ? 'gray' : 'white'}
					/>
					<Text className='text-white text-lg font-semibold'>
						{isUploading
							? 'Upload in progress...'
							: 'Press here to upload files'}
					</Text>
					<Text className='text-gray-300 text-sm'>
						Supported formats: JPG, PNG, mp4 (up to{' '}
						{MAX_FILE_SIZE_MB}MB)
					</Text>
				</View>
			)}
		</TouchableOpacity>
	)
}
