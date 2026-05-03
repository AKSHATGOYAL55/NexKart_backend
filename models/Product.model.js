import mongoose from 'mongoose'

// ─────────────────────────────────────────────────────
// PRODUCT SCHEMA
// This defines what a product looks like in your store
// ─────────────────────────────────────────────────────

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      maxLength: [200, 'Product name cannot exceed 200 characters'],
    },

    slug: {
      type: String,
      unique: true,
      lowercase: true,
      // slug is auto-generated from name in pre-save middleware
      // Example: "Apple iPhone 15 Pro" → "apple-iphone-15-pro"
    },

    description: {
      type: String,
      required: [true, 'Product description is required'],
      maxLength: [2000, 'Description cannot exceed 2000 characters'],
    },

    price: {
      type: Number,
      required: [true, 'Product price is required'],
      min: [0, 'Price cannot be negative'],
      max: [1000000, 'Price cannot exceed 10 lakhs'],
    },

    discountPrice: {
      type: Number,
      default: 0,
      min: [0, 'Discount price cannot be negative'],
      // Validation: discountPrice must be less than price
      validate: {
        validator: function (value) {
          return value < this.price
        },
        message: 'Discount price must be less than regular price',
      },
    },

    category: {
      type: String,
      required: [true, 'Product category is required'],
      enum: {
        values: [
          'Electronics',
          'Clothing',
          'Shoes',
          'Books',
          'Home & Kitchen',
          'Sports',
          'Beauty',
          'Toys',
          'Grocery',
          'Other',
        ],
        message: '{VALUE} is not a valid category',
      },
    },

    brand: {
      type: String,
      required: [true, 'Brand name is required'],
      trim: true,
    },

    images: [
      {
        url: {
          type: String,
          required: true,
        },
        publicId: {
          type: String,
          required: true,
        },
        // publicId is from Cloudinary — used to delete the image later
      },
    ],

    stock: {
      type: Number,
      required: [true, 'Stock quantity is required'],
      min: [0, 'Stock cannot be negative'],
      default: 0,
    },

    // ── Rating System ──────────────────────────────────
    // We store both average rating AND count of ratings
    // This way we can show "4.5 stars (234 reviews)"
    ratings: {
      average: {
        type: Number,
        default: 0,
        min: [0, 'Rating cannot be less than 0'],
        max: [5, 'Rating cannot be more than 5'],
        // Stored with 1 decimal: 4.5, 3.8, etc.
      },
      count: {
        type: Number,
        default: 0,
      },
    },

    // Array of review IDs
    // Reviews are stored in a separate Review collection
    // This is called "referencing" — better for large datasets
    reviews: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Review',
      },
    ],

    // ── Product Status ─────────────────────────────────
    isFeatured: {
      type: Boolean,
      default: false,
      // Featured products show on homepage
    },

    isActive: {
      type: Boolean,
      default: true,
      // false = product is hidden/deleted but kept in database
    },

    // ── SEO & Metadata ─────────────────────────────────
    metaTitle: {
      type: String,
      maxLength: [60, 'Meta title cannot exceed 60 characters'],
    },

    metaDescription: {
      type: String,
      maxLength: [160, 'Meta description cannot exceed 160 characters'],
    },

    // ── Additional Info ────────────────────────────────
    specifications: {
      type: Map,
      of: String,
      // Flexible key-value pairs
      // Example for a phone:
      // { "Screen Size": "6.1 inch", "RAM": "8GB", "Storage": "256GB" }
    },

    // ── Who created/updated this product ──────────────
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      // Links to the admin user who added this product
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    // Auto adds createdAt and updatedAt
  }
)

// ─────────────────────────────────────────────────────
// INDEXES — make queries faster
// ─────────────────────────────────────────────────────

// Text index for search — allows searching by name, description, brand
productSchema.index({ name: 'text', description: 'text', brand: 'text' })

// Compound index for filtering products
// Example query: "show me all Electronics under ₹50,000 sorted by price"
productSchema.index({ category: 1, price: 1 })

// Index for sorting by latest/popular
productSchema.index({ createdAt: -1 })
productSchema.index({ 'ratings.average': -1 })

// Unique index on slug
productSchema.index({ slug: 1 }, { unique: true })

// ─────────────────────────────────────────────────────
// MIDDLEWARE — auto-generate slug before saving
// ─────────────────────────────────────────────────────

productSchema.pre('save', function () {
  // Only generate slug if name was modified
  if (this.isModified('name')) {
    // Convert "Apple iPhone 15 Pro Max" → "apple-iphone-15-pro-max"
    this.slug = this.name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // remove special characters
      .replace(/\s+/g, '-')      // replace spaces with hyphens
      .replace(/-+/g, '-')       // replace multiple hyphens with single
  }
})

// ─────────────────────────────────────────────────────
// VIRTUAL FIELD — calculated on the fly, not stored
// ─────────────────────────────────────────────────────

// Calculate discount percentage
// This doesn't store in DB — it's calculated when you fetch the product
productSchema.virtual('discountPercentage').get(function () {
  if (this.discountPrice > 0 && this.price > 0) {
    return Math.round(((this.price - this.discountPrice) / this.price) * 100)
  }
  return 0
})

// Make virtuals show up in JSON responses
productSchema.set('toJSON', { virtuals: true })
productSchema.set('toObject', { virtuals: true })

const Product = mongoose.model('Product', productSchema)

export default Product