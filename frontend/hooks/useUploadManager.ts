import {
	checkUploadStatus,
	finalizeUpload,
	initiateUpload,
	uploadChunk,
} from '@/services/uploadService'
import { UploadFile } from '@/types/fileType'
import { createChunks } from '@/utils/chunkUtils'
import {
	ARTIFICIAL_DELAY,
	CHUNK_SIZE,
	MAX_CONCURRENT_UPLOADS,
} from '@/utils/constants'
import { saveToUploadHistory } from '@/utils/storageUtils'
import { useEffect, useRef, useState } from 'react'
import { Platform } from 'react-native'

type FileUploadState = {
	files: UploadFile[]
	isUploading: boolean
}

type FileUploadActions = {
	enqueueFile: (file: UploadFile) => void
	processQueue: () => void
	pauseUpload: (fileId: string) => void
	resumeUpload: (fileId: string) => void
	cancelUpload: (fileId: string) => void
	clearAllFiles: () => void
}

export const useUploadManager = (): FileUploadState & FileUploadActions => {
	const filesRef = useRef<UploadFile[]>([])
	const [files, setFiles] = useState<UploadFile[]>([])
	const [isUploading, setIsUploading] = useState(false)

	const activeUploads = useRef(0)
	const fileQueue = useRef<UploadFile[]>([])
	const activeFileUploads = useRef<Record<string, boolean>>({})

	useEffect(() => {
		const saveCompletedFilesForWeb = () => {
			if (Platform.OS === 'web') {
				files.forEach(file => {
					if (file.status === 'completed') {
						saveToUploadHistory(file)
					}
				})
			}
		}

		saveCompletedFilesForWeb()
	}, [files])

	const updateFiles = (updated: UploadFile[]) => {
		filesRef.current = updated
		setFiles(updated)
	}

	const updateFileStatus = (fileId: string, updates: Partial<UploadFile>) => {
		updateFiles(
			filesRef.current.map(file =>
				file.id === fileId ? { ...file, ...updates } : file
			)
		)
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

	const uploadChunkWithRetry = async (
		chunk: any,
		fileId: string
	): Promise<boolean> => {
		const isFilePaused = () =>
			filesRef.current.find(f => f.id === fileId)?.status === 'paused'

		if (isFilePaused()) return false

		// Artificial delay for testing
		if (ARTIFICIAL_DELAY) {
			await new Promise(res => setTimeout(res, 200))
		}

		if (isFilePaused()) return false

		let attempts = 0
		const maxRetries = 3

		while (attempts <= maxRetries) {
			try {
				await uploadChunk(chunk)
				return true
			} catch (err) {
				attempts++

				if (attempts <= maxRetries) {
					const exponentialBackoff = Math.pow(2, attempts) * 1000
					// Exponential backoff
					await new Promise(res =>
						setTimeout(res, exponentialBackoff)
					)

					if (isFilePaused()) return false
				} else {
					console.error(
						`Chunk ${chunk.chunkIndex} failed after ${maxRetries} retries.`
					)
					updateFileStatus(fileId, { status: 'error' })
					return false
				}
			}
		}

		return false
	}

	const updateFileProgress = (fileId: string): boolean => {
		const file = filesRef.current.find(f => f.id === fileId)
		if (!file) return false

		const uploadedChunks = file.uploadedChunks + 1
		const isCompleted = uploadedChunks === file.totalChunks

		updateFileStatus(fileId, {
			uploadedChunks,
			status: isCompleted ? 'completed' : 'uploading',
		})

		return isCompleted
	}

	const startFileUpload = async (file: UploadFile) => {
		if (activeFileUploads.current[file.id]) return

		activeUploads.current += 1
		activeFileUploads.current[file.id] = true
		setIsUploading(true)

		updateFileStatus(file.id, { status: 'uploading' })

		try {
			let uploadId = file.id
			let updatedFile = file

			const initiateOrResumeUpload = async () => {
				if (!uploadId || file.uploadedChunks === 0) {
					uploadId = await initiateUpload(file)
					updatedFile = { ...file, id: uploadId }
					updateFileStatus(file.id, { id: uploadId })
				}
			}

			await initiateOrResumeUpload()

			const status = await checkUploadStatus(uploadId)
			const uploadedChunkIndices = new Set(status.chunkIndices)

			updatedFile =
				filesRef.current.find(f => f.id === uploadId) || updatedFile

			const updateUploadProgressOnMismatch = () => {
				if (status.chunksReceived !== updatedFile.uploadedChunks) {
					updateFileStatus(updatedFile.id, {
						uploadedChunks: status.chunksReceived,
					})
					updatedFile =
						filesRef.current.find(f => f.id === uploadId) ||
						updatedFile
				}
			}

			updateUploadProgressOnMismatch()

			const isCompleted =
				status.chunksReceived === updatedFile.totalChunks

			if (isCompleted) {
				updateFileStatus(updatedFile.id, {
					status: 'completed',
					uploadedChunks: updatedFile.totalChunks,
				})

				await finalizeSingleUpload(updatedFile)
				return
			}

			const uploadRemainingChunks = async () => {
				const chunks = createChunks(updatedFile)

				for (let i = 0; i < chunks.length; i++) {
					const chunk = chunks[i]

					const checkIfStatusChanged = () => {
						const currentFile = filesRef.current.find(
							f => f.id === updatedFile.id
						)
						if (
							!currentFile ||
							['paused', 'error', 'completed'].includes(
								currentFile.status
							)
						) {
							return true
						}
						return false
					}

					if (checkIfStatusChanged()) break

					const checkIfChunkAlreadyUploaded = () => {
						if (uploadedChunkIndices.has(chunk.chunkIndex)) {
							return true
						}
						return false
					}

					if (checkIfChunkAlreadyUploaded()) continue

					const uploadChunkAndCheckIfSuccess = async () => {
						const uploadSuccess = await uploadChunkWithRetry(
							chunk,
							updatedFile.id
						)
						return uploadSuccess
					}

					const uploadSuccess = await uploadChunkAndCheckIfSuccess()

					if (!uploadSuccess) break

					const isCompleted = updateFileProgress(updatedFile.id)
					if (isCompleted) {
						await finalizeSingleUpload(updatedFile)
					}
				}
			}

			await uploadRemainingChunks()
		} catch (error) {
			console.error('Error starting file upload:', error)
			updateFileStatus(file.id, {
				status: 'error',
				errorMessage: 'Failed to initiate upload',
			})
		} finally {
			activeUploads.current -= 1
			activeFileUploads.current[file.id] = false

			if (activeUploads.current === 0) {
				setIsUploading(false)
			}

			processQueue()
		}
	}

	const finalizeSingleUpload = async (file: UploadFile) => {
		const completedFile = filesRef.current.find(f => f.id === file.id)
		if (!completedFile) return

		const finalizeResult = await finalizeUpload(completedFile)

		if (!finalizeResult.success) {
			updateFileStatus(file.id, {
				status: 'error',
				errorMessage: finalizeResult.message,
			})
		}
	}

	const pauseUpload = (fileId: string) =>
		updateFileStatus(fileId, { status: 'paused' })

	const resumeUpload = async (fileId: string) => {
		const file = filesRef.current.find(f => f.id === fileId)
		if (!file) return

		updateFileStatus(fileId, { status: 'uploading' })

		try {
			const updateStatusFromServer = async () => {
				const status = await checkUploadStatus(file.id)
				updateFileStatus(fileId, {
					uploadedChunks: status.chunksReceived,
				})
			}

			if (file.id && file.uploadedChunks > 0) {
				await updateStatusFromServer()
			}
		} catch (error) {
			console.error('Error checking upload status:', error)
		}

		const isActivelyUploading = activeFileUploads.current[fileId]
		const isAlreadyInQueue = fileQueue.current.some(
			queuedFile => queuedFile.id === fileId
		)

		if (!isActivelyUploading && !isAlreadyInQueue) {
			const updatedFile = filesRef.current.find(f => f.id === fileId)
			if (!updatedFile) return

			fileQueue.current.push(updatedFile)
		}

		processQueue()
	}

	const cancelUpload = (fileId: string) => {
		fileQueue.current = fileQueue.current.filter(file => file.id !== fileId)
		updateFiles(filesRef.current.filter(file => file.id !== fileId))
	}

	const clearAllFiles = () => {
		fileQueue.current = []
		activeFileUploads.current = {}
		activeUploads.current = 0
		updateFiles([])
		setIsUploading(false)
	}

	return {
		files,
		isUploading,
		enqueueFile,
		processQueue,
		pauseUpload,
		resumeUpload,
		cancelUpload,
		clearAllFiles,
	}
}
