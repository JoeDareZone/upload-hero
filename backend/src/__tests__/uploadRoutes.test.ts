import crypto from 'crypto'
import { Request, Response } from 'express'
import fs from 'fs-extra'
import path from 'path'

const MOCK_UPLOAD_DIR = '/mock/uploads'
jest.mock('../constants', () => ({
	...jest.requireActual('../constants'),
	UPLOAD_DIR: '/mock/uploads',
}))

jest.mock('../controllers/finalizeUpload')
jest.mock('../models/FileChecksum')

// Mock Redis
jest.mock('../services/redisService', () => ({
	connect: jest.fn().mockResolvedValue(undefined),
	storeUploadMetadata: jest.fn().mockResolvedValue(undefined),
	updateChunksReceived: jest.fn().mockResolvedValue(undefined),
	getUploadMetadata: jest.fn().mockResolvedValue(null),
	getChunksList: jest.fn().mockResolvedValue([]),
	getChunksReceived: jest.fn().mockResolvedValue(0),
	setChunkStatus: jest.fn().mockResolvedValue(undefined),
	updateChunksList: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('fs-extra')
jest.mock('path')
jest.mock('crypto')
jest.mock('multer', () => {
	return jest.fn().mockImplementation(() => {
		return {
			single: jest
				.fn()
				.mockReturnValue((req: any, res: any, next: any) => next()),
		}
	})
})

// Import after mocks are set up
import {
	initiateUploadHandler,
	uploadStatusHandler,
} from '../routes/uploadRoutes'

describe('Upload Routes', () => {
	let req: Partial<Request>
	let res: Partial<Response>
	let jsonMock: jest.Mock
	let statusMock: jest.Mock
	let consoleErrorSpy: jest.SpyInstance

	beforeEach(() => {
		// Spy on console.error to silence it in tests
		consoleErrorSpy = jest
			.spyOn(console, 'error')
			.mockImplementation(() => {})

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

	afterEach(() => {
		// Restore console.error
		consoleErrorSpy.mockRestore()
	})

	describe('POST /initiate-upload', () => {
		test('should initialize an upload successfully', async () => {
			req = {
				body: {
					fileName: 'test.jpg',
					fileSize: 1024,
					mimeType: 'image/jpeg',
					userId: 'test-user',
				},
			}

			// Mock implementations
			const redisService = require('../services/redisService')
			;(fs.ensureDirSync as jest.Mock).mockImplementation(() => {})
			;(fs.writeJSONSync as jest.Mock).mockImplementation(() => {})

			await initiateUploadHandler(req as Request, res as Response)

			expect(fs.ensureDirSync).toHaveBeenCalledWith(
				`${MOCK_UPLOAD_DIR}/mock-uuid`
			)
			expect(fs.writeJSONSync).toHaveBeenCalled()
			expect(jsonMock).toHaveBeenCalledWith({
				success: true,
				uploadId: 'mock-uuid',
				message: 'Upload initialized successfully',
			})
			expect(redisService.connect).toHaveBeenCalled()
			expect(redisService.storeUploadMetadata).toHaveBeenCalled()
			expect(redisService.updateChunksReceived).toHaveBeenCalledWith(
				'mock-uuid',
				0
			)
		})

		test('should return error when missing required fields', async () => {
			req = {
				body: {
					fileName: 'test.jpg',
				},
			}

			await initiateUploadHandler(req as Request, res as Response)

			expect(statusMock).toHaveBeenCalledWith(400)
			expect(jsonMock).toHaveBeenCalledWith({
				success: false,
				message: 'Missing required file information',
			})
		})

		test('should handle errors', async () => {
			req = {
				body: {
					fileName: 'test.jpg',
					fileSize: 1024,
				},
			}

			const error = new Error('Test error')
			const redisService = require('../services/redisService')
			redisService.connect.mockRejectedValueOnce(error)

			await initiateUploadHandler(req as Request, res as Response)

			expect(statusMock).toHaveBeenCalledWith(500)
			expect(jsonMock).toHaveBeenCalledWith({
				success: false,
				message: 'Test error',
			})
		})
	})

	describe('GET /upload-status/:uploadId', () => {
		test('should return upload status from Redis cache', async () => {
			const mockMetadata = {
				fileName: 'test.jpg',
				fileSize: 1024,
			}

			const redisService = require('../services/redisService')
			redisService.getUploadMetadata.mockResolvedValueOnce(mockMetadata)
			redisService.getChunksList.mockResolvedValueOnce([1, 2])
			redisService.getChunksReceived.mockResolvedValueOnce(2)

			req = {
				params: {
					uploadId: 'test-upload-id',
				},
			}

			await uploadStatusHandler(req as Request, res as Response)

			expect(redisService.connect).toHaveBeenCalled()
			expect(redisService.getUploadMetadata).toHaveBeenCalledWith(
				'test-upload-id'
			)
			expect(jsonMock).toHaveBeenCalledWith({
				success: true,
				uploadId: 'test-upload-id',
				metadata: mockMetadata,
				chunksReceived: 2,
				chunkIndices: [1, 2],
			})
		})

		test('should return 404 when upload not found', async () => {
			const redisService = require('../services/redisService')
			;(fs.pathExistsSync as jest.Mock).mockReturnValueOnce(false)

			req = {
				params: {
					uploadId: 'nonexistent-id',
				},
			}

			await uploadStatusHandler(req as Request, res as Response)

			expect(statusMock).toHaveBeenCalledWith(404)
			expect(jsonMock).toHaveBeenCalledWith({
				success: false,
				message: 'Upload not found',
			})
		})

		test('should rebuild cache from filesystem if needed', async () => {
			const mockMetadata = {
				fileName: 'test.jpg',
				fileSize: 1024,
			}

			const redisService = require('../services/redisService')

			// Mock filesystem exists and read operations
			;(fs.pathExistsSync as jest.Mock).mockReturnValue(true)
			;(fs.readJSONSync as jest.Mock).mockReturnValue(mockMetadata)
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

			await uploadStatusHandler(req as Request, res as Response)

			// Verify Redis cache was updated
			expect(redisService.storeUploadMetadata).toHaveBeenCalledWith(
				'test-upload-id',
				mockMetadata
			)
			expect(redisService.updateChunksReceived).toHaveBeenCalledWith(
				'test-upload-id',
				2
			)
			expect(redisService.updateChunksList).toHaveBeenCalledTimes(2)

			expect(jsonMock).toHaveBeenCalledWith(
				expect.objectContaining({
					success: true,
					uploadId: 'test-upload-id',
					metadata: mockMetadata,
					chunksReceived: 2,
				})
			)
		})

		test('should handle errors', async () => {
			req = {
				params: {
					uploadId: 'test-upload-id',
				},
			}

			const error = new Error('Test error')
			const redisService = require('../services/redisService')
			redisService.connect.mockRejectedValueOnce(error)

			await uploadStatusHandler(req as Request, res as Response)

			expect(statusMock).toHaveBeenCalledWith(500)
			expect(jsonMock).toHaveBeenCalledWith({
				success: false,
				message: 'Test error',
			})
		})
	})
})
