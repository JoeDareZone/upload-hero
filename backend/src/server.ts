import cors from 'cors'
import express from 'express'
import uploadRoutes from './routes/uploadRoutes'

const app = express()

app.use(cors())
app.use(express.json())

app.use('/', uploadRoutes)

app.listen(4000, () => console.log('Server running on port 4000'))
