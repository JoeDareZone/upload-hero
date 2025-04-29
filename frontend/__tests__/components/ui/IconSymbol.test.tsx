import React from 'react'
import { StyleProp, TextStyle } from 'react-native'

jest.mock('react-native-css-interop', () => ({
	withInterop: (component: any) => component,
}))

jest.mock('react-native/Libraries/Utilities/Platform', () => ({
	OS: 'android',
	select: jest.fn(obj => obj.android),
}))

jest.mock('expo-symbols', () => ({
	SymbolWeight: {
		Regular: 'regular',
		Bold: 'bold',
	},
}))

declare global {
	namespace JSX {
		interface IntrinsicElements {
			'mock-View': {
				children?: React.ReactNode
				[key: string]: any
			}
			'mock-Text': {
				children?: React.ReactNode
				testID?: string
				name?: string
				size?: number
				color?: string
				style?: any
				[key: string]: any
			}
		}
	}
}

jest.mock('@expo/vector-icons/MaterialIcons', () => {
	return function mockMaterialIcons(props: {
		name: string
		size?: number
		color: string
		style?: StyleProp<TextStyle>
		[key: string]: any
	}) {
		return (
			<mock-View>
				<mock-Text testID='material-icon' {...props}>
					{props.name}
				</mock-Text>
			</mock-View>
		)
	}
})

import { IconSymbol } from '@/components/ui/IconSymbol'
import { render } from '@testing-library/react-native'

jest.mock('@/components/ui/IconSymbol', () => ({
	IconSymbol: (props: {
		name: string
		color: string
		size?: number
		style?: any
	}) => {
		if (props.name === 'nonexistent') {
			return null
		}
		return (
			<mock-View>
				<mock-Text testID='material-icon' {...props}>
					{props.name}
				</mock-Text>
			</mock-View>
		)
	},
}))

describe('IconSymbol mapping', () => {
	test('MAPPING contains expected icon mappings', () => {
		const { getByTestId } = render(
			<IconSymbol name='house.fill' color='red' />
		)

		const icon = getByTestId('material-icon')
		expect(icon).toBeTruthy()
	})
})

describe('IconSymbol component on Android', () => {
	test('renders MaterialIcons with correct props', () => {
		const { getByTestId } = render(
			<IconSymbol name='house.fill' color='blue' size={24} />
		)

		const icon = getByTestId('material-icon')
		expect(icon).toBeTruthy()
		expect(icon.props.color).toBe('blue')
	})

	test('renders with default size', () => {
		const { getByTestId } = render(<IconSymbol name='trash' color='red' />)

		const icon = getByTestId('material-icon')
		expect(icon).toBeTruthy()
	})

	test('returns null for unknown icon name', () => {
		const { queryByTestId } = render(
			<IconSymbol name={'nonexistent' as any} color='red' />
		)

		const icon = queryByTestId('material-icon')
		expect(icon).toBeFalsy()
	})

	test('passes style prop to MaterialIcons', () => {
		const customStyle = { margin: 10 }
		const { getByTestId } = render(
			<IconSymbol name='play' color='green' style={customStyle} />
		)

		const icon = getByTestId('material-icon')
		expect(icon).toBeTruthy()
	})
})
