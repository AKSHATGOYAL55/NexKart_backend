import crypto from 'crypto'
import razorpay from '../config/razorpay.js'
import Order from '../models/Order.model.js'
import asyncHandler from '../utils/asyncHandler.js'
import AppError from '../utils/AppError.js'

// ─────────────────────────────────────────────────────
// @desc    Create Razorpay order
// @route   POST /api/payments/create-order
// @access  Protected
// ─────────────────────────────────────────────────────
export const createRazorpayOrder = asyncHandler(async (req, res) => {
  const { amount, currency = 'INR', orderId } = req.body

  if (!amount || !orderId) {
    throw new AppError('Amount and orderId are required', 400)
  }

  // Verify the order belongs to this user
  const order = await Order.findById(orderId)

  if (!order) {
    throw new AppError('Order not found', 404)
  }

  if (order.user.toString() !== req.user._id.toString()) {
    throw new AppError('Not authorized', 403)
  }

  if (order.isPaid) {
    throw new AppError('Order is already paid', 400)
  }

  // Create Razorpay order
  // amount must be in PAISE (multiply by 100)
  // ₹500 = 50000 paise
  const razorpayOrder = await razorpay.orders.create({
    amount: Math.round(amount * 100),
    currency,
    receipt: orderId.toString(),
    notes: {
      orderId: orderId.toString(),
      userId: req.user._id.toString(),
    },
  })

  res.status(200).json({
    success: true,
    razorpayOrderId: razorpayOrder.id,
    amount: razorpayOrder.amount,
    currency: razorpayOrder.currency,
    keyId: process.env.RAZORPAY_KEY_ID,
  })
})

// ─────────────────────────────────────────────────────
// @desc    Verify Razorpay payment
// @route   POST /api/payments/verify
// @access  Protected
// ─────────────────────────────────────────────────────
export const verifyPayment = asyncHandler(async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    orderId,
  } = req.body

  if (
    !razorpay_order_id ||
    !razorpay_payment_id ||
    !razorpay_signature ||
    !orderId
  ) {
    throw new AppError('All payment details are required', 400)
  }

  // ── Verify signature ───────────────────────────────
  // Razorpay creates a signature using:
  // HMAC SHA256(razorpay_order_id + "|" + razorpay_payment_id)
  // using your key_secret
  // We recreate this and compare — if they match, payment is genuine
  const body = razorpay_order_id + '|' + razorpay_payment_id

  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body.toString())
    .digest('hex')

  const isSignatureValid = expectedSignature === razorpay_signature

  if (!isSignatureValid) {
    throw new AppError('Payment verification failed — invalid signature', 400)
  }

  // ── Signature verified — update order in database ──
  const order = await Order.findById(orderId)

  if (!order) {
    throw new AppError('Order not found', 404)
  }

  order.isPaid = true
  order.paidAt = Date.now()
  order.status = 'processing'
  order.paymentResult = {
    id: razorpay_payment_id,
    status: 'captured',
    updateTime: new Date().toISOString(),
    razorpayOrderId: razorpay_order_id,
    razorpaySignature: razorpay_signature,
  }

  await order.save()

  res.status(200).json({
    success: true,
    message: 'Payment verified successfully',
    order,
  })
})

// ─────────────────────────────────────────────────────
// @desc    Get Razorpay key for frontend
// @route   GET /api/payments/key
// @access  Protected
// ─────────────────────────────────────────────────────
export const getRazorpayKey = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    keyId: process.env.RAZORPAY_KEY_ID,
  })
})