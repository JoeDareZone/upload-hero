import { API_BASE_URL, IS_WEB } from '@/utils/constants'
import React from 'react'
import { Alert, Text, TextInput, TouchableOpacity, View } from 'react-native'

interface RedisTestPanelProps {
	recentUploadIds: string[]
	savedUploadId: string
	setSavedUploadId: (id: string) => void
}

export const RedisTestPanel = ({
	recentUploadIds,
	savedUploadId,
	setSavedUploadId,
}: RedisTestPanelProps) => {
	const testRedisChunks = async () => {
		try {
			if (!savedUploadId) {
				showAlert('Please enter an upload ID to test')
				return
			}

			const endpoint = `${API_BASE_URL}/upload-status/${savedUploadId}`

			const response = await fetch(endpoint)
			const data = await response.json()

			showAlert(
				`Redis Test Results`,
				`Upload ID: ${savedUploadId}\n` +
					`Success: ${data.success}\n` +
					`Chunks received: ${data.chunksReceived || 'N/A'}\n` +
					`Chunk indices: ${
						(data.chunkIndices || []).join(', ') || 'None'
					}`
			)
		} catch (error) {
			showAlert(
				'Error',
				`Failed to test Redis: ${
					error instanceof Error ? error.message : String(error)
				}`
			)
		}
	}

	const showAlert = (title: string, message?: string) =>
		IS_WEB
			? alert(message ? `${title}\n\n${message}` : title)
			: Alert.alert(title, message)

	const copyToClipboard = (id: string) => {
		setSavedUploadId(id)
		if (IS_WEB && navigator.clipboard) {
			navigator.clipboard.writeText(id)
			showAlert('Copied to clipboard')
		}
	}

	return (
		<View className='bg-gray-800 p-4 mb-4 rounded-lg'>
			<Text className='text-white font-bold mb-2'>
				Redis Testing Tools
			</Text>

			<View className='mb-3'>
				<Text className='text-white text-sm mb-1'>
					Recent Upload IDs (tap to use):
				</Text>
				<View className='flex-row flex-wrap'>
					{recentUploadIds.map((id, index) => (
						<TouchableOpacity
							key={index}
							className='bg-gray-700 px-2 py-1 rounded mr-2 mb-1'
							onPress={() => copyToClipboard(id)}
						>
							<Text className='text-blue-300 text-xs'>
								{id.substring(0, 8)}...
							</Text>
						</TouchableOpacity>
					))}
				</View>
			</View>

			<View className='flex-row items-center mb-3'>
				<TextInput
					className='bg-gray-700 text-white px-2 py-1 rounded flex-1 mr-2'
					value={savedUploadId}
					onChangeText={setSavedUploadId}
					placeholder='Enter upload ID here'
					placeholderTextColor='#888'
				/>
				<TouchableOpacity
					onPress={testRedisChunks}
					className='px-3 py-1.5 bg-green-600 rounded-lg'
					disabled={!savedUploadId}
					style={{ opacity: savedUploadId ? 1 : 0.5 }}
				>
					<Text className='text-white font-medium'>Test ID</Text>
				</TouchableOpacity>
			</View>
		</View>
	)
}
