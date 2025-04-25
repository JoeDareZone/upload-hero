import AndroidActionSheet from '@/components/ui/AndroidActionSheet'
import { fireEvent, render } from '@testing-library/react-native'
import React from 'react'

jest.mock('react-native', () => {
	const rn = jest.requireActual('react-native')
	return {
		...rn,
		Modal: ({
			children,
			visible,
			onRequestClose,
			...props
		}: {
			children: React.ReactNode
			visible: boolean
			onRequestClose: () => void
			[key: string]: any
		}) => (
			<rn.View
				testID='modal'
				visible={visible}
				onRequestClose={onRequestClose}
				{...props}
			>
				{visible ? children : null}
			</rn.View>
		),
		TouchableOpacity: ({
			children,
			onPress,
			...props
		}: {
			children: React.ReactNode
			onPress: () => void
			[key: string]: any
		}) => (
			<rn.View testID='touchable' onPress={onPress} {...props}>
				{children}
			</rn.View>
		),
	}
})

describe('AndroidActionSheet', () => {
	const mockOptions = [
		{ label: 'Option 1', onPress: jest.fn() },
		{ label: 'Option 2', onPress: jest.fn() },
	]
	const mockOnClose = jest.fn()

	beforeEach(() => {
		jest.clearAllMocks()
	})

	test('renders correctly when visible', () => {
		const { getByText } = render(
			<AndroidActionSheet
				visible={true}
				onClose={mockOnClose}
				options={mockOptions}
			/>
		)

		expect(getByText('Option 1')).toBeTruthy()
		expect(getByText('Option 2')).toBeTruthy()
		expect(getByText('Cancel')).toBeTruthy()
	})

	test('handles visibility prop', () => {
		const { rerender, queryByText } = render(
			<AndroidActionSheet
				visible={false}
				onClose={mockOnClose}
				options={mockOptions}
			/>
		)

		expect(queryByText('Option 1')).toBeNull()

		rerender(
			<AndroidActionSheet
				visible={true}
				onClose={mockOnClose}
				options={mockOptions}
			/>
		)

		expect(queryByText('Option 1')).toBeTruthy()
	})

	test('calls onClose when clicking an option', () => {
		const { getByText } = render(
			<AndroidActionSheet
				visible={true}
				onClose={mockOnClose}
				options={mockOptions}
			/>
		)

		fireEvent.press(getByText('Option 1'))
		expect(mockOptions[0].onPress).toHaveBeenCalledTimes(1)
		expect(mockOnClose).toHaveBeenCalledTimes(1)
	})

	test('calls onClose when clicking the cancel button', () => {
		const { getByText } = render(
			<AndroidActionSheet
				visible={true}
				onClose={mockOnClose}
				options={mockOptions}
			/>
		)

		fireEvent.press(getByText('Cancel'))
		expect(mockOnClose).toHaveBeenCalledTimes(1)
	})

	test('supports custom cancel label', () => {
		const { getByText } = render(
			<AndroidActionSheet
				visible={true}
				onClose={mockOnClose}
				options={mockOptions}
				cancelLabel='Close'
			/>
		)

		expect(getByText('Close')).toBeTruthy()
	})
})
