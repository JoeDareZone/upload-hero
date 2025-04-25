import { LOG_LEVELS, getUserStoragePath } from '../constants'

describe('Constants', () => {
	beforeEach(() => {
		jest.useFakeTimers()
		jest.setSystemTime(new Date(2023, 5, 15))
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
			expect(result).toContain('2023')
			expect(result).toContain('06')
			expect(result).toContain('15')
		})

		test('should use anonymous for empty userId', () => {
			const result = getUserStoragePath('')

			expect(result).toContain('anonymous')
			expect(result).toContain('2023')
			expect(result).toContain('06')
			expect(result).toContain('15')
		})

		test('should handle single-digit months and days', () => {
			jest.setSystemTime(new Date(2023, 0, 5))

			const result = getUserStoragePath('test-user')

			expect(result).toContain('test-user')
			expect(result).toContain('2023')
			expect(result).toContain('01')
			expect(result).toContain('05')
		})

		test('should handle month transitions', () => {
			jest.setSystemTime(new Date(2023, 11, 31))

			const result = getUserStoragePath('test-user')

			expect(result).toContain('test-user')
			expect(result).toContain('2023')
			expect(result).toContain('12')
			expect(result).toContain('31')
		})

		test('should handle year transitions', () => {
			jest.setSystemTime(new Date(2023, 11, 31, 23, 59, 59))
			const resultBefore = getUserStoragePath('test-user')

			jest.setSystemTime(new Date(2024, 0, 1, 0, 0, 0))
			const resultAfter = getUserStoragePath('test-user')

			expect(resultBefore).toContain('2023/12/31')
			expect(resultAfter).toContain('2024/01/01')
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
