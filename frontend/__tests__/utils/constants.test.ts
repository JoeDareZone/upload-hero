import { API_BASE_URL, CHUNK_SIZE, IS_WEB } from '../../utils/constants'

describe('constants', () => {
	test('API_BASE_URL is defined', () => {
		expect(API_BASE_URL).toBeDefined()
	})

	test('CHUNK_SIZE is a positive number', () => {
		expect(CHUNK_SIZE).toBeGreaterThan(0)
	})

	test('IS_WEB is a boolean', () => {
		expect(typeof IS_WEB).toBe('boolean')
	})
})
