import fs from 'fs'
import schedule from 'node-schedule'
import path from 'path'
import { FILE_RETENTION_PERIOD, UPLOAD_DIR } from '../constants'
import { cleanupOldChecksums } from '../models/FileChecksum'

class CleanupService {
	private job: schedule.Job | null = null

	start(cronSchedule = '*/5 * * * *') {
		console.log('Starting upload cleanup service...')

		this.job = schedule.scheduleJob(cronSchedule, () => {
			Promise.all([
				this.cleanupIncompleteUploads(),
				this.cleanupOldFiles(),
			])
				.then(([incompletesRemoved, oldFilesRemoved]) => {
					if (incompletesRemoved > 0 || oldFilesRemoved > 0) {
						console.log(
							`Cleaned up ${incompletesRemoved} incomplete uploads and ${oldFilesRemoved} old files`
						)
					}
				})
				.catch(err => {
					console.error('Error during upload cleanup:', err)
				})
		})
	}

	stop() {
		if (this.job) {
			this.job.cancel()
			this.job = null
			console.log('Upload cleanup service stopped')
		}
	}

	async cleanupIncompleteUploads(): Promise<number> {
		if (!fs.existsSync(UPLOAD_DIR)) {
			return 0
		}

		const now = Date.now()
		const files = fs.readdirSync(UPLOAD_DIR)
		let removedCount = 0

		for (const file of files) {
			if (file === 'final') {
				continue
			}

			const filePath = path.join(UPLOAD_DIR, file)

			try {
				const stats = fs.statSync(filePath)

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

	async cleanupOldFiles(): Promise<number> {
		try {
			const retentionDays = FILE_RETENTION_PERIOD / (24 * 60 * 60 * 1000)
			return await cleanupOldChecksums(retentionDays)
		} catch (error) {
			console.error('Error cleaning up old files:', error)
			return 0
		}
	}
}

export default new CleanupService()
