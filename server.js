// import express from 'express'
// import dotenv from 'dotenv'
// import cors from 'cors'
// import helmet from 'helmet'
// import morgan from 'morgan'
// import connectDB from './config/db.js'

// // MUST be first line — loads all variables from .env into process.env
// dotenv.config()

// // Connect to MongoDB
// connectDB()

// const app = express()

// // ─── Security Middleware ──────────────────────────────
// // helmet adds 15 security headers automatically
// app.use(helmet())

// // cors allows your React app (localhost:5173) to talk to this server
// // without this the browser blocks all requests — called CORS policy error
// app.use(cors({
//   origin: 'http://localhost:5173',
//   credentials: true               // allows cookies to be sent
// }))

// // ─── Body Parsing Middleware ──────────────────────────
// // Without these two lines, req.body is always undefined
// app.use(express.json())                        // parses JSON bodies
// app.use(express.urlencoded({ extended: true })) // parses form data

// // ─── Request Logger ───────────────────────────────────
// // morgan logs every request to your terminal like:
// // GET /api/health 200 3.456 ms
// // Only log in development, not production
// if (process.env.NODE_ENV === 'development') {
//   app.use(morgan('dev'))
// }

// // ─── Routes ───────────────────────────────────────────
// // Health check — always keep this, useful for testing
// app.get('/api/health', (req, res) => {
//   res.status(200).json({
//     success: true,
//     message: '🚀 NexKart server is running!',
//     environment: process.env.NODE_ENV,
//     time: new Date().toISOString()
//   })
// })

// // ─── 404 Handler ─────────────────────────────────────
// // If no route matches, send a proper 404 instead of Express default HTML error
// app.use((req, res) => {
//   res.status(404).json({
//     success: false,
//     message: `Route ${req.originalUrl} not found`
//   })
// })

// // ─── Start Server ─────────────────────────────────────
// const PORT = process.env.PORT || 5000

// app.listen(PORT, () => {
//   console.log(`🚀 NexKart backend running on http://localhost:${PORT}`)
//   console.log(`📦 Environment: ${process.env.NODE_ENV}`)
// })



// // TEMPORARY TEST CODE — delete after testing
// import User from './models/User.model.js'

// // This runs once when server starts
// const testModel = async () => {
//   try {
//     // Try to create a test user
//     const testUser = await User.create({
//       name: 'Akshat',
//       email: 'akshat@nexkart.com',
//       password: 'password123',
//       role: 'user'
//     })

//     console.log('✅ User model working!')
//     console.log('User created:', testUser.name, testUser.email)
//     console.log('Password hashed?', testUser.password)
//     // password should show "$2b$10$..." NOT "password123"
//     // this confirms bcrypt is working

//     // Clean up — delete the test user
//     await User.deleteOne({ email: 'test@nexkart.com' })
//     console.log('✅ Test user deleted — model is clean')

//   } catch (error) {
//     console.error('❌ Model error:', error.message)
//   }
// }

// // Call it after DB connects
// connectDB().then(() => {
//   testModel()  // ← add this line
//   app.listen(PORT, () => {
//     console.log(`🚀 NexKart backend running on http://localhost:${PORT}`)
//   })
// })



// ALL imports must be at the very top — always
import express from 'express'
import dotenv from 'dotenv'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import connectDB from './config/db.js'
import User from './models/User.model.js'

// MUST be first — loads .env variables
dotenv.config()

const app = express()

// ─── Security Middleware ───────────────────────────────
app.use(helmet())
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}))

// ─── Body Parsing ──────────────────────────────────────
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// ─── Logger ────────────────────────────────────────────
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'))
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

// ─── TEMPORARY TEST FUNCTION ───────────────────────────
const testModel = async () => {
  try {
    // Use 'new User()' + '.save()' instead of 'User.create()'
    // This properly triggers the pre('save') middleware with next
    const testUser = new User({
      name: 'Akshat',
      email: 'akshat@nexkart.com',
      password: 'password123',
      role: 'user'
    })

    await testUser.save()  // ← this correctly triggers pre('save')

    console.log('✅ User model working!')
    console.log('👤 User created:', testUser.name, testUser.email)
    console.log('🔒 Password hashed?', testUser.password)

    await User.deleteOne({ email: 'akshat@nexkart.com' })
    console.log('✅ Test user deleted — model is clean')

  } catch (error) {
    console.error('❌ Model error:', error.message)
  }
}

// ─── START SERVER ──────────────────────────────────────
// connectDB() called ONCE here — then start server
const PORT = process.env.PORT || 5000

connectDB().then(() => {
  testModel()
  app.listen(PORT, () => {
    console.log(`🚀 NexKart running on http://localhost:${PORT}`)
    console.log(`📦 Environment: ${process.env.NODE_ENV}`)
  })
})