import { FlatList } from 'react-native'
import { FileItem } from './FileItem'
import { FilesListProps } from './FilesList'

export const NativeFilesList = ({
	files,
	pauseUpload,
	resumeUpload,
	cancelUpload,
}: FilesListProps) => {
	return (
		<FlatList
			data={files}
			keyExtractor={item => item.id}
			contentContainerStyle={{ paddingBottom: 16, gap: 12 }}
			renderItem={({ item }) => (
				<FileItem
					item={item}
					pauseUpload={pauseUpload}
					resumeUpload={resumeUpload}
					cancelUpload={cancelUpload}
				/>
			)}
		/>
	)
}
