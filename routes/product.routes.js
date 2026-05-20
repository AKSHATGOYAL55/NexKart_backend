import express from 'express'
import {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getFeaturedProducts,
  getProductsByCategory,
} from '../controllers/product.controller.js'
import { protect, adminOnly } from '../middleware/auth.middleware.js'

const router = express.Router()

// ─────────────────────────────────────────────────────
// IMPORTANT: Route order matters!
// More specific routes MUST come before generic routes
// ─────────────────────────────────────────────────────

// WHY ORDER MATTERS:
// If you put '/:idOrSlug' before '/featured',
// Express thinks "featured" is an ID and calls getProduct instead
// So specific routes like /featured, /category/:name go FIRST
// Generic routes like /:idOrSlug go LAST

// ─────────────────────────────────────────────────────
// PUBLIC ROUTES — no authentication needed
// ─────────────────────────────────────────────────────

// Get featured products (homepage)
// GET /api/products/featured
router.get('/featured', getFeaturedProducts)

// Get products by category
// GET /api/products/category/Electronics
router.get('/category/:category', getProductsByCategory)

// Get all products with filters, search, pagination
// GET /api/products
// GET /api/products?keyword=laptop
// GET /api/products?category=Electronics&minPrice=30000&sort=-price
router.get('/', getProducts)

// Get single product by ID or slug
// GET /api/products/64abc123...
// GET /api/products/apple-iphone-15-pro
// THIS MUST BE LAST among GET routes
router.get('/:idOrSlug', getProduct)

// ─────────────────────────────────────────────────────
// ADMIN ROUTES — must be logged in AND admin role
// protect → checks token, sets req.user
// adminOnly → checks if req.user.role === 'admin'
// ─────────────────────────────────────────────────────

// Create new product
// POST /api/products
router.post('/', protect, adminOnly, createProduct)

// Update product
// PUT /api/products/64abc123...
router.put('/:id', protect, adminOnly, updateProduct)

// Delete product (soft delete)
// DELETE /api/products/64abc123...
router.delete('/:id', protect, adminOnly, deleteProduct)

export default router