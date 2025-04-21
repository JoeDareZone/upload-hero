import crypto from 'crypto'
import { Request, Response } from 'express'
import fs from 'fs-extra'
import path from 'path'

const MOCK_UPLOAD_DIR = '/mock/uploads'
jest.mock('../constants', () => ({
	...jest.requireActual('../constants'),
	UPLOAD_DIR: '/mock/uploads',
}))

jest.mock('fs-extra')
jest.mock('path')
jest.mock('crypto')
jest.mock('../controllers/finalizeUpload')
jest.mock('../models/FileChecksum')

jest.mock('multer', () => {
	return jest.fn().mockImplementation(() => {
		return {
			single: jest
				.fn()
				.mockReturnValue((req: any, res: any, next: any) => next()),
		}
	})
})

let initiateUploadHandler: (req: Request, res: Response) => void
let uploadStatusHandler: (req: Request, res: Response) => void

const mockRouter = {
	post: jest.fn().mockImplementation((path, handler) => {
		if (path === '/initiate-upload') {
			initiateUploadHandler = handler
		}
		return mockRouter
	}),
	get: jest.fn().mockImplementation((path, handler) => {
		if (path === '/upload-status/:uploadId') {
			uploadStatusHandler = handler
		}
		return mockRouter
	}),
}

jest.mock('express', () => {
	return {
		Router: () => mockRouter,
	}
})

require('../routes/uploadRoutes')

describe('Upload Routes', () => {
	let req: Partial<Request>
	let res: Partial<Response>
	let jsonMock: jest.Mock
	let statusMock: jest.Mock

	beforeEach(() => {
		jest.clearAllMocks()
		;(crypto.randomUUID as jest.Mock).mockReturnValue('mock-uuid')
		;(path.join as jest.Mock).mockImplementation((...args) => {
			if (args[0] === MOCK_UPLOAD_DIR) {
				return `${MOCK_UPLOAD_DIR}/${args.slice(1).join('/')}`
			}
			return args.join('/')
		})

		jsonMock = jest.fn().mockReturnThis()
		statusMock = jest.fn().mockReturnValue({ json: jsonMock })
		res = {
			json: jsonMock,
			status: statusMock,
		}
	})

	describe('POST /initiate-upload', () => {
		test('should initialize an upload successfully', () => {
			req = {
				body: {
					fileName: 'test.jpg',
					fileSize: 1024,
					mimeType: 'image/jpeg',
					userId: 'test-user',
				},
			}

			initiateUploadHandler(req as Request, res as Response)

			expect(fs.ensureDirSync).toHaveBeenCalledWith(
				`${MOCK_UPLOAD_DIR}/mock-uuid`
			)
			expect(fs.writeJSONSync).toHaveBeenCalled()
			expect(jsonMock).toHaveBeenCalledWith({
				success: true,
				uploadId: 'mock-uuid',
				message: 'Upload initialized successfully',
			})
		})

		test('should return error when missing required fields', () => {
			req = {
				body: {
					fileName: 'test.jpg',
				},
			}

			initiateUploadHandler(req as Request, res as Response)

			expect(statusMock).toHaveBeenCalledWith(400)
			expect(jsonMock).toHaveBeenCalledWith({
				success: false,
				message: 'Missing required file information',
			})
		})
	})

	describe('GET /upload-status/:uploadId', () => {
		test('should return upload status', () => {
			;(fs.pathExistsSync as jest.Mock).mockReturnValue(true)
			;(fs.readJSONSync as jest.Mock).mockReturnValue({
				fileName: 'test.jpg',
				chunks: { received: 2, total: 5 },
			})
			;(fs.readdirSync as jest.Mock).mockReturnValue([
				'chunk_1',
				'chunk_2',
				'metadata.json',
			])

			req = {
				params: {
					uploadId: 'test-upload-id',
				},
			}

			uploadStatusHandler(req as Request, res as Response)

			expect(jsonMock).toHaveBeenCalledWith(
				expect.objectContaining({
					success: true,
					uploadId: 'test-upload-id',
					chunksReceived: 2,
				})
			)
		})

		test('should return 404 when upload not found', () => {
			;(fs.pathExistsSync as jest.Mock).mockReturnValue(false)

			req = {
				params: {
					uploadId: 'nonexistent-id',
				},
			}

			uploadStatusHandler(req as Request, res as Response)

			expect(statusMock).toHaveBeenCalledWith(404)
			expect(jsonMock).toHaveBeenCalledWith({
				success: false,
				message: 'Upload not found',
			})
		})
	})
})
