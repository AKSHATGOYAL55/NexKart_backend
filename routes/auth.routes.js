import express from 'express'
import {
  register,
  login,
  logout,
  getMe,
  refreshToken,
} from '../controllers/auth.controller.js'
import {
  validateRegister,
  validateLogin,
  validate,
} from '../validators/auth.validator.js'
import { protect } from '../middleware/auth.middleware.js'

const router = express.Router()

// ─── PUBLIC ROUTES ─────────────────────────────────────
router.post('/register', validateRegister, validate, register)
router.post('/login', validateLogin, validate, login)
router.post('/refresh-token', refreshToken)

// ─── PROTECTED ROUTES ──────────────────────────────────
// router.post('/logout', protect, logout)
// router.get('/me', protect, getMe)

export default router