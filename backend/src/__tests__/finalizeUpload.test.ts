import fileType from 'file-type'
import fs from 'fs'
import path from 'path'
import {
	cleanupChunks,
	combineChunksIntoSingleFile,
	getAndSortChunkFiles,
	reassembleFile,
	streamChunk,
	validateFileType,
} from '../controllers/finalizeUpload'

jest.mock('fs')
jest.mock('path')
jest.mock('file-type')

describe('finalizeUpload Controller', () => {
	const mockUploadId = 'test-upload-id'
	const mockFileName = 'test-file.jpg'
	const mockUserId = 'test-user'
	const mockTempDir = '/mocked/path/uploads/test-upload-id'
	const mockFinalPath = '/mocked/path/uploads/final/test-file.jpg'
	const mockFinalDir = '/mocked/path/uploads/final'

	beforeEach(() => {
		jest.clearAllMocks()
		;(path.join as jest.Mock).mockImplementation((...args) => {
			if (args.includes('final') && args.includes(mockFileName)) {
				return mockFinalPath
			} else if (args.includes('final')) {
				return mockFinalDir
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
		;(fs.readdirSync as jest.Mock).mockReturnValue([
			'chunk_0',
			'chunk_1',
			'chunk_2',
			'metadata.json',
		])
		;(fileType.fromBuffer as jest.Mock).mockResolvedValue({
			mime: 'image/jpeg',
			ext: 'jpg',
		})
		;(fs.readFileSync as jest.Mock).mockReturnValue(Buffer.from('test'))
		;(fs.unlinkSync as jest.Mock).mockImplementation(() => undefined)
	})

	describe('getAndSortChunkFiles', () => {
		test('should return sorted chunk files', () => {
			;(fs.existsSync as jest.Mock).mockReturnValue(true)
			;(path.join as jest.Mock).mockImplementation((dir, file) => {
				return `${dir}/${file}`
			})

			const result = getAndSortChunkFiles(mockTempDir, 3)

			expect(result).toHaveLength(3)
			expect(result[0]).toContain('chunk_1')
			expect(result[1]).toContain('chunk_2')
			expect(result[2]).toContain('chunk_3')
		})

		test('should throw error if a chunk is missing', () => {
			;(fs.existsSync as jest.Mock)
				.mockReturnValueOnce(true)
				.mockReturnValueOnce(false)
			;(path.join as jest.Mock).mockImplementation((dir, file) => {
				return `${dir}/${file}`
			})

			expect(() => {
				getAndSortChunkFiles(mockTempDir, 3)
			}).toThrow('Missing chunk 2')
		})
	})

	describe('streamChunk', () => {
		test('should pipe read stream to write stream', async () => {
			const mockReadStream = {
				pipe: jest.fn(),
				on: jest.fn().mockImplementation((event, callback) => {
					if (event === 'end') setTimeout(callback, 10)
					return mockReadStream
				}),
			}

			const mockWriteStream = {
				end: jest.fn(),
			}

			;(fs.createReadStream as jest.Mock).mockReturnValue(mockReadStream)

			await streamChunk('/path/to/chunk', mockWriteStream as any)

			expect(fs.createReadStream).toHaveBeenCalledWith('/path/to/chunk')
			expect(mockReadStream.pipe).toHaveBeenCalledWith(mockWriteStream, {
				end: false,
			})
		})

		test('should handle stream errors', async () => {
			const mockError = new Error('Stream error')
			const mockReadStream = {
				pipe: jest.fn(),
				on: jest.fn().mockImplementation((event, callback) => {
					if (event === 'error')
						setTimeout(() => callback(mockError), 10)
					return mockReadStream
				}),
			}

			const mockWriteStream = {
				end: jest.fn(),
			}

			;(fs.createReadStream as jest.Mock).mockReturnValue(mockReadStream)

			await expect(
				streamChunk('/path/to/chunk', mockWriteStream as any)
			).rejects.toThrow('Stream error')
		})
	})

	describe('combineChunksIntoSingleFile', () => {
		test('should stream all chunks to output file', async () => {
			const mockWriteStream = {
				end: jest.fn(),
				on: jest.fn().mockImplementation((event, callback) => {
					if (event === 'finish') setTimeout(callback, 10)
					return mockWriteStream
				}),
			}

			;(fs.createWriteStream as jest.Mock).mockReturnValue(
				mockWriteStream
			)

			const chunkFiles = [
				'/path/chunk_1',
				'/path/chunk_2',
				'/path/chunk_3',
			]
			await combineChunksIntoSingleFile(chunkFiles, '/path/output.jpg')

			expect(fs.createWriteStream).toHaveBeenCalledWith(
				'/path/output.jpg'
			)
			expect(mockWriteStream.end).toHaveBeenCalled()
		})

		test('should handle write stream errors', async () => {
			const mockError = new Error('Write error')
			const mockWriteStream = {
				end: jest.fn(),
				on: jest.fn().mockImplementation((event, callback) => {
					if (event === 'error')
						setTimeout(() => callback(mockError), 10)
					return mockWriteStream
				}),
			}

			;(fs.createWriteStream as jest.Mock).mockReturnValue(
				mockWriteStream
			)

			const chunkFiles = ['/path/chunk_1', '/path/chunk_2']
			await expect(
				combineChunksIntoSingleFile(chunkFiles, '/path/output.jpg')
			).rejects.toThrow('Write error')
		})
	})

	describe('validateFileType', () => {
		test('should pass if file type matches expected', async () => {
			;(fileType.fromBuffer as jest.Mock).mockResolvedValue({
				mime: 'image/jpeg',
				ext: 'jpg',
			})

			await validateFileType('/path/to/file.jpg', 'image/jpeg')

			expect(fs.readFileSync).toHaveBeenCalledWith('/path/to/file.jpg')
			expect(fileType.fromBuffer).toHaveBeenCalled()
		})

		test('should throw if file type does not match expected', async () => {
			;(fileType.fromBuffer as jest.Mock).mockResolvedValue({
				mime: 'image/png',
				ext: 'png',
			})

			await expect(
				validateFileType('/path/to/file.jpg', 'image/jpeg')
			).rejects.toThrow(
				'File type validation failed: expected image/jpeg but got image/png'
			)
		})

		test('should throw if file type cannot be detected', async () => {
			;(fileType.fromBuffer as jest.Mock).mockResolvedValue(null)

			await expect(
				validateFileType('/path/to/file.jpg', 'image/jpeg')
			).rejects.toThrow(
				'File type validation failed: unable to detect file type'
			)
		})
	})

	describe('cleanupChunks', () => {
		test('should delete all chunk files', () => {
			const chunkFiles = [
				'/path/chunk_1',
				'/path/chunk_2',
				'/path/chunk_3',
			]
			cleanupChunks(chunkFiles)

			expect(fs.unlinkSync).toHaveBeenCalledTimes(3)
			expect(fs.unlinkSync).toHaveBeenCalledWith('/path/chunk_1')
			expect(fs.unlinkSync).toHaveBeenCalledWith('/path/chunk_2')
			expect(fs.unlinkSync).toHaveBeenCalledWith('/path/chunk_3')
		})
	})

	describe('reassembleFile', () => {
		test('should successfully reassemble a file when all chunks exist', async () => {
			const result = await reassembleFile(
				mockUploadId,
				mockFileName,
				mockUserId
			)

			expect(result.success).toBe(true)
			expect(result.filePath).toBe(mockFinalPath)
			expect(fs.existsSync).toHaveBeenCalledWith(mockTempDir)
			expect(fs.createWriteStream).toHaveBeenCalledWith(mockFinalPath)
			expect(fs.createReadStream).toHaveBeenCalledTimes(3)
		})

		test('should return error if upload directory does not exist', async () => {
			;(fs.existsSync as jest.Mock).mockReturnValueOnce(false)

			const result = await reassembleFile(
				mockUploadId,
				mockFileName,
				mockUserId
			)

			expect(result.success).toBe(false)
			expect(result.message).toContain('Upload directory does not exist')
		})

		test('should create final directory if it does not exist', async () => {
			;(fs.existsSync as jest.Mock).mockImplementation(path => {
				if (path === mockFinalDir) return false
				return true
			})

			const result = await reassembleFile(
				mockUploadId,
				mockFileName,
				mockUserId
			)

			expect(result.success).toBe(true)
			expect(fs.mkdirSync).toHaveBeenCalledWith(mockFinalDir, {
				recursive: true,
			})
		})

		test('should handle missing chunks', async () => {
			;(fs.readdirSync as jest.Mock).mockReturnValue(['metadata.json'])

			const result = await reassembleFile(
				mockUploadId,
				mockFileName,
				mockUserId
			)

			expect(result.success).toBe(false)
			expect(result.message).toContain('No chunks found for this upload')
		})

		test('should handle read stream errors', async () => {
			const mockErrorMessage = 'Stream read error'
			const mockReadStream = {
				pipe: jest.fn(),
				on: jest.fn().mockImplementation((event, callback) => {
					if (event === 'error') callback(new Error(mockErrorMessage))
					return mockReadStream
				}),
			}

			;(fs.createReadStream as jest.Mock).mockReturnValue(mockReadStream)

			const result = await reassembleFile(
				mockUploadId,
				mockFileName,
				mockUserId
			)

			expect(result.success).toBe(false)
			expect(result.message).toContain(mockErrorMessage)
			expect(fs.unlinkSync).toHaveBeenCalledWith(mockFinalPath)
		})

		test('should handle write stream errors', async () => {
			const mockErrorMessage = 'Stream write error'
			const mockWriteStream = {
				on: jest.fn().mockImplementation((event, callback) => {
					if (event === 'error') callback(new Error(mockErrorMessage))
					return mockWriteStream
				}),
				end: jest.fn(),
			}

			;(fs.createWriteStream as jest.Mock).mockReturnValue(
				mockWriteStream
			)

			const result = await reassembleFile(
				mockUploadId,
				mockFileName,
				mockUserId
			)

			expect(result.success).toBe(false)
			expect(fs.unlinkSync).toHaveBeenCalledWith(mockFinalPath)
		})
	})
})
