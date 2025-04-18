import fs from 'fs'
import schedule from 'node-schedule'
import path from 'path'
import { FILE_RETENTION_PERIOD, UPLOAD_DIR } from '../constants'

/**
 * Cleanup service that scans the upload directory and removes incomplete uploads
 * that are older than the specified retention period (default: 30 minutes)
 */
class CleanupService {
	private job: schedule.Job | null = null

	/**
	 * Start the cleanup service with a scheduled job
	 * Runs every 5 minutes by default
	 */
	start(cronSchedule = '*/5 * * * *') {
		console.log('Starting upload cleanup service...')

		this.job = schedule.scheduleJob(cronSchedule, () => {
			this.cleanupIncompleteUploads()
				.then(removedCount => {
					if (removedCount > 0) {
						console.log(
							`Cleaned up ${removedCount} incomplete uploads`
						)
					}
				})
				.catch(err => {
					console.error('Error during upload cleanup:', err)
				})
		})
	}

	/**
	 * Stop the cleanup service
	 */
	stop() {
		if (this.job) {
			this.job.cancel()
			this.job = null
			console.log('Upload cleanup service stopped')
		}
	}

	/**
	 * Clean up incomplete uploads that are older than the retention period
	 * @returns The number of uploads cleaned up
	 */
	async cleanupIncompleteUploads(): Promise<number> {
		// Skip if upload dir doesn't exist
		if (!fs.existsSync(UPLOAD_DIR)) {
			return 0
		}

		const now = Date.now()
		const files = fs.readdirSync(UPLOAD_DIR)
		let removedCount = 0

		for (const file of files) {
			// Skip the 'final' directory
			if (file === 'final') {
				continue
			}

			const filePath = path.join(UPLOAD_DIR, file)

			try {
				const stats = fs.statSync(filePath)

				// Check if directory and if it's older than the retention period
				if (
					stats.isDirectory() &&
					now - stats.mtimeMs > FILE_RETENTION_PERIOD
				) {
					fs.rmSync(filePath, { recursive: true, force: true })
					removedCount++
				}
			} catch (err) {
				console.error(`Error processing ${filePath}:`, err)
			}
		}

		return removedCount
	}
}

export const cleanupService = new CleanupService()

export default cleanupService
