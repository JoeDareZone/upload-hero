import fs from 'fs'
import schedule from 'node-schedule'
import path from 'path'
import { FILE_RETENTION_PERIOD, UPLOAD_DIR } from '../constants'
import CleanupService from '../services/cleanupService'

jest.mock('fs')
jest.mock('path')
jest.mock('node-schedule')
jest.mock('../models/FileChecksum', () => ({
	cleanupOldChecksums: jest.fn().mockResolvedValue(3),
}))

describe('CleanupService', () => {
	const mockFiles = ['final', 'upload1', 'upload2', 'upload3']
	const mockStats = {
		isDirectory: jest.fn().mockReturnValue(true),
		mtimeMs: Date.now() - (FILE_RETENTION_PERIOD + 1000),
	}
	const mockRecentStats = {
		isDirectory: jest.fn().mockReturnValue(true),
		mtimeMs: Date.now(),
	}

	beforeEach(() => {
		jest.clearAllMocks()

		;(fs.existsSync as jest.Mock).mockReturnValue(true)
		;(fs.readdirSync as jest.Mock).mockReturnValue(mockFiles)
		;(fs.statSync as jest.Mock).mockImplementation(filePath => {
			if (filePath.includes('upload1') || filePath.includes('upload2')) {
				return mockStats
			}
			return mockRecentStats
		})
		;(fs.rmSync as jest.Mock).mockImplementation(() => {})
		;(path.join as jest.Mock).mockImplementation((...args) => {
			if (args[0] === UPLOAD_DIR && mockFiles.includes(args[1])) {
				return `${UPLOAD_DIR}/${args[1]}`
			}
			return args.join('/')
		})
		;(schedule.scheduleJob as jest.Mock).mockImplementation(
			(_, callback) => {
				if (callback) callback()
				return { cancel: jest.fn() }
			}
		)
	})

	test('should start and schedule cleanup job', () => {
		CleanupService.start()
		expect(schedule.scheduleJob).toHaveBeenCalled()
	})

	test('should stop cleanup job', () => {
		const mockCancel = jest.fn()
		;(schedule.scheduleJob as jest.Mock).mockReturnValue({
			cancel: mockCancel,
		})

		CleanupService.start()
		CleanupService.stop()

		expect(mockCancel).toHaveBeenCalled()
	})

	test('should clean up incomplete uploads older than retention period', async () => {
		const removedCount = await CleanupService.cleanupIncompleteUploads()

		expect(removedCount).toBe(2)
		expect(fs.rmSync).toHaveBeenCalledTimes(2)
		expect(fs.rmSync).toHaveBeenCalledWith(`${UPLOAD_DIR}/upload1`, {
			recursive: true,
			force: true,
		})
		expect(fs.rmSync).toHaveBeenCalledWith(`${UPLOAD_DIR}/upload2`, {
			recursive: true,
			force: true,
		})
	})

	test('should not clean up files if UPLOAD_DIR does not exist', async () => {
		;(fs.existsSync as jest.Mock).mockReturnValueOnce(false)

		const removedCount = await CleanupService.cleanupIncompleteUploads()

		expect(removedCount).toBe(0)
		expect(fs.rmSync).not.toHaveBeenCalled()
	})

	test('should clean up old files using cleanupOldChecksums', async () => {
		const cleanupOldChecksums =
			require('../models/FileChecksum').cleanupOldChecksums

		const removedCount = await CleanupService.cleanupOldFiles()

		expect(removedCount).toBe(3)
		expect(cleanupOldChecksums).toHaveBeenCalled()
	})
})
