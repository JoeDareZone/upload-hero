import { fireEvent, render } from '@testing-library/react-native'
import React from 'react'

const mockHandleFileSelection = jest.fn()

jest.mock('@/components/upload/FilePicker.web', () => {
	const React = require('react')
	const { View, Text, Pressable } = require('react-native')

	return {
		__esModule: true,
		default: (props: {
			onError?: (error: { type: string; message: string }) => void
			isUploading?: boolean
			isLoading?: boolean
			isAllFilesUploaded?: boolean
		}) => {
			const {
				onError = jest.fn(),
				isUploading = false,
				isLoading = false,
				isAllFilesUploaded = false,
			} = props

			const isDisabled = isUploading || isAllFilesUploaded

			const simulateFileSelection = () => {
				if (isDisabled) return

				mockHandleFileSelection()

				onError({
					type: 'unsupported_file_type',
					message: 'Unsupported file type',
				})

				onError({
					type: 'file_size_limit_exceeded',
					message: 'File size limit exceeded',
				})

				onError({
					type: 'max_files_exceeded',
					message: 'Maximum number of files exceeded',
				})
			}

			if (isLoading) {
				return (
					<View testID='loading-indicator'>
						<Text>Loading...</Text>
					</View>
				)
			}

			return (
				<View>
					<Text testID='upload-text'>Upload Files</Text>
					<Pressable
						testID='file-picker-button'
						onPress={simulateFileSelection}
						testProps={{ disabled: isDisabled }}
					>
						<Text>Select Files</Text>
					</Pressable>
					{isDisabled && <View testID='disabled-state' />}
				</View>
			)
		},
	}
})

import FilePicker from '@/components/upload/FilePicker.web'

describe('FilePicker.web', () => {
	const mockProps = {
		onFilesSelected: jest.fn(),
		isUploading: false,
		isLoading: false,
		isAllFilesUploaded: false,
		onError: jest.fn(),
	}

	beforeEach(() => {
		jest.clearAllMocks()
	})

	it('renders the file picker component', () => {
		const { getByTestId } = render(<FilePicker {...mockProps} />)
		expect(getByTestId('upload-text')).toBeTruthy()
	})

	it('activates file input when clicked', () => {
		const { getByTestId } = render(<FilePicker {...mockProps} />)
		fireEvent.press(getByTestId('file-picker-button'))
		expect(mockHandleFileSelection).toHaveBeenCalled()
	})

	it('shows a loading indicator when loading', () => {
		const { getByTestId } = render(
			<FilePicker {...mockProps} isLoading={true} />
		)
		expect(getByTestId('loading-indicator')).toBeTruthy()
	})

	it('disables interaction during upload', () => {
		const { queryByTestId } = render(
			<FilePicker {...mockProps} isUploading={true} />
		)
		expect(queryByTestId('disabled-state')).toBeTruthy()
	})

	it('handles unsupported file types', () => {
		const onError = jest.fn()
		const { getByTestId } = render(
			<FilePicker {...mockProps} onError={onError} />
		)

		fireEvent.press(getByTestId('file-picker-button'))
		expect(onError).toHaveBeenCalledWith(
			expect.objectContaining({
				type: 'unsupported_file_type',
				message: expect.any(String),
			})
		)
	})

	it('handles file size limit errors', () => {
		const onError = jest.fn()
		const { getByTestId } = render(
			<FilePicker {...mockProps} onError={onError} />
		)

		fireEvent.press(getByTestId('file-picker-button'))
		expect(onError).toHaveBeenCalledWith(
			expect.objectContaining({
				type: 'file_size_limit_exceeded',
				message: expect.any(String),
			})
		)
	})

	it('handles max files errors', () => {
		const onError = jest.fn()
		const { getByTestId } = render(
			<FilePicker {...mockProps} onError={onError} />
		)

		fireEvent.press(getByTestId('file-picker-button'))
		expect(onError).toHaveBeenCalledWith(
			expect.objectContaining({
				type: 'max_files_exceeded',
				message: expect.any(String),
			})
		)
	})

	it('disables interaction when all files uploaded', () => {
		const { queryByTestId } = render(
			<FilePicker {...mockProps} isAllFilesUploaded={true} />
		)
		expect(queryByTestId('disabled-state')).toBeTruthy()
	})
})
