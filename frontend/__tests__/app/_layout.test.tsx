import { render } from '@testing-library/react-native'
import React from 'react'

// Import RootLayout to test
import RootLayout from '../../app/_layout'

// Mock the require for the font and css
jest.mock('../../global.css', () => ({}), { virtual: true })
jest.mock('../../web-styles.css', () => ({}), { virtual: true })
jest.mock(
	'../../assets/fonts/SpaceMono-Regular.ttf',
	() => 'mocked-font-path',
	{ virtual: true }
)
jest.mock('react-native-reanimated', () => ({}), { virtual: true })

// Create custom Stack mock for this test
const StackMock = ({ children }: { children: React.ReactNode }) => (
	<>{children}</>
)
StackMock.Screen = ({ name, options }: { name: string; options: object }) => (
	<div data-testid='stack-screen' data-name={name}></div>
)

// Override the expo-router mock for this test
jest.mock('expo-router', () => ({
	Stack: StackMock,
	__esModule: true,
	default: jest.fn(),
}))

describe('RootLayout', () => {
	// Get access to the mocks defined in setup file
	const mockHideAsync = jest.requireMock('expo-splash-screen').hideAsync
	const mockPreventAutoHideAsync =
		jest.requireMock('expo-splash-screen').preventAutoHideAsync
	const mockUseFonts = jest.requireMock('expo-font').useFonts

	beforeEach(() => {
		jest.clearAllMocks()
	})

	test('renders correctly when fonts are loaded', () => {
		// Set fonts as loaded
		mockUseFonts.mockReturnValue([true])

		const { toJSON } = render(<RootLayout />)

		expect(mockHideAsync).toHaveBeenCalled()

		// Check that the component renders something
		expect(toJSON()).not.toBeNull()
	})

	test('returns null when fonts are not loaded', () => {
		// Set fonts as not loaded
		mockUseFonts.mockReturnValue([false])

		const { toJSON } = render(<RootLayout />)

		expect(mockHideAsync).not.toHaveBeenCalled()

		// When fonts aren't loaded, the component returns null
		expect(toJSON()).toBeNull()
	})

	test('hides splash screen once fonts are loaded', async () => {
		let loadedState = false
		mockUseFonts.mockImplementation(() => {
			return [loadedState]
		})

		let { rerender } = render(<RootLayout />)

		expect(mockHideAsync).not.toHaveBeenCalled()

		// Now simulate fonts loading
		loadedState = true
		rerender(<RootLayout />)

		// SplashScreen.hideAsync should be called in useEffect
		expect(mockHideAsync).toHaveBeenCalled()
	})
})
