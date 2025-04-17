import { UploadChunk, UploadFile } from '@/types/fileType'
import { CHUNK_SIZE, MAX_CONCURRENT_UPLOADS } from '@/utils/constants'
import axios from 'axios'
import * as FileSystem from 'expo-file-system'
import { useRef, useState } from 'react'

export const useUploadManager = () => {
	const [files, setFiles] = useState<UploadFile[]>([])
	const activeUploads = useRef(0)
	const queue = useRef<UploadChunk[]>([])

	const enqueueFile = (file: UploadFile) => {
		console.log('enqueueFile', file)
		const totalChunks = Math.ceil(file.size / CHUNK_SIZE)
		const chunks: UploadChunk[] = []

		for (let i = 0; i < totalChunks; i++) {
			console.log('i', i)
			const start = i * CHUNK_SIZE
			const end = Math.min(file.size, start + CHUNK_SIZE)
			chunks.push({
				fileId: file.id,
				chunkIndex: i,
				start,
				end,
				status: 'queued',
				retries: 0,
				uri: file.uri,
			})
		}

		queue.current.push(...chunks)
		setFiles(prev => [
			...prev,
			{ ...file, status: 'queued', totalChunks, uploadedChunks: 0 },
		])
		processQueue()
	}

	const processQueue = () => {
		while (
			activeUploads.current < MAX_CONCURRENT_UPLOADS &&
			queue.current.length > 0
		) {
			const chunk = queue.current.shift()

			if (!chunk) continue

			const file = files.find(f => f.id === chunk.fileId)

			// Skip if file is paused or error
			if (!file || file.status === 'paused' || file.status === 'error')
				continue

			uploadChunk(chunk)
		}
	}

	const uploadChunk = async (chunk: UploadChunk) => {
		activeUploads.current += 1

		try {
			const chunkData = await readChunk(chunk.uri, chunk.start, chunk.end)

			await axios.post('https://your-server/upload-chunk', {
				fileName: chunk.uri,
				chunkData,
				chunkIndex: chunk.chunkIndex,
				totalChunks: files.find(f => f.id === chunk.fileId)
					?.totalChunks,
			})

			onChunkUploaded(chunk)
		} catch (err) {
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
			prev.map(file =>
				file.id === chunk.fileId
					? {
							...file,
							uploadedChunks: file.uploadedChunks + 1,
							status:
								file.uploadedChunks + 1 === file.totalChunks
									? 'completed'
									: file.status,
					  }
					: file
			)
		)
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
