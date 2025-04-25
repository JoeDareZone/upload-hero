import { fireEvent, render } from '@testing-library/react-native'
import React from 'react'
import { ClearAllButton } from '../../../components/ui/ClearAllButton'

describe('ClearAllButton', () => {
	test('renders correctly', () => {
		const mockOnClearAll = jest.fn()
		const { getByText } = render(
			<ClearAllButton isUploading={false} onClearAll={mockOnClearAll} />
		)

		expect(getByText('Clear All')).toBeTruthy()
	})

	test('does not allow clearing when isUploading is true', () => {
		const mockOnClearAll = jest.fn()
		const { getByText } = render(
			<ClearAllButton isUploading={true} onClearAll={mockOnClearAll} />
		)

		fireEvent.press(getByText('Clear All'))
		expect(mockOnClearAll).not.toHaveBeenCalled()
	})

	test('calls onClearAll when pressed', () => {
		const mockOnClearAll = jest.fn()
		const { getByText } = render(
			<ClearAllButton isUploading={false} onClearAll={mockOnClearAll} />
		)

		fireEvent.press(getByText('Clear All'))
		expect(mockOnClearAll).toHaveBeenCalledTimes(1)
	})
})
