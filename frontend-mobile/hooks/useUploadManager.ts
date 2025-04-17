import { UploadChunk, UploadFile } from '@/types/fileType'
import { CHUNK_SIZE, MAX_CONCURRENT_UPLOADS } from '@/utils/constants'
import axios from 'axios'
import * as FileSystem from 'expo-file-system'
import { useRef, useState } from 'react'

export const useUploadManager = () => {
	const filesRef = useRef<UploadFile[]>([])
	const [files, setFiles] = useState<UploadFile[]>([])

	const activeUploads = useRef(0)
	const queue = useRef<UploadChunk[]>([])

	const enqueueFile = (file: UploadFile) => {
		console.log('enqueueFile', file)
		const totalChunks = Math.ceil(file.size / CHUNK_SIZE)
		const chunks: UploadChunk[] = []

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

		queue.current.push(...chunks)
		setFiles(prev => {
			const updated = [
				...prev,
				{
					...file,
					status: 'queued' as const,
					totalChunks,
					uploadedChunks: 0,
				},
			]
			filesRef.current = updated
			return updated
		})
		processQueue()
	}

	const processQueue = () => {
		while (
			activeUploads.current < MAX_CONCURRENT_UPLOADS &&
			queue.current.length > 0
		) {
			console.log('processing queue', queue.current.length)
			const chunk = queue.current.shift()

			if (!chunk) continue

			const file = filesRef.current.find(f => f.id === chunk.fileId)


			// Skip if file is paused or error
			if (!file || file.status === 'paused' || file.status === 'error')
				continue

			uploadChunk(chunk)
		}
	}

	const uploadChunk = async (chunk: UploadChunk) => {
		console.log('uploading chunk', chunk)
		activeUploads.current += 1

		try {
			const formData = new FormData()
			formData.append('chunk', {
				uri: chunk.uri,
				type: 'application/octet-stream',
				name: `chunk_${chunk.chunkIndex}`,
			} as any)
			formData.append('uploadId', chunk.fileId)
			formData.append('chunkIndex', chunk.chunkIndex.toString())

			await axios.post('http://localhost:4000/upload-chunk', formData, {
				headers: {
					'Content-Type': 'multipart/form-data',
				},
			})
			console.log('chunk uploaded', chunk)
			onChunkUploaded(chunk)
		} catch (err) {
			console.log('chunk upload failed', chunk)
			if (chunk.retries < 3) {
				const delay = Math.pow(2, chunk.retries) * 1000
				chunk.retries += 1
				setTimeout(() => queue.current.unshift(chunk), delay)
			} else {
				console.error(
					`Chunk ${chunk.chunkIndex} failed after 3 retries.`
				)
				setFiles(prev =>
					prev.map(file =>
						file.id === chunk.fileId
							? { ...file, status: 'error' }
							: file
					)
				)
			}
		} finally {
			activeUploads.current -= 1
			processQueue()
		}
	}

	const onChunkUploaded = (chunk: UploadChunk) => {
		setFiles(prev =>
			prev.map(file => {
				if (file.id !== chunk.fileId) return file

				const uploadedChunks = file.uploadedChunks + 1
				const isCompleted = uploadedChunks === file.totalChunks

				if (isCompleted) {
					finalizeUpload(file)
				}

				return {
					...file,
					uploadedChunks,
					status: isCompleted ? 'completed' : file.status,
				}
			})
		)
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

	const readChunk = async (
		uri: string,
		start: number,
		end: number
	): Promise<string> => {
		try {
			const result = await FileSystem.readAsStringAsync(uri, {
				encoding: FileSystem.EncodingType.Base64,
				position: start,
				length: end - start,
			})
			return result
		} catch (error) {
			console.error('Failed to read file chunk', error)
			throw error
		}
	}

	const pauseUpload = (fileId: string) =>
		setFiles(prev =>
			prev.map(file =>
				file.id === fileId ? { ...file, status: 'paused' } : file
			)
		)

	const resumeUpload = (fileId: string) => {
		setFiles(prev =>
			prev.map(file =>
				file.id === fileId ? { ...file, status: 'uploading' } : file
			)
		)
		processQueue()
	}

	const cancelUpload = (fileId: string) => {
		queue.current = queue.current.filter(chunk => chunk.fileId !== fileId)
		setFiles(prev =>
			prev.map(file =>
				file.id === fileId ? { ...file, status: 'error' } : file
			)
		)
	}

	return {
		enqueueFile,
		files,
		pauseUpload,
		resumeUpload,
		cancelUpload,
	}
}
