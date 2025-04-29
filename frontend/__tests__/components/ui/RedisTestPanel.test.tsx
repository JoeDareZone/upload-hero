import { fireEvent, render } from '@testing-library/react-native'
import React from 'react'

const mockAlert = jest.fn()
jest.mock('react-native', () => {
	const RN = jest.requireActual('react-native')
	return {
		...RN,
		Alert: {
			...RN.Alert,
			alert: mockAlert,
		},
	}
})

global.alert = jest.fn()

jest.mock('@/utils/constants', () => ({
	API_BASE_URL: 'http://test-api',
	IS_WEB: false,
}))

global.fetch = jest.fn(() =>
	Promise.resolve({
		json: () =>
			Promise.resolve({
				success: true,
				chunksReceived: 5,
				chunkIndices: [0, 1, 2, 3, 4],
			}),
	})
) as jest.Mock

import { RedisTestPanel } from '@/components/ui/RedisTestPanel'

describe('RedisTestPanel', () => {
	const mockRecentUploadIds = ['id1234567890', 'id0987654321']
	const mockSetSavedUploadId = jest.fn()

	beforeEach(() => {
		jest.clearAllMocks()
	})

	test('renders with recentUploadIds', () => {
		const { getByText } = render(
			<RedisTestPanel
				recentUploadIds={mockRecentUploadIds}
				savedUploadId=''
				setSavedUploadId={mockSetSavedUploadId}
			/>
		)

		expect(getByText('Redis Testing Tools')).toBeTruthy()
		expect(getByText('Recent Upload IDs (tap to use):')).toBeTruthy()
	})

	test('renders test button correctly', () => {
		const { getByText } = render(
			<RedisTestPanel
				recentUploadIds={mockRecentUploadIds}
				savedUploadId='testId123'
				setSavedUploadId={mockSetSavedUploadId}
			/>
		)

		expect(getByText('Test ID')).toBeTruthy()
	})

	test('disables Test ID button when no ID is provided', () => {
		const { getByText } = render(
			<RedisTestPanel
				recentUploadIds={mockRecentUploadIds}
				savedUploadId=''
				setSavedUploadId={mockSetSavedUploadId}
			/>
		)

		const button = getByText('Test ID').parent
		expect(global.fetch).not.toHaveBeenCalled()

		if (button) {
			fireEvent.press(button)
			expect(global.fetch).not.toHaveBeenCalled()
		}
	})

	test('shows placeholder text in input field', () => {
		const { getByPlaceholderText } = render(
			<RedisTestPanel
				recentUploadIds={mockRecentUploadIds}
				savedUploadId=''
				setSavedUploadId={mockSetSavedUploadId}
			/>
		)

		expect(getByPlaceholderText('Enter upload ID here')).toBeTruthy()
	})
})
