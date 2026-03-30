import mongoose from 'mongoose'

// This function connects your Express server to MongoDB Atlas
// We call this once when the server starts in server.js

// WHY SEPARATE FILE?
// Keeps server.js clean
// Easy to import and reuse
// Easy to add connection options later

const connectDB = async () => {
  try {
    // mongoose.connect returns a connection object
    const conn = await mongoose.connect(process.env.MONGO_URI)

    // conn.connection.host shows which MongoDB server you connected to
    // helps confirm you're on Atlas and not a wrong database
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`)

  } catch (error) {
    // If MongoDB fails to connect, there's no point running the server
    // process.exit(1) shuts down Node completely
    // 1 = exit with failure, 0 = exit with success
    console.error(`❌ MongoDB connection failed: ${error.message}`)
    process.exit(1)
  }
}

export default connectDB