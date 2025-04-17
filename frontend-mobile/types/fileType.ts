export type FileType = {
	status: string
	uri: string
	name: string
	mimeType: string
	size: number
}

export type UploadFile = FileType & {
	id: string
	totalChunks: number
	uploadedChunks: number
	status: 'queued' | 'uploading' | 'completed' | 'paused' | 'error'
}

export type UploadChunk = {
	fileId: string
	chunkIndex: number
	start: number
	end: number
	status: 'queued' | 'uploading' | 'completed' | 'failed'
	retries: number
	uri: string
}