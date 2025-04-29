import { FileItem } from '@/components/upload/FileItem'
import { UploadFile } from '@/types/fileType'
import { render } from '@testing-library/react-native'
import React from 'react'

declare global {
	namespace JSX {
		interface IntrinsicElements {
			'mock-icon-symbol': React.DetailedHTMLProps<
				React.HTMLAttributes<HTMLElement> & {
					name: string
					size: number | string
					color: string
					onPress?: () => void
				},
				HTMLElement
			>
			'mock-progress-bar': React.DetailedHTMLProps<
				React.HTMLAttributes<HTMLElement> & {
					progress: number
					width: number | string | null
					color: string
					borderWidth: number
					style: any
					unfilledColor: string
				},
				HTMLElement
			>
		}
	}
}

jest.mock('@/utils/constants', () => ({
	IS_WEB: false,
}))

jest.mock('@/components/ui/IconSymbol', () => ({
	IconSymbol: ({
		name,
		size,
		color,
		onPress,
	}: {
		name: string
		size: number | string
		color: string
		onPress?: () => void
	}) => (
		<mock-icon-symbol
			name={name}
			size={size}
			color={color}
			onPress={onPress}
			data-testid={`icon-${name}`}
		/>
	),
}))

jest.mock('react-native-progress', () => ({
	Bar: ({
		progress,
		width,
		color,
		borderWidth,
		style,
		unfilledColor,
	}: {
		progress: number
		width: number | string | null
		color: string
		borderWidth: number
		style: any
		unfilledColor: string
	}) => (
		<mock-progress-bar
			progress={progress}
			width={width}
			color={color}
			borderWidth={borderWidth}
			style={style}
			unfilledColor={unfilledColor}
		/>
	),
}))

jest.mock('@/utils/helpers', () => ({
	convertBytesToMB: jest.fn().mockReturnValue('1.00'),
	convertUploadedChunksToPercentage: jest
		.fn()
		.mockImplementation((uploaded, total) => (uploaded / total) * 100),
}))

jest.mock('react-native', () => {
	const rn = jest.requireActual('react-native')
	return {
		...rn,
		Image: ({ source, ...props }: { source: any; [key: string]: any }) => (
			<rn.View testID='image' source={source} {...props} />
		),
		TouchableOpacity: ({ onPress, children, ...props }: any) => (
			<rn.View testID='touchable-opacity' onPress={onPress} {...props}>
				{children}
			</rn.View>
		),
	}
})

describe('FileItem', () => {
	const mockFileUploading: UploadFile = {
		id: 'test-file-1',
		name: 'test-file.jpg',
		uri: 'file://test/test-file.jpg',
		size: 1024 * 1024,
		mimeType: 'image/jpeg',
		status: 'uploading',
		uploadedChunks: 5,
		totalChunks: 10,
	} as UploadFile

	const mockFileCompleted: UploadFile = {
		...mockFileUploading,
		status: 'completed',
		uploadedChunks: 10,
		totalChunks: 10,
	} as UploadFile

	const mockFileError: UploadFile = {
		...mockFileUploading,
		status: 'error',
		errorMessage: 'Upload failed',
		uploadedChunks: 2,
		totalChunks: 10,
	} as UploadFile

	const mockFilePaused: UploadFile = {
		...mockFileUploading,
		status: 'paused',
		uploadedChunks: 3,
		totalChunks: 10,
	} as UploadFile

	const mockPauseUpload = jest.fn()
	const mockResumeUpload = jest.fn()
	const mockCancelUpload = jest.fn()

	beforeEach(() => {
		jest.clearAllMocks()
	})

	test('renders uploading file correctly', () => {
		const { getByText, queryByText } = render(
			<FileItem
				item={mockFileUploading}
				pauseUpload={mockPauseUpload}
				resumeUpload={mockResumeUpload}
				cancelUpload={mockCancelUpload}
			/>
		)

		expect(getByText('test-file.jpg')).toBeTruthy()
		expect(getByText('1.00 MB')).toBeTruthy()
		expect(getByText('image/jpeg')).toBeTruthy()
		expect(getByText('50%')).toBeTruthy()

		expect(queryByText('Upload Successful!')).toBeNull()
	})

	test('renders completed file correctly', () => {
		const { getByText, queryByText } = render(
			<FileItem
				item={mockFileCompleted}
				pauseUpload={mockPauseUpload}
				resumeUpload={mockResumeUpload}
				cancelUpload={mockCancelUpload}
			/>
		)

		expect(getByText('test-file.jpg')).toBeTruthy()
		expect(getByText('Upload Successful!')).toBeTruthy()
		expect(getByText('100%')).toBeTruthy()

		expect(queryByText('1.00 MB')).toBeNull()
		expect(queryByText('image/jpeg')).toBeNull()
	})

	test('renders error file correctly', () => {
		const { getByText, queryByText } = render(
			<FileItem
				item={mockFileError}
				pauseUpload={mockPauseUpload}
				resumeUpload={mockResumeUpload}
				cancelUpload={mockCancelUpload}
			/>
		)

		expect(getByText('test-file.jpg')).toBeTruthy()
		expect(getByText('Upload failed')).toBeTruthy()
		expect(getByText('20%')).toBeTruthy()

		expect(queryByText('Upload Successful!')).toBeNull()
	})

	test('renders paused file correctly', () => {
		const { getByText } = render(
			<FileItem
				item={mockFilePaused}
				pauseUpload={mockPauseUpload}
				resumeUpload={mockResumeUpload}
				cancelUpload={mockCancelUpload}
			/>
		)

		expect(getByText('test-file.jpg')).toBeTruthy()
		expect(getByText('1.00 MB')).toBeTruthy()
		expect(getByText('image/jpeg')).toBeTruthy()
		expect(getByText('30%')).toBeTruthy()
	})

	test('handles retry action for error files', () => {
		const mockRetry = jest.fn()
		render(
			<FileItem
				item={{
					...mockFileError,
					status: 'error',
				}}
				pauseUpload={mockPauseUpload}
				resumeUpload={mockRetry}
				cancelUpload={mockCancelUpload}
			/>
		)

		mockRetry(mockFileError.id)

		expect(mockRetry).toHaveBeenCalledWith(mockFileError.id)
	})
})
