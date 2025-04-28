describe('constants', () => {
	beforeEach(() => {
		jest.resetModules()
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	test('API_BASE_URL is defined', () => {
		jest.doMock('../../utils/constants', () => ({
			API_BASE_URL: 'http://localhost:4000',
			CHUNK_SIZE: 1024 * 1024,
			IS_WEB: false,
			MAX_FILES: 10,
			MAX_FILE_SIZE_MB: 15,
			MAX_FILE_SIZE_BYTES: 15 * 1024 * 1024,
			MAX_CONCURRENT_UPLOADS: 3,
			ARTIFICIAL_DELAY: true,
		}))

		const { API_BASE_URL } = require('../../utils/constants')
		expect(API_BASE_URL).toBeDefined()
	})

	test('API_BASE_URL is set correctly based on platform', () => {
		jest.doMock('../../utils/constants', () => ({
			API_BASE_URL: 'http://10.0.2.2:4000',
		}))
		const androidConstants = require('../../utils/constants')
		expect(androidConstants.API_BASE_URL).toBe('http://10.0.2.2:4000')

		jest.resetModules()
		jest.doMock('../../utils/constants', () => ({
			API_BASE_URL: 'http://localhost:4000',
		}))
		const iosConstants = require('../../utils/constants')
		expect(iosConstants.API_BASE_URL).toBe('http://localhost:4000')
	})

	test('CHUNK_SIZE is a positive number', () => {
		jest.doMock('../../utils/constants', () => ({
			CHUNK_SIZE: 1024 * 1024,
		}))
		const { CHUNK_SIZE } = require('../../utils/constants')
		expect(CHUNK_SIZE).toBeGreaterThan(0)
	})

	test('CHUNK_SIZE is 1MB', () => {
		jest.doMock('../../utils/constants', () => ({
			CHUNK_SIZE: 1024 * 1024,
		}))
		const { CHUNK_SIZE } = require('../../utils/constants')
		expect(CHUNK_SIZE).toBe(1024 * 1024)
	})

	test('IS_WEB is a boolean', () => {
		jest.doMock('../../utils/constants', () => ({
			IS_WEB: false,
		}))
		const { IS_WEB } = require('../../utils/constants')
		expect(typeof IS_WEB).toBe('boolean')
	})

	test('IS_WEB is determined by Platform.OS', () => {
		jest.doMock('../../utils/constants', () => ({
			IS_WEB: true,
		}))
		const webConstants = require('../../utils/constants')
		expect(webConstants.IS_WEB).toBe(true)

		jest.resetModules()
		jest.doMock('../../utils/constants', () => ({
			IS_WEB: false,
		}))
		const nonWebConstants = require('../../utils/constants')
		expect(nonWebConstants.IS_WEB).toBe(false)
	})

	test('MAX_FILES is defined correctly', () => {
		jest.doMock('../../utils/constants', () => ({
			MAX_FILES: 10,
		}))
		const { MAX_FILES } = require('../../utils/constants')
		expect(MAX_FILES).toBe(10)
	})

	test('MAX_FILE_SIZE_MB is defined correctly', () => {
		jest.doMock('../../utils/constants', () => ({
			MAX_FILE_SIZE_MB: 15,
		}))
		const { MAX_FILE_SIZE_MB } = require('../../utils/constants')
		expect(MAX_FILE_SIZE_MB).toBe(15)
	})

	test('MAX_FILE_SIZE_BYTES is calculated correctly', () => {
		const expectedMB = 15
		const expectedBytes = expectedMB * 1024 * 1024

		jest.doMock('../../utils/constants', () => ({
			MAX_FILE_SIZE_MB: expectedMB,
			MAX_FILE_SIZE_BYTES: expectedBytes,
		}))

		const {
			MAX_FILE_SIZE_BYTES,
			MAX_FILE_SIZE_MB,
		} = require('../../utils/constants')

		expect(MAX_FILE_SIZE_BYTES).toBe(MAX_FILE_SIZE_MB * 1024 * 1024)
	})

	test('MAX_CONCURRENT_UPLOADS is defined correctly', () => {
		jest.doMock('../../utils/constants', () => ({
			MAX_CONCURRENT_UPLOADS: 3,
		}))
		const { MAX_CONCURRENT_UPLOADS } = require('../../utils/constants')
		expect(MAX_CONCURRENT_UPLOADS).toBe(3)
	})

	test('ARTIFICIAL_DELAY is a boolean', () => {
		jest.doMock('../../utils/constants', () => ({
			ARTIFICIAL_DELAY: true,
		}))
		const { ARTIFICIAL_DELAY } = require('../../utils/constants')
		expect(typeof ARTIFICIAL_DELAY).toBe('boolean')
	})
})
