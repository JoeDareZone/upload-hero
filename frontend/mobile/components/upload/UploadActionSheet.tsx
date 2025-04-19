import AndroidActionSheet from '@/components/ui/AndroidActionSheet'
import { useState } from 'react'
import { ActionSheetIOS, Platform } from 'react-native'

type UploadActionSheetProps = {
	onPickDocuments: () => void
	onTakePhoto: () => void
}

export const useUploadActionSheet = ({
	onPickDocuments,
	onTakePhoto,
}: UploadActionSheetProps) => {
	const [androidActionSheetVisible, setAndroidActionSheetVisible] =
		useState(false)

	const showActionSheet = () => {
		if (Platform.OS === 'ios') {
			ActionSheetIOS.showActionSheetWithOptions(
				{
					options: ['Cancel', 'Choose from Library', 'Take Photo'],
					cancelButtonIndex: 0,
				},
				buttonIndex => {
					if (buttonIndex === 1) onPickDocuments()
					else if (buttonIndex === 2) onTakePhoto()
				}
			)
		} else {
			setAndroidActionSheetVisible(true)
		}
	}

	const actionSheetOptions = [
		{ label: 'Choose from Library', onPress: onPickDocuments },
		{ label: 'Take Photo', onPress: onTakePhoto },
	]

	const ActionSheetComponent = () => (
		<AndroidActionSheet
			visible={androidActionSheetVisible}
			onClose={() => setAndroidActionSheetVisible(false)}
			options={actionSheetOptions}
		/>
	)

	return {
		showActionSheet,
		ActionSheetComponent,
	}
}
