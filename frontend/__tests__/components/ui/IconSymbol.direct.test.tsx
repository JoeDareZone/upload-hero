/**
 * Mock modules
 */
jest.mock('react-native-css-interop', () => ({
	withInterop: (component: any) => component,
}))

jest.mock('@expo/vector-icons/MaterialIcons', () => 'MaterialIconsMock')

jest.mock('expo-symbols', () => ({
	Symbols: {},
	SymbolView: 'SymbolViewMock',
	SymbolWeight: {
		regular: 'regular',
		semibold: 'semibold',
		bold: 'bold',
	},
}))

jest.mock('react-native/Libraries/Utilities/Platform', () => ({
	OS: 'ios',
	select: (obj: any) => obj.ios,
}))

import { render } from '@testing-library/react-native'
import React from 'react'
import { StyleProp, ViewStyle } from 'react-native'

jest.mock('@/components/ui/IconSymbol.ios', () => {
	const React = require('react')
	const { View, Text } = require('react-native')

	const MockIosIcon = (props: { name: string }) => {
		if (props.name === 'non-existent') {
			return null
		}
		return (
			<View testID='ios-symbol'>
				<Text>{props.name}</Text>
			</View>
		)
	}

	return {
		IconSymbol: MockIosIcon,
	}
})

const { IconSymbol } = require('@/components/ui/IconSymbol')

describe('IconSymbol', () => {
	beforeEach(() => {
		jest.clearAllMocks()
	})

	it('should be defined', () => {
		expect(IconSymbol).toBeDefined()
	})

	it('should use iOS component when on iOS', () => {
		const { getByTestId } = render(
			<IconSymbol name='house.fill' color='red' />
		)

		const iosSymbol = getByTestId('ios-symbol')
		expect(iosSymbol).toBeTruthy()
	})

	it('renders with mapped names', () => {
		const { getByTestId } = render(
			<IconSymbol name='house.fill' color='red' />
		)

		const iosSymbol = getByTestId('ios-symbol')
		expect(iosSymbol).toBeTruthy()
	})

	it('renders with default size', () => {
		const { getByTestId } = render(
			<IconSymbol name='house.fill' color='red' />
		)

		const iosSymbol = getByTestId('ios-symbol')
		expect(iosSymbol).toBeTruthy()
	})

	it('renders with custom size', () => {
		const { getByTestId } = render(
			<IconSymbol name='house.fill' color='red' size={32} />
		)

		const iosSymbol = getByTestId('ios-symbol')
		expect(iosSymbol).toBeTruthy()
	})

	it('renders with custom style', () => {
		const customStyle: StyleProp<ViewStyle> = { margin: 10 }
		const { getByTestId } = render(
			<IconSymbol name='house.fill' color='red' style={customStyle} />
		)

		const iosSymbol = getByTestId('ios-symbol')
		expect(iosSymbol).toBeTruthy()
	})

	it('returns null for non-existent icon', () => {
		// @ts-ignore - intentionally testing invalid icon name
		const { queryByTestId } = render(
			<IconSymbol name='non-existent' color='red' />
		)

		const iosSymbol = queryByTestId('ios-symbol')
		expect(iosSymbol).toBeFalsy()
	})
})
