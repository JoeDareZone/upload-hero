import WebFilesList from '@/components/upload/FilesList.web'
import { UploadFile } from '@/types/fileType'
import { render } from '@testing-library/react-native'
import React from 'react'

declare global {
	namespace JSX {
		interface IntrinsicElements {
			'mock-file-item-web': React.DetailedHTMLProps<
				React.HTMLAttributes<HTMLElement> & {
					name: string
					id: string
					pause: () => void
					resume: () => void
					cancel: () => void
					'data-item': string
				},
				HTMLElement
			>
		}
	}
}

jest.mock('@/components/upload/FileItem', () => ({
	FileItem: ({
		item,
		pauseUpload,
		resumeUpload,
		cancelUpload,
	}: {
		item: { name: string; id: string }
		pauseUpload: () => void
		resumeUpload: () => void
		cancelUpload: () => void
	}) => (
		<mock-file-item-web
			name={item.name}
			id={item.id}
			pause={pauseUpload}
			resume={resumeUpload}
			cancel={cancelUpload}
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

	const MockFileItem = 'mock-file-item-web' as any

	test('renders a list of files', () => {
		const { UNSAFE_getAllByType } = render(
			<WebFilesList
				files={mockFiles}
				pauseUpload={mockPauseUpload}
				resumeUpload={mockResumeUpload}
				cancelUpload={mockCancelUpload}
			/>
		)

		const fileItems = UNSAFE_getAllByType(MockFileItem)
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
		const { UNSAFE_getAllByType } = render(
			<WebFilesList
				files={[mockFiles[0]]}
				pauseUpload={mockPauseUpload}
				resumeUpload={mockResumeUpload}
				cancelUpload={mockCancelUpload}
			/>
		)

		const fileItem = UNSAFE_getAllByType(MockFileItem)[0]
		expect(fileItem.props.pause).toBe(mockPauseUpload)
		expect(fileItem.props.resume).toBe(mockResumeUpload)
		expect(fileItem.props.cancel).toBe(mockCancelUpload)
		expect(fileItem.props.name).toBe(mockFiles[0].name)
	})
})
