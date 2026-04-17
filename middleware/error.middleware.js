import AppError from '../utils/AppError.js'

// ─────────────────────────────────────────────────────
// WHAT IS A GLOBAL ERROR HANDLER?
// ─────────────────────────────────────────────────────

// Without a global error handler, every controller needs its own
// try/catch and its own way of sending error responses.
// That means 20 controllers = 20 different error formats.
// Frontend never knows what shape the error will be in.

// WITH a global error handler:
// - Every error in your ENTIRE app flows to ONE place
// - Every error response has the SAME shape
// - Frontend always knows exactly what to expect
// - You never write error response code in controllers

// HOW IT WORKS:
// When you call next(error) anywhere in your app,
// OR when asyncHandler catches an error,
// Express automatically sends it to this function.
// Express knows this is an error handler because it has
// FOUR parameters: (err, req, res, next)
// Normal middleware has three: (req, res, next)
// That 'err' as the FIRST parameter is what makes it special

// ─────────────────────────────────────────────────────
// HANDLE SPECIFIC MONGOOSE / JWT ERRORS
// ─────────────────────────────────────────────────────

// MongoDB throws its own error types with specific names/codes
// We catch them here and convert to friendly AppError messages

const handleCastError = (err) => {
  // CastError happens when you pass an invalid MongoDB ID
  // Example: GET /api/products/invalid-id-123
  // MongoDB tries to cast "invalid-id-123" to ObjectId and fails
  const message = `Invalid ${err.path}: ${err.value}`
  return new AppError(message, 400)
}

const handleDuplicateKeyError = (err) => {
  // Code 11000 = duplicate key error
  // Happens when you try to register with an email that already exists
  // err.keyValue looks like: { email: "john@gmail.com" }
  const field = Object.keys(err.keyValue)[0]  // gets "email"
  const value = err.keyValue[field]            // gets "john@gmail.com"
  const message = `${field} '${value}' already exists. Please use a different ${field}`
  return new AppError(message, 400)
}

const handleValidationError = (err) => {
  // Mongoose ValidationError happens when schema validation fails
  // Example: saving a user without required email field
  // err.errors is an object with all validation failures
  const errors = Object.values(err.errors).map((el) => el.message)
  const message = `Invalid input data: ${errors.join('. ')}`
  return new AppError(message, 400)
}

const handleJWTError = () => {
  // JWT throws this when token signature is invalid
  // Happens when someone tampers with the token
  return new AppError('Invalid token. Please log in again', 401)
}

const handleJWTExpiredError = () => {
  // JWT throws this when token has expired
  // Happens when access token's 15 minutes are up
  return new AppError('Your token has expired. Please log in again', 401)
}

// ─────────────────────────────────────────────────────
// SEND ERROR IN DEVELOPMENT
// Show full error details — helpful for debugging
// ─────────────────────────────────────────────────────
const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    success: false,
    status: err.status,
    message: err.message,
    // in development we show the full stack trace
    // so you can see exactly which line caused the error
    stack: err.stack,
    error: err
  })
}

// ─────────────────────────────────────────────────────
// SEND ERROR IN PRODUCTION
// Hide internal details — never expose server internals
// ─────────────────────────────────────────────────────
const sendErrorProd = (err, res) => {
  // isOperational = errors we threw on purpose with AppError
  // These are safe to show to the user
  if (err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message
      // no stack trace — user doesn't need to see that
    })
  } else {
    // NOT operational = unexpected bug, programming error
    // Log it for developers but don't leak details to user
    console.error('💥 UNEXPECTED ERROR:', err)

    res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again later'
      // vague message on purpose — don't expose bug details
    })
  }
}

// ─────────────────────────────────────────────────────
// MAIN ERROR HANDLER MIDDLEWARE
// This is the function Express calls when any error occurs
// It MUST have exactly 4 parameters to work as error handler
// ─────────────────────────────────────────────────────
const errorHandler = (err, req, res, next) => {
  // Set defaults if not already set
  err.statusCode = err.statusCode || 500
  err.status = err.status || 'error'

  if (process.env.NODE_ENV === 'development') {
    // ── Development: show everything ──
    let error = { ...err }
    error.message = err.message

    // Convert specific error types to AppError
    if (err.name === 'CastError') error = handleCastError(error)
    if (err.code === 11000) error = handleDuplicateKeyError(error)
    if (err.name === 'ValidationError') error = handleValidationError(error)
    if (err.name === 'JsonWebTokenError') error = handleJWTError()
    if (err.name === 'TokenExpiredError') error = handleJWTExpiredError()

    sendErrorDev(error, res)

  } else {
    // ── Production: show minimal info ──
    let error = { ...err }
    error.message = err.message

    if (err.name === 'CastError') error = handleCastError(error)
    if (err.code === 11000) error = handleDuplicateKeyError(error)
    if (err.name === 'ValidationError') error = handleValidationError(error)
    if (err.name === 'JsonWebTokenError') error = handleJWTError()
    if (err.name === 'TokenExpiredError') error = handleJWTExpiredError()

    sendErrorProd(error, res)
  }
}

export default errorHandler