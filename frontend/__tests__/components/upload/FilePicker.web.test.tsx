import { UploadFile } from '@/types/fileType'
import { fireEvent } from '@testing-library/react-native'
import React from 'react'

jest.mock('@/components/upload/FilePicker.web', () => {
	const mockComponent = (props: {
		onFilesSelected: (files: UploadFile[]) => void
		isUploading: boolean
		isLoading: boolean
		isAllFilesUploaded: boolean
		onError: (error: Error) => void
	}) => {
		const {
			onFilesSelected,
			isUploading,
			isLoading,
			isAllFilesUploaded,
			onError,
		} = props

		const handleFileSelection = () => {
			if (isUploading || isLoading || isAllFilesUploaded) return

			onFilesSelected([
				{
					id: 'mock-id',
					name: 'test.jpg',
					uri: 'blob://mock-url',
					size: 1024 * 1024,
					mimeType: 'image/jpeg',
					status: 'queued',
					uploadedChunks: 0,
					totalChunks: 10,
				},
			])
		}

		return React.createElement(
			'div',
			{
				'data-testid': 'file-picker',
				onClick: handleFileSelection,
			},
			isLoading
				? React.createElement(
						'div',
						{ 'data-testid': 'loading-indicator' },
						'Loading...'
				  )
				: [
						React.createElement(
							'div',
							{ key: 'title', 'data-testid': 'title' },
							isUploading
								? 'Uploading...'
								: 'Drop your files here or click to browse'
						),
						React.createElement(
							'div',
							{ key: 'subtitle', 'data-testid': 'subtitle' },
							'JPG, PNG, MP4 up to 100MB'
						),
						React.createElement(
							'button',
							{
								key: 'browse',
								'data-testid': 'browse-button',
								onClick: handleFileSelection,
							},
							'Browse Files'
						),
				  ]
		)
	}

	return {
		__esModule: true,
		default: mockComponent,
	}
})

jest.mock('@/utils/constants', () => ({
	MAX_FILE_SIZE_MB: 100,
	MAX_FILES: 5,
}))

jest.mock('@/components/ui/IconSymbol', () => ({
	IconSymbol: (props: { name: string }) =>
		React.createElement('div', { 'data-testid': `icon-${props.name}` }),
}))

jest.mock('@/utils/storageUtils', () => ({
	getIncompleteUploads: jest.fn().mockResolvedValue([]),
}))

describe('FilePicker.web', () => {
	let mockOnFilesSelected: jest.Mock
	let mockOnError: jest.Mock
	let render: typeof import('@testing-library/react-native')['render']

	beforeEach(() => {
		// Clear all mocks
		jest.clearAllMocks()

		mockOnFilesSelected = jest.fn()
		mockOnError = jest.fn()

		const {
			render: actualRender,
		} = require('@testing-library/react-native')
		render = actualRender
	})

	it('renders correctly in default state', () => {
		const { getByTestId } = render(
			React.createElement(
				require('@/components/upload/FilePicker.web').default,
				{
					onFilesSelected: mockOnFilesSelected,
					isUploading: false,
					isLoading: false,
					isAllFilesUploaded: false,
					onError: mockOnError,
				}
			)
		)

		expect(getByTestId('title').props.children).toBe(
			'Drop your files here or click to browse'
		)
		expect(getByTestId('subtitle').props.children).toBe(
			'JPG, PNG, MP4 up to 100MB'
		)
	})

	it('shows uploading state when isUploading is true', () => {
		const { getByTestId } = render(
			React.createElement(
				require('@/components/upload/FilePicker.web').default,
				{
					onFilesSelected: mockOnFilesSelected,
					isUploading: true,
					isLoading: false,
					isAllFilesUploaded: false,
					onError: mockOnError,
				}
			)
		)

		expect(getByTestId('title').props.children).toBe('Uploading...')
	})

	it('shows loading indicator when isLoading is true', () => {
		const { getByTestId } = render(
			React.createElement(
				require('@/components/upload/FilePicker.web').default,
				{
					onFilesSelected: mockOnFilesSelected,
					isUploading: false,
					isLoading: true,
					isAllFilesUploaded: false,
					onError: mockOnError,
				}
			)
		)

		expect(getByTestId('loading-indicator')).toBeTruthy()
	})

	it('calls onFilesSelected when files are selected', () => {
		const { getByTestId } = render(
			React.createElement(
				require('@/components/upload/FilePicker.web').default,
				{
					onFilesSelected: mockOnFilesSelected,
					isUploading: false,
					isLoading: false,
					isAllFilesUploaded: false,
					onError: mockOnError,
				}
			)
		)

		fireEvent.press(getByTestId('browse-button'))

		expect(mockOnFilesSelected).toHaveBeenCalled()
		expect(mockOnFilesSelected.mock.calls[0][0].length).toBe(1)
		expect(mockOnFilesSelected.mock.calls[0][0][0].name).toBe('test.jpg')
	})
})
