import { useUploadActionSheet } from '@/components/upload/UploadActionSheet'
import { renderHook } from '@testing-library/react'
import { Platform } from 'react-native'

declare global {
	namespace JSX {
		interface IntrinsicElements {
			'mock-android-action-sheet': React.DetailedHTMLProps<
				React.HTMLAttributes<HTMLElement> & {
					visible: boolean
					onClose: () => void
					options: { label: string; onPress: () => void }[]
				},
				HTMLElement
			>
		}
	}
}

jest.mock('react-native', () => {
	const rn = jest.requireActual('react-native')
	return {
		...rn,
		ActionSheetIOS: {
			showActionSheetWithOptions: jest.fn(),
		},
		Platform: {
			...rn.Platform,
			OS: 'ios',
		},
	}
})

jest.mock('@/components/ui/AndroidActionSheet', () => {
	return function MockAndroidActionSheet({
		visible,
		onClose,
		options,
	}: {
		visible: boolean
		onClose: () => void
		options: { label: string; onPress: () => void }[]
	}) {
		return (
			<mock-android-action-sheet
				visible={visible}
				onClose={onClose}
				options={options}
			/>
		)
	}
})

describe('useUploadActionSheet', () => {
	const mockOnPickDocuments = jest.fn()
	const mockOnTakePhoto = jest.fn()
	const mockShowActionSheetWithOptions = jest.fn()

	beforeEach(() => {
		jest.clearAllMocks()
		Platform.OS = 'ios'
		require('react-native').ActionSheetIOS.showActionSheetWithOptions =
			mockShowActionSheetWithOptions
	})

	test('should show ActionSheetIOS on iOS', () => {
		const { result } = renderHook(() =>
			useUploadActionSheet({
				onPickDocuments: mockOnPickDocuments,
				onTakePhoto: mockOnTakePhoto,
			})
		)

		result.current.showActionSheet()

		expect(mockShowActionSheetWithOptions).toHaveBeenCalledWith(
			{
				options: ['Cancel', 'Choose from Library', 'Take Photo'],
				cancelButtonIndex: 0,
			},
			expect.any(Function)
		)
	})

	test('should call onPickDocuments when library option is selected on iOS', () => {
		const { result } = renderHook(() =>
			useUploadActionSheet({
				onPickDocuments: mockOnPickDocuments,
				onTakePhoto: mockOnTakePhoto,
			})
		)

		result.current.showActionSheet()

		const callback = mockShowActionSheetWithOptions.mock.calls[0][1]

		callback(1)

		expect(mockOnPickDocuments).toHaveBeenCalled()
		expect(mockOnTakePhoto).not.toHaveBeenCalled()
	})

	test('should call onTakePhoto when take photo option is selected on iOS', () => {
		const { result } = renderHook(() =>
			useUploadActionSheet({
				onPickDocuments: mockOnPickDocuments,
				onTakePhoto: mockOnTakePhoto,
			})
		)

		result.current.showActionSheet()

		const callback = mockShowActionSheetWithOptions.mock.calls[0][1]

		callback(2)

		expect(mockOnTakePhoto).toHaveBeenCalled()
		expect(mockOnPickDocuments).not.toHaveBeenCalled()
	})

	test('should set state for AndroidActionSheet on Android', () => {
		Platform.OS = 'android'

		const { result } = renderHook(() =>
			useUploadActionSheet({
				onPickDocuments: mockOnPickDocuments,
				onTakePhoto: mockOnTakePhoto,
			})
		)

		expect(result.current.ActionSheetComponent).toBeDefined()

		const ActionSheetComponent = result.current.ActionSheetComponent
		const wrapper = ActionSheetComponent()

		expect(wrapper.props.options).toEqual([
			{ label: 'Choose from Library', onPress: mockOnPickDocuments },
			{ label: 'Take Photo', onPress: mockOnTakePhoto },
		])
	})
})
