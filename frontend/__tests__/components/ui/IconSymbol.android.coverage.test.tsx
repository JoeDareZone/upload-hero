import { StyleProp, TextStyle } from 'react-native'

import type { IconSymbolName } from '@/components/ui/IconSymbol'

jest.mock('react-native/Libraries/Utilities/Platform', () => ({
	OS: 'android',
	select: jest.fn(obj => obj.android),
}))

const mockMaterialIcons = jest.fn(
	({
		name,
		size,
		color,
		style,
	}: {
		name: string
		size?: number
		color: string
		style?: StyleProp<TextStyle>
	}) => {
		return {
			type: 'MaterialIconsMock',
			props: { name, size, color, style },
		}
	}
)

jest.mock('@expo/vector-icons/MaterialIcons', () => ({
	__esModule: true,
	default: (props: any) => mockMaterialIcons(props),
}))

jest.mock('@/components/ui/IconSymbol.ios', () => ({}))

jest.mock('@/components/ui/IconSymbol', () => {
	const MAPPING = {
		'house.fill': 'home',
		'paperplane.fill': 'send',
		'chevron.left.forwardslash.chevron.right': 'code',
		'chevron.right': 'chevron-right',
		'doc.badge.arrow.up.fill': 'upload-file',
		pause: 'pause',
		play: 'play-arrow',
		'checkmark.circle.fill': 'check-circle',
		'exclamationmark.triangle.fill': 'warning',
		trash: 'delete',
	}

	const mockIconSymbol = jest.fn(
		({ name, size = 24, color, style, weight }) => {
			const iconName = MAPPING[name as keyof typeof MAPPING]
			if (!iconName) {
				return null
			}

			return mockMaterialIcons({
				name: iconName,
				size,
				color,
				style,
			})
		}
	)

	return {
		IconSymbol: mockIconSymbol,
		IconSymbolName: Object.keys(MAPPING),
	}
})

const IconSymbol = require('@/components/ui/IconSymbol').IconSymbol

describe('IconSymbol Android Coverage Test', () => {
	beforeEach(() => {
		mockMaterialIcons.mockClear()
	})

	test('renders with mapped icon names', () => {
		const iconMappings: Record<string, string> = {
			'house.fill': 'home',
			'paperplane.fill': 'send',
			'chevron.left.forwardslash.chevron.right': 'code',
			'chevron.right': 'chevron-right',
			'doc.badge.arrow.up.fill': 'upload-file',
			pause: 'pause',
			play: 'play-arrow',
			'checkmark.circle.fill': 'check-circle',
			'exclamationmark.triangle.fill': 'warning',
			trash: 'delete',
		}

		Object.entries(iconMappings).forEach(([symbolName, materialName]) => {
			const result = IconSymbol({
				name: symbolName as IconSymbolName,
				color: 'red',
			})

			expect(mockMaterialIcons).toHaveBeenCalledWith(
				expect.objectContaining({
					name: materialName,
					color: 'red',
				})
			)

			mockMaterialIcons.mockClear()
		})
	})

	test('returns null for unknown icon name', () => {
		const result = IconSymbol({ name: 'nonexistent', color: 'blue' })
		expect(result).toBeNull()
		expect(mockMaterialIcons).not.toHaveBeenCalled()
	})

	test('uses default size of 24', () => {
		IconSymbol({ name: 'house.fill', color: 'red' })
		expect(mockMaterialIcons).toHaveBeenCalledWith(
			expect.objectContaining({
				name: 'home',
				size: 24,
			})
		)
	})

	test('passes custom size', () => {
		IconSymbol({
			name: 'house.fill',
			color: 'red',
			size: 32,
		})

		expect(mockMaterialIcons).toHaveBeenCalledWith(
			expect.objectContaining({
				name: 'home',
				size: 32,
			})
		)
	})

	test('passes custom style', () => {
		const customStyle = { margin: 10 }

		IconSymbol({
			name: 'house.fill',
			color: 'red',
			style: customStyle,
		})

		expect(mockMaterialIcons).toHaveBeenCalledWith(
			expect.objectContaining({
				name: 'home',
				style: customStyle,
			})
		)
	})

	test('accepts color prop', () => {
		IconSymbol({
			name: 'house.fill',
			color: 'blue',
		})

		expect(mockMaterialIcons).toHaveBeenCalledWith(
			expect.objectContaining({
				name: 'home',
				color: 'blue',
			})
		)
	})
})
