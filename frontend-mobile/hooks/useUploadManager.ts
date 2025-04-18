import { finalizeUpload, uploadChunk } from '@/services/uploadService'
import { UploadChunk, UploadFile } from '@/types/fileType'
import { createChunks } from '@/utils/chunkUtils'
import { CHUNK_SIZE, MAX_CONCURRENT_UPLOADS } from '@/utils/constants'
import { useRef, useState } from 'react'

export const useUploadManager = () => {
	const filesRef = useRef<UploadFile[]>([])
	const [files, setFiles] = useState<UploadFile[]>([])
	const activeUploads = useRef(0)
	const queue = useRef<UploadChunk[]>([])

	const updateFiles = (updated: UploadFile[]) => {
		filesRef.current = updated
		setFiles(updated)
	}

	const isUploadable = (fileId: string) => {
		const file = filesRef.current.find(f => f.id === fileId)
		return file && file.status === 'uploading'
	}

	const enqueueFile = (file: UploadFile) => {
		const chunks = createChunks(file)
		queue.current.push(...chunks)

		updateFiles([
			...filesRef.current,
			{
				...file,
				status: 'queued',
				totalChunks: chunks.length,
				uploadedChunks: 0,
			},
		])
	}

	const processQueue = () => {
		while (
			activeUploads.current < MAX_CONCURRENT_UPLOADS &&
			queue.current.length > 0
		) {
			const chunk = queue.current.shift()
			if (!chunk) continue

			const file = filesRef.current.find(f => f.id === chunk.fileId)
			if (!file || ['paused', 'error', 'completed'].includes(file.status))
				continue

			updateFiles(
				filesRef.current.map(f =>
					f.id === chunk.fileId ? { ...f, status: 'uploading' } : f
				)
			)

			startChunkUpload(chunk)
		}
	}

	const startChunkUpload = async (chunk: UploadChunk) => {
		if (!isUploadable(chunk.fileId)) return

		activeUploads.current += 1

		try {
			// Simulate slow network
			await new Promise(res => setTimeout(res, 1500))

			const currentFile = filesRef.current.find(
				f => f.id === chunk.fileId
			)
			if (
				!currentFile ||
				['paused', 'error', 'completed'].includes(currentFile.status)
			)
				return

			await uploadChunk(chunk)
			onChunkUploaded(chunk)
		} catch (err) {
			onChunkUploadFailed(chunk, err)
		} finally {
			activeUploads.current -= 1
			processQueue()
		}
	}

	const onChunkUploaded = (chunk: UploadChunk) => {
		updateFiles(
			filesRef.current.map(file => {
				if (file.id !== chunk.fileId) return file

				const uploadedChunks = file.uploadedChunks + 1
				const isCompleted = uploadedChunks === file.totalChunks

				if (isCompleted) finalizeUpload(file)

				return {
					...file,
					uploadedChunks,
					status: isCompleted ? 'completed' : file.status,
				}
			})
		)
	}

	const onChunkUploadFailed = (chunk: UploadChunk, err: any) => {
		console.error('Upload error', err)

		if (chunk.retries < 3) {
			const delay = Math.pow(2, chunk.retries) * 1000
			chunk.retries += 1
			setTimeout(() => {
				queue.current.unshift(chunk)
				processQueue()
			}, delay)
		} else {
			console.error(`Chunk ${chunk.chunkIndex} failed after 3 retries.`)
			updateFiles(
				filesRef.current.map(file =>
					file.id === chunk.fileId
						? { ...file, status: 'error' }
						: file
				)
			)
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

		const existingChunkIndices = new Set(
			queue.current
				.filter(chunk => chunk.fileId === fileId)
				.map(chunk => chunk.chunkIndex)
		)

		const missingChunks = Array.from(
			{ length: file.totalChunks },
			(_, i) => i + 1
		)
			.filter(
				index =>
					index > file.uploadedChunks &&
					!existingChunkIndices.has(index)
			)
			.map(index => ({
				fileId,
				chunkIndex: index,
				start: (index - 1) * CHUNK_SIZE,
				end: Math.min(file.size, index * CHUNK_SIZE),
				status: 'queued',
				retries: 0,
				uri: file.uri,
			})) as UploadChunk[]

		queue.current.push(...missingChunks)

		updateFiles(
			filesRef.current.map(f =>
				f.id === fileId ? { ...f, status: 'uploading' } : f
			)
		)

		processQueue()
	}

	const cancelUpload = (fileId: string) => {
		queue.current = queue.current.filter(chunk => chunk.fileId !== fileId)
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
