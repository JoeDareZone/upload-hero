import fs from 'fs'
import path from 'path'
import { reassembleFile } from '../controllers/finalizeUpload'

jest.mock('fs')
jest.mock('path')
jest.mock('file-type')

describe('finalizeUpload Controller', () => {
	const mockUploadId = 'test-upload-id'
	const mockTotalChunks = 3
	const mockFileName = 'test-file.jpg'
	const mockExpectedMimeType = 'image/jpeg'
	const mockTempDir = '/mocked/path/uploads/test-upload-id'
	const mockFinalPath = '/mocked/path/uploads/final/test-file.jpg'

	beforeEach(() => {
		jest.clearAllMocks()
		;(path.join as jest.Mock).mockImplementation((...args) => {
			if (args.includes('final') && args.includes(mockFileName)) {
				return mockFinalPath
			} else if (args.includes('final')) {
				return '/mocked/path/uploads/final'
			} else if (args.includes(mockUploadId)) {
				return mockTempDir
			}
			return args.join('/')
		})
		;(fs.existsSync as jest.Mock).mockImplementation(path => {
			return true
		})
		;(path.basename as jest.Mock).mockImplementation(path => {
			return path.split('/').pop()
		})

		interface MockStream {
			on: jest.Mock<any, any>
			pipe?: jest.Mock<any, any>
			end?: jest.Mock<any, any>
		}

		const mockWriteStream: MockStream = {
			on: jest.fn().mockImplementation((event, callback) => {
				if (event === 'finish') callback()
				return mockWriteStream
			}),
			end: jest.fn(),
		}

		const mockReadStream: MockStream = {
			pipe: jest.fn(),
			on: jest.fn().mockImplementation((event, callback) => {
				if (event === 'end') callback()
				return mockReadStream
			}),
		}

		;(fs.createWriteStream as jest.Mock).mockImplementation(path => {
			expect(path).toBe(mockFinalPath)
			const mockStream = {
				on: jest.fn().mockImplementation((event, callback) => {
					if (event === 'finish') callback()
					return mockStream
				}),
				end: jest.fn(),
			}
			return mockStream
		})
		;(fs.createReadStream as jest.Mock).mockReturnValue(mockReadStream)
	})

	test('should successfully reassemble a file when all chunks exist', async () => {
		const fileTypeModule = require('file-type')
		fileTypeModule.fromBuffer.mockResolvedValue({
			mime: mockExpectedMimeType,
		})

		const result = await reassembleFile(
			mockUploadId,
			mockTotalChunks,
			mockFileName,
			mockExpectedMimeType
		)

		expect(result).toBe(mockFinalPath)
		expect(fs.existsSync).toHaveBeenCalledWith(mockTempDir)
		expect(fs.createWriteStream).toHaveBeenCalledWith(mockFinalPath)
		expect(fs.createReadStream).toHaveBeenCalledTimes(mockTotalChunks)
	})

	test('should throw error if upload directory does not exist', async () => {
		;(fs.existsSync as jest.Mock).mockReturnValueOnce(false)

		await expect(
			reassembleFile(mockUploadId, mockTotalChunks, mockFileName)
		).rejects.toThrow(`Upload directory does not exist: ${mockTempDir}`)
	})

	test('should throw error if file type validation fails', async () => {
		const fileTypeModule = require('file-type')
		fileTypeModule.fromBuffer.mockResolvedValue({ mime: 'image/png' })
		;(fs.readFileSync as jest.Mock).mockReturnValue(
			Buffer.from('dummy data')
		)
		;(fs.createWriteStream as jest.Mock).mockImplementation(path => {
			expect(path).toBe(mockFinalPath)
			return {
				on: jest.fn().mockImplementation((event, callback) => {
					if (event === 'finish') callback()
					return this
				}),
				end: jest.fn(),
			}
		})

		await expect(
			reassembleFile(
				mockUploadId,
				mockTotalChunks,
				mockFileName,
				mockExpectedMimeType
			)
		).rejects.toThrow('File type validation failed')

		expect(fs.unlinkSync).toHaveBeenCalledWith(mockFinalPath)
	})
})
