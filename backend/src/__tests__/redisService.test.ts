import redisService from '../services/redisService'

// Mock Redis module
jest.mock('redis', () => {
	const mockRedisClient = {
		connect: jest.fn().mockResolvedValue(undefined),
		quit: jest.fn().mockResolvedValue(undefined),
		on: jest.fn().mockImplementation(function (this: any, event, callback) {
			// Only trigger callbacks during initialization but not log anything
			if (event === 'connect' || event === 'error') {
				// Don't actually call the callback as it would log messages
			}
			return this
		}),
		set: jest.fn().mockResolvedValue(undefined),
		get: jest.fn().mockResolvedValue(null),
		del: jest.fn().mockResolvedValue(undefined),
		sAdd: jest.fn().mockResolvedValue(undefined),
		sMembers: jest.fn().mockResolvedValue([]),
		expire: jest.fn().mockResolvedValue(undefined),
	}

	return {
		createClient: jest.fn().mockReturnValue(mockRedisClient),
	}
})

// Get access to internal Redis client in redisService
const internalClient = (redisService as any).client

describe('RedisService', () => {
	let consoleErrorSpy: jest.SpyInstance
	let consoleLogSpy: jest.SpyInstance

	beforeEach(() => {
		// Spy on console to silence it in tests
		consoleErrorSpy = jest
			.spyOn(console, 'error')
			.mockImplementation(() => {})
		consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {})

		jest.clearAllMocks()
		// Reset connected state
		;(redisService as any).isConnected = false
	})

	afterEach(() => {
		// Restore console
		consoleErrorSpy.mockRestore()
		consoleLogSpy.mockRestore()
	})

	describe('Connection methods', () => {
		test('connect should call client.connect when not connected', async () => {
			;(redisService as any).isConnected = false
			await redisService.connect()
			expect(internalClient.connect).toHaveBeenCalled()
		})

		test('disconnect should call client.quit when connected', async () => {
			;(redisService as any).isConnected = true
			await redisService.disconnect()
			expect(internalClient.quit).toHaveBeenCalled()
		})
	})

	describe('Chunk handling methods', () => {
		test('setChunkStatus should set status and expiry', async () => {
			const uploadId = 'test-upload'
			const chunkIndex = 1
			const status = 'complete'

			await redisService.setChunkStatus(uploadId, chunkIndex, status)

			expect(internalClient.set).toHaveBeenCalledWith(
				`upload:${uploadId}:chunk:${chunkIndex}`,
				status
			)
			expect(internalClient.expire).toHaveBeenCalled()
		})

		test('getChunkStatus should retrieve status', async () => {
			const uploadId = 'test-upload'
			const chunkIndex = 1
			const mockStatus = 'complete'

			internalClient.get.mockResolvedValueOnce(mockStatus)

			const result = await redisService.getChunkStatus(
				uploadId,
				chunkIndex
			)

			expect(result).toBe(mockStatus)
			expect(internalClient.get).toHaveBeenCalledWith(
				`upload:${uploadId}:chunk:${chunkIndex}`
			)
		})

		test('updateChunksList should add chunk to set', async () => {
			const uploadId = 'test-upload'
			const chunkIndex = 2

			await redisService.updateChunksList(uploadId, chunkIndex)

			expect(internalClient.sAdd).toHaveBeenCalledWith(
				`upload:${uploadId}:chunks`,
				chunkIndex.toString()
			)
			expect(internalClient.expire).toHaveBeenCalled()
		})

		test('getChunksList should retrieve and parse chunks', async () => {
			const uploadId = 'test-upload'
			const mockChunks = ['1', '2', '3']

			internalClient.sMembers.mockResolvedValueOnce(mockChunks)

			const result = await redisService.getChunksList(uploadId)

			expect(result).toEqual([1, 2, 3])
			expect(internalClient.sMembers).toHaveBeenCalledWith(
				`upload:${uploadId}:chunks`
			)
		})
	})

	describe('Metadata handling methods', () => {
		test('storeUploadMetadata should store serialized metadata', async () => {
			const uploadId = 'test-upload'
			const metadata = { fileName: 'test.jpg', fileSize: 1024 }

			await redisService.storeUploadMetadata(uploadId, metadata)

			expect(internalClient.set).toHaveBeenCalledWith(
				`upload:${uploadId}:metadata`,
				JSON.stringify(metadata)
			)
			expect(internalClient.expire).toHaveBeenCalled()
		})

		test('getUploadMetadata should retrieve and parse metadata', async () => {
			const uploadId = 'test-upload'
			const metadata = { fileName: 'test.jpg', fileSize: 1024 }

			internalClient.get.mockResolvedValueOnce(JSON.stringify(metadata))

			const result = await redisService.getUploadMetadata(uploadId)

			expect(result).toEqual(metadata)
			expect(internalClient.get).toHaveBeenCalledWith(
				`upload:${uploadId}:metadata`
			)
		})

		test('getUploadMetadata should return null for missing data', async () => {
			const uploadId = 'test-upload'

			internalClient.get.mockResolvedValueOnce(null)

			const result = await redisService.getUploadMetadata(uploadId)

			expect(result).toBeNull()
		})
	})

	describe('Chunks received methods', () => {
		test('updateChunksReceived should store count', async () => {
			const uploadId = 'test-upload'
			const count = 5

			await redisService.updateChunksReceived(uploadId, count)

			expect(internalClient.set).toHaveBeenCalledWith(
				`upload:${uploadId}:chunksReceived`,
				count.toString()
			)
			expect(internalClient.expire).toHaveBeenCalled()
		})

		test('getChunksReceived should retrieve and parse count', async () => {
			const uploadId = 'test-upload'
			const count = 5

			internalClient.get.mockResolvedValueOnce(count.toString())

			const result = await redisService.getChunksReceived(uploadId)

			expect(result).toBe(count)
			expect(internalClient.get).toHaveBeenCalledWith(
				`upload:${uploadId}:chunksReceived`
			)
		})

		test('getChunksReceived should return 0 for missing data', async () => {
			const uploadId = 'test-upload'

			internalClient.get.mockResolvedValueOnce(null)

			const result = await redisService.getChunksReceived(uploadId)

			expect(result).toBe(0)
		})
	})

	describe('clearUploadData', () => {
		test('should clear all upload data', async () => {
			const uploadId = 'test-upload'
			const mockChunks = ['1', '2', '3']

			internalClient.sMembers.mockResolvedValueOnce(mockChunks)

			await redisService.clearUploadData(uploadId)

			// Should delete each chunk
			expect(internalClient.del).toHaveBeenCalledWith(
				`upload:${uploadId}:chunk:1`
			)
			expect(internalClient.del).toHaveBeenCalledWith(
				`upload:${uploadId}:chunk:2`
			)
			expect(internalClient.del).toHaveBeenCalledWith(
				`upload:${uploadId}:chunk:3`
			)

			// Should delete metadata keys
			expect(internalClient.del).toHaveBeenCalledWith(
				`upload:${uploadId}:chunks`
			)
			expect(internalClient.del).toHaveBeenCalledWith(
				`upload:${uploadId}:metadata`
			)
			expect(internalClient.del).toHaveBeenCalledWith(
				`upload:${uploadId}:chunksReceived`
			)
		})

		test('should handle errors during cleanup', async () => {
			const uploadId = 'test-upload'
			const mockError = new Error('Redis error')

			internalClient.sMembers.mockRejectedValueOnce(mockError)

			// Should not throw
			await redisService.clearUploadData(uploadId)

			// Should still attempt to get chunks
			expect(internalClient.sMembers).toHaveBeenCalledWith(
				`upload:${uploadId}:chunks`
			)
		})
	})
})
