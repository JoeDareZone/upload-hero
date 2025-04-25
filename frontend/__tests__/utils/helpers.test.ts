import axios from 'axios'
import {
	convertBytesToMB,
	convertUploadedChunksToPercentage,
	generateFileId,
	getUserFriendlyErrorMessage,
} from '../../utils/helpers'

jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

describe('helpers', () => {
	describe('convertBytesToMB', () => {
		it('should convert bytes to MB with 2 decimal places', () => {
			expect(convertBytesToMB(1048576)).toBe('1.00')
			expect(convertBytesToMB(2097152)).toBe('2.00')
			expect(convertBytesToMB(2621440)).toBe('2.50')
		})
	})

	describe('convertUploadedChunksToPercentage', () => {
		it('should calculate percentage correctly', () => {
			expect(convertUploadedChunksToPercentage(0, 10)).toBe(0)
			expect(convertUploadedChunksToPercentage(5, 10)).toBe(50)
			expect(convertUploadedChunksToPercentage(10, 10)).toBe(100)
		})
	})

	describe('generateFileId', () => {
		it('should generate a unique ID', () => {
			const id1 = generateFileId()
			const id2 = generateFileId()

			expect(id1).not.toBe(id2)
			expect(typeof id1).toBe('string')
			expect(id1.includes('-')).toBe(true)
		})
	})

	describe('getUserFriendlyErrorMessage', () => {
		it('should handle duplicate file error', () => {
			const error = new Error('File already exists')
			expect(getUserFriendlyErrorMessage(error)).toBe(
				'This file already exists in your uploads.'
			)
		})

		it('should handle network errors', () => {
			const networkError = { isAxiosError: true, response: null }
			mockedAxios.isAxiosError.mockReturnValueOnce(true)

			expect(getUserFriendlyErrorMessage(networkError)).toBe(
				'Network error. Please check your connection and try again.'
			)
		})

		it('should handle HTTP status errors', () => {
			mockedAxios.isAxiosError.mockReturnValue(true)

			const errorCases = [
				{ status: 400, message: 'Invalid request. Please try again.' },
				{
					status: 401,
					message: 'Authentication error. Please log in again.',
				},
				{
					status: 403,
					message: "You don't have permission to upload this file.",
				},
				{
					status: 413,
					message: 'File too large. Please select a smaller file.',
				},
				{
					status: 500,
					message: 'Server error. Please try again later.',
				},
				{
					status: 418,
					message: 'Upload failed (418). Please try again later.',
				},
			]

			errorCases.forEach(({ status, message }) => {
				const axiosError = { isAxiosError: true, response: { status } }
				expect(getUserFriendlyErrorMessage(axiosError)).toBe(message)
			})
		})

		it('should handle unexpected errors', () => {
			mockedAxios.isAxiosError.mockReturnValueOnce(false)
			expect(getUserFriendlyErrorMessage({})).toBe(
				'An unexpected error occurred. Please try again.'
			)
		})
	})
})
