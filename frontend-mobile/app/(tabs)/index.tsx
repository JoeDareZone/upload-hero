import * as DocumentPicker from 'expo-document-picker'
import { useState } from 'react'
import { Button, Text, View } from 'react-native'

export default function HomeScreen() {
	const [file, setFile] =
		useState<DocumentPicker.DocumentPickerResult | null>(null)

	const pickDocument = async () => {
		let result = await DocumentPicker.getDocumentAsync({
			type: 'image/*,video/*',
			copyToCacheDirectory: true,
			multiple: true,
		})

		if (result) {
			setFile(result)
		}
	}

	return (
		<View className='flex-1 justify-center items-center'>
			<Button title='Pick a file' onPress={pickDocument} />
			{file && (
				<View>
					<Text>File name: {file.assets?.[0]?.name}</Text>
					<Text>File type: {file.assets?.[0]?.mimeType}</Text>
				</View>
			)}
		</View>
	)
}
