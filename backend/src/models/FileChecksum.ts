import fs from 'fs-extra'
import path from 'path'
import { UPLOAD_DIR } from '../constants'

interface FileReference {
	path: string
	userId: string
	timestamp: number
}

const CHECKSUMS_DIR = path.join(UPLOAD_DIR, 'checksums')

fs.ensureDirSync(CHECKSUMS_DIR)

export async function findFileByChecksum(
	checksum: string,
	userId: string
): Promise<string | null> {
	try {
		const normalizedChecksum = checksum.toLowerCase()

		const checksumFile = path.join(
			CHECKSUMS_DIR,
			`${normalizedChecksum}.json`
		)

		const fileExists = await fs.pathExists(checksumFile)

		if (!fileExists) {
			return null
		}

		const data = (await fs.readJSON(checksumFile)) as {
			files: FileReference[]
		}

		const userFiles = data.files.filter(file => file.userId === userId)

		for (const file of userFiles) {
			const exists = await fs.pathExists(file.path)
			if (exists) {
				return file.path
			}
		}

		return null
	} catch (error) {
		console.error('Error finding file by checksum:', error)
		return null
	}
}

export async function storeFileChecksum(
	checksum: string,
	filePath: string,
	userId: string
): Promise<void> {
	try {
		const normalizedChecksum = checksum.toLowerCase()

		const checksumFile = path.join(
			CHECKSUMS_DIR,
			`${normalizedChecksum}.json`
		)
		let data: { files: FileReference[] } = { files: [] }

		if (await fs.pathExists(checksumFile)) {
			data = (await fs.readJSON(checksumFile)) as {
				files: FileReference[]
			}
		}

		data.files.push({
			path: filePath,
			userId,
			timestamp: Date.now(),
		})

		await fs.writeJSON(checksumFile, data, { spaces: 2 })
	} catch (error) {
		console.error('Error storing file checksum:', error)
	}
}

export async function cleanupOldChecksums(
	retentionDays: number = 30
): Promise<number> {
	try {
		const now = Date.now()
		const cutoffTime = now - retentionDays * 24 * 60 * 60 * 1000
		let removedCount = 0

		const checksumFiles = await fs.readdir(CHECKSUMS_DIR)

		for (const checksumFile of checksumFiles) {
			if (!checksumFile.endsWith('.json')) continue

			const filePath = path.join(CHECKSUMS_DIR, checksumFile)
			const data = (await fs.readJSON(filePath)) as {
				files: FileReference[]
			}

			const oldFiles = data.files.filter(
				(file: FileReference) => file.timestamp < cutoffTime
			)

			for (const file of oldFiles) {
				if (await fs.pathExists(file.path)) {
					await fs.remove(file.path)
					removedCount++
				}
			}

			data.files = data.files.filter(
				(file: FileReference) => file.timestamp >= cutoffTime
			)

			if (data.files.length === 0) {
				await fs.remove(filePath)
			} else {
				await fs.writeJSON(filePath, data, { spaces: 2 })
			}
		}

		return removedCount
	} catch (error) {
		console.error('Error cleaning up old checksums:', error)
		return 0
	}
}
