import { render } from '@testing-library/react-native'
import React from 'react'

jest.mock('../../web-styles.css', () => ({}), { virtual: true })

import HomeScreen from '../../app/index'

jest.mock('@/utils/constants', () => ({
	IS_WEB: true,
	API_BASE_URL: 'http://localhost:3000',
}))

jest.mock('@/hooks/useUploadManager', () => ({
	useUploadManager: jest.fn().mockReturnValue({
		enqueueFile: jest.fn(),
		files: [],
		processQueue: jest.fn(),
		pauseUpload: jest.fn(),
		resumeUpload: jest.fn(),
		cancelUpload: jest.fn(),
		isUploading: false,
		clearAllFiles: jest.fn(),
		loadIncompleteUploads: jest.fn(),
	}),
}))

jest.mock('@/hooks/uploadHooks', () => ({
	useFileSelection: jest.fn().mockReturnValue({
		errors: [],
		isLoading: false,
		handlePickDocuments: jest.fn(),
		handleTakePhoto: jest.fn(),
		clearErrors: jest.fn(),
	}),
	calculateUploadStats: jest.fn().mockReturnValue({
		hasQueuedFiles: false,
		hasErrorFiles: false,
		totalChunks: 0,
		overallUploadProgress: 0,
		isAllFilesUploaded: false,
	}),
}))

jest.mock('@/components/upload/UploadActionSheet', () => ({
	useUploadActionSheet: jest.fn().mockReturnValue({
		showActionSheet: jest.fn(),
		ActionSheetComponent: () => null,
	}),
}))

jest.mock('@/components/upload/FilePicker', () => ({
	__esModule: true,
	default: jest.fn().mockImplementation(() => null),
}))

jest.mock('@/components/upload/FilesList', () => ({
	__esModule: true,
	default: jest.fn().mockImplementation(() => null),
}))

jest.mock('@/components/upload/UploadHistory', () => ({
	__esModule: true,
	default: jest.fn().mockImplementation(() => null),
}))

jest.mock('@/components/ui/RedisTestPanel', () => ({
	RedisTestPanel: jest.fn().mockImplementation(() => null),
}))

global.fetch = jest.fn().mockImplementation(() =>
	Promise.resolve({
		json: () =>
			Promise.resolve({
				activeUploads: 0,
				successfulUploads: 10,
				failedUploads: 2,
				cpuLoad: [0.5, 0.3, 0.2],
				memory: {
					free: 1000,
					total: 8000,
				},
			}),
	})
)

describe('HomeScreen', () => {
	beforeEach(() => {
		jest.clearAllMocks()
	})

	test('renders correctly', () => {
		const { getByText } = render(<HomeScreen />)

		expect(getByText('Upload Hero')).toBeTruthy()
	})
})
