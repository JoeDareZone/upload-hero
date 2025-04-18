import { ActivityIndicator, Text, TouchableOpacity } from 'react-native'

type ActionButtonProps = {
	onPress: () => void
	label: string
	disabled?: boolean
	isLoading: boolean
	isUploading: boolean
}

export const ActionButton = ({
	onPress,
	label,
	disabled,
	isLoading,
	isUploading,
}: ActionButtonProps) => (
	<TouchableOpacity
		className={`${
			disabled ? 'bg-gray-500' : 'bg-blue-600'
		} p-4 rounded-xl mb-4 min-w-40 min-h-14 shadow-md active:opacity-80`}
		onPress={onPress}
		disabled={disabled || isUploading}
		style={{ opacity: isLoading || isUploading || disabled ? 0.5 : 1 }}
	>
		{isLoading ? (
			<ActivityIndicator size='small' color='#fff' />
		) : (
			<Text className='text-white text-center text-lg font-medium'>
				{isUploading && label === 'Upload' ? 'Uploading...' : label}
			</Text>
		)}
	</TouchableOpacity>
)
