import '@testing-library/jest-native/extend-expect'

const mockPreventAutoHideAsync = jest.fn()
const mockHideAsync = jest.fn()

jest.mock('expo-splash-screen', () => ({
	preventAutoHideAsync: mockPreventAutoHideAsync,
	hideAsync: mockHideAsync,
}))

const mockUseFonts = jest.fn(() => [true])
jest.mock('expo-font', () => ({
	useFonts: mockUseFonts,
}))

jest.mock(
	'@/utils/constants',
	() => ({
		IS_WEB: false,
	}),
	{ virtual: true }
)

jest.mock('react-native', () => {
	const RN = jest.requireActual('react-native')

	RN.NativeModules.StatusBarManager = {
		HEIGHT: 42,
		setStyle: jest.fn(),
		setHidden: jest.fn(),
		setNetworkActivityIndicatorVisible: jest.fn(),
		setBackgroundColor: jest.fn(),
		setTranslucent: jest.fn(),
	}

	return RN
})

jest.mock('expo-image-picker', () => ({
	requestMediaLibraryPermissionsAsync: jest
		.fn()
		.mockResolvedValue({ status: 'granted' }),
	getMediaLibraryPermissionsAsync: jest
		.fn()
		.mockResolvedValue({ status: 'granted' }),
	launchImageLibraryAsync: jest.fn(),
}))

jest.mock('expo-document-picker', () => ({
	getDocumentAsync: jest.fn(),
}))

jest.mock('expo-file-system', () => ({
	getInfoAsync: jest.fn(),
	documentDirectory: 'file://document-directory/',
	cacheDirectory: 'file://cache-directory/',
	readAsStringAsync: jest.fn(),
}))

jest.mock('expo-haptics', () => ({
	impactAsync: jest.fn(),
	NotificationFeedbackType: {
		Success: 'success',
		Warning: 'warning',
		Error: 'error',
	},
	ImpactFeedbackStyle: {
		Light: 'light',
		Medium: 'medium',
		Heavy: 'heavy',
	},
}))

jest.mock('@react-native-async-storage/async-storage', () => ({
	setItem: jest.fn(() => Promise.resolve()),
	getItem: jest.fn(() => Promise.resolve()),
	removeItem: jest.fn(() => Promise.resolve()),
	clear: jest.fn(() => Promise.resolve()),
}))

jest.mock('expo-router', () => ({
	useRouter: () => ({
		push: jest.fn(),
		replace: jest.fn(),
		back: jest.fn(),
	}),
	useNavigation: () => ({
		navigate: jest.fn(),
		goBack: jest.fn(),
	}),
	Link: 'Link',
	Stack: {
		Screen: ({ name, options }) => null,
	},
}))

jest.mock('react-native-progress', () => ({
	Bar: 'Bar',
}))
