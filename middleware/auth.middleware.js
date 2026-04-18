import jwt from 'jsonwebtoken'
import asyncHandler from '../utils/asyncHandler.js'
import AppError from '../utils/AppError.js'
import User from '../models/User.model.js'

// ─────────────────────────────────────────────────────
// WHAT IS AUTH MIDDLEWARE?
// ─────────────────────────────────────────────────────

// Some routes in your app are PUBLIC — anyone can access them
// Example: GET /api/products — anyone can browse products

// Some routes are PROTECTED — only logged in users can access
// Example: POST /api/orders — you must be logged in to place an order

// Some routes are ADMIN ONLY — only admins can access
// Example: DELETE /api/products/:id — only admin can delete products

// Auth middleware sits BETWEEN the route and the controller
// It checks the token BEFORE the controller runs
// If token is valid → req.user is set → controller runs
// If token is invalid → error sent → controller never runs

// ─────────────────────────────────────────────────────
// HOW TOKEN AUTHENTICATION WORKS:
// ─────────────────────────────────────────────────────

// 1. User logs in → server creates a JWT token → sends to client
// 2. Client stores token (in memory / localStorage)
// 3. Client sends token with EVERY request in the header:
//    Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...
// 4. This middleware reads that header
// 5. Verifies the token with JWT_SECRET
// 6. Finds the user from database using id inside token
// 7. Attaches user to req.user
// 8. Controller can now use req.user to know WHO is making the request

// ─────────────────────────────────────────────────────
// PROTECT MIDDLEWARE — checks if user is logged in
// Use this on any route that requires authentication
// ─────────────────────────────────────────────────────
export const protect = asyncHandler(async (req, res, next) => {
  let token

  // ── Step 1: Find the token ──────────────────────────
  // Token comes in the Authorization header like this:
  // "Bearer eyJhbGciOiJIUzI1NiJ9.eyJpZCI6IjY..."
  // We split by space and take index [1] to get just the token

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1]
    // "Bearer abc123" → ["Bearer", "abc123"] → "abc123"
  }

  // ── Step 2: Check token exists ─────────────────────
  if (!token) {
    throw new AppError(
      'You are not logged in. Please log in to access this route',
      401
    )
    // 401 = Unauthorized — not logged in at all
  }

  // ── Step 3: Verify token is valid ──────────────────
  // jwt.verify() does two things:
  // 1. Checks the signature — was this token created by OUR server?
  //    (uses JWT_SECRET to verify)
  // 2. Checks expiry — has the 15 minute window passed?
  // If either check fails, jwt.verify() THROWS an error
  // That error is caught by asyncHandler → goes to errorHandler
  // errorHandler handles JsonWebTokenError and TokenExpiredError
  const decoded = jwt.verify(token, process.env.JWT_SECRET)

  // decoded looks like: { id: '64abc123...', iat: 1234567890, exp: 9876543210 }
  // id = the user's MongoDB _id we put in the token when they logged in
  // iat = issued at (when token was created)
  // exp = expiry (when token expires)
  console.log('Decoded token:', decoded)

  // ── Step 4: Find user from database ────────────────
  // Why fetch from DB and not just use decoded.id directly?
  // Because the user might have been DELETED or BANNED after
  // the token was issued. We need to confirm user still exists.
  const currentUser = await User.findById(decoded.id)

  if (!currentUser) {
    throw new AppError(
      'The user belonging to this token no longer exists',
      401
    )
  }

  // ── Step 5: Check if user is active ────────────────
  if (!currentUser.isActive) {
    throw new AppError(
      'Your account has been deactivated. Please contact support',
      401
    )
  }

  // ── Step 6: Attach user to request ─────────────────
  // This is the KEY step — we add the full user object to req
  // Now ANY controller after this middleware can use req.user
  // Example in controller: const userId = req.user._id
  req.user = currentUser

  // ── Step 7: Continue to next middleware/controller ──
  next()
})


// ─────────────────────────────────────────────────────
// ADMIN ONLY MIDDLEWARE
// Use this AFTER protect — protect sets req.user first
// then adminOnly checks if that user is an admin
// ─────────────────────────────────────────────────────
export const adminOnly = (req, res, next) => {
  // req.user is already set by protect middleware above
  // We just check the role field
  if (req.user && req.user.role === 'admin') {
    next()  // they are admin — continue
  } else {
    throw new AppError(
      'You do not have permission to perform this action',
      403
      // 403 = Forbidden — logged in but not allowed
      // Different from 401 which means not logged in at all
    )
  }
}
