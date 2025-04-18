import React from 'react'
import { Modal, Text, TouchableOpacity, View } from 'react-native'

interface AndroidActionSheetProps {
	visible: boolean
	onClose: () => void
	options: {
		label: string
		onPress: () => void
	}[]
	cancelLabel?: string
}

export default function AndroidActionSheet({
	visible,
	onClose,
	options,
	cancelLabel = 'Cancel',
}: AndroidActionSheetProps) {
	return (
		<Modal
			transparent={true}
			visible={visible}
			animationType='slide'
			onRequestClose={onClose}
		>
			<TouchableOpacity
				style={{ flex: 1, justifyContent: 'flex-end' }}
				activeOpacity={1}
				onPress={onClose}
			>
				<View className='bg-gray-800 rounded-t-2xl p-4'>
					<View className='w-12 h-1 bg-gray-500 rounded-full self-center mb-4' />

					{options.map((option, index) => (
						<TouchableOpacity
							key={index}
							className='p-4 border-b border-gray-700'
							onPress={() => {
								onClose()
								option.onPress()
							}}
						>
							<Text className='text-white text-lg font-medium'>
								{option.label}
							</Text>
						</TouchableOpacity>
					))}

					<TouchableOpacity className='p-4 mt-2' onPress={onClose}>
						<Text className='text-gray-400 text-lg font-medium text-center'>
							{cancelLabel}
						</Text>
					</TouchableOpacity>
				</View>
			</TouchableOpacity>
		</Modal>
	)
}
