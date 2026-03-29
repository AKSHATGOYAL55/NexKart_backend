import express from 'express'
import dotenv from 'dotenv'
import cors from 'cors'
import mongoose from 'mongoose'

// Load .env file FIRST before anything else
dotenv.config()

const app = express()

// ─── Middleware ───────────────────────────────────────
app.use(cors({
  origin: 'http://localhost:5173', // your React app URL
  credentials: true
}))
app.use(express.json())            // lets Express read JSON request bodies
app.use(express.urlencoded({ extended: true }))

// ─── Test Route ───────────────────────────────────────
// Open this in browser to confirm server is working
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'NexKart server is running!',
    time: new Date().toISOString()
  })
})

// ─── Connect to MongoDB ───────────────────────────────
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI)
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`)
  } catch (error) {
    console.error(`❌ MongoDB Error: ${error.message}`)
    process.exit(1)
  }
}

// ─── Start Server ─────────────────────────────────────
const PORT = process.env.PORT || 5000

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 NexKart server running on http://localhost:${PORT}`)
  })
})