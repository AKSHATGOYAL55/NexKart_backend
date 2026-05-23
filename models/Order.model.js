import mongoose from 'mongoose'

// ─────────────────────────────────────────────────────
// ORDER SCHEMA
// Created when user completes checkout
// ─────────────────────────────────────────────────────

const orderSchema = new mongoose.Schema(
  {
    // ── Who placed the order ──────────────────────────
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // ── Order Items ────────────────────────────────────
    // We COPY product details at time of order
    // Even if product is deleted later, order shows what was bought
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
          required: true,
        },

        name: {
          type: String,
          required: true,
        },

        slug: {
          type: String,
          required: true,
        },

        image: {
          type: String,
          required: true,
        },

        price: {
          type: Number,
          required: true,
          // Price at time of purchase — locked in forever
        },

        quantity: {
          type: Number,
          required: true,
          min: 1,
        },

        // Total for this line item = price × quantity
        total: {
          type: Number,
          required: true,
        },
      },
    ],

    // ── Shipping Address ───────────────────────────────
    // Snapshot of address at time of order
    // User might change their saved addresses later
    shippingAddress: {
      fullName: {
        type: String,
        required: true,
      },
      phone: {
        type: String,
        required: true,
      },
      street: {
        type: String,
        required: true,
      },
      city: {
        type: String,
        required: true,
      },
      state: {
        type: String,
        required: true,
      },
      pincode: {
        type: String,
        required: true,
      },
    },

    // ── Payment Details ────────────────────────────────
    paymentMethod: {
      type: String,
      required: true,
      enum: ['card', 'upi', 'netbanking', 'cod'],
      // cod = Cash on Delivery
    },

    paymentResult: {
      id: String,        // Stripe payment intent ID
      status: String,    // succeeded, pending, failed
      updateTime: Date,
      emailAddress: String,
    },

    // ── Price Breakdown ────────────────────────────────
    itemsPrice: {
      type: Number,
      required: true,
      default: 0,
      // Sum of all items
    },

    taxPrice: {
      type: Number,
      required: true,
      default: 0,
      // GST 18% in India
    },

    shippingPrice: {
      type: Number,
      required: true,
      default: 0,
      // Free shipping over ₹500, else ₹50
    },

    discountPrice: {
      type: Number,
      default: 0,
      // Coupon discount applied
    },

    totalPrice: {
      type: Number,
      required: true,
      default: 0,
      // itemsPrice + taxPrice + shippingPrice - discountPrice
    },

    // ── Order Status ───────────────────────────────────
    isPaid: {
      type: Boolean,
      required: true,
      default: false,
    },

    paidAt: {
      type: Date,
    },

    isDelivered: {
      type: Boolean,
      required: true,
      default: false,
    },

    deliveredAt: {
      type: Date,
    },

    status: {
      type: String,
      required: true,
      enum: [
        'pending',      // just created, payment not confirmed
        'processing',   // payment received, preparing to ship
        'shipped',      // on the way
        'delivered',    // completed successfully
        'cancelled',    // user or admin cancelled
        'refunded',     // money returned
      ],
      default: 'pending',
    },

    // ── Tracking ───────────────────────────────────────
    trackingNumber: {
      type: String,
    },

    carrier: {
      type: String,
      // Example: "Blue Dart", "Delhivery", "India Post"
    },

    // ── Coupon Applied ─────────────────────────────────
    couponCode: {
      type: String,
    },

    // ── Notes ──────────────────────────────────────────
    orderNotes: {
      type: String,
      maxLength: 500,
    },

    // ── Cancellation ───────────────────────────────────
    cancelledAt: {
      type: Date,
    },

    cancelReason: {
      type: String,
    },
  },
  {
    timestamps: true,
    // createdAt = when order was placed
    // updatedAt = last status change
  }
)

// ─────────────────────────────────────────────────────
// INDEXES — query orders efficiently
// ─────────────────────────────────────────────────────

// User's orders sorted by date
orderSchema.index({ user: 1, createdAt: -1 })

// Admin filter by status
orderSchema.index({ status: 1 })

// Admin filter by date range
orderSchema.index({ createdAt: -1 })

const Order = mongoose.model('Order', orderSchema)

export default Order