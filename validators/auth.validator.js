import { body, validationResult } from 'express-validator'

// ─────────────────────────────────────────────────────
// WHAT IS VALIDATION AND WHY DO WE NEED IT?
// ─────────────────────────────────────────────────────

// Imagine a user sends this to your register API:
// { name: "", email: "notanemail", password: "123" }
//
// Without validation — this hits your database and either:
// 1. Saves garbage data into MongoDB
// 2. Crashes with a confusing Mongoose error
//
// With validation — you catch it BEFORE it touches the database
// and send back a clear error like:
// "Email must be valid"
// "Password must be at least 6 characters"
//
// VALIDATION HAPPENS IN TWO PLACES:
// 1. Frontend — instant feedback as user types (React Hook Form + Zod)
// 2. Backend  — this file — final security check before database
//
// WHY BOTH?
// Frontend validation can be bypassed — anyone can use Postman
// to send bad data directly to your API, skipping React entirely
// Backend validation is the last line of defense

// ─────────────────────────────────────────────────────
// HOW express-validator WORKS:
// ─────────────────────────────────────────────────────
// Step 1 — define rules using body('fieldName').rule()
// Step 2 — attach rules to a route as middleware array
// Step 3 — inside controller call validationResult(req)
//          to check if any rules were broken
// Step 4 — if errors exist, send them back to client
// Step 5 — if no errors, continue to business logic

// ─────────────────────────────────────────────────────
// REGISTER VALIDATOR
// Checks data when user tries to create a new account
// ─────────────────────────────────────────────────────
export const validateRegister = [
  // body('name') — checks the 'name' field in req.body
  body('name')
    .trim()                          // removes leading/trailing spaces first
    .notEmpty()                      // fails if empty string or missing
    .withMessage('Name is required') // error message if notEmpty fails
    .isLength({ min: 2, max: 50 })   // must be between 2 and 50 characters
    .withMessage('Name must be between 2 and 50 characters'),

  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()                       // checks valid email format
    .withMessage('Please enter a valid email')
    .normalizeEmail(),               // converts "John@Gmail.COM" → "john@gmail.com"

  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase and a number'),
    // example: "Password1" passes, "password" fails

  body('confirmPassword')
    .notEmpty()
    .withMessage('Please confirm your password')
    .custom((value, { req }) => {
      // custom validator — compare confirmPassword with password
      // value = what user typed in confirmPassword field
      // req.body.password = what user typed in password field
      if (value !== req.body.password) {
        throw new Error('Passwords do not match')
      }
      return true  // validation passed
    }),
]

// ─────────────────────────────────────────────────────
// LOGIN VALIDATOR
// Checks data when user tries to log in
// Much simpler — just needs email and password
// ─────────────────────────────────────────────────────
export const validateLogin = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please enter a valid email')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('Password is required'),
    // Note: no length check here — if password is wrong,
    // we let the controller handle it with "Invalid credentials"
    // We don't want to hint that their password is "too short"
]

// ─────────────────────────────────────────────────────
// VALIDATE — the middleware that CHECKS the results
// This runs AFTER the rules above, BEFORE the controller
// ─────────────────────────────────────────────────────
export const validate = (req, res, next) => {
  // validationResult(req) collects all validation errors
  const errors = validationResult(req)

  // isEmpty() returns true if NO errors found
  if (errors.isEmpty()) {
    return next()  // no errors — continue to controller
  }

  // errors exist — format them nicely and send back
  const extractedErrors = errors.array().map((err) => ({
    field: err.path,    // which field failed e.g. "email"
    message: err.msg    // what went wrong e.g. "Please enter a valid email"
  }))

  // 422 = Unprocessable Entity — means data format is wrong
  return res.status(422).json({
    success: false,
    message: 'Validation failed',
    errors: extractedErrors
    // example response:
    // {
    //   success: false,
    //   message: "Validation failed",
    //   errors: [
    //     { field: "email", message: "Please enter a valid email" },
    //     { field: "password", message: "Password must be at least 6 characters" }
    //   ]
    // }
  })
}