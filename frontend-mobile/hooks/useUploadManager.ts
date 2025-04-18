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
	}

	const startFileUpload = async (file: UploadFile) => {
		if (activeFileUploads.current[file.id]) return

		activeUploads.current += 1
		activeFileUploads.current[file.id] = true

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

				await new Promise(res => setTimeout(res, 1500))

				try {
					await uploadChunk(chunk)

					updateFiles(
						filesRef.current.map(f => {
							if (f.id !== file.id) return f

							const uploadedChunks = f.uploadedChunks + 1
							const isCompleted = uploadedChunks === f.totalChunks

							if (isCompleted) finalizeUpload(f)

							return {
								...f,
								uploadedChunks,
								status: isCompleted ? 'completed' : f.status,
							}
						})
					)
				} catch (err) {
					if (chunk.retries < 3) {
						i--
						chunk.retries += 1
						await new Promise(res =>
							setTimeout(res, Math.pow(2, chunk.retries) * 1000)
						)
					} else {
						console.error(
							`Chunk ${chunk.chunkIndex} failed after 3 retries.`
						)
						updateFiles(
							filesRef.current.map(f =>
								f.id === file.id ? { ...f, status: 'error' } : f
							)
						)
						break
					}
				}
			}
		} finally {
			activeUploads.current -= 1
			activeFileUploads.current[file.id] = false
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

	return {
		enqueueFile,
		processQueue,
		files,
		pauseUpload,
		resumeUpload,
		cancelUpload,
	}
}
