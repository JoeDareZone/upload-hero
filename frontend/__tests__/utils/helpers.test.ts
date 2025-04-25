import axios from 'axios'
import {
	convertBytesToMB,
	convertUploadedChunksToPercentage,
	generateFileId,
	getUserFriendlyErrorMessage,
} from '../../utils/helpers'

jest.mock('axios')

describe('helpers', () => {
	describe('convertBytesToMB', () => {
		test('converts bytes to MB correctly', () => {
			expect(convertBytesToMB(0)).toBe('0.00')
			expect(convertBytesToMB(1024 * 1024)).toBe('1.00')
			expect(convertBytesToMB(1024 * 1024 * 2.5)).toBe('2.50')
		})
	})

	describe('convertUploadedChunksToPercentage', () => {
		test('calculates percentage correctly', () => {
			expect(convertUploadedChunksToPercentage(0, 10)).toBe(0)
			expect(convertUploadedChunksToPercentage(5, 10)).toBe(50)
			expect(convertUploadedChunksToPercentage(10, 10)).toBe(100)
		})
	})

	describe('generateFileId', () => {
		test('generates unique IDs', () => {
			const id1 = generateFileId()
			const id2 = generateFileId()
			expect(id1).not.toBe(id2)
			expect(typeof id1).toBe('string')
		})
	})

	describe('getUserFriendlyErrorMessage', () => {
		test('returns appropriate message for file exists error', () => {
			const fileExistsError = { message: 'File already exists' }
			expect(getUserFriendlyErrorMessage(fileExistsError)).toContain(
				'already exists'
			)
		})

		test('returns appropriate message for axios errors', () => {
			;(axios.isAxiosError as unknown as jest.Mock).mockImplementation(
				() => true
			)

			const errorWithNoResponse = {}
			expect(getUserFriendlyErrorMessage(errorWithNoResponse)).toContain(
				'Network error'
			)

			const error400 = { response: { status: 400 } }
			expect(getUserFriendlyErrorMessage(error400)).toContain(
				'Invalid request'
			)

			const error401 = { response: { status: 401 } }
			expect(getUserFriendlyErrorMessage(error401)).toContain(
				'Authentication error'
			)

			const error403 = { response: { status: 403 } }
			expect(getUserFriendlyErrorMessage(error403)).toContain(
				'permission'
			)

			const error413 = { response: { status: 413 } }
			expect(getUserFriendlyErrorMessage(error413)).toContain(
				'File too large'
			)

			const error500 = { response: { status: 500 } }
			expect(getUserFriendlyErrorMessage(error500)).toContain(
				'Server error'
			)

			const errorOther = { response: { status: 999 } }
			expect(getUserFriendlyErrorMessage(errorOther)).toContain('999')
		})

		test('returns generic message for unknown errors', () => {
			;(axios.isAxiosError as unknown as jest.Mock).mockImplementation(
				() => false
			)

			const unknownError = new Error('Something went wrong')
			expect(getUserFriendlyErrorMessage(unknownError)).toContain(
				'unexpected error'
			)
		})
	})
})
