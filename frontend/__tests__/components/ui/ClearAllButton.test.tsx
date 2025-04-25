import { ClearAllButton } from '@/components/ui/ClearAllButton'
import { fireEvent, render } from '@testing-library/react-native'
import React from 'react'
import { TouchableOpacity } from 'react-native'

jest.mock('@/utils/constants', () => ({
	IS_WEB: false,
}))

describe('ClearAllButton', () => {
	const mockOnClearAll = jest.fn()

	beforeEach(() => {
		jest.clearAllMocks()
	})

	test('renders correctly', () => {
		const { getByText } = render(
			<ClearAllButton isUploading={false} onClearAll={mockOnClearAll} />
		)

		expect(getByText('Clear All')).toBeTruthy()
	})

	test('calls onClearAll when pressed', () => {
		const { getByText } = render(
			<ClearAllButton isUploading={false} onClearAll={mockOnClearAll} />
		)

		fireEvent.press(getByText('Clear All'))
		expect(mockOnClearAll).toHaveBeenCalledTimes(1)
	})

	test('is disabled when uploading', () => {
		const { getByText, UNSAFE_getAllByType } = render(
			<ClearAllButton isUploading={true} onClearAll={mockOnClearAll} />
		)

		const button = UNSAFE_getAllByType(TouchableOpacity)[0]
		expect(button.props.disabled).toBe(true)
		expect(button.props.style.opacity).toBe(0.5)

		fireEvent.press(getByText('Clear All'))
		expect(mockOnClearAll).not.toHaveBeenCalled()
	})
})
