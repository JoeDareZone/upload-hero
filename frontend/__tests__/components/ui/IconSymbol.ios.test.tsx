import { IconSymbol } from '@/components/ui/IconSymbol.ios'
import { render } from '@testing-library/react-native'
import React from 'react'
import { Platform } from 'react-native'

Platform.OS = 'ios'

jest.mock('expo-symbols', () => {
	return {
		SymbolView: jest.fn(() => null),
		SymbolWeight: {
			regular: 'regular',
			medium: 'medium',
			bold: 'bold',
		},
	}
})

const mockExpoSymbols = require('expo-symbols')

describe('IconSymbol (iOS)', () => {
	beforeEach(() => {
		jest.clearAllMocks()
	})

	test('renders with default size and weight', () => {
		render(<IconSymbol name='pause' color='red' />)

		expect(mockExpoSymbols.SymbolView).toHaveBeenCalledWith(
			expect.objectContaining({
				name: 'pause',
				tintColor: 'red',
				weight: 'regular',
				style: expect.arrayContaining([
					expect.objectContaining({
						width: 24,
						height: 24,
					}),
				]),
			}),
			expect.anything()
		)
	})

	test('renders with custom size', () => {
		render(<IconSymbol name='play' color='blue' size={32} />)

		expect(mockExpoSymbols.SymbolView).toHaveBeenCalledWith(
			expect.objectContaining({
				name: 'play',
				style: expect.arrayContaining([
					expect.objectContaining({
						width: 32,
						height: 32,
					}),
				]),
			}),
			expect.anything()
		)
	})

	test('renders with custom weight', () => {
		render(<IconSymbol name='trash' color='green' weight='bold' />)

		expect(mockExpoSymbols.SymbolView).toHaveBeenCalledWith(
			expect.objectContaining({
				weight: 'bold',
			}),
			expect.anything()
		)
	})

	test('renders with custom style', () => {
		const customStyle = { opacity: 0.5 }
		render(
			<IconSymbol
				name='checkmark.circle.fill'
				color='yellow'
				style={customStyle}
			/>
		)

		expect(mockExpoSymbols.SymbolView).toHaveBeenCalledWith(
			expect.objectContaining({
				style: expect.arrayContaining([expect.anything(), customStyle]),
			}),
			expect.anything()
		)
	})

	test('sets correct props for Symbol component', () => {
		render(<IconSymbol name='house.fill' color='black' />)

		expect(mockExpoSymbols.SymbolView).toHaveBeenCalledWith(
			expect.objectContaining({
				resizeMode: 'scaleAspectFit',
			}),
			expect.anything()
		)
	})
})
