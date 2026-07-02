// AppError is a custom error class
// JavaScript has a built-in Error class — we extend it to add extra info
// Specifically we add a "statusCode" so we can send the right HTTP status

// WHY DO WE NEED THIS?
// When something goes wrong, we want to send back:
// - A status code (404 = not found, 401 = unauthorized, 400 = bad request)
// - A message ("Product not found", "Invalid password")
// - A flag saying this is an "operational" error (expected) vs a bug

// EXAMPLE USAGE in a controller:
// if (!user) throw new AppError('User not found', 404)
// if (!token) throw new AppError('Not authorized', 401)

class AppError extends Error {
  constructor(message, statusCode) {
    // super() calls the parent Error class constructor
    // this sets this.message = message
    super(message)

    this.statusCode = statusCode

    // 4xx errors = client's fault (wrong input, not authorized)
    // 5xx errors = server's fault (bug, database down)
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error'

    // isOperational = true means this is an expected error we threw on purpose
    // isOperational = false means it's a real bug (unhandled crash)
    this.isOperational = true

    // Captures the stack trace — shows exactly which line threw the error
    // Useful for debugging
    Error.captureStackTrace(this, this.constructor)
  }
}

export default AppError