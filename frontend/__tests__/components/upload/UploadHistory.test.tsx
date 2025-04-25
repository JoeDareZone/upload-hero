import { clearUploadHistory, getUploadHistory } from '@/utils/storageUtils'
import { act, fireEvent, render, waitFor } from '@testing-library/react-native'
import React from 'react'
import UploadHistory from '../../../components/upload/UploadHistory'

jest.mock('@/utils/constants', () => ({
	IS_WEB: false,
}))

jest.mock('@/utils/storageUtils', () => ({
	getUploadHistory: jest.fn().mockResolvedValue([]),
	clearUploadHistory: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('react-native', () => {
	const rn = jest.requireActual('react-native')
	return {
		...rn,
		ScrollView: ({
			children,
			...props
		}: {
			children: React.ReactNode
			[key: string]: any
		}) => (
			<rn.View testID='scroll-view' {...props}>
				{children}
			</rn.View>
		),
		Image: ({ source, ...props }: { source: any; [key: string]: any }) => (
			<rn.View testID='image' source={source} {...props} />
		),
	}
})

describe('UploadHistory', () => {
	const mockHistory = [
		{
			id: '1',
			name: 'test-image.jpg',
			uri: 'file://test/test-image.jpg',
			size: 1024,
			type: 'image',
			mimeType: 'image/jpeg',
			completedAt: '2023-06-15T10:30:00.000Z',
			uploadId: 'upload-1',
		},
		{
			id: '2',
			name: 'test-document.pdf',
			uri: 'file://test/test-document.pdf',
			size: 2048,
			type: 'document',
			mimeType: 'application/pdf',
			completedAt: '2023-06-16T11:45:00.000Z',
			uploadId: 'upload-2',
		},
	]

	beforeEach(() => {
		jest.clearAllMocks()
	})

	test('renders nothing when not visible', () => {
		const { toJSON } = render(
			<UploadHistory isVisible={false} onClose={jest.fn()} />
		)

		expect(toJSON()).toBeNull()
	})

	test('renders upload history when visible', async () => {
		;(getUploadHistory as jest.Mock).mockResolvedValue(mockHistory)

		let { getByText } = render(
			<UploadHistory isVisible={true} onClose={jest.fn()} />
		)

		await waitFor(() => {
			expect(getByText('Upload History')).toBeTruthy()
			expect(getByText('test-image.jpg')).toBeTruthy()
			expect(getByText('test-document.pdf')).toBeTruthy()
		})

		expect(getUploadHistory).toHaveBeenCalledTimes(1)
	})

	test('displays "No upload history" message when history is empty', async () => {
		;(getUploadHistory as jest.Mock).mockResolvedValue([])

		let { getByText } = render(
			<UploadHistory isVisible={true} onClose={jest.fn()} />
		)

		await waitFor(() => {
			expect(getByText('No upload history found')).toBeTruthy()
		})

		expect(getUploadHistory).toHaveBeenCalledTimes(1)
	})

	test('calls onClose when close button is pressed', async () => {
		const mockOnClose = jest.fn()
		;(getUploadHistory as jest.Mock).mockResolvedValue(mockHistory)

		let { getByText } = render(
			<UploadHistory isVisible={true} onClose={mockOnClose} />
		)

		await waitFor(() => expect(getByText('Upload History')).toBeTruthy())

		fireEvent.press(getByText('×'))
		expect(mockOnClose).toHaveBeenCalledTimes(1)
	})

	test('clears history when "Clear History" button is pressed', async () => {
		;(getUploadHistory as jest.Mock).mockResolvedValueOnce(mockHistory)

		let { getByText } = render(
			<UploadHistory isVisible={true} onClose={jest.fn()} />
		)

		await waitFor(() => expect(getByText('Clear History')).toBeTruthy())
		;(getUploadHistory as jest.Mock).mockResolvedValueOnce([])

		await act(async () => {
			fireEvent.press(getByText('Clear History'))
		})

		expect(clearUploadHistory).toHaveBeenCalledTimes(1)

		await waitFor(() => {
			expect(getByText('No upload history found')).toBeTruthy()
		})
	})

	test('fetches history when becoming visible', async () => {
		;(getUploadHistory as jest.Mock).mockClear()

		const { rerender, getByText } = render(
			<UploadHistory isVisible={false} onClose={jest.fn()} />
		)

		expect(getUploadHistory).not.toHaveBeenCalled()
		;(getUploadHistory as jest.Mock).mockResolvedValueOnce(mockHistory)

		await act(async () => {
			rerender(<UploadHistory isVisible={true} onClose={jest.fn()} />)
		})

		expect(getUploadHistory).toHaveBeenCalledTimes(1)

		await waitFor(() => {
			expect(getByText('Upload History')).toBeTruthy()
		})
	})
})
