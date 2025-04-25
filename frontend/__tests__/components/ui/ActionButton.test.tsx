import { ActionButton } from '@/components/ui/ActionButton'
import { fireEvent, render } from '@testing-library/react-native'
import React from 'react'
import { ActivityIndicator } from 'react-native'

jest.mock('@/utils/constants', () => ({
	IS_WEB: false,
}))

describe('ActionButton', () => {
	const mockOnPress = jest.fn()

	beforeEach(() => {
		jest.clearAllMocks()
	})

	test('renders Upload text when not uploading or completed', () => {
		const { getByText } = render(
			<ActionButton
				onPress={mockOnPress}
				disabled={false}
				isLoading={false}
				isUploading={false}
				isAllFilesUploaded={false}
			/>
		)

		expect(getByText('Upload')).toBeTruthy()
	})

	test('renders Uploading text when uploading', () => {
		const { getByText } = render(
			<ActionButton
				onPress={mockOnPress}
				disabled={false}
				isLoading={false}
				isUploading={true}
				isAllFilesUploaded={false}
			/>
		)

		expect(getByText('Uploading...')).toBeTruthy()
	})

	test('renders Start Over text when all files uploaded', () => {
		const { getByText } = render(
			<ActionButton
				onPress={mockOnPress}
				disabled={false}
				isLoading={false}
				isUploading={false}
				isAllFilesUploaded={true}
			/>
		)

		expect(getByText('Start Over')).toBeTruthy()
	})

	test('shows loading indicator when isLoading is true', () => {
		const { UNSAFE_getAllByType } = render(
			<ActionButton
				onPress={mockOnPress}
				disabled={false}
				isLoading={true}
				isUploading={false}
				isAllFilesUploaded={false}
			/>
		)

		const activityIndicators = UNSAFE_getAllByType(ActivityIndicator)
		expect(activityIndicators.length).toBeGreaterThan(0)
	})

	test('calls onPress when button is pressed', () => {
		const { getByText } = render(
			<ActionButton
				onPress={mockOnPress}
				disabled={false}
				isLoading={false}
				isUploading={false}
				isAllFilesUploaded={false}
			/>
		)

		fireEvent.press(getByText('Upload'))
		expect(mockOnPress).toHaveBeenCalledTimes(1)
	})

	test('disables button when disabled prop is true', () => {
		const { getByText } = render(
			<ActionButton
				onPress={mockOnPress}
				disabled={true}
				isLoading={false}
				isUploading={false}
				isAllFilesUploaded={false}
			/>
		)

		fireEvent.press(getByText('Upload'))
		expect(mockOnPress).not.toHaveBeenCalled()
	})
})
