import Razorpay from 'razorpay'

// Guard against missing keys
if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  console.warn('⚠️  Razorpay keys not found in .env — payment features disabled')
}

// console.log("KEY ID:", process.env.RAZORPAY_KEY_ID)
// console.log("KEY SECRET:", process.env.RAZORPAY_KEY_SECRET)

// Initialize Razorpay instance with your credentials
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'missing_key',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'missing_secret',
})

export default razorpay