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

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public (anyone can register)
// ─────────────────────────────────────────────────────
export const register = asyncHandler(async (req, res) => {
  // ── Step 1: Get data from request body ─────────────
  // req.body contains what the frontend sent
  // Example: { name: "Akshat", email: "a@gmail.com",
  //            password: "Pass123", confirmPassword: "Pass123" }
  const { name, email, password } = req.body
  // note: we don't need confirmPassword here
  // it was already validated in auth.validator.js
  // its only purpose was to confirm passwords match on frontend

  // ── Step 2: Check if email already exists ──────────
  // Even though email has unique:true in schema,
  // checking here gives us a cleaner error message
  const existingUser = await User.findOne({ email })
  // User.findOne({ email }) is shorthand for
  // User.findOne({ email: email })

  if (existingUser) {
    throw new AppError(
      'An account with this email already exists. Please login instead.',
      400
    )
}
  // ── Step 3: Create the user ─────────────────────────
  // User.create() does two things:
  // 1. Creates a new User instance
  // 2. Calls .save() which triggers pre('save') middleware
  //    pre('save') automatically hashes the password
  // So by the time user is saved, password is already hashed
  const user = await User.create({
    name,
    email,
    password,
    // role defaults to 'user' as defined in schema
    // isActive defaults to true
  })

  // ── Step 4: Send token response ────────────────────
  // 201 = Created (new resource was created)
  sendTokenResponse(user, 201, res)

  // At this point the client receives:
  // {
  //   success: true,
  //   accessToken: "eyJhbGci...",
  //   user: { _id, name, email, role, avatar, phone }
  // }
  // AND a refreshToken cookie is set in the browser
})


// ─────────────────────────────────────────────────────
// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
// ─────────────────────────────────────────────────────
export const login = asyncHandler(async (req, res) => {
  // ── Step 1: Get credentials from request ───────────
  const { email, password } = req.body

  // ── Step 2: Find user by email ─────────────────────
  // IMPORTANT: we use .select('+password') here
  // Because password has select:false in schema
  // it never comes back in normal queries
  // But for login we NEED it to compare with entered password
  const user = await User.findOne({ email }).select('+password')

  // ── Step 3: Check user exists ──────────────────────
  if (!user) {
    // SECURITY TIP: Don't say "email not found"
    // That tells attackers which emails are registered
    // Instead say "Invalid credentials" for both wrong
    // email AND wrong password — same vague message
    throw new AppError('Invalid email or password', 401)
  }

  // ── Step 4: Check password is correct ──────────────
  // user.comparePassword() is our instance method from User.model.js
  // It runs bcrypt.compare(enteredPassword, user.password)
  // Returns true if match, false if wrong
  const isPasswordMatch = await user.comparePassword(password)

  if (!isPasswordMatch) {
    throw new AppError('Invalid email or password', 401)
    // same message as wrong email — security best practice
  }

  // ── Step 5: Check account is active ────────────────
  if (!user.isActive) {
    throw new AppError(
      'Your account has been deactivated. Please contact support.',
      401
    )
  }

  // ── Step 6: Send token response ────────────────────
  // 200 = OK (existing resource accessed successfully)
  sendTokenResponse(user, 200, res)
})
