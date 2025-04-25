import { Platform } from 'react-native'

export const MAX_FILES = 10
export const MAX_FILE_SIZE_MB = 15
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024
export const MAX_CONCURRENT_UPLOADS = 3
export const CHUNK_SIZE = 1024 * 1024 // 1MB
export const ARTIFICIAL_DELAY = true
export const API_BASE_URL =
	Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://localhost:4000'
export const IS_WEB = Platform.OS === 'web'

