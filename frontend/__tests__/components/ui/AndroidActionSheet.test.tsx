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
	const mockOnClose = jest.fn()
	const mockOption1 = jest.fn()
	const mockOption2 = jest.fn()

	const options = [
		{ label: 'Option 1', onPress: mockOption1 },
		{ label: 'Option 2', onPress: mockOption2 },
	]

	beforeEach(() => {
		jest.clearAllMocks()
	})

	test('renders correctly when visible', () => {
		const { getByText } = render(
			<AndroidActionSheet
				visible={true}
				onClose={mockOnClose}
				options={options}
			/>
		)

		expect(getByText('Option 1')).toBeTruthy()
		expect(getByText('Option 2')).toBeTruthy()
		expect(getByText('Cancel')).toBeTruthy()
	})

	test('does not render when not visible', () => {
		const { queryByText } = render(
			<AndroidActionSheet
				visible={false}
				onClose={mockOnClose}
				options={options}
			/>
		)

		expect(queryByText('Option 1')).toBeNull()
	})

	test('calls onClose when cancel is pressed', () => {
		const { getByText } = render(
			<AndroidActionSheet
				visible={true}
				onClose={mockOnClose}
				options={options}
			/>
		)

		fireEvent.press(getByText('Cancel'))
		expect(mockOnClose).toHaveBeenCalledTimes(1)
	})

	test('calls option.onPress and onClose when an option is pressed', () => {
		const { getByText } = render(
			<AndroidActionSheet
				visible={true}
				onClose={mockOnClose}
				options={options}
			/>
		)

		fireEvent.press(getByText('Option 1'))
		expect(mockOnClose).toHaveBeenCalledTimes(1)
		expect(mockOption1).toHaveBeenCalledTimes(1)
		expect(mockOption2).not.toHaveBeenCalled()
	})

	test('uses custom cancel label when provided', () => {
		const { getByText } = render(
			<AndroidActionSheet
				visible={true}
				onClose={mockOnClose}
				options={options}
				cancelLabel='Close'
			/>
		)

		expect(getByText('Close')).toBeTruthy()
	})
})
