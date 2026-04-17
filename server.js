

import express from 'express'
import dotenv from 'dotenv'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import connectDB from './config/db.js'
import errorHandler from './middleware/error.middleware.js'

dotenv.config()

const app = express()

// ─── Security Middleware ───────────────────────────────
app.use(helmet())  // Adds security : headers to protect against common vulnerabilitys : 15+ security 
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}))

// ─── Body Parsing ──────────────────────────────────────
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// ─── Logger ────────────────────────────────────────────
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'))    //debugging : show every request in your terminal/console.
}

// ─── Routes ────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: '🚀 NexKart server is running!',
    environment: process.env.NODE_ENV,
    time: new Date().toISOString()
  })
})

// ─── 404 Handler ───────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  })
})

// ─── Global Error Handler ──────────────────────────────
// MUST be after all routes
// MUST be last app.use()

app.use(errorHandler)

// ─── START SERVER ──────────────────────────────────────
const PORT = process.env.PORT || 5000

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 NexKart running on http://localhost:${PORT}`)
    console.log(`📦 Environment: ${process.env.NODE_ENV}`)
  })
})