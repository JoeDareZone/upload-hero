import { UploadFile } from '@/types/fileType'
import { CHUNK_SIZE, MAX_FILES } from '@/utils/constants'
import {
	pickDocuments,
	pickImageFromCamera,
	validateFiles,
} from '@/utils/fileUtils'
import { generateFileId } from '@/utils/helpers'
import { useState } from 'react'

export const createUploadFile = (file: any): UploadFile => {
	const checkIfUploadMetadataExists = (file: any) => {
		if (file.id && (file.uploadedChunks !== undefined || file.status)) {
			return {
				...file,
				totalChunks:
					file.totalChunks || Math.ceil(file.size / CHUNK_SIZE),
				uploadedChunks: file.uploadedChunks || 0,
				status: file.status || 'paused',
			}
		}
	}

	const uploadFile = checkIfUploadMetadataExists(file)

	if (uploadFile) return uploadFile

	return {
		...file,
		id: generateFileId(),
		status: 'queued',
		totalChunks: Math.ceil(file.size / CHUNK_SIZE),
		uploadedChunks: 0,
	}
}

export const useFileSelection = (
	enqueueFile: (file: UploadFile) => void,
	isUploading: boolean
) => {
	const [errors, setErrors] = useState<string[]>([])
	const [isLoading, setIsLoading] = useState(false)

	const handleError = (msg: string) => setErrors([msg])

	const clearErrors = () => setErrors([])

	const handlePickDocuments = async () => {
		if (isUploading) return

		clearErrors()
		setIsLoading(true)
		try {
			const result = await pickDocuments()
			if (result.canceled) return

			if (result.assets.length > MAX_FILES) {
				return handleError(
					`You can upload a maximum of ${MAX_FILES} files.`
				)
			}

			const { errors: newErrors, validFiles } = await validateFiles(
				result.assets
			)
			if (newErrors.length) setErrors(newErrors)
			validFiles.forEach(file => enqueueFile(createUploadFile(file)))
		} catch (error) {
			console.error(error)
			handleError('Something went wrong while picking files.')
		} finally {
			setIsLoading(false)
		}
	}

	const handleTakePhoto = async () => {
		clearErrors()
		setIsLoading(true)
		try {
			const file = await pickImageFromCamera()
			if (file) enqueueFile(createUploadFile(file))
		} catch (error: any) {
			console.error(error)
			handleError(
				error.message || 'Something went wrong while picking an image.'
			)
		} finally {
			setIsLoading(false)
		}
	}

	return {
		errors,
		isLoading,
		handlePickDocuments,
		handleTakePhoto,
		clearErrors,
	}
}

export const calculateUploadStats = (files: UploadFile[]) => {
	const hasQueuedFiles = files.some(file => file.status === 'queued')
	const hasErrorFiles = files.some(file => file.status === 'error')
	const totalUploadedChunks = files.reduce(
		(sum, file) => sum + file.uploadedChunks,
		0
	)
	const totalChunks = files.reduce((sum, file) => sum + file.totalChunks, 0)
	const overallUploadProgress =
		totalChunks > 0 ? totalUploadedChunks / totalChunks : 0
	const isAllFilesUploaded = overallUploadProgress === 1

	return {
		hasQueuedFiles,
		hasErrorFiles,
		totalUploadedChunks,
		totalChunks,
		overallUploadProgress,
		isAllFilesUploaded,
	}
}
