import { render } from '@testing-library/react-native'
import React from 'react'
import { OverallProgress } from '../../../components/upload/UploadProgress'

jest.mock('@/utils/constants', () => ({
	IS_WEB: false,
}))

describe('OverallProgress', () => {
	test('renders correctly with in-progress upload', () => {
		const { getByText } = render(
			<OverallProgress
				totalChunks={10}
				overallUploadProgress={0.5}
				isAllFilesUploaded={false}
				hasErrorFiles={false}
			/>
		)

		expect(getByText('Overall Progress')).toBeTruthy()
	})

	test('renders correctly when all files uploaded successfully', () => {
		const { getByText } = render(
			<OverallProgress
				totalChunks={10}
				overallUploadProgress={1.0}
				isAllFilesUploaded={true}
				hasErrorFiles={false}
			/>
		)

		expect(getByText('All files uploaded successfully!')).toBeTruthy()
	})

	test('renders correctly when files uploaded with errors', () => {
		const { getByText } = render(
			<OverallProgress
				totalChunks={10}
				overallUploadProgress={1.0}
				isAllFilesUploaded={true}
				hasErrorFiles={true}
			/>
		)

		expect(getByText('Files uploaded with errors')).toBeTruthy()
	})

	test('does not render when totalChunks is 0', () => {
		const { toJSON } = render(
			<OverallProgress
				totalChunks={0}
				overallUploadProgress={0}
				isAllFilesUploaded={false}
				hasErrorFiles={false}
			/>
		)

		expect(toJSON()).toBeNull()
	})
})
