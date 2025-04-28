import { render } from '@testing-library/react-native'
import React from 'react'
import { Platform } from 'react-native'

const isIOS = Platform.OS === 'ios'

const MockSymbolView = (props: any) => <mock-symbol-view {...props} />

jest.mock('expo-symbols', () => ({
	SymbolView: MockSymbolView,
	SymbolWeight: {
		regular: 'regular',
		medium: 'medium',
		bold: 'bold',
	},
}))

import { IconSymbol } from '@/components/ui/IconSymbol'

declare global {
	namespace JSX {
		interface IntrinsicElements {
			'mock-symbol-view': React.DetailedHTMLProps<
				React.HTMLAttributes<HTMLElement> & {
					name: string
					weight: string
					tintColor: string
					resizeMode: string
					style: any
				},
				HTMLElement
			>
		}
	}
}

describe('IconSymbol iOS Implementation', () => {
	beforeEach(() => {
		expect(isIOS).toBe(true)
	})

	test('renders with default size and weight', () => {
		const { UNSAFE_getAllByType } = render(
			<IconSymbol name='pause' color='red' />
		)

		const icon = UNSAFE_getAllByType(MockSymbolView)[0]
		expect(icon.props.name).toBe('pause')
		expect(icon.props.tintColor).toBe('red')
		expect(icon.props.weight).toBe('regular')
		expect(icon.props.style[0].width).toBe(24)
		expect(icon.props.style[0].height).toBe(24)
	})

	test('renders with custom size', () => {
		const { UNSAFE_getAllByType } = render(
			<IconSymbol name='play' color='blue' size={32} />
		)

		const icon = UNSAFE_getAllByType(MockSymbolView)[0]
		expect(icon.props.name).toBe('play')
		expect(icon.props.style[0].width).toBe(32)
		expect(icon.props.style[0].height).toBe(32)
	})

	test('renders with custom weight', () => {
		const { UNSAFE_getAllByType } = render(
			<IconSymbol name='trash' color='green' weight='bold' />
		)

		const icon = UNSAFE_getAllByType(MockSymbolView)[0]
		expect(icon.props.weight).toBe('bold')
	})

	test('renders with custom style', () => {
		const customStyle = { opacity: 0.5 }
		const { UNSAFE_getAllByType } = render(
			<IconSymbol
				name='checkmark.circle.fill'
				color='yellow'
				style={customStyle}
			/>
		)

		const icon = UNSAFE_getAllByType(MockSymbolView)[0]
		expect(icon.props.style[1]).toBe(customStyle)
	})

	test('sets correct props for SymbolView component', () => {
		const { UNSAFE_getAllByType } = render(
			<IconSymbol name='house.fill' color='black' />
		)

		const icon = UNSAFE_getAllByType(MockSymbolView)[0]
		expect(icon.props.resizeMode).toBe('scaleAspectFit')
	})
})
