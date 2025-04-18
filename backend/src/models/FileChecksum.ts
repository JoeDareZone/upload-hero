import fs from 'fs-extra'
import path from 'path'
import { UPLOAD_DIR } from '../constants'

// Define the file reference type for type safety
interface FileReference {
	path: string
	userId: string
	timestamp: number
}

// Path for storing checksum data - keeping it with uploads
const CHECKSUMS_DIR = path.join(UPLOAD_DIR, 'checksums')

// Ensure checksums directory exists
fs.ensureDirSync(CHECKSUMS_DIR)
console.log('Checksums directory created/verified at:', CHECKSUMS_DIR)

/**
 * Finds a file by its MD5 checksum
 *
 * @param checksum The MD5 checksum to look for
 * @param userId The user ID
 * @returns Path to existing file if found, null otherwise
 */
export async function findFileByChecksum(
	checksum: string,
	userId: string
): Promise<string | null> {
	try {
		// Convert checksum to lowercase for consistency
		const normalizedChecksum = checksum.toLowerCase()
		console.log(`Looking for normalized checksum: ${normalizedChecksum}`)

		// Simple approach: store checksums as files
		const checksumFile = path.join(
			CHECKSUMS_DIR,
			`${normalizedChecksum}.json`
		)
		console.log(`Looking for checksum file: ${checksumFile}`)

		// Check if the file exists
		const fileExists = await fs.pathExists(checksumFile)
		console.log(`Checksum file exists? ${fileExists}`)

		if (!fileExists) {
			return null
		}

		// Read the checksum data
		const data = (await fs.readJSON(checksumFile)) as {
			files: FileReference[]
		}

		console.log(
			`Found ${data.files.length} file references with this checksum`
		)

		// Find files from this user
		const userFiles = data.files.filter(file => file.userId === userId)
		console.log(
			`Found ${userFiles.length} files belonging to user ${userId}`
		)

		// Check if any of these files still exist
		for (const file of userFiles) {
			console.log(`Checking if file exists: ${file.path}`)
			const exists = await fs.pathExists(file.path)
			if (exists) {
				console.log(`File exists, returning: ${file.path}`)
				return file.path
			}
		}

		console.log('No existing files found')
		return null
	} catch (error) {
		console.error('Error finding file by checksum:', error)
		return null
	}
}

/**
 * Stores a file's checksum information
 *
 * @param checksum The MD5 checksum
 * @param filePath The file path
 * @param userId The user ID
 */
export async function storeFileChecksum(
	checksum: string,
	filePath: string,
	userId: string
): Promise<void> {
	try {
		// Convert checksum to lowercase for consistency
		const normalizedChecksum = checksum.toLowerCase()
		console.log(
			`Storing normalized checksum: ${normalizedChecksum} for file: ${filePath}`
		)

		const checksumFile = path.join(
			CHECKSUMS_DIR,
			`${normalizedChecksum}.json`
		)
		let data: { files: FileReference[] } = { files: [] }

		// If checksum entry already exists, load it
		if (await fs.pathExists(checksumFile)) {
			console.log('Checksum file already exists, loading existing data')
			data = (await fs.readJSON(checksumFile)) as {
				files: FileReference[]
			}
		}

		// Add new file reference
		data.files.push({
			path: filePath,
			userId,
			timestamp: Date.now(),
		})

		console.log(`Writing checksum file with ${data.files.length} entries`)
		await fs.writeJSON(checksumFile, data, { spaces: 2 })
		console.log('Checksum stored successfully')
	} catch (error) {
		console.error('Error storing file checksum:', error)
	}
}

/**
 * Clean up old files based on retention period
 *
 * @param retentionDays Number of days to keep files
 * @returns Number of files cleaned up
 */
export async function cleanupOldChecksums(
	retentionDays: number = 30
): Promise<number> {
	try {
		const now = Date.now()
		const cutoffTime = now - retentionDays * 24 * 60 * 60 * 1000
		let removedCount = 0

		// Get all checksum files
		const checksumFiles = await fs.readdir(CHECKSUMS_DIR)

		for (const checksumFile of checksumFiles) {
			if (!checksumFile.endsWith('.json')) continue

			const filePath = path.join(CHECKSUMS_DIR, checksumFile)
			const data = (await fs.readJSON(filePath)) as {
				files: FileReference[]
			}

			// Find files older than cutoff
			const oldFiles = data.files.filter(
				(file: FileReference) => file.timestamp < cutoffTime
			)

			// Remove old files
			for (const file of oldFiles) {
				if (await fs.pathExists(file.path)) {
					await fs.remove(file.path)
					removedCount++
				}
			}

			// Update the checksum entry
			data.files = data.files.filter(
				(file: FileReference) => file.timestamp >= cutoffTime
			)

			// If no files left, remove the checksum entry
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
