import express from 'express'
import dotenv from 'dotenv'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import connectDB from './config/db.js'

// MUST be first line — loads all variables from .env into process.env
dotenv.config()

// Connect to MongoDB
connectDB()

const app = express()

// ─── Security Middleware ──────────────────────────────
// helmet adds 15 security headers automatically
app.use(helmet())

// cors allows your React app (localhost:5173) to talk to this server
// without this the browser blocks all requests — called CORS policy error
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true               // allows cookies to be sent
}))

// ─── Body Parsing Middleware ──────────────────────────
// Without these two lines, req.body is always undefined
app.use(express.json())                        // parses JSON bodies
app.use(express.urlencoded({ extended: true })) // parses form data

// ─── Request Logger ───────────────────────────────────
// morgan logs every request to your terminal like:
// GET /api/health 200 3.456 ms
// Only log in development, not production
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'))
}

// ─── Routes ───────────────────────────────────────────
// Health check — always keep this, useful for testing
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: '🚀 NexKart server is running!',
    environment: process.env.NODE_ENV,
    time: new Date().toISOString()
  })
})

// ─── 404 Handler ─────────────────────────────────────
// If no route matches, send a proper 404 instead of Express default HTML error
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  })
})

// ─── Start Server ─────────────────────────────────────
const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
  console.log(`🚀 NexKart backend running on http://localhost:${PORT}`)
  console.log(`📦 Environment: ${process.env.NODE_ENV}`)
})