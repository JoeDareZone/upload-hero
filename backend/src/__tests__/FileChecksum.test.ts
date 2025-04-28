import { jest } from '@jest/globals'
import fs from 'fs-extra'
import path from 'path'
import {
	CHECKSUMS_DIR,
	cleanupOldChecksums,
	findFileByChecksum,
	storeFileChecksum,
} from '../models/FileChecksum'
import logger from '../utils/logger'

jest.mock('fs-extra')
const mockFs = fs as jest.Mocked<typeof fs>

jest.mock('path')
const mockPath = path as jest.Mocked<typeof path>

// Mock logger
jest.mock('../utils/logger', () => ({
	error: jest.fn(),
	info: jest.fn(),
	warn: jest.fn(),
	debug: jest.fn(),
}))

describe('FileChecksum Model', () => {
	const mockChecksum = 'abc123'
	const mockChecksumFile = '/mock/dir/abc123.json'
	const mockFilePath = '/path/to/file.jpg'
	const mockUserId = 'user1'
	const mockTimestamp = 1234567890

	beforeEach(() => {
		jest.clearAllMocks()

		mockPath.join.mockImplementation((...args: string[]) => {
			if (args.includes('checksums')) {
				return '/mock/dir'
			}
			if (args.includes('abc123.json')) {
				return mockChecksumFile
			}
			return args.join('/')
		})

		jest.spyOn(Date, 'now').mockReturnValue(mockTimestamp)
	})

	describe('findFileByChecksum', () => {
		test('should return null if checksum file does not exist', async () => {
			mockFs.pathExists.mockResolvedValue(false as never)

			const result = await findFileByChecksum(mockChecksum, mockUserId)

			expect(result).toBeNull()
			expect(mockFs.pathExists).toHaveBeenCalledWith(mockChecksumFile)
		})

		test('should return valid file path for user', async () => {
			mockFs.pathExists.mockResolvedValueOnce(true as never)

			mockFs.readJSON.mockResolvedValueOnce({
				files: [
					{
						path: '/mock/path/file1.jpg',
						userId: 'otherUser',
						timestamp: 123,
					},
					{
						path: '/mock/path/file2.jpg',
						userId: 'user1',
						timestamp: 456,
					},
				],
			} as never)

			mockFs.pathExists.mockResolvedValueOnce(true as never)

			const result = await findFileByChecksum(mockChecksum, mockUserId)

			expect(result).toBe('/mock/path/file2.jpg')
			expect(mockFs.readJSON).toHaveBeenCalledWith(mockChecksumFile)
		})

		test('should filter files by userId', async () => {
			mockFs.pathExists.mockResolvedValueOnce(true as never)

			mockFs.readJSON.mockResolvedValueOnce({
				files: [
					{
						path: '/mock/path/file1.jpg',
						userId: 'otherUser',
						timestamp: 123,
					},
					{
						path: '/mock/path/file2.jpg',
						userId: 'user1',
						timestamp: 456,
					},
				],
			} as never)

			mockFs.pathExists.mockResolvedValueOnce(true as never)

			const result = await findFileByChecksum('abc123', 'user1')

			expect(result).toBe('/mock/path/file2.jpg')
		})

		test('should return null if no matching user files exist', async () => {
			mockFs.pathExists.mockResolvedValueOnce(true as never)
			mockFs.readJSON.mockResolvedValueOnce({
				files: [
					{
						path: '/mock/path/file1.jpg',
						userId: 'otherUser',
						timestamp: 123,
					},
				],
			} as never)

			const result = await findFileByChecksum(mockChecksum, mockUserId)

			expect(result).toBeNull()
		})

		test('should return null if file no longer exists on disk', async () => {
			mockFs.pathExists.mockResolvedValueOnce(true as never)
			mockFs.readJSON.mockResolvedValueOnce({
				files: [
					{
						path: '/mock/path/file.jpg',
						userId: mockUserId,
						timestamp: 123,
					},
				],
			} as never)

			mockFs.pathExists.mockResolvedValueOnce(false as never)

			const result = await findFileByChecksum(mockChecksum, mockUserId)

			expect(result).toBeNull()
		})

		test('should handle errors gracefully', async () => {
			mockFs.pathExists.mockRejectedValue(
				new Error('Test error') as never
			)

			const result = await findFileByChecksum(mockChecksum, mockUserId)

			expect(result).toBeNull()
			expect(logger.error).toHaveBeenCalled()
		})
	})

	describe('storeFileChecksum', () => {
		test('should create new checksum file when one does not exist', async () => {
			mockFs.pathExists.mockResolvedValue(false as never)

			await storeFileChecksum(mockChecksum, mockFilePath, mockUserId)

			expect(mockFs.writeJSON).toHaveBeenCalledWith(
				mockChecksumFile,
				{
					files: [
						{
							path: mockFilePath,
							userId: mockUserId,
							timestamp: mockTimestamp,
						},
					],
				},
				{ spaces: 2 }
			)
		})

		test('should update existing checksum file when one exists', async () => {
			mockFs.pathExists.mockResolvedValueOnce(true as never)

			mockFs.readJSON.mockResolvedValueOnce({
				files: [
					{
						path: '/existing/path.jpg',
						userId: 'other-user',
						timestamp: 12345,
					},
				],
			} as never)

			await storeFileChecksum(mockChecksum, mockFilePath, mockUserId)

			expect(mockFs.writeJSON).toHaveBeenCalledWith(
				mockChecksumFile,
				{
					files: [
						{
							path: '/existing/path.jpg',
							userId: 'other-user',
							timestamp: 12345,
						},
						{
							path: mockFilePath,
							userId: mockUserId,
							timestamp: mockTimestamp,
						},
					],
				},
				{ spaces: 2 }
			)
		})

		test('should handle errors gracefully', async () => {
			mockFs.pathExists.mockRejectedValue(
				new Error('Test error') as never
			)

			await storeFileChecksum('abc123', '/path/file.jpg', 'user1')

			expect(logger.error).toHaveBeenCalled()
			expect(logger.error).toHaveBeenCalledWith(
				'Error storing file checksum: Error: Test error'
			)
		})
	})

	describe('cleanupOldChecksums', () => {
		const now = 1619000000000
		const dayInMs = 24 * 60 * 60 * 1000
		const cutoffTime = now - 30 * dayInMs

		beforeEach(() => {
			jest.spyOn(Date, 'now').mockReturnValue(now)
		})

		test('should remove old files and update checksum records', async () => {
			mockFs.readdir.mockResolvedValue([
				'checksum1.json',
				'checksum2.json',
				'not-a-json-file.txt',
			] as never)

			mockFs.readJSON.mockResolvedValueOnce({
				files: [
					{
						path: '/path/oldFile1.jpg',
						userId: 'user1',
						timestamp: cutoffTime - 1000,
					},
					{
						path: '/path/newFile1.jpg',
						userId: 'user1',
						timestamp: cutoffTime + 1000,
					},
				],
			} as never)

			mockFs.readJSON.mockResolvedValueOnce({
				files: [
					{
						path: '/path/oldFile2.jpg',
						userId: 'user2',
						timestamp: cutoffTime - 10000,
					},
				],
			} as never)

			mockFs.pathExists.mockResolvedValue(true as never)

			const result = await cleanupOldChecksums(30)

			expect(mockFs.pathExists).toHaveBeenCalledTimes(2)
			expect(mockFs.remove).toHaveBeenCalledWith('/path/oldFile1.jpg')
			expect(mockFs.remove).toHaveBeenCalledWith('/path/oldFile2.jpg')

			expect(mockFs.writeJSON).toHaveBeenCalledWith(
				path.join(CHECKSUMS_DIR, 'checksum1.json'),
				{
					files: [
						{
							path: '/path/newFile1.jpg',
							userId: 'user1',
							timestamp: cutoffTime + 1000,
						},
					],
				},
				{ spaces: 2 }
			)

			expect(mockFs.remove).toHaveBeenCalledWith(
				path.join(CHECKSUMS_DIR, 'checksum2.json')
			)

			expect(result).toBe(2)
		})

		test('should skip non-JSON files', async () => {
			mockFs.readdir.mockResolvedValue([
				'not-a-json-file.txt',
				'another-file.log',
			] as never)

			const result = await cleanupOldChecksums(30)

			expect(mockFs.readJSON).not.toHaveBeenCalled()
			expect(result).toBe(0)
		})

		test('should skip files that do not exist on disk', async () => {
			mockFs.readdir.mockResolvedValue(['checksum1.json'] as never)

			mockFs.readJSON.mockResolvedValueOnce({
				files: [
					{
						path: '/path/oldFile1.jpg',
						userId: 'user1',
						timestamp: cutoffTime - 1000,
					},
				],
			} as never)

			mockFs.pathExists.mockResolvedValue(false as never)

			const result = await cleanupOldChecksums(30)

			expect(mockFs.pathExists).toHaveBeenCalledWith('/path/oldFile1.jpg')
			expect(mockFs.remove).not.toHaveBeenCalledWith('/path/oldFile1.jpg')
			expect(result).toBe(0)
		})

		test('should handle errors gracefully', async () => {
			mockFs.readdir.mockRejectedValue(new Error('Test error') as never)

			const result = await cleanupOldChecksums(30)

			expect(result).toBe(0)
			expect(logger.error).toHaveBeenCalled()
		})

		test('should use default retention period if none specified', async () => {
			mockFs.readdir.mockResolvedValue(['checksum1.json'] as never)

			mockFs.readJSON.mockResolvedValueOnce({
				files: [
					{
						path: '/path/oldFile1.jpg',
						userId: 'user1',
						timestamp: now - 31 * dayInMs,
					},
				],
			} as never)

			mockFs.pathExists.mockResolvedValue(true as never)

			const result = await cleanupOldChecksums()

			expect(mockFs.remove).toHaveBeenCalledWith('/path/oldFile1.jpg')
			expect(result).toBe(1)
		})
	})
})
