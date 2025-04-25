import { render } from '@testing-library/react-native'
import React from 'react'
import { ActionButton } from '../../../components/ui/ActionButton'

jest.mock('@/utils/constants', () => ({
	IS_WEB: false,
}))

describe('ActionButton', () => {
	const mockOnPress = jest.fn()

	beforeEach(() => {
		mockOnPress.mockClear()
	})

	test('renders correctly when enabled', () => {
		const { getByText } = render(
			<ActionButton
				onPress={mockOnPress}
				disabled={false}
				isLoading={false}
				isUploading={false}
			/>
		)

		expect(getByText('Upload')).toBeTruthy()
	})

	test('shows uploading text when isUploading is true', () => {
		const { getByText } = render(
			<ActionButton
				onPress={mockOnPress}
				disabled={false}
				isLoading={false}
				isUploading={true}
			/>
		)

		expect(getByText('Uploading...')).toBeTruthy()
	})

	test('shows Start Over text when isAllFilesUploaded is true', () => {
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
})
