import Product from '../models/Product.model.js'
import asyncHandler from '../utils/asyncHandler.js'
import AppError from '../utils/AppError.js'

// ─────────────────────────────────────────────────────
// WHAT THESE CONTROLLERS DO:
// ─────────────────────────────────────────────────────

// getProducts  → list all products with filters, search, pagination
// getProduct   → get single product by ID or slug
// createProduct → admin creates new product
// updateProduct → admin updates existing product
// deleteProduct → admin deletes product (soft delete)

// ─────────────────────────────────────────────────────
// @desc    Get all products with filters, search, sort, pagination
// @route   GET /api/products
// @access  Public
// ─────────────────────────────────────────────────────
export const getProducts = asyncHandler(async (req, res) => {
  // ── Extract query parameters ───────────────────────
  const {
    keyword,      // search term
    category,     // filter by category
    brand,        // filter by brand
    minPrice,     // filter price range
    maxPrice,
    rating,       // filter by minimum rating
    page = 1,     // pagination
    limit = 12,   // products per page
    sort = '-createdAt', // sort field (- means descending)
  } = req.query

  // ── Build filter object ────────────────────────────
  const filter = { isActive: true } // only show active products

  // Search by keyword — searches in name, description, brand
  if (keyword) {
    filter.$text = { $search: keyword }
    // $text uses the text index we created in the model
    // Example: keyword="iphone" finds all products with "iphone" in name/desc/brand
  }

  // Filter by category
  if (category) {
    filter.category = category
  }

  // Filter by brand
  if (brand) {
    filter.brand = brand
  }

  // Filter by price range
  if (minPrice || maxPrice) {
    filter.price = {}
    if (minPrice) filter.price.$gte = Number(minPrice) // greater than or equal
    if (maxPrice) filter.price.$lte = Number(maxPrice) // less than or equal
  }

  // Filter by minimum rating
  if (rating) {
    filter['ratings.average'] = { $gte: Number(rating) }
    // Example: rating=4 shows only products with 4+ stars
  }

  // ── Calculate pagination ───────────────────────────
  const skip = (Number(page) - 1) * Number(limit)
  // page 1 → skip 0
  // page 2 → skip 12
  // page 3 → skip 24

  // ── Execute query ──────────────────────────────────
  const products = await Product.find(filter)
    .sort(sort)
    // sort examples:
    // '-createdAt' → newest first
    // 'price' → cheapest first
    // '-price' → most expensive first
    // '-ratings.average' → highest rated first
    .skip(skip)
    .limit(Number(limit))
    .populate('createdBy', 'name email') // include creator's name and email
    .select('-reviews') // exclude reviews array (too big, fetch separately)

  // ── Get total count for pagination ────────────────
  const total = await Product.countDocuments(filter)

  // ── Send response ──────────────────────────────────
  res.status(200).json({
    success: true,
    count: products.length,
    total,
    page: Number(page),
    pages: Math.ceil(total / Number(limit)),
    products,
  })
})

// ─────────────────────────────────────────────────────
// @desc    Get single product by ID or slug
// @route   GET /api/products/:idOrSlug
// @access  Public
// ─────────────────────────────────────────────────────
export const getProduct = asyncHandler(async (req, res) => {
  const { idOrSlug } = req.params

  // Try to find by ID first, if that fails try slug
  // This allows both URLs to work:
  // /api/products/64abc123... (MongoDB ID)
  // /api/products/apple-iphone-15-pro (slug)
  let product

  // Check if it looks like a MongoDB ObjectId (24 hex characters)
  if (idOrSlug.match(/^[0-9a-fA-F]{24}$/)) {
    product = await Product.findById(idOrSlug)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .populate({
        path: 'reviews',
        populate: { path: 'user', select: 'name avatar' },
        options: { sort: { createdAt: -1 }, limit: 10 }, // latest 10 reviews
      })
  } else {
    // Not an ID, treat as slug
    product = await Product.findOne({ slug: idOrSlug })
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .populate({
        path: 'reviews',
        populate: { path: 'user', select: 'name avatar' },
        options: { sort: { createdAt: -1 }, limit: 10 },
      })
  }

  if (!product) {
    throw new AppError('Product not found', 404)
  }

  res.status(200).json({
    success: true,
    product,
  })
})

// ─────────────────────────────────────────────────────
// @desc    Create new product
// @route   POST /api/products
// @access  Protected + Admin only
// ─────────────────────────────────────────────────────
export const createProduct = asyncHandler(async (req, res) => {
  // req.user is set by protect middleware
  // req.body contains product data from frontend

  const {
    name,
    description,
    price,
    discountPrice,
    category,
    brand,
    images,
    stock,
    specifications,
    metaTitle,
    metaDescription,
    isFeatured,
  } = req.body

  // ── Validation ─────────────────────────────────────
  if (!name || !description || !price || !category || !brand) {
    throw new AppError(
      'Please provide all required fields: name, description, price, category, brand',
      400
    )
  }

  // ── Check for duplicate slug ───────────────────────
  // We generate slug from name, but what if a product with
  // that name already exists? Check before creating.
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')

  const existingProduct = await Product.findOne({ slug })
  if (existingProduct) {
    throw new AppError(
      'A product with this name already exists. Please use a different name.',
      400
    )
  }

  // ── Create product ─────────────────────────────────
  const product = await Product.create({
    name,
    description,
    price,
    discountPrice: discountPrice || 0,
    category,
    brand,
    images: images || [],
    stock: stock || 0,
    specifications: specifications || {},
    metaTitle: metaTitle || name,
    metaDescription: metaDescription || description.substring(0, 160),
    isFeatured: isFeatured || false,
    createdBy: req.user._id, // track who created this
  })

  res.status(201).json({
    success: true,
    message: 'Product created successfully',
    product,
  })
})

// ─────────────────────────────────────────────────────
// @desc    Update product
// @route   PUT /api/products/:id
// @access  Protected + Admin only
// ─────────────────────────────────────────────────────
export const updateProduct = asyncHandler(async (req, res) => {
  const { id } = req.params

  // ── Find product ───────────────────────────────────
  const product = await Product.findById(id)

  if (!product) {
    throw new AppError('Product not found', 404)
  }

  // ── Update fields ──────────────────────────────────
  // Only update fields that are provided in req.body
  const allowedUpdates = [
    'name',
    'description',
    'price',
    'discountPrice',
    'category',
    'brand',
    'images',
    'stock',
    'specifications',
    'metaTitle',
    'metaDescription',
    'isFeatured',
    'isActive',
  ]

  allowedUpdates.forEach((field) => {
    if (req.body[field] !== undefined) {
      product[field] = req.body[field]
    }
  })

  // Track who updated this
  product.updatedBy = req.user._id

  await product.save()

  res.status(200).json({
    success: true,
    message: 'Product updated successfully',
    product,
  })
})

// ─────────────────────────────────────────────────────
// @desc    Delete product (soft delete)
// @route   DELETE /api/products/:id
// @access  Protected + Admin only
// ─────────────────────────────────────────────────────
export const deleteProduct = asyncHandler(async (req, res) => {
  const { id } = req.params

  const product = await Product.findById(id)

  if (!product) {
    throw new AppError('Product not found', 404)
  }

  // SOFT DELETE — don't actually delete from database
  // Just set isActive = false so it doesn't show in listings
  // This preserves order history — users can still see products
  // they previously bought even if the product is "deleted"
  product.isActive = false
  product.updatedBy = req.user._id
  await product.save()

  // If you want HARD DELETE (actually remove from database):
  // await product.deleteOne()

  res.status(200).json({
    success: true,
    message: 'Product deleted successfully',
  })
})

// ─────────────────────────────────────────────────────
// @desc    Get featured products
// @route   GET /api/products/featured
// @access  Public
// ─────────────────────────────────────────────────────
export const getFeaturedProducts = asyncHandler(async (req, res) => {
  const products = await Product.find({
    isFeatured: true,
    isActive: true,
  })
    .sort('-createdAt')
    .limit(8) // show 8 featured products on homepage
    .select('-reviews')

  res.status(200).json({
    success: true,
    count: products.length,
    products,
  })
})

// ─────────────────────────────────────────────────────
// @desc    Get products by category
// @route   GET /api/products/category/:category
// @access  Public
// ─────────────────────────────────────────────────────
export const getProductsByCategory = asyncHandler(async (req, res) => {
  const { category } = req.params
  const { page = 1, limit = 12, sort = '-createdAt' } = req.query

  const skip = (Number(page) - 1) * Number(limit)

  const products = await Product.find({
    category,
    isActive: true,
  })
    .sort(sort)
    .skip(skip)
    .limit(Number(limit))
    .select('-reviews')

  const total = await Product.countDocuments({ category, isActive: true })

  res.status(200).json({
    success: true,
    count: products.length,
    total,
    page: Number(page),
    pages: Math.ceil(total / Number(limit)),
    products,
  })
})