import React from 'react'
import { Platform, Text, TouchableOpacity, View } from 'react-native'

interface ClearAllButtonProps {
	isUploading: boolean
	onClearAll: () => void
}

export const ClearAllButton = ({
	isUploading,
	onClearAll,
}: ClearAllButtonProps) => {
	const isWeb = Platform.OS === 'web'

	return (
		<View className='flex-row justify-end mb-2'>
			<TouchableOpacity
				onPress={onClearAll}
				className={`bg-red-600 px-3 py-1.5 rounded-lg ${
					isWeb ? 'hover-highlight web-clickable' : ''
				}`}
				disabled={isUploading}
				style={{
					opacity: isUploading ? 0.5 : 1,
				}}
			>
				<Text className='text-white font-medium'>Clear All</Text>
			</TouchableOpacity>
		</View>
	)
}
