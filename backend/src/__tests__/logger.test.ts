jest.clearAllMocks()
jest.resetModules()

const mockInfoFn = jest.fn()
const mockErrorFn = jest.fn()
const mockWarnFn = jest.fn()
const mockDebugFn = jest.fn()

jest.doMock('winston', () => ({
	createLogger: jest.fn().mockReturnValue({
		info: mockInfoFn,
		error: mockErrorFn,
		warn: mockWarnFn,
		debug: mockDebugFn,
	}),
	addColors: jest.fn(),
	format: {
		combine: jest.fn().mockReturnValue({}),
		timestamp: jest.fn().mockReturnValue({}),
		printf: jest.fn().mockReturnValue({}),
		colorize: jest.fn().mockReturnValue({}),
		json: jest.fn().mockReturnValue({}),
	},
	transports: {
		Console: jest.fn(),
	},
}))

jest.doMock('winston-daily-rotate-file', () => {
	return jest.fn().mockImplementation(() => ({}))
})

jest.doMock('fs-extra', () => ({
	ensureDirSync: jest.fn(),
}))

jest.doMock('path', () => ({
	join: jest.fn().mockImplementation((...args) => args.join('/')),
}))

import { NextFunction, Request, Response } from 'express'
import { logRequest } from '../utils/logger'
const loggerModule = require('../utils/logger')
const winston = require('winston')

describe('Logger Utility', () => {
	let mockRequest: Partial<Request>
	let mockResponse: Partial<Response>
	let mockNext: NextFunction

	beforeEach(() => {
		jest.clearAllMocks()

		mockRequest = {
			method: 'GET',
			url: '/api/test',
			headers: {
				'user-agent': 'test-agent',
			},
			body: {},
			socket: {
				remoteAddress: '127.0.0.2',
			} as any,
			get ip() {
				return '127.0.0.1'
			},
			get path() {
				return '/api/test'
			},
		}

		mockResponse = {
			statusCode: 200,
			on: jest.fn().mockImplementation((event, callback) => {
				if (event === 'finish') {
					callback()
				}
				return mockResponse
			}),
		}

		mockNext = jest.fn()
	})

	describe('Winston Logger Configuration', () => {
		test('should create logger with correct configuration', () => {
			expect(winston.createLogger).toBeDefined()
			expect(winston.addColors).toBeDefined()
			expect(winston.format.combine).toBeDefined()
		})
	})

	describe('logRequest Middleware', () => {
		test('should log request details', () => {
			logRequest(
				mockRequest as Request,
				mockResponse as Response,
				mockNext
			)

			expect(mockInfoFn).toHaveBeenCalledWith(
				'Request',
				expect.objectContaining({
					method: 'GET',
					url: '/api/test',
					ip: '127.0.0.1',
					userAgent: 'test-agent',
					userId: 'anonymous',
					operationType: 'GET_REQUEST',
				})
			)

			expect(mockResponse.on).toHaveBeenCalledWith(
				'finish',
				expect.any(Function)
			)

			expect(mockInfoFn).toHaveBeenCalledWith(
				'Response',
				expect.objectContaining({
					status: 200,
					duration: expect.any(Number),
				})
			)

			expect(mockNext).toHaveBeenCalled()
		})

		test('should use userId from request body when available', () => {
			mockRequest.body = { userId: 'test-user' }

			logRequest(
				mockRequest as Request,
				mockResponse as Response,
				mockNext
			)

			expect(mockInfoFn).toHaveBeenCalledWith(
				'Request',
				expect.objectContaining({
					userId: 'test-user',
				})
			)
		})

		test('should use socket.remoteAddress when ip is not available', () => {
			const noIpRequest = {
				...mockRequest,
				get ip() {
					return undefined
				},
			}

			logRequest(
				noIpRequest as Request,
				mockResponse as Response,
				mockNext
			)

			expect(mockInfoFn).toHaveBeenCalledWith(
				'Request',
				expect.objectContaining({
					ip: '127.0.0.2',
				})
			)
		})
	})

	describe('getOperationType', () => {
		test('should identify INITIATE_UPLOAD operation', () => {
			const initiateUploadRequest = {
				...mockRequest,
				get path() {
					return '/api/initiate-upload'
				},
			}

			logRequest(
				initiateUploadRequest as Request,
				mockResponse as Response,
				mockNext
			)

			expect(mockInfoFn).toHaveBeenCalledWith(
				'Request',
				expect.objectContaining({
					operationType: 'INITIATE_UPLOAD',
				})
			)
		})

		test('should identify UPLOAD_CHUNK operation', () => {
			const uploadChunkRequest = {
				...mockRequest,
				get path() {
					return '/api/upload-chunk'
				},
			}

			logRequest(
				uploadChunkRequest as Request,
				mockResponse as Response,
				mockNext
			)

			expect(mockInfoFn).toHaveBeenCalledWith(
				'Request',
				expect.objectContaining({
					operationType: 'UPLOAD_CHUNK',
				})
			)
		})

		test('should identify FINALIZE_UPLOAD operation', () => {
			const finalizeUploadRequest = {
				...mockRequest,
				get path() {
					return '/api/finalize-upload'
				},
			}

			logRequest(
				finalizeUploadRequest as Request,
				mockResponse as Response,
				mockNext
			)

			expect(mockInfoFn).toHaveBeenCalledWith(
				'Request',
				expect.objectContaining({
					operationType: 'FINALIZE_UPLOAD',
				})
			)
		})

		test('should identify UPLOAD_STATUS operation', () => {
			const uploadStatusRequest = {
				...mockRequest,
				get path() {
					return '/api/upload-status'
				},
			}

			logRequest(
				uploadStatusRequest as Request,
				mockResponse as Response,
				mockNext
			)

			expect(mockInfoFn).toHaveBeenCalledWith(
				'Request',
				expect.objectContaining({
					operationType: 'UPLOAD_STATUS',
				})
			)
		})

		test('should identify DELETE_UPLOAD operation', () => {
			const deleteUploadRequest = {
				...mockRequest,
				get path() {
					return '/api/delete-upload'
				},
			}

			logRequest(
				deleteUploadRequest as Request,
				mockResponse as Response,
				mockNext
			)

			expect(mockInfoFn).toHaveBeenCalledWith(
				'Request',
				expect.objectContaining({
					operationType: 'DELETE_UPLOAD',
				})
			)
		})

		test('should identify CHECK_DUPLICATE operation', () => {
			const checkDuplicateRequest = {
				...mockRequest,
				get path() {
					return '/api/check-duplicate'
				},
			}

			logRequest(
				checkDuplicateRequest as Request,
				mockResponse as Response,
				mockNext
			)

			expect(mockInfoFn).toHaveBeenCalledWith(
				'Request',
				expect.objectContaining({
					operationType: 'CHECK_DUPLICATE',
				})
			)
		})

		test('should use HTTP method for unknown operations', () => {
			const unknownPathRequest = {
				...mockRequest,
				get path() {
					return '/api/unknown-path'
				},
				method: 'POST',
			}

			logRequest(
				unknownPathRequest as Request,
				mockResponse as Response,
				mockNext
			)

			expect(mockInfoFn).toHaveBeenCalledWith(
				'Request',
				expect.objectContaining({
					operationType: 'POST_REQUEST',
				})
			)
		})
	})

	describe('Default logger', () => {
		test('should export a configured logger instance', () => {
			const defaultLogger = loggerModule.default
			expect(defaultLogger).toBeDefined()

			defaultLogger.info('Test message')
			expect(mockInfoFn).toHaveBeenCalledWith('Test message')
		})
	})
})
