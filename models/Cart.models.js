import mongoose from 'mongoose'

// ─────────────────────────────────────────────────────
// CART SCHEMA
// Each user has ONE cart with multiple items
// ─────────────────────────────────────────────────────

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      // Each user can only have ONE cart
      // If you try to create a second cart for the same user, MongoDB will throw error
    },

    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
          required: true,
        },

        quantity: {
          type: Number,
          required: true,
          min: [1, 'Quantity cannot be less than 1'],
          default: 1,
        },

        // We store the price at the time of adding to cart
        // This way if the product price changes later,
        // the cart still shows the original price
        // (until user refreshes the cart)
        price: {
          type: Number,
          required: true,
        },

        // Store product details snapshot
        // In case product gets deleted/deactivated later,
        // user can still see what was in their cart
        name: {
          type: String,
          required: true,
        },

        image: {
          type: String,
          required: true,
        },

        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Coupon code applied to cart
    coupon: {
      code: String,
      discount: Number, // percentage or fixed amount
      discountType: {
        type: String,
        enum: ['percentage', 'fixed'],
      },
    },

    // Total price calculations
    itemsTotal: {
      type: Number,
      default: 0,
      // Sum of all (price × quantity)
    },

    discount: {
      type: Number,
      default: 0,
      // Discount from coupon
    },

    total: {
      type: Number,
      default: 0,
      // itemsTotal - discount
    },
  },
  {
    timestamps: true,
  }
)

// ─────────────────────────────────────────────────────
// METHODS — calculate cart totals
// ─────────────────────────────────────────────────────

cartSchema.methods.calculateTotals = function () {
  // Calculate items total
  this.itemsTotal = this.items.reduce((total, item) => {
    return total + item.price * item.quantity
  }, 0)

  // Apply coupon discount if exists
  if (this.coupon && this.coupon.code) {
    if (this.coupon.discountType === 'percentage') {
      this.discount = (this.itemsTotal * this.coupon.discount) / 100
    } else {
      this.discount = this.coupon.discount
    }
  } else {
    this.discount = 0
  }

  // Calculate final total
  this.total = this.itemsTotal - this.discount

  // Ensure total never goes below 0
  if (this.total < 0) {
    this.total = 0
  }
}

// ─────────────────────────────────────────────────────
// MIDDLEWARE — recalculate totals before saving
// ─────────────────────────────────────────────────────

cartSchema.pre('save', function () {
  this.calculateTotals()
})

const Cart = mongoose.model('Cart', cartSchema)

export default Cart