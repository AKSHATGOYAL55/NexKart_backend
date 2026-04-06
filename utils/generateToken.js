import jwt from 'jsonwebtoken'

// This file has ONE job — create JWT tokens
// We use two types of tokens:
// 1. Access Token  — short lived (15 mins), sent with every API request
// 2. Refresh Token — long lived (7 days), used to get a new access token

// HOW JWT WORKS:
// jwt.sign() takes 3 things:
//   - payload: data to store inside the token (user's id)
//   - secret: a secret key only your server knows
//   - options: expiry time
// It returns a long string like: "eyJhbGciOiJIUzI1NiJ9.eyJpZCI6..."
// This string is sent to the client and stored there
// Client sends it back with every request in the Authorization header
// Your server verifies it with the same secret to confirm it's valid

export const generateAccessToken = (userId) => {
  return jwt.sign(
    { id: userId },              // payload — what's stored inside the token
    process.env.JWT_SECRET,      // secret key from .env
    { expiresIn: process.env.JWT_EXPIRE || '15m' }  // expires in 15 minutes
  )
}

// export const generateRefreshToken = (userId) => {
//   return jwt.sign(
//     { id: userId },
//     process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
//     { expiresIn: '7d' }          // expires in 7 days
//   )
// }