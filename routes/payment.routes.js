import express from 'express'
import {
  createRazorpayOrder,
  verifyPayment,
  getRazorpayKey,
} from '../controllers/payment.controller.js'
import { protect } from '../middleware/auth.middleware.js'

const router = express.Router()

// All payment routes are protected
router.get('/key', protect, getRazorpayKey)
router.post('/create-order', protect, createRazorpayOrder)
router.post('/verify', protect, verifyPayment)

export default router