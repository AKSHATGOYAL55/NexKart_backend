import express from 'express'
import {
  updateProfile,
  changePassword,
  addAddress,
  updateAddress,
  deleteAddress,
} from '../controllers/user.controller.js'
import { protect } from '../middleware/auth.middleware.js'

const router = express.Router()

// All routes protected
router.put('/profile', protect, updateProfile)
router.put('/change-password', protect, changePassword)
router.post('/addresses', protect, addAddress)
router.put('/addresses/:idx', protect, updateAddress)
router.delete('/addresses/:idx', protect, deleteAddress)

export default router