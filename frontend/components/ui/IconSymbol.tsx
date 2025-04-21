import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { SymbolWeight } from 'expo-symbols'
import React from 'react'
import { OpaqueColorValue, StyleProp, TextStyle } from 'react-native'

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
} as Partial<
	Record<
		import('expo-symbols').SymbolViewProps['name'],
		React.ComponentProps<typeof MaterialIcons>['name']
	>
>

export type IconSymbolName = keyof typeof MAPPING

export function IconSymbol({
	name,
	size = 24,
	color,
	style,
	weight,
}: {
	name: IconSymbolName
	size?: number
	color: string | OpaqueColorValue
	style?: StyleProp<TextStyle>
	weight?: SymbolWeight
}) {
	const iconName = MAPPING[name]
	if (!iconName) {
		return null
	}

	return (
		<MaterialIcons
			color={color}
			size={size}
			name={iconName}
			style={style}
		/>
	)
}
