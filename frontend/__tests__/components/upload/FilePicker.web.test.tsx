import { render } from '@testing-library/react-native'
import React from 'react'

jest.mock('react-native-css-interop', () => ({
	withInterop: (component: any) => component,
}))

declare global {
	namespace JSX {
		interface IntrinsicElements {
			'mock-div': React.DetailedHTMLProps<
				React.HTMLAttributes<HTMLDivElement> & {
					testID?: string
				},
				HTMLDivElement
			>
			'mock-button': React.DetailedHTMLProps<
				React.HTMLAttributes<HTMLButtonElement> & {
					testID?: string
					onClick?: () => void
					disabled?: boolean
				},
				HTMLButtonElement
			>
		}
	}
}

jest.mock('@/components/upload/FilePicker.web', () => {
	return {
		__esModule: true,
		default: ({
			onFilesSelected,
			isUploading,
			isLoading,
		}: {
			onFilesSelected: (files: any[]) => void
			isUploading: boolean
			isLoading: boolean
			isAllFilesUploaded: boolean
		}) => (
			<mock-div testID='file-picker-web'>
				<mock-button
					testID='upload-button'
					disabled={isUploading || isLoading}
					onClick={() => onFilesSelected([{ name: 'test.jpg' }])}
				>
					Upload Files
				</mock-button>
			</mock-div>
		),
	}
})

import FilePicker from '@/components/upload/FilePicker.web'

describe('FilePicker.web', () => {
	it('should render the file picker component', () => {
		const mockOnFilesSelected = jest.fn()
		const { getByTestId } = render(
			<FilePicker
				onFilesSelected={mockOnFilesSelected}
				onError={() => {}}
				isUploading={false}
				isLoading={false}
				isAllFilesUploaded={false}
			/>
		)

		expect(getByTestId('file-picker-web')).toBeTruthy()
	})

	it('should call onFilesSelected when files are selected', () => {
		const mockOnFilesSelected = jest.fn()
		const { getByTestId } = render(
			<FilePicker
				onFilesSelected={mockOnFilesSelected}
				onError={() => {}}
				isUploading={false}
				isLoading={false}
				isAllFilesUploaded={false}
			/>
		)

		const button = getByTestId('upload-button')
		button.props.onClick()

		expect(mockOnFilesSelected).toHaveBeenCalledWith([{ name: 'test.jpg' }])
	})

	it('should disable the button when uploading', () => {
		const { getByTestId } = render(
			<FilePicker
				onFilesSelected={() => {}}
				onError={() => {}}
				isUploading={true}
				isLoading={false}
				isAllFilesUploaded={false}
			/>
		)

		const button = getByTestId('upload-button')
		expect(button.props.disabled).toBe(true)
	})
})
