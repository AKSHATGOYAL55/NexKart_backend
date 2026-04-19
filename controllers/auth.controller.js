import User from '../models/User.model.js'
import asyncHandler from '../utils/asyncHandler.js'
import AppError from '../utils/AppError.js'
import { generateAccessToken, generateRefreshToken } from '../utils/generateToken.js'

// ─────────────────────────────────────────────────────
// WHAT DOES AUTH CONTROLLER DO?
// ─────────────────────────────────────────────────────

// This file handles everything related to authentication:
// 1. register  — create new account
// 2. login     — verify credentials, send tokens
// 3. logout    — clear tokens
// 4. getMe     — get current logged in user profile
// 5. refreshToken — get new access token using refresh token

// Each function here is called a "controller"
// Controllers receive req (request) and res (response)
// They talk to the database through Models
// They send back JSON responses to the client

// ─────────────────────────────────────────────────────
// HELPER — SEND TOKEN RESPONSE
// ─────────────────────────────────────────────────────

// This helper function is used by both register and login
// It creates tokens, sets the refresh token as a cookie,
// and sends the response back to the client
// We put it here so we don't repeat this code twice

const sendTokenResponse = (user, statusCode, res) => {
  // Generate both tokens using the user's MongoDB _id
  const accessToken = generateAccessToken(user._id)
  const refreshToken = generateRefreshToken(user._id)

  // ── Cookie options ──────────────────────────────────
  // We store the refresh token in an httpOnly cookie
  // httpOnly = JavaScript cannot read this cookie
  // This protects against XSS attacks
  // (malicious scripts can't steal the refresh token)
  const cookieOptions = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    httpOnly: true,   // cannot be accessed by JavaScript
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: 'strict' // prevents CSRF attacks
  }

  // Store refresh token in database
  // So we can invalidate it on logout
  user.refreshToken = refreshToken
  user.save({ validateBeforeSave: false })
  // validateBeforeSave: false — skip schema validation
  // because we're only updating refreshToken field
  // we don't want to re-validate name, email etc.

  // Remove password from output
  // even though select:false hides it in queries,
  // the current 'user' object in memory still has it
  // after .save() — so we manually delete it
  user.password = undefined

  // Set refresh token as httpOnly cookie
  res.cookie('refreshToken', refreshToken, cookieOptions)

  // Send access token in response body
  // Client stores this in memory (Redux state)
  // and sends it in Authorization header with every request
  res.status(statusCode).json({
    success: true,
    accessToken,  // client uses this for API requests
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      phone: user.phone,
    }
    // we only send what the frontend needs
    // never send refreshToken, passwordResetToken etc.
  })
}
