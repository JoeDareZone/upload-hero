import cors from 'cors'
import express from 'express'
import fs from 'fs'
import { FINAL_DIR, UPLOAD_DIR } from './constants'
import uploadRoutes from './routes/uploadRoutes'
import cleanupService from './services/cleanupService'

const app = express()

// Ensure upload directories exist
fs.mkdirSync(UPLOAD_DIR, { recursive: true })
fs.mkdirSync(FINAL_DIR, { recursive: true })

app.use(cors())
app.use(express.json())

app.use('/', uploadRoutes)

const server = app.listen(4000, () => {
	console.log('Server running on port 4000')

	cleanupService.start()
})

// Graceful shutdown
process.on('SIGTERM', () => {
	console.log('SIGTERM signal received: closing HTTP server')
	cleanupService.stop()
	server.close(() => {
		console.log('HTTP server closed')
	})
})

process.on('SIGINT', () => {
	console.log('SIGINT signal received: closing HTTP server')
	cleanupService.stop()
	server.close(() => {
		console.log('HTTP server closed')
	})
})
