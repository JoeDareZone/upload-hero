import { render } from '@testing-library/react-native'
import React from 'react'
import { ErrorDisplay } from '../../../components/ui/ErrorDisplay'

describe('ErrorDisplay', () => {
	test('renders nothing when there are no errors', () => {
		const { toJSON } = render(<ErrorDisplay errors={[]} />)
		expect(toJSON()).toBeNull()
	})

	test('renders correctly with a single error', () => {
		const { getByText } = render(<ErrorDisplay errors={['Test error']} />)
		expect(getByText('Test error')).toBeTruthy()
	})

	test('renders correctly with multiple errors', () => {
		const { getByText } = render(
			<ErrorDisplay errors={['Error 1', 'Error 2']} />
		)

		expect(getByText('Error 1')).toBeTruthy()
		expect(getByText('Error 2')).toBeTruthy()
	})
})
