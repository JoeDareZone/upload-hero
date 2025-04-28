import WebFilesList from '@/components/upload/FilesList.web'
import { UploadFile } from '@/types/fileType'
import { render } from '@testing-library/react-native'
import React from 'react'

// Mock the FileItem component
jest.mock('@/components/upload/FileItem', () => ({
	FileItem: ({ item, pauseUpload, resumeUpload, cancelUpload }) => (
		<mock-file-item
			testID={`file-item-${item.id}`}
			name={item.name}
			pauseUpload={pauseUpload}
			resumeUpload={resumeUpload}
			cancelUpload={cancelUpload}
			data-item={JSON.stringify(item)}
		/>
	),
}))

describe('WebFilesList', () => {
	const mockPauseUpload = jest.fn()
	const mockResumeUpload = jest.fn()
	const mockCancelUpload = jest.fn()

	const mockFiles: UploadFile[] = [
		{
			id: 'file-1',
			name: 'test-file-1.jpg',
			uri: 'file://test/test-file-1.jpg',
			size: 1024 * 1024,
			mimeType: 'image/jpeg',
			status: 'uploading',
			uploadedChunks: 5,
			totalChunks: 10,
		} as UploadFile,
		{
			id: 'file-2',
			name: 'test-file-2.jpg',
			uri: 'file://test/test-file-2.jpg',
			size: 2 * 1024 * 1024,
			mimeType: 'image/jpeg',
			status: 'completed',
			uploadedChunks: 10,
			totalChunks: 10,
		} as UploadFile,
	]

	beforeEach(() => {
		jest.clearAllMocks()
	})

	test('renders a list of files', () => {
		const { getAllByTestId } = render(
			<WebFilesList
				files={mockFiles}
				pauseUpload={mockPauseUpload}
				resumeUpload={mockResumeUpload}
				cancelUpload={mockCancelUpload}
			/>
		)

		const fileItems = getAllByTestId(/^file-item-/)
		expect(fileItems).toHaveLength(2)
		expect(fileItems[0].props['data-item']).toContain('test-file-1.jpg')
		expect(fileItems[1].props['data-item']).toContain('test-file-2.jpg')
	})

	test('returns null when no files are provided', () => {
		const { UNSAFE_root } = render(
			<WebFilesList
				files={[]}
				pauseUpload={mockPauseUpload}
				resumeUpload={mockResumeUpload}
				cancelUpload={mockCancelUpload}
			/>
		)

		expect(UNSAFE_root.children.length).toBe(0)
	})

	test('passes correct props to FileItem components', () => {
		const { getByTestId } = render(
			<WebFilesList
				files={[mockFiles[0]]}
				pauseUpload={mockPauseUpload}
				resumeUpload={mockResumeUpload}
				cancelUpload={mockCancelUpload}
			/>
		)

		const fileItem = getByTestId(`file-item-${mockFiles[0].id}`)
		expect(fileItem.props.pauseUpload).toBe(mockPauseUpload)
		expect(fileItem.props.resumeUpload).toBe(mockResumeUpload)
		expect(fileItem.props.cancelUpload).toBe(mockCancelUpload)
		expect(fileItem.props.name).toBe(mockFiles[0].name)
	})
})
