import { render } from '@testing-library/react-native'
import React from 'react'

import RootLayout from '../../app/_layout'

jest.mock('../../global.css', () => ({}), { virtual: true })
jest.mock('../../web-styles.css', () => ({}), { virtual: true })
jest.mock(
	'../../assets/fonts/SpaceMono-Regular.ttf',
	() => 'mocked-font-path',
	{ virtual: true }
)
jest.mock('react-native-reanimated', () => ({}), { virtual: true })

const StackMock = ({ children }: { children: React.ReactNode }) => (
	<>{children}</>
)
StackMock.Screen = ({ name, options }: { name: string; options: object }) => (
	<div data-testid='stack-screen' data-name={name}></div>
)

jest.mock('expo-router', () => ({
	Stack: StackMock,
	__esModule: true,
	default: jest.fn(),
}))

describe('RootLayout', () => {
	const mockHideAsync = jest.requireMock('expo-splash-screen').hideAsync
	const mockPreventAutoHideAsync =
		jest.requireMock('expo-splash-screen').preventAutoHideAsync
	const mockUseFonts = jest.requireMock('expo-font').useFonts

	beforeEach(() => {
		jest.clearAllMocks()
	})

	test('renders correctly when fonts are loaded', () => {
		mockUseFonts.mockReturnValue([true])

		const { toJSON } = render(<RootLayout />)

		expect(mockHideAsync).toHaveBeenCalled()

		expect(toJSON()).not.toBeNull()
	})

	test('returns null when fonts are not loaded', () => {
		mockUseFonts.mockReturnValue([false])

		const { toJSON } = render(<RootLayout />)

		expect(mockHideAsync).not.toHaveBeenCalled()

		expect(toJSON()).toBeNull()
	})

	test('hides splash screen once fonts are loaded', async () => {
		let loadedState = false
		mockUseFonts.mockImplementation(() => {
			return [loadedState]
		})

		let { rerender } = render(<RootLayout />)

		expect(mockHideAsync).not.toHaveBeenCalled()

		loadedState = true
		rerender(<RootLayout />)

		expect(mockHideAsync).toHaveBeenCalled()
	})
})
