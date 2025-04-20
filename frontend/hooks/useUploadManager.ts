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

export const useUploadManager = () => {
	const filesRef = useRef<UploadFile[]>([])
	const [files, setFiles] = useState<UploadFile[]>([])
	const activeUploads = useRef(0)
	const fileQueue = useRef<UploadFile[]>([])
	const activeFileUploads = useRef<Record<string, boolean>>({})
	const [isUploading, setIsUploading] = useState(false)

	useEffect(() => {
		Platform.OS === 'web' &&
			files.forEach(file => {
				if (file.status === 'completed') {
					saveToUploadHistory(file)
				}
			})
	}, [files])

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
		if (ARTIFICIAL_DELAY) {
			await new Promise(res => setTimeout(res, 1500))
		}

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

		try {
			let uploadId = file.id
			let updatedFile = file

			if (!uploadId || file.uploadedChunks === 0) {
				uploadId = await initiateUpload(file)

				updatedFile = {
					...file,
					id: uploadId,
				}

				updateFiles(
					filesRef.current.map(f =>
						f.id === file.id ? updatedFile : f
					)
				)
			}

			const status = await checkUploadStatus(uploadId)
			const uploadedChunkIndices = new Set(status.chunkIndices)

			updatedFile =
				filesRef.current.find(f => f.id === uploadId) || updatedFile

			if (status.chunksReceived !== updatedFile.uploadedChunks) {
				updateFiles(
					filesRef.current.map(f =>
						f.id === updatedFile.id
							? { ...f, uploadedChunks: status.chunksReceived }
							: f
					)
				)

				updatedFile =
					filesRef.current.find(f => f.id === uploadId) || updatedFile
			}

			if (status.chunksReceived === updatedFile.totalChunks) {
				updateFiles(
					filesRef.current.map(f =>
						f.id === updatedFile.id
							? {
									...f,
									status: 'completed',
									uploadedChunks: updatedFile.totalChunks,
							  }
							: f
					)
				)

				const finalizeResult = await finalizeUpload(updatedFile)
				if (!finalizeResult.success) {
					updateFiles(
						filesRef.current.map(f =>
							f.id === updatedFile.id
								? {
										...f,
										status: 'error',
										errorMessage: finalizeResult.message,
								  }
								: f
						)
					)
				}
				return
			}

			const chunks = createChunks(updatedFile)

			for (let i = 0; i < chunks.length; i++) {
				const chunk = chunks[i]

				const currentFile = filesRef.current.find(
					f => f.id === updatedFile.id
				)
				if (
					!currentFile ||
					['paused', 'error', 'completed'].includes(
						currentFile.status
					)
				) {
					break
				}

				if (uploadedChunkIndices.has(chunk.chunkIndex)) {
					continue
				}

				const uploadSuccess = await uploadChunkWithRetry(
					chunk,
					updatedFile.id
				)
				if (!uploadSuccess) break

				const isCompleted = updateFileProgress(updatedFile.id)

				if (isCompleted) {
					const completedFile = filesRef.current.find(
						f => f.id === updatedFile.id
					)
					if (!completedFile) continue

					const finalizeResult = await finalizeUpload(completedFile)

					if (!finalizeResult.success) {
						updateFiles(
							filesRef.current.map(f =>
								f.id === updatedFile.id
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
		} catch (error) {
			console.error('Error starting file upload:', error)
			updateFiles(
				filesRef.current.map(f =>
					f.id === file.id
						? {
								...f,
								status: 'error',
								errorMessage: 'Failed to initiate upload',
						  }
						: f
				)
			)
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

	const resumeUpload = async (fileId: string) => {
		const file = filesRef.current.find(f => f.id === fileId)
		if (!file) return

		updateFiles(
			filesRef.current.map(f =>
				f.id === fileId ? { ...f, status: 'uploading' } : f
			)
		)

		try {
			if (file.id && file.uploadedChunks > 0) {
				const status = await checkUploadStatus(file.id)

				updateFiles(
					filesRef.current.map(f =>
						f.id === fileId
							? { ...f, uploadedChunks: status.chunksReceived }
							: f
					)
				)
			}
		} catch (error) {
			console.error('Error checking upload status:', error)
		}

		if (!activeFileUploads.current[fileId]) {
			const updatedFile = filesRef.current.find(f => f.id === fileId)
			if (!updatedFile) return

			const alreadyInQueue = fileQueue.current.some(
				queuedFile => queuedFile.id === fileId
			)
			if (!alreadyInQueue) {
				fileQueue.current.push(updatedFile)
			}
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
