import cors from 'cors'
import express from 'express'
import fs from 'fs'
import { FINAL_DIR, UPLOAD_DIR } from './constants'
import uploadRoutes from './routes/uploadRoutes'
import cleanupService from './services/cleanupService'
import redisService from './services/redisService'

const app = express()

fs.mkdirSync(UPLOAD_DIR, { recursive: true })
fs.mkdirSync(FINAL_DIR, { recursive: true })

app.use(cors())
app.use(express.json())

app.use('/', uploadRoutes)

const initRedis = async () => {
	try {
		await redisService.connect()
		console.log('Redis connection established')
	} catch (error) {
		console.error('Failed to connect to Redis:', error)
	}
}

const server = app.listen(4000, () => {
	console.log('Server running on port 4000')

	initRedis()
	cleanupService.start()
})

process.on('SIGTERM', async () => {
	console.log('SIGTERM signal received: closing HTTP server')
	await redisService.disconnect()
	cleanupService.stop()
	server.close(() => {
		console.log('HTTP server closed')
		process.exit(0)
	})
})

process.on('SIGINT', async () => {
	console.log('SIGINT signal received: closing HTTP server')
	await redisService.disconnect()
	cleanupService.stop()
	server.close(() => {
		console.log('HTTP server closed')
		process.exit(0)
	})
})
