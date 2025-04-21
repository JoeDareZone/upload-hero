import { ScrollView, View } from 'react-native'
import { FileItem } from './FileItem'
import { FilesListProps } from './FilesList'

export const WebFilesList = ({
	files,
	pauseUpload,
	resumeUpload,
	cancelUpload,
}: FilesListProps) => {
	if (files.length === 0) return null

	return (
		<ScrollView style={{ flex: 1, padding: 10 }}>
			<View className='files-grid-web'>
				{files.map(item => (
					<View key={item.id} className='file-item-web'>
						<FileItem
							item={item}
							pauseUpload={pauseUpload}
							resumeUpload={resumeUpload}
							cancelUpload={cancelUpload}
						/>
					</View>
				))}
			</View>
		</ScrollView>
	)
}
