import FilesList from '@/components/upload/FilesList.native'
import { UploadFile } from '@/types/fileType'
import { render } from '@testing-library/react-native'
import React from 'react'

// Custom element declarations
declare global {
	namespace JSX {
		interface IntrinsicElements {
			'mock-file-item': React.DetailedHTMLProps<
				React.HTMLAttributes<HTMLElement> & {
					name: string
					id: string
					pause: () => void
					resume: () => void
					cancel: () => void
				},
				HTMLElement
			>
		}
	}
}

jest.mock('react-native', () => {
	const rn = jest.requireActual('react-native')
	return {
		...rn,
		FlatList: ({
			data,
			renderItem,
			keyExtractor,
		}: {
			data: any[]
			renderItem: (info: { item: any }) => React.ReactElement
			keyExtractor: (item: any) => string
		}) => (
			<rn.View>
				{data.map((item: any) => (
					<rn.View key={keyExtractor(item)}>
						{renderItem({ item })}
					</rn.View>
				))}
			</rn.View>
		),
	}
})

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
		<mock-file-item
			name={item.name}
			id={item.id}
			pause={pauseUpload}
			resume={resumeUpload}
			cancel={cancelUpload}
		/>
	),
}))

describe('FilesList.native', () => {
	const mockFiles: UploadFile[] = [
		{
			id: 'file-1',
			name: 'test-file-1.jpg',
			uri: 'file://test/test-file-1.jpg',
			size: 1024,
			mimeType: 'image/jpeg',
			status: 'uploading',
			uploadedChunks: 5,
			totalChunks: 10,
		},
		{
			id: 'file-2',
			name: 'test-file-2.pdf',
			uri: 'file://test/test-file-2.pdf',
			size: 2048,
			mimeType: 'application/pdf',
			status: 'completed',
			uploadedChunks: 10,
			totalChunks: 10,
		},
	]

	const mockPauseUpload = jest.fn()
	const mockResumeUpload = jest.fn()
	const mockCancelUpload = jest.fn()

	const MockFileItem = 'mock-file-item' as any

	test('renders file items correctly', () => {
		const { UNSAFE_getAllByType } = render(
			<FilesList
				files={mockFiles}
				pauseUpload={mockPauseUpload}
				resumeUpload={mockResumeUpload}
				cancelUpload={mockCancelUpload}
			/>
		)

		const fileItems = UNSAFE_getAllByType(MockFileItem)
		expect(fileItems).toHaveLength(2)

		expect(fileItems[0].props.id).toBe('file-1')
		expect(fileItems[1].props.id).toBe('file-2')
	})

	test('renders an empty list when no files', () => {
		const { UNSAFE_queryAllByType } = render(
			<FilesList
				files={[]}
				pauseUpload={mockPauseUpload}
				resumeUpload={mockResumeUpload}
				cancelUpload={mockCancelUpload}
			/>
		)

		const fileItems = UNSAFE_queryAllByType(MockFileItem)
		expect(fileItems).toHaveLength(0)
	})

	test('passes handlers to FileItem', () => {
		const { UNSAFE_getAllByType } = render(
			<FilesList
				files={mockFiles}
				pauseUpload={mockPauseUpload}
				resumeUpload={mockResumeUpload}
				cancelUpload={mockCancelUpload}
			/>
		)

		const fileItems = UNSAFE_getAllByType(MockFileItem)
		expect(fileItems[0].props.pause).toBe(mockPauseUpload)
		expect(fileItems[0].props.resume).toBe(mockResumeUpload)
		expect(fileItems[0].props.cancel).toBe(mockCancelUpload)
	})
})
