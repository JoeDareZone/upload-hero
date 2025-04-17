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

	const updateFiles = (updated: UploadFile[]) => {
		filesRef.current = updated
		setFiles(updated)
		console.log(updated, 'updated')
	}

	const enqueueFile = (file: UploadFile) => {
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

		updateFiles([
			...filesRef.current,
			{ ...file, status: 'queued', totalChunks, uploadedChunks: 0 },
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
			if (
				!file ||
				file.status === 'paused' ||
				file.status === 'error' ||
				file.status === 'completed'
			)
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
		activeUploads.current += 1

		try {
			await new Promise(resolve => setTimeout(resolve, 1500))

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
			onChunkUploaded(chunk)
		} catch (err) {
			console.log('err', err)
			if (chunk.retries < 3) {
				const delay = Math.pow(2, chunk.retries) * 1000
				chunk.retries += 1
				setTimeout(() => queue.current.unshift(chunk), delay)
			} else {
				console.error(
					`Chunk ${chunk.chunkIndex} failed after 3 retries.`
				)
				updateFiles(
					filesRef.current.map(file =>
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
		updateFiles(
			filesRef.current.map(file => {
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

	const pauseUpload = (fileId: string) => {
		const updated = filesRef.current.map(file =>
			file.id === fileId ? { ...file, status: 'paused' as const } : file
		)
		updateFiles(updated)
	}

	const resumeUpload = (fileId: string) => {
		const updated = filesRef.current.map(file =>
			file.id === fileId && file.status === 'paused'
				? { ...file, status: 'uploading' as const }
				: file
		)
		updateFiles(updated)
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
