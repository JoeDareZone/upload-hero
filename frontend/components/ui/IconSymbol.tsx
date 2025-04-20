// This file is a fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { SymbolWeight } from 'expo-symbols'
import React from 'react'
import { OpaqueColorValue, StyleProp, TextStyle } from 'react-native'

// Add your SFSymbol to MaterialIcons mappings here.
const MAPPING = {
	// See MaterialIcons here: https://icons.expo.fyi
	// See SF Symbols in the SF Symbols app on Mac.
	'house.fill': 'home',
	'paperplane.fill': 'send',
	'chevron.left.forwardslash.chevron.right': 'code',
	'chevron.right': 'chevron-right',
	// Additional mappings for Android
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

// List of available MaterialIcons names
// You can find the complete list at: https://icons.expo.fyi/Index/MaterialIcons

export type IconSymbolName = keyof typeof MAPPING

/**
 * An icon component that uses native SFSymbols on iOS, and MaterialIcons on Android and web. This ensures a consistent look across platforms, and optimal resource usage.
 *
 * Icon `name`s are based on SFSymbols and require manual mapping to MaterialIcons.
 */
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
	// Make sure the mapping exists
	const iconName = MAPPING[name]
	if (!iconName) {
		console.warn(`Icon mapping not found for "${name}"`)
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
