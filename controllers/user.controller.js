import User from '../models/User.model.js'
import asyncHandler from '../utils/asyncHandler.js'
import AppError from '../utils/AppError.js'

// ─── Update profile ────────────────────────────────────
export const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone } = req.body

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { name, phone },
    { new: true, runValidators: true }
  )

  res.status(200).json({ success: true, user })
})

// ─── Change password ───────────────────────────────────
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body

  const user = await User.findById(req.user._id).select('+password')

  const isMatch = await user.comparePassword(currentPassword)
  if (!isMatch) {
    throw new AppError('Current password is incorrect', 401)
  }

  user.password = newPassword
  await user.save()

  res.status(200).json({
    success: true,
    message: 'Password changed successfully',
  })
})

// ─── Add address ───────────────────────────────────────
export const addAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)

  user.addresses.push(req.body)
  await user.save({ validateBeforeSave: false })

  res.status(200).json({
    success: true,
    addresses: user.addresses,
  })
})

// ─── Update address ────────────────────────────────────
export const updateAddress = asyncHandler(async (req, res) => {
  const { idx } = req.params
  const user = await User.findById(req.user._id)

  if (!user.addresses[idx]) {
    throw new AppError('Address not found', 404)
  }

  user.addresses[idx] = { ...user.addresses[idx].toObject(), ...req.body }
  await user.save({ validateBeforeSave: false })

  res.status(200).json({
    success: true,
    addresses: user.addresses,
  })
})

// ─── Delete address ────────────────────────────────────
export const deleteAddress = asyncHandler(async (req, res) => {
  const { idx } = req.params
  const user = await User.findById(req.user._id)

  if (!user.addresses[idx]) {
    throw new AppError('Address not found', 404)
  }

  user.addresses.splice(idx, 1)
  await user.save({ validateBeforeSave: false })

  res.status(200).json({
    success: true,
    addresses: user.addresses,
  })
})