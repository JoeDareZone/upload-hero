import path from 'path'

export const UPLOAD_DIR = path.join(__dirname, '..', 'uploads')
export const FINAL_DIR = path.join(__dirname, '..', 'uploads', 'final')
export const CHUNK_SIZE = 1024 * 1024
export const TWENTY_FOUR_HOURS_IN_SECONDS = 24 * 60 * 60
export const CHUNK_CACHE_TTL = TWENTY_FOUR_HOURS_IN_SECONDS
export const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024
export const FILE_RETENTION_PERIOD = 30 * 24 * 60 * 60 * 1000

export const getUserStoragePath = (userId: string) => {
	const safeUserId = userId || 'anonymous'

	const now = new Date()
	const year = now.getFullYear()
	const month = String(now.getMonth() + 1).padStart(2, '0')
	const day = String(now.getDate()).padStart(2, '0')

	const YYYYMMDDStoragePath = path.join(
		FINAL_DIR,
		safeUserId,
		String(year),
		month,
		day
	)

	return YYYYMMDDStoragePath
}

export const LOG_LEVELS = {
	DEBUG: 'debug',
	INFO: 'info',
	WARN: 'warn',
	ERROR: 'error',
}
