import express from 'express'
import {
  createOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
  getAllOrders,
  updateOrderStatus,
  getOrderStats,
} from '../controllers/order.controller.js'
import { protect, adminOnly } from '../middleware/auth.middleware.js'

const router = express.Router()

// ─────────────────────────────────────────────────────
// IMPORTANT: Specific routes BEFORE dynamic routes
// Same rule as product routes — order matters!
// ─────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────
// ADMIN ROUTES — specific, so they come FIRST
// ─────────────────────────────────────────────────────

// Get order statistics for dashboard
// GET /api/orders/admin/stats
router.get('/admin/stats', protect, adminOnly, getOrderStats)

// Get all orders (with filters)
// GET /api/orders/admin/all
// GET /api/orders/admin/all?status=pending
// GET /api/orders/admin/all?status=shipped&page=2
router.get('/admin/all', protect, adminOnly, getAllOrders)

// Update order status
// PUT /api/orders/:id/status
router.put('/:id/status', protect, adminOnly, updateOrderStatus)

// ─────────────────────────────────────────────────────
// USER ROUTES — protected, logged in users only
// ─────────────────────────────────────────────────────

// Get my orders (logged in user's order history)
// GET /api/orders/my-orders
router.get('/my-orders', protect, getMyOrders)

// Create new order from cart
// POST /api/orders
router.post('/', protect, createOrder)

// Get single order by ID
// GET /api/orders/:id
router.get('/:id', protect, getOrderById)

// Cancel order
// PUT /api/orders/:id/cancel
router.put('/:id/cancel', protect, cancelOrder)

export default router