import { NextFunction, Request, Response } from 'express'
import fs from 'fs-extra'
import path from 'path'
import winston from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'

const logsDir = path.join(process.cwd(), 'logs')
fs.ensureDirSync(logsDir)

const levels = {
	error: 0,
	warn: 1,
	info: 2,
	debug: 3,
}

const colors = {
	error: 'red',
	warn: 'yellow',
	info: 'green',
	debug: 'blue',
}

winston.addColors(colors)

const format = winston.format.combine(
	winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
	winston.format.printf(
		info => `${info.timestamp} ${info.level}: ${info.message}`
	)
)

const fileRotateTransport = new DailyRotateFile({
	filename: 'application-%DATE%.log',
	datePattern: 'YYYY-MM-DD',
	maxFiles: '30d',
	dirname: logsDir,
	format,
})

const consoleTransport = new winston.transports.Console({
	format: winston.format.combine(
		winston.format.colorize({ all: true }),
		format
	),
})

const logger = winston.createLogger({
	level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
	levels,
	transports: [fileRotateTransport, consoleTransport],
})

const auditFileRotateTransport = new DailyRotateFile({
	filename: 'audit-%DATE%.log',
	datePattern: 'YYYY-MM-DD',
	maxFiles: '30d',
	dirname: path.join(logsDir, 'audit'),
	format: winston.format.combine(
		winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
		winston.format.json()
	),
})

const auditLogger = winston.createLogger({
	level: 'info',
	transports: [auditFileRotateTransport],
})

export const logRequest = (req: Request, res: Response, next: NextFunction) => {
	const start = Date.now()

	const requestData = {
		method: req.method,
		url: req.url,
		ip: req.ip || req.socket.remoteAddress,
		userAgent: req.headers['user-agent'],
		userId: req.body?.userId || 'anonymous',
		operationType: getOperationType(req),
	}

	auditLogger.info('Request', requestData)
	res.on('finish', () => {
		const duration = Date.now() - start
		auditLogger.info('Response', {
			...requestData,
			status: res.statusCode,
			duration,
		})
	})

	next()
}

const getOperationType = (req: Request) => {
	const { path, method } = req

	if (path.includes('initiate-upload')) return 'INITIATE_UPLOAD'
	if (path.includes('upload-chunk')) return 'UPLOAD_CHUNK'
	if (path.includes('finalize-upload')) return 'FINALIZE_UPLOAD'
	if (path.includes('upload-status')) return 'UPLOAD_STATUS'
	if (path.includes('delete-upload')) return 'DELETE_UPLOAD'
	if (path.includes('check-duplicate')) return 'CHECK_DUPLICATE'

	return `${method}_REQUEST`
}

export default logger
