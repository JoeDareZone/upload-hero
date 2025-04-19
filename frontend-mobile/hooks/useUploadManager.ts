import { finalizeUpload, uploadChunk } from '@/services/uploadService'
import { UploadFile } from '@/types/fileType'
import { createChunks } from '@/utils/chunkUtils'
import { CHUNK_SIZE, MAX_CONCURRENT_UPLOADS } from '@/utils/constants'
import { useRef, useState } from 'react'

export const useUploadManager = () => {
	const filesRef = useRef<UploadFile[]>([])
	const [files, setFiles] = useState<UploadFile[]>([])
	const activeUploads = useRef(0)
	const fileQueue = useRef<UploadFile[]>([])
	const activeFileUploads = useRef<Record<string, boolean>>({})
	const [isUploading, setIsUploading] = useState(false)

	const updateFiles = (updated: UploadFile[]) => {
		filesRef.current = updated
		setFiles(updated)
	}

	const enqueueFile = (file: UploadFile) => {
		fileQueue.current.push(file)

		updateFiles([
			...filesRef.current,
			{
				...file,
				status: 'queued',
				totalChunks: Math.ceil(file.size / CHUNK_SIZE),
				uploadedChunks: 0,
			},
		])
	}

	const processQueue = () => {
		setIsUploading(true)
		while (
			activeUploads.current < MAX_CONCURRENT_UPLOADS &&
			fileQueue.current.length > 0
		) {
			const nextFile = fileQueue.current.shift()
			if (!nextFile) continue

			const file = filesRef.current.find(f => f.id === nextFile.id)
			if (!file || ['paused', 'error', 'completed'].includes(file.status))
				continue

			startFileUpload(file)
		}

		if (activeUploads.current === 0) {
			setIsUploading(false)
		}
	}

	const uploadChunkWithRetry = async (chunk: any, fileId: string) => {
		if (filesRef.current.find(f => f.id === fileId)?.status === 'paused') {
			return false
		}

		// Artificial delay for testing
		// await new Promise(res => setTimeout(res, 1500))

		if (filesRef.current.find(f => f.id === fileId)?.status === 'paused') {
			return false
		}

		let attempts = 0
		const maxRetries = 3

		while (attempts <= maxRetries) {
			try {
				await uploadChunk(chunk)
				return true
			} catch (err) {
				attempts++

				if (attempts <= maxRetries) {
					await new Promise(res =>
						setTimeout(res, Math.pow(2, attempts) * 1000)
					)

					if (
						filesRef.current.find(f => f.id === fileId)?.status ===
						'paused'
					) {
						return false
					}
				} else {
					console.error(
						`Chunk ${chunk.chunkIndex} failed after ${maxRetries} retries.`
					)
					updateFiles(
						filesRef.current.map(f =>
							f.id === fileId ? { ...f, status: 'error' } : f
						)
					)
					return false
				}
			}
		}

		return false
	}

	const updateFileProgress = (fileId: string) => {
		const file = filesRef.current.find(f => f.id === fileId)
		if (!file) return false

		const uploadedChunks = file.uploadedChunks + 1
		const isCompleted = uploadedChunks === file.totalChunks

		updateFiles(
			filesRef.current.map(f => {
				if (f.id !== fileId) return f
				return {
					...f,
					uploadedChunks,
					status: isCompleted ? 'completed' : 'uploading',
				}
			})
		)

		return isCompleted
	}

	const startFileUpload = async (file: UploadFile) => {
		if (activeFileUploads.current[file.id]) return

		activeUploads.current += 1
		activeFileUploads.current[file.id] = true
		setIsUploading(true)

		updateFiles(
			filesRef.current.map(f =>
				f.id === file.id ? { ...f, status: 'uploading' } : f
			)
		)

		const chunks = createChunks(file)

		try {
			for (let i = 0; i < chunks.length; i++) {
				const chunk = chunks[i]

				const currentFile = filesRef.current.find(f => f.id === file.id)
				if (
					!currentFile ||
					['paused', 'error', 'completed'].includes(
						currentFile.status
					)
				) {
					break
				}

				// Upload the chunk with retry logic
				const uploadSuccess = await uploadChunkWithRetry(chunk, file.id)
				if (!uploadSuccess) break

				// Update progress and check if complete
				const isCompleted = updateFileProgress(file.id)

				// If upload is complete, finalize it
				if (isCompleted) {
					const updatedFile = filesRef.current.find(
						f => f.id === file.id
					)
					if (!updatedFile) continue

					const finalizeResult = await finalizeUpload(updatedFile)

					if (!finalizeResult.success) {
						updateFiles(
							filesRef.current.map(f =>
								f.id === file.id
									? {
											...f,
											status: 'error',
											errorMessage:
												finalizeResult.message,
									  }
									: f
							)
						)
					}
				}
			}
		} finally {
			activeUploads.current -= 1
			activeFileUploads.current[file.id] = false

			if (activeUploads.current === 0) {
				setIsUploading(false)
			}

			processQueue()
		}
	}

	const pauseUpload = (fileId: string) => {
		const updated = filesRef.current.map(file =>
			file.id === fileId ? { ...file, status: 'paused' } : file
		)
		updateFiles(updated as UploadFile[])
	}

	const resumeUpload = (fileId: string) => {
		const file = filesRef.current.find(f => f.id === fileId)
		if (!file) return

		if (!activeFileUploads.current[fileId]) {
			const alreadyInQueue = fileQueue.current.some(
				queuedFile => queuedFile.id === fileId
			)
			if (!alreadyInQueue) {
				fileQueue.current.push(file)
			}
		}

		updateFiles(
			filesRef.current.map(f =>
				f.id === fileId ? { ...f, status: 'uploading' } : f
			)
		)

		processQueue()
	}

	const cancelUpload = (fileId: string) => {
		fileQueue.current = fileQueue.current.filter(file => file.id !== fileId)
		updateFiles(filesRef.current.filter(file => file.id !== fileId))
	}

	const clearAllFiles = () => {
		// Clear all queues and reset state
		fileQueue.current = []
		activeFileUploads.current = {}
		activeUploads.current = 0
		updateFiles([])
		setIsUploading(false)
	}

	return {
		enqueueFile,
		processQueue,
		files,
		pauseUpload,
		resumeUpload,
		cancelUpload,
		isUploading,
		clearAllFiles,
	}
}
