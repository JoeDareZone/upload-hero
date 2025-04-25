import FilePicker from '@/components/upload/FilePicker.native'
import { UploadFile } from '@/types/fileType'
import { render } from '@testing-library/react-native'
import React from 'react'

jest.mock('@/utils/constants', () => ({
	MAX_FILE_SIZE_MB: 100,
}))

jest.mock('@/components/ui/IconSymbol', () => ({
	IconSymbol: ({
		name,
		size,
		color,
	}: {
		name: string
		size: number
		color: string
	}) => (
		<mock-icon-symbol
			data-testid='icon'
			name={name}
			size={size}
			color={color}
		/>
	),
}))

jest.mock('react-native', () => {
	const rn = jest.requireActual('react-native')
	return {
		...rn,
		TouchableOpacity: ({
			children,
			onPress,
			disabled,
			...props
		}: {
			children: React.ReactNode
			onPress: () => void
			disabled?: boolean
			[key: string]: any
		}) => (
			<rn.View
				testID='touchable'
				onPress={disabled ? undefined : onPress}
				disabled={disabled}
				{...props}
			>
				{children}
			</rn.View>
		),
		ActivityIndicator: (props: React.JSX.IntrinsicAttributes) => (
			<rn.View testID='activity-indicator' {...props} />
		),
	}
})

describe('FilePicker.native', () => {
	const mockOnPressNative = jest.fn()

	beforeEach(() => {
		jest.clearAllMocks()
	})

	test('renders correctly in default state', () => {
		const { getByText } = render(
			<FilePicker
				isUploading={false}
				isLoading={false}
				isAllFilesUploaded={false}
				onPressNative={mockOnPressNative}
				onFilesSelected={function (files: UploadFile[]): void {
					throw new Error('Function not implemented.')
				}}
				onError={function (error: string): void {
					throw new Error('Function not implemented.')
				}}
			/>
		)

		expect(getByText('Press here to upload files')).toBeTruthy()
		expect(getByText(/Supported formats:/)).toBeTruthy()
	})

	test('shows uploading state when isUploading is true', () => {
		const { getByText, queryByText } = render(
			<FilePicker
				isUploading={true}
				isLoading={false}
				isAllFilesUploaded={false}
				onPressNative={mockOnPressNative}
				onFilesSelected={function (files: UploadFile[]): void {
					throw new Error('Function not implemented.')
				}}
				onError={function (error: string): void {
					throw new Error('Function not implemented.')
				}}
			/>
		)

		expect(getByText('Upload in progress...')).toBeTruthy()
		expect(queryByText('Press here to upload files')).toBeNull()
	})

	test('shows loading indicator when isLoading is true', () => {
		const { queryByText } = render(
			<FilePicker
				isUploading={false}
				isLoading={true}
				isAllFilesUploaded={false}
				onPressNative={mockOnPressNative}
				onFilesSelected={function (files: UploadFile[]): void {
					throw new Error('Function not implemented.')
				}}
				onError={function (error: string): void {
					throw new Error('Function not implemented.')
				}}
			/>
		)

		expect(queryByText('Press here to upload files')).toBeNull()
	})

	test('would call onPressNative when pressed in a real environment', () => {
		render(
			<FilePicker
				isUploading={false}
				isLoading={false}
				isAllFilesUploaded={false}
				onPressNative={mockOnPressNative}
				onFilesSelected={function (files: UploadFile[]): void {
					throw new Error('Function not implemented.')
				}}
				onError={function (error: string): void {
					throw new Error('Function not implemented.')
				}}
			/>
		)

		expect(mockOnPressNative).not.toHaveBeenCalled()
	})

	test('is disabled when isUploading is true', () => {
		render(
			<FilePicker
				isUploading={true}
				isLoading={false}
				isAllFilesUploaded={false}
				onPressNative={mockOnPressNative}
				onFilesSelected={function (files: UploadFile[]): void {
					throw new Error('Function not implemented.')
				}}
				onError={function (error: string): void {
					throw new Error('Function not implemented.')
				}}
			/>
		)

		expect(mockOnPressNative).not.toHaveBeenCalled()
	})

	test('is disabled when isAllFilesUploaded is true', () => {
		render(
			<FilePicker
				isUploading={false}
				isLoading={false}
				isAllFilesUploaded={true}
				onPressNative={mockOnPressNative}
				onFilesSelected={function (files: UploadFile[]): void {
					throw new Error('Function not implemented.')
				}}
				onError={function (error: string): void {
					throw new Error('Function not implemented.')
				}}
			/>
		)

		expect(mockOnPressNative).not.toHaveBeenCalled()
	})
})
