export type FileType = {
	status: string
	uri: string
	name: string
	mimeType: string
	size: number
}

type UploadStatus =
	| 'queued'
	| 'uploading'
	| 'paused'
	| 'completed'
	| 'error'
	| 'cancelled'

export type UploadFile = FileType & {
	id: string
	totalChunks: number
	uploadedChunks: number
	status: UploadStatus
	errorMessage?: string
}

export type UploadChunk = {
	fileId: string
	chunkIndex: number
	start: number
	end: number
	status: UploadStatus
	retries: number
	uri: string
}
