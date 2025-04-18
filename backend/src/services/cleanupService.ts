import fs from 'fs'
import schedule from 'node-schedule'
import path from 'path'
import { FILE_RETENTION_PERIOD, UPLOAD_DIR } from '../constants'

class CleanupService {
	private job: schedule.Job | null = null

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
}

export const cleanupService = new CleanupService()

export default cleanupService
