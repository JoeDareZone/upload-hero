import axios from 'axios'
import FormData from 'form-data'
import fs from 'fs'
import path from 'path'

const uploadId = 'upload-123'
const chunksDir = '/Users/joe/Desktop/demo_files'
const chunkFiles = [
	'chunk_aa',
	'chunk_ab',
	'chunk_ac',
	'chunk_ad',
	'chunk_ae',
	'chunk_af',
	'chunk_ag',
	'chunk_ah',
	'chunk_ai',
	'chunk_aj',
	'chunk_ak',
]

const uploadChunk = async (chunkPath: string, index: number) => {
	const form = new FormData()
	form.append('chunk', fs.createReadStream(chunkPath))
	form.append('uploadId', uploadId)
	form.append('chunkIndex', index + 1)

	try {
		const res = await axios.post(
			'http://localhost:4000/upload-chunk',
			form,
			{
				headers: form.getHeaders(),
			}
		)
		console.log(`✅ Uploaded chunk ${index + 1}:`, res.data.message)
	} catch (err) {
		console.error(
			`❌ Error uploading chunk ${index + 1}:`,
			(err as any).response?.data || (err as Error).message
		)
	}
}

const runUploads = async () => {
	for (let i = 0; i < chunkFiles.length; i++) {
		const chunkPath = path.join(chunksDir, chunkFiles[i])
		await uploadChunk(chunkPath, i)
	}
}

runUploads()
