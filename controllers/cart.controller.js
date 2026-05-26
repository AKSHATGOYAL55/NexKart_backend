import Cart from '../models/Cart.model.js'
import Product from '../models/Product.model.js'
import asyncHandler from '../utils/asyncHandler.js'
import AppError from '../utils/AppError.js'

// ─────────────────────────────────────────────────────
// CART CONTROLLERS
// ─────────────────────────────────────────────────────

// getCart       → get current user's cart
// addToCart     → add product to cart or increase quantity
// updateItem    → change quantity of existing item
// removeItem    → remove item from cart
// clearCart     → empty entire cart
// applyCoupon   → apply discount coupon

// ─────────────────────────────────────────────────────
// @desc    Get user's cart
// @route   GET /api/cart
// @access  Protected
// ─────────────────────────────────────────────────────
export const getCart = asyncHandler(async (req, res) => {
  // req.user is set by protect middleware

  // Find or create cart for this user
  let cart = await Cart.findOne({ user: req.user._id }).populate(
    'items.product',
    'name slug price discountPrice images stock isActive'
  )

  // If no cart exists, create an empty one
  if (!cart) {
    cart = await Cart.create({
      user: req.user._id,
      items: [],
    })
  }

  // ── Check if any products are out of stock or deleted ──
  // Filter out items where product is inactive or deleted
  const validItems = cart.items.filter((item) => {
    if (!item.product || !item.product.isActive) {
      return false // product deleted or deactivated
    }
    if (item.product.stock < item.quantity) {
      // Not enough stock — reduce quantity to available stock
      item.quantity = item.product.stock
    }
    return true
  })

  // Update cart if any items were removed
  if (validItems.length !== cart.items.length) {
    cart.items = validItems
    await cart.save()
  }

  res.status(200).json({
    success: true,
    cart,
  })
})

// ─────────────────────────────────────────────────────
// @desc    Add product to cart
// @route   POST /api/cart/add
// @access  Protected
// ─────────────────────────────────────────────────────
export const addToCart = asyncHandler(async (req, res) => {
  const { productId, quantity = 1 } = req.body

  // ── Validate input ─────────────────────────────────
  if (!productId) {
    throw new AppError('Product ID is required', 400)
  }

  if (quantity < 1) {
    throw new AppError('Quantity must be at least 1', 400)
  }

  // ── Check if product exists and is available ───────
  const product = await Product.findById(productId)

  if (!product) {
    throw new AppError('Product not found', 404)
  }

  if (!product.isActive) {
    throw new AppError('This product is no longer available', 400)
  }

  if (product.stock < quantity) {
    throw new AppError(
      `Only ${product.stock} items available in stock`,
      400
    )
  }

  // ── Find or create cart ────────────────────────────
  let cart = await Cart.findOne({ user: req.user._id })

  if (!cart) {
    cart = await Cart.create({
      user: req.user._id,
      items: [],
    })
  }

  // ── Check if product already in cart ───────────────
  const existingItemIndex = cart.items.findIndex(
    (item) => item.product.toString() === productId
  )

  if (existingItemIndex > -1) {
    // Product already in cart — increase quantity
    const newQuantity = cart.items[existingItemIndex].quantity + quantity

    // Check stock limit
    if (product.stock < newQuantity) {
      throw new AppError(
        `Cannot add more. Only ${product.stock} items available`,
        400
      )
    }

    cart.items[existingItemIndex].quantity = newQuantity
    cart.items[existingItemIndex].price = product.discountPrice || product.price
  } else {
    // New product — add to cart
    cart.items.push({
      product: productId,
      quantity,
      price: product.discountPrice || product.price,
      name: product.name,
      image: product.images[0]?.url || '',
    })
  }

  // Save cart — totals auto-calculate via pre-save middleware
  await cart.save()

  // Populate product details before sending response
  await cart.populate('items.product', 'name slug price discountPrice images stock')

  res.status(200).json({
    success: true,
    message: 'Product added to cart',
    cart,
  })
})

// ─────────────────────────────────────────────────────
// @desc    Update cart item quantity
// @route   PUT /api/cart/update/:itemId
// @access  Protected
// ─────────────────────────────────────────────────────
export const updateCartItem = asyncHandler(async (req, res) => {
  const { itemId } = req.params
  const { quantity } = req.body

  // ── Validate quantity ──────────────────────────────
  if (!quantity || quantity < 1) {
    throw new AppError('Quantity must be at least 1', 400)
  }

  // ── Find cart ──────────────────────────────────────
  const cart = await Cart.findOne({ user: req.user._id })

  if (!cart) {
    throw new AppError('Cart not found', 404)
  }

  // ── Find item in cart ──────────────────────────────
  const item = cart.items.id(itemId)
  // .id() is a Mongoose subdocument method
  // Searches for subdocument by its _id

  if (!item) {
    throw new AppError('Item not found in cart', 404)
  }

  // ── Check stock availability ───────────────────────
  const product = await Product.findById(item.product)

  if (!product) {
    throw new AppError('Product not found', 404)
  }

  if (!product.isActive) {
    throw new AppError('This product is no longer available', 400)
  }

  if (product.stock < quantity) {
    throw new AppError(
      `Only ${product.stock} items available in stock`,
      400
    )
  }

  // ── Update quantity ────────────────────────────────
  item.quantity = quantity
  item.price = product.discountPrice || product.price

  await cart.save()

  await cart.populate('items.product', 'name slug price discountPrice images stock')

  res.status(200).json({
    success: true,
    message: 'Cart updated',
    cart,
  })
})

// ─────────────────────────────────────────────────────
// @desc    Remove item from cart
// @route   DELETE /api/cart/remove/:itemId
// @access  Protected
// ─────────────────────────────────────────────────────
export const removeCartItem = asyncHandler(async (req, res) => {
  const { itemId } = req.params

  const cart = await Cart.findOne({ user: req.user._id })

  if (!cart) {
    throw new AppError('Cart not found', 404)
  }

  // ── Remove item from items array ───────────────────
  // pull() is a Mongoose array method that removes subdocuments
  cart.items.pull(itemId)

  await cart.save()

  await cart.populate('items.product', 'name slug price discountPrice images stock')

  res.status(200).json({
    success: true,
    message: 'Item removed from cart',
    cart,
  })
})

// ─────────────────────────────────────────────────────
// @desc    Clear entire cart
// @route   DELETE /api/cart/clear
// @access  Protected
// ─────────────────────────────────────────────────────
export const clearCart = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id })

  if (!cart) {
    throw new AppError('Cart not found', 404)
  }

  // Empty the items array
  cart.items = []
  cart.coupon = undefined

  await cart.save()

  res.status(200).json({
    success: true,
    message: 'Cart cleared',
    cart,
  })
})

// ─────────────────────────────────────────────────────
// @desc    Apply coupon to cart
// @route   POST /api/cart/coupon
// @access  Protected
// ─────────────────────────────────────────────────────
export const applyCoupon = asyncHandler(async (req, res) => {
  const { code } = req.body

  if (!code) {
    throw new AppError('Coupon code is required', 400)
  }

  // ── Find cart ──────────────────────────────────────
  const cart = await Cart.findOne({ user: req.user._id })

  if (!cart) {
    throw new AppError('Cart not found', 404)
  }

  if (cart.items.length === 0) {
    throw new AppError('Cart is empty', 400)
  }

  // ── Validate coupon ────────────────────────────────
  // For now, we'll use hardcoded coupons
  // Later you can create a Coupon model and check database

  const coupons = {
    SAVE10: { discount: 10, discountType: 'percentage' },
    SAVE100: { discount: 100, discountType: 'fixed' },
    WELCOME20: { discount: 20, discountType: 'percentage' },
  }

  const coupon = coupons[code.toUpperCase()]

  if (!coupon) {
    throw new AppError('Invalid coupon code', 400)
  }

  // ── Apply coupon ───────────────────────────────────
  cart.coupon = {
    code: code.toUpperCase(),
    discount: coupon.discount,
    discountType: coupon.discountType,
  }

  await cart.save()

  await cart.populate('items.product', 'name slug price discountPrice images stock')

  res.status(200).json({
    success: true,
    message: `Coupon ${code.toUpperCase()} applied successfully`,
    cart,
  })
})

// ─────────────────────────────────────────────────────
// @desc    Remove coupon from cart
// @route   DELETE /api/cart/coupon
// @access  Protected
// ─────────────────────────────────────────────────────
export const removeCoupon = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id })

  if (!cart) {
    throw new AppError('Cart not found', 404)
  }

  cart.coupon = undefined

  await cart.save()

  await cart.populate('items.product', 'name slug price discountPrice images stock')

  res.status(200).json({
    success: true,
    message: 'Coupon removed',
    cart,
  })
})