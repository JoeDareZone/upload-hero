import path from 'path'

export const UPLOAD_DIR = path.join(__dirname, '..', 'uploads')
export const FINAL_DIR = path.join(__dirname, '..', 'uploads', 'final')
export const CHUNK_SIZE = 1024 * 1024
export const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024
export const FILE_RETENTION_PERIOD = 30 * 24 * 60 * 60 * 1000

// Organized storage paths
export const getUserStoragePath = (userId: string) => {
	// If userId is not provided, use 'anonymous'
	const safeUserId = userId || 'anonymous'

	// Create a date-based directory structure (YYYY/MM/DD)
	const now = new Date()
	const year = now.getFullYear()
	const month = String(now.getMonth() + 1).padStart(2, '0')
	const day = String(now.getDate()).padStart(2, '0')

	return path.join(FINAL_DIR, safeUserId, String(year), month, day)
}

export const LOG_LEVELS = {
	DEBUG: 'debug',
	INFO: 'info',
	WARN: 'warn',
	ERROR: 'error',
}
