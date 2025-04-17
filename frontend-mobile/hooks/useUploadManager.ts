import { UploadChunk, UploadFile } from '@/types/fileType'
import { CHUNK_SIZE, MAX_CONCURRENT_UPLOADS } from '@/utils/constants'
import axios from 'axios'
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

	const createChunks = (file: UploadFile): UploadChunk[] => {
		const chunks: UploadChunk[] = []
		const totalChunks = Math.ceil(file.size / CHUNK_SIZE)

		for (let i = 0; i < totalChunks; i++) {
			const start = i * CHUNK_SIZE
			const end = Math.min(file.size, start + CHUNK_SIZE)
			chunks.push({
				fileId: file.id,
				chunkIndex: i + 1,
				start,
				end,
				status: 'queued',
				retries: 0,
				uri: file.uri,
			})
		}
		return chunks
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

	const pauseUpload = (fileId: string) => {
		updateFiles(
			filesRef.current.map(file =>
				file.id === fileId ? { ...file, status: 'paused' } : file
			)
		)
	}

	const resumeUpload = (fileId: string) => {
		const file = filesRef.current.find(f => f.id === fileId)
		if (!file) return

		const existingChunks = new Set(
			queue.current
				.filter(chunk => chunk.fileId === fileId)
				.map(chunk => chunk.chunkIndex)
		)

		// Add any missed chunks back into queue
		for (let i = 1; i <= file.totalChunks; i++) {
			if (i <= file.uploadedChunks || existingChunks.has(i)) continue

			queue.current.push({
				fileId,
				chunkIndex: i,
				start: (i - 1) * CHUNK_SIZE,
				end: Math.min(file.size, i * CHUNK_SIZE),
				status: 'queued',
				retries: 0,
				uri: file.uri,
			})
		}

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

			uploadChunk(chunk)
		}
	}

	const uploadChunk = async (chunk: UploadChunk) => {
		if (!isUploadable(chunk.fileId)) return

		activeUploads.current += 1

		try {
			// simulate slow network
			await new Promise(resolve => setTimeout(resolve, 1500))

			if (!isUploadable(chunk.fileId)) return

			const formData = new FormData()
			formData.append('chunk', {
				uri: chunk.uri,
				type: 'application/octet-stream',
				name: `chunk_${chunk.chunkIndex}`,
			} as any)
			formData.append('uploadId', chunk.fileId)
			formData.append('chunkIndex', chunk.chunkIndex.toString())

			await axios.post('http://localhost:4000/upload-chunk', formData, {
				headers: { 'Content-Type': 'multipart/form-data' },
			})

			handleChunkSuccess(chunk)
		} catch (err) {
			handleChunkFailure(chunk, err)
		} finally {
			activeUploads.current -= 1
			processQueue()
		}
	}
	const handleChunkSuccess = (chunk: UploadChunk) => {
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

	const handleChunkFailure = (chunk: UploadChunk, err: any) => {
		console.error('Upload error', err)

		if (chunk.retries < 3) {
			const delay = Math.pow(2, chunk.retries) * 1000
			chunk.retries += 1
			setTimeout(() => queue.current.unshift(chunk), delay)
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

	const finalizeUpload = async (file: UploadFile) => {
		try {
			await axios.post('http://localhost:4000/finalize-upload', {
				uploadId: file.id,
				totalChunks: file.totalChunks,
				fileName: file.name,
			})
			console.log(`✅ Finalized upload: ${file.name}`)
		} catch (err) {
			console.error('❌ Finalize upload failed', err)
		}
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
