import { IS_WEB } from '@/utils/constants'
import React from 'react'
import { Text, View } from 'react-native'
import * as Progress from 'react-native-progress'

interface OverallProgressProps {
	totalChunks: number
	overallUploadProgress: number
	isAllFilesUploaded: boolean
	hasErrorFiles: boolean
}

export const OverallProgress = ({
	totalChunks,
	overallUploadProgress,
	isAllFilesUploaded,
	hasErrorFiles,
}: OverallProgressProps) => {
	if (totalChunks === 0) return null

	return (
		<View className='mb-4'>
			<Text className='text-gray-200 text-base font-semibold mb-2'>
				{isAllFilesUploaded
					? hasErrorFiles
						? 'Files uploaded with errors'
						: 'All files uploaded successfully!'
					: 'Overall Progress'}
			</Text>
			<View className={IS_WEB ? 'progress-bar-web' : ''}>
				<Progress.Bar
					progress={overallUploadProgress}
					width={null}
					height={IS_WEB ? 12 : 10}
					color={
						isAllFilesUploaded
							? hasErrorFiles
								? 'orange'
								: 'green'
							: 'lightblue'
					}
					borderWidth={0}
					unfilledColor='rgba(255,255,255,0.1)'
				/>
			</View>
		</View>
	)
}
