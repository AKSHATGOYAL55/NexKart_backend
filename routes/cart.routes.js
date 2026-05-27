import express from 'express'
import {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
  applyCoupon,
  removeCoupon,
} from '../controllers/cart.controller.js'
import { protect } from '../middleware/auth.middleware.js'

const router = express.Router()

// ─────────────────────────────────────────────────────
// ALL CART ROUTES ARE PROTECTED
// User must be logged in to access their cart
// ─────────────────────────────────────────────────────

// Get user's cart
// GET /api/cart
router.get('/', protect, getCart)

// Add product to cart
// POST /api/cart/add
router.post('/add', protect, addToCart)

// Update item quantity
// PUT /api/cart/update/:itemId
router.put('/update/:itemId', protect, updateCartItem)

// Remove item from cart
// DELETE /api/cart/remove/:itemId
router.delete('/remove/:itemId', protect, removeCartItem)

// Clear entire cart
// DELETE /api/cart/clear
router.delete('/clear', protect, clearCart)

// Apply coupon
// POST /api/cart/coupon
router.post('/coupon', protect, applyCoupon)

// Remove coupon
// DELETE /api/cart/coupon
router.delete('/coupon', protect, removeCoupon)

export default router