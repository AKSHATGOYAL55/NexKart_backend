import Order from '../models/Order.model.js'
// import Cart from '../models/Cart.model.js'
import Cart from "../models/Cart.models.js"
import Product from '../models/Product.model.js'
import asyncHandler from '../utils/asyncHandler.js'
import AppError from '../utils/AppError.js'

// ─────────────────────────────────────────────────────
// ORDER CONTROLLERS
// ─────────────────────────────────────────────────────

// createOrder      → convert cart to order + reduce stock
// getMyOrders      → get logged in user's order history
// getOrderById     → get single order details
// cancelOrder      → user cancels their order
// getAllOrders      → admin sees all orders
// updateOrderStatus → admin updates order status
// getOrderStats    → admin dashboard statistics

// ─────────────────────────────────────────────────────
// HELPER — calculate price breakdown
// ─────────────────────────────────────────────────────

const calculatePrices = (items, discountAmount = 0) => {
  // Sum of all items
  const itemsPrice = items.reduce((total, item) => {
    return total + item.price * item.quantity
  }, 0)

  // GST 18% on items
  const taxPrice = Math.round(itemsPrice * 0.18)

  // Free shipping over ₹500, else ₹50
  const shippingPrice = itemsPrice > 500 ? 0 : 50

  // Final total
  const totalPrice = itemsPrice + taxPrice + shippingPrice - discountAmount

  return {
    itemsPrice,
    taxPrice,
    shippingPrice,
    discountPrice: discountAmount,
    totalPrice,
  }
}

// ─────────────────────────────────────────────────────
// @desc    Create new order from cart
// @route   POST /api/orders
// @access  Protected
// ─────────────────────────────────────────────────────
export const createOrder = asyncHandler(async (req, res) => {
  const { shippingAddress, paymentMethod, orderNotes } = req.body

  // ── Step 1: Validate required fields ───────────────
  if (!shippingAddress) {
    throw new AppError('Shipping address is required', 400)
  }

  if (!paymentMethod) {
    throw new AppError('Payment method is required', 400)
  }

  const {
    fullName,
    phone,
    street,
    city,
    state,
    pincode
  } = shippingAddress

  if (!fullName || !phone || !street || !city || !state || !pincode) {
    throw new AppError(
      'All shipping address fields are required: fullName, phone, street, city, state, pincode',
      400
    )
  }

  // ── Step 2: Get user's cart ─────────────────────────
  const cart = await Cart.findOne({ user: req.user._id }).populate(
    'items.product',
    'name slug price discountPrice stock isActive images'
  )

  if (!cart || cart.items.length === 0) {
    throw new AppError(
      'Your cart is empty. Add products before placing an order.',
      400
    )
  }

  // ── Step 3: Validate all cart items ────────────────
  // Check each product is still available and in stock
  const validationErrors = []

  for (const item of cart.items) {
    if (!item.product || !item.product.isActive) {
      validationErrors.push(
        `Product "${item.name}" is no longer available`
      )
      continue
    }

    if (item.product.stock < item.quantity) {
      validationErrors.push(
        `Only ${item.product.stock} units of "${item.name}" available. You have ${item.quantity} in cart.`
      )
    }
  }

  if (validationErrors.length > 0) {
    throw new AppError(
      `Some items in your cart have issues: ${validationErrors.join(', ')}`,
      400
    )
  }

  // ── Step 4: Build order items from cart ────────────
  // Snapshot — copy all details at time of order
  const orderItems = cart.items.map((item) => ({
    product: item.product._id,
    name: item.product.name,
    slug: item.product.slug,
    image: item.product.images[0]?.url || '',
    price: item.price,       // price when added to cart
    quantity: item.quantity,
    total: item.price * item.quantity,
  }))

  // ── Step 5: Calculate prices ────────────────────────
  const prices = calculatePrices(orderItems, cart.discount || 0)

  // ── Step 6: Create the order ────────────────────────
  const order = await Order.create({
    user: req.user._id,
    items: orderItems,
    shippingAddress,
    paymentMethod,
    ...prices,          // spread itemsPrice, taxPrice, shippingPrice, totalPrice
    couponCode: cart.coupon?.code || '',
    orderNotes: orderNotes || '',
    status: 'pending',
    isPaid: false,
    isDelivered: false,
  })

  // ── Step 7: Reduce stock for each product ──────────
  // This is CRITICAL — reduce stock so others can't buy the same items
  for (const item of cart.items) {
    await Product.findByIdAndUpdate(
      item.product._id,
      {
        $inc: { stock: -item.quantity }
        // $inc with negative number = decrease
        // If stock was 10 and user bought 3, stock becomes 7
      }
    )
  }

  // ── Step 8: Clear user's cart ──────────────────────
  // Order is placed — cart is no longer needed
  cart.items = []
  cart.coupon = undefined
  await cart.save()

  // ── Step 9: Send response ──────────────────────────
  res.status(201).json({
    success: true,
    message: 'Order placed successfully',
    order,
  })
})

// ─────────────────────────────────────────────────────
// @desc    Get logged in user's orders
// @route   GET /api/orders/my-orders
// @access  Protected
// ─────────────────────────────────────────────────────
export const getMyOrders = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query

  const skip = (Number(page) - 1) * Number(limit)

  const orders = await Order.find({ user: req.user._id })
    .sort({ createdAt: -1 })  // newest first
    .skip(skip)
    .limit(Number(limit))
    .select('-items.product')  // exclude full product reference (we have snapshot)

  const total = await Order.countDocuments({ user: req.user._id })

  res.status(200).json({
    success: true,
    count: orders.length,
    total,
    page: Number(page),
    pages: Math.ceil(total / Number(limit)),
    orders,
  })
})

// ─────────────────────────────────────────────────────
// @desc    Get single order by ID
// @route   GET /api/orders/:id
// @access  Protected
// ─────────────────────────────────────────────────────
export const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('user', 'name email phone')

  if (!order) {
    throw new AppError('Order not found', 404)
  }

  // ── Security check ─────────────────────────────────
  // Users can only see their OWN orders
  // Admins can see all orders
  if (
    order.user._id.toString() !== req.user._id.toString() &&
    req.user.role !== 'admin'
  ) {
    throw new AppError(
      'You are not authorized to view this order',
      403
    )
  }

  res.status(200).json({
    success: true,
    order,
  })
})

// ─────────────────────────────────────────────────────
// @desc    Cancel order
// @route   PUT /api/orders/:id/cancel
// @access  Protected
// ─────────────────────────────────────────────────────
export const cancelOrder = asyncHandler(async (req, res) => {
  const { cancelReason } = req.body

  const order = await Order.findById(req.params.id)

  if (!order) {
    throw new AppError('Order not found', 404)
  }

  // ── Check if this is user's order ──────────────────
  if (order.user.toString() !== req.user._id.toString()) {
    throw new AppError('Not authorized to cancel this order', 403)
  }

  // ── Can only cancel pending or processing orders ───
  if (!['pending', 'processing'].includes(order.status)) {
    throw new AppError(
      `Cannot cancel order that is already ${order.status}`,
      400
    )
  }

  // ── Update order status ────────────────────────────
  order.status = 'cancelled'
  order.cancelledAt = Date.now()
  order.cancelReason = cancelReason || 'Cancelled by user'
  await order.save()

  // ── Restore stock ──────────────────────────────────
  // When order cancelled, add stock back
  for (const item of order.items) {
    await Product.findByIdAndUpdate(
      item.product,
      { $inc: { stock: item.quantity } }
      // $inc with positive number = increase stock back
    )
  }

  res.status(200).json({
    success: true,
    message: 'Order cancelled successfully',
    order,
  })
})

// ─────────────────────────────────────────────────────
// @desc    Get all orders (Admin)
// @route   GET /api/orders/admin/all
// @access  Protected + Admin
// ─────────────────────────────────────────────────────
export const getAllOrders = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    status,
    sort = '-createdAt',
  } = req.query

  const filter = {}
  if (status) filter.status = status

  const skip = (Number(page) - 1) * Number(limit)

  const orders = await Order.find(filter)
    .sort(sort)
    .skip(skip)
    .limit(Number(limit))
    .populate('user', 'name email')

  const total = await Order.countDocuments(filter)

  res.status(200).json({
    success: true,
    count: orders.length,
    total,
    page: Number(page),
    pages: Math.ceil(total / Number(limit)),
    orders,
  })
})

// ─────────────────────────────────────────────────────
// @desc    Update order status (Admin)
// @route   PUT /api/orders/:id/status
// @access  Protected + Admin
// ─────────────────────────────────────────────────────
export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, trackingNumber, carrier } = req.body

  const validStatuses = [
    'pending',
    'processing',
    'shipped',
    'delivered',
    'cancelled',
    'refunded',
  ]

  if (!status || !validStatuses.includes(status)) {
    throw new AppError(
      `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      400
    )
  }

  const order = await Order.findById(req.params.id)

  if (!order) {
    throw new AppError('Order not found', 404)
  }

  // ── Update status ──────────────────────────────────
  order.status = status

  // If marking as delivered
  if (status === 'delivered') {
    order.isDelivered = true
    order.deliveredAt = Date.now()
  }

  // If marking as paid (for COD orders)
  if (status === 'processing' && order.paymentMethod === 'cod') {
    order.isPaid = true
    order.paidAt = Date.now()
  }

  // Add tracking info when shipped
  if (status === 'shipped') {
    if (trackingNumber) order.trackingNumber = trackingNumber
    if (carrier) order.carrier = carrier
  }

  // If cancelled by admin — restore stock
  if (status === 'cancelled') {
    order.cancelledAt = Date.now()
    order.cancelReason = req.body.cancelReason || 'Cancelled by admin'

    for (const item of order.items) {
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { stock: item.quantity } }
      )
    }
  }

  await order.save()

  res.status(200).json({
    success: true,
    message: `Order status updated to ${status}`,
    order,
  })
})

// ─────────────────────────────────────────────────────
// @desc    Get order statistics (Admin Dashboard)
// @route   GET /api/orders/admin/stats
// @access  Protected + Admin
// ─────────────────────────────────────────────────────
export const getOrderStats = asyncHandler(async (req, res) => {
  // ── Total revenue ──────────────────────────────────
  const revenueResult = await Order.aggregate([
    {
      $match: {
        status: { $nin: ['cancelled', 'refunded'] }
        // exclude cancelled and refunded orders from revenue
      }
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$totalPrice' },
        totalOrders: { $count: {} },
        averageOrderValue: { $avg: '$totalPrice' },
      }
    }
  ])

  // ── Orders by status ───────────────────────────────
  const ordersByStatus = await Order.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $count: {} },
      }
    }
  ])

  // ── Revenue by month (last 6 months) ───────────────
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  const monthlyRevenue = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: sixMonthsAgo },
        status: { $nin: ['cancelled', 'refunded'] },
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
        },
        revenue: { $sum: '$totalPrice' },
        orders: { $count: {} },
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } }
  ])

  // ── Total users ────────────────────────────────────
  const stats = revenueResult[0] || {
    totalRevenue: 0,
    totalOrders: 0,
    averageOrderValue: 0,
  }

  res.status(200).json({
    success: true,
    stats: {
      totalRevenue: stats.totalRevenue,
      totalOrders: stats.totalOrders,
      averageOrderValue: Math.round(stats.averageOrderValue),
      ordersByStatus,
      monthlyRevenue,
    },
  })
})