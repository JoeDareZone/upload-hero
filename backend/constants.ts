import path from 'path'

export const UPLOAD_DIR = path.join(__dirname, '..', 'backend', 'uploads')
export const FINAL_DIR = path.join(__dirname, '..', 'backend', 'uploads', 'final')
export const CHUNK_SIZE = 1024 * 1024
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024
export const FILE_RETENTION_PERIOD = 30 * 24 * 60 * 60 * 1000

export const LOG_LEVELS = {
	DEBUG: 'debug',
	INFO: 'info',
	WARN: 'warn',
	ERROR: 'error',
}
