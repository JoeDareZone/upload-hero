import { LOG_LEVELS, getUserStoragePath } from '../constants'

describe('Constants', () => {
	beforeEach(() => {
		jest.useFakeTimers()
		jest.setSystemTime(new Date(2023, 5, 15)) // June 15, 2023
	})

	afterEach(() => {
		jest.useRealTimers()
	})

	describe('getUserStoragePath', () => {
		test('should create storage path with user ID and current date', () => {
			const userId = 'test-user'
			const result = getUserStoragePath(userId)

			expect(result).toContain('test-user')
			expect(result).toContain('2023')
			expect(result).toContain('06')
			expect(result).toContain('15')
		})

		test('should use anonymous for undefined userId', () => {
			const result = getUserStoragePath(undefined as unknown as string)

			expect(result).toContain('anonymous')
		})

		test('should use anonymous for empty userId', () => {
			const result = getUserStoragePath('')

			expect(result).toContain('anonymous')
		})
	})

	describe('LOG_LEVELS', () => {
		test('should have the correct log levels defined', () => {
			expect(LOG_LEVELS).toEqual({
				DEBUG: 'debug',
				INFO: 'info',
				WARN: 'warn',
				ERROR: 'error',
			})
		})
	})
})
