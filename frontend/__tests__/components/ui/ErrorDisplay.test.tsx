import { ErrorDisplay } from '@/components/ui/ErrorDisplay'
import { render } from '@testing-library/react-native'
import React from 'react'

describe('ErrorDisplay', () => {
	test('renders errors correctly', () => {
		const errors = ['Error 1', 'Error 2']
		const { getByText } = render(<ErrorDisplay errors={errors} />)

		expect(getByText('Error 1')).toBeTruthy()
		expect(getByText('Error 2')).toBeTruthy()
	})

	test('renders multiple errors', () => {
		const errors = ['Error 1', 'Error 2', 'Error 3']
		const { getAllByText } = render(<ErrorDisplay errors={errors} />)

		const errorElements = getAllByText(/Error \d/)
		expect(errorElements).toHaveLength(3)
	})

	test('does not render when there are no errors', () => {
		const { toJSON } = render(<ErrorDisplay errors={[]} />)
		expect(toJSON()).toBeNull()
	})
})
