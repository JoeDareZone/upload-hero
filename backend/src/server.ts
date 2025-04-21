import cors from 'cors'
import express from 'express'
import fs from 'fs'
import { FINAL_DIR, UPLOAD_DIR } from './constants'
import uploadRoutes from './routes/uploadRoutes'
import cleanupService from './services/cleanupService'

const app = express()

fs.mkdirSync(UPLOAD_DIR, { recursive: true })
fs.mkdirSync(FINAL_DIR, { recursive: true })

app.use(cors())
app.use(express.json())

app.use('/', uploadRoutes)

const server = app.listen(4000, () => {
	cleanupService.start()
})

process.on('SIGTERM', () => {
	cleanupService.stop()
	server.close()
})

process.on('SIGINT', () => {
	cleanupService.stop()
	server.close()
})
