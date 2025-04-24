import { IconSymbol } from '@/components/ui/IconSymbol'
import { createUploadFile } from '@/hooks/uploadHooks'
import { UploadFile } from '@/types/fileType'
import { MAX_FILE_SIZE_MB, MAX_FILES } from '@/utils/constants'
import { getIncompleteUploads } from '@/utils/storageUtils'
import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native'
import { FilePickerProps } from './FilePicker'

export default function FilePicker({
	onFilesSelected,
	isUploading,
	isLoading,
	isAllFilesUploaded,
	onError,
}: FilePickerProps) {
	const [isDragging, setIsDragging] = useState(false)
	const [incompleteUploads, setIncompleteUploads] = useState<UploadFile[]>([])
	const dropZoneRef = useRef(null)

	useEffect(() => {
		const loadIncompleteFiles = async () => {
			const files = await getIncompleteUploads()
			if (files.length > 0) setIncompleteUploads(files)
			else setIncompleteUploads([])
		}

		loadIncompleteFiles()
	}, [isAllFilesUploaded])

	const handleWebFileSelect = (e: any) => {
		if (!e.target.files || e.target.files.length === 0) return
		processFiles(Array.from(e.target.files))
	}

	const processFiles = (files: File[]) => {
		if (!files || files.length === 0) return

		const acceptedTypes = ['image/jpeg', 'image/png', 'video/mp4']
		const maxSizeBytes = MAX_FILE_SIZE_MB * 1024 * 1024
		let unsupportedTypeCount = 0
		let filesTooLargeCount = 0
		const validFiles: UploadFile[] = []

		if (files.length > MAX_FILES) {
			onError(`You can upload a maximum of ${MAX_FILES} files.`)
			return
		}

		files.forEach((file: File) => {
			if (!acceptedTypes.includes(file.type)) {
				unsupportedTypeCount++
				return
			}

			if (file.size > maxSizeBytes) {
				filesTooLargeCount++
				return
			}

			const blobUrl = URL.createObjectURL(file)
			const webFile = {
				uri: blobUrl,
				name: file.name,
				mimeType: file.type,
				size: file.size,
				status: 'queued',
				file: file,
			}
			validFiles.push(createUploadFile(webFile))
		})

		if (unsupportedTypeCount > 0) {
			onError(
				`${unsupportedTypeCount} file(s) were not added: unsupported file type. Only JPG, PNG, and MP4 are supported.`
			)
		}

		if (filesTooLargeCount > 0) {
			onError(
				`${filesTooLargeCount} file(s) were not added: file size exceeds the ${MAX_FILE_SIZE_MB}MB limit.`
			)
		}

		if (validFiles.length > 0) {
			onFilesSelected(validFiles)
		}
	}

	const resumeUpload = (incompleteFile: UploadFile) => {
		const input = document.createElement('input')
		input.type = 'file'
		input.accept = incompleteFile.mimeType
		input.onchange = (e: any) => {
			if (!e.target.files || e.target.files.length === 0) return

			const file = e.target.files[0]

			if (file.size !== incompleteFile.size) {
				onError(
					"Selected file doesn't match the original upload. Size mismatch."
				)
				return
			}

			const updatedFile = {
				...incompleteFile,
				file: file,
				uri: URL.createObjectURL(file),
				status: 'paused',
			} as UploadFile

			onFilesSelected([updatedFile])

			setIncompleteUploads(prev =>
				prev.filter(f => f.id !== incompleteFile.id)
			)

			onError('File added. Press the play button to resume the upload.')
		}

		input.click()
	}

	const onPressFileUpload = () => {
		const input = document.createElement('input')
		input.type = 'file'
		input.accept = 'image/jpeg,image/png,video/mp4'
		input.multiple = true
		input.onchange = handleWebFileSelect
		input.click()
	}

	useEffect(() => {
		if (!dropZoneRef.current) return

		const handleDragEnter = (e: DragEvent) => {
			e.preventDefault()
			e.stopPropagation()
			if (!isUploading && !isLoading && !isAllFilesUploaded) {
				setIsDragging(true)
			}
		}

		const handleDragOver = (e: DragEvent) => {
			e.preventDefault()
			e.stopPropagation()
			if (!isUploading && !isLoading && !isAllFilesUploaded) {
				// Check if we can access file information during drag
				if (e.dataTransfer?.items) {
					// Show visual feedback even during drag
					let hasSupportedFiles = false
					for (let i = 0; i < e.dataTransfer.items.length; i++) {
						const item = e.dataTransfer.items[i]
						if (
							item.kind === 'file' &&
							['image/jpeg', 'image/png', 'video/mp4'].includes(
								item.type
							)
						) {
							hasSupportedFiles = true
							break
						}
					}
					setIsDragging(hasSupportedFiles)
				} else {
					setIsDragging(true)
				}
			}
		}

		const handleDragLeave = (e: DragEvent) => {
			e.preventDefault()
			e.stopPropagation()

			const currentTarget = e.currentTarget as HTMLElement
			const relatedTarget = e.relatedTarget as Node

			if (
				currentTarget &&
				relatedTarget &&
				!currentTarget.contains(relatedTarget)
			) {
				setIsDragging(false)
			}
		}

		const handleDrop = (e: DragEvent) => {
			e.preventDefault()
			e.stopPropagation()
			setIsDragging(false)

			if (isUploading || isLoading || isAllFilesUploaded) return

			if (e.dataTransfer?.files) {
				processFiles(Array.from(e.dataTransfer.files))
			}
		}

		document.addEventListener('dragenter', handleDragEnter)

		const dropZone = dropZoneRef.current as unknown as HTMLElement
		dropZone.addEventListener('dragover', handleDragOver)
		dropZone.addEventListener('dragleave', handleDragLeave)
		dropZone.addEventListener('drop', handleDrop)

		const handleDocumentDragEnd = () => {
			setIsDragging(false)
		}
		document.addEventListener('dragleave', e => {
			if ((e.target as HTMLElement).tagName === 'HTML') {
				setIsDragging(false)
			}
		})
		document.addEventListener('drop', handleDocumentDragEnd)

		return () => {
			document.removeEventListener('dragenter', handleDragEnter)
			dropZone.removeEventListener('dragover', handleDragOver)
			dropZone.removeEventListener('dragleave', handleDragLeave)
			dropZone.removeEventListener('drop', handleDrop)
			document.removeEventListener('dragleave', e => {
				if ((e.target as HTMLElement).tagName === 'HTML') {
					setIsDragging(false)
				}
			})
			document.removeEventListener('drop', handleDocumentDragEnd)
		}
	}, [isUploading, isLoading, isAllFilesUploaded, dropZoneRef.current])

	return (
		<View>
			<TouchableOpacity
				ref={dropZoneRef}
				onPress={onPressFileUpload}
				className={`min-h-48 my-4 justify-center items-center bg-gray-800 py-10 rounded-xl hover-highlight web-clickable drop-zone ${
					isDragging ? 'drag-active' : ''
				}`}
				disabled={isUploading || isLoading || isAllFilesUploaded}
				style={{
					opacity:
						isUploading || isLoading || isAllFilesUploaded
							? 0.5
							: 1,
				}}
			>
				{isLoading ? (
					<ActivityIndicator size='large' color='#fff' />
				) : (
					<View className='items-center gap-y-2'>
						<IconSymbol
							name='doc.badge.arrow.up.fill'
							size={32}
							color={isUploading ? 'gray' : 'white'}
						/>
						<Text
							className={`text-white text-lg font-semibold ${
								isDragging ? 'drop-zone-text' : ''
							}`}
						>
							{isUploading
								? 'Upload in progress...'
								: isDragging
								? 'Drop files here'
								: 'Drag & drop or click to upload'}
						</Text>
						<Text className='text-gray-300 text-sm'>
							Supported formats: JPG, PNG, mp4 (up to{' '}
							{MAX_FILE_SIZE_MB}MB)
						</Text>

						<View className='mt-4 custom-file-input-web bg-blue-600 px-6 py-2 rounded-lg hover-highlight'>
							<Text className='text-white font-medium'>
								Browse Files
							</Text>
						</View>
					</View>
				)}
			</TouchableOpacity>

			{incompleteUploads.length > 0 &&
				!isUploading &&
				!isLoading &&
				!isAllFilesUploaded && (
					<View className='mt-2 mb-4 border-t border-gray-700 pt-4'>
						<Text className='text-white text-lg font-semibold mb-2'>
							Resume Incomplete Uploads
						</Text>
						{incompleteUploads.map(file => (
							<TouchableOpacity
								key={file.id}
								className='flex-row items-center py-2 px-4 bg-gray-800 mb-2 rounded-lg hover-highlight'
								onPress={() => resumeUpload(file)}
							>
								<IconSymbol
									name='arrow.clockwise'
									size={20}
									color='white'
								/>
								<View className='ml-3 flex-1'>
									<Text className='text-white'>
										{file.name}
									</Text>
									<Text className='text-gray-400 text-xs'>
										{Math.round(
											(file.uploadedChunks /
												file.totalChunks) *
												100
										)}
										% complete
									</Text>
								</View>
								<Text className='text-blue-400 text-sm'>
									Resume
								</Text>
							</TouchableOpacity>
						))}
					</View>
				)}
		</View>
	)
}
