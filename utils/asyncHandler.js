// asyncHandler is a wrapper function that catches errors in async routes
// Without this, if an error happens inside async code, Express won't catch it
// and your server will crash silently

// HOW IT WORKS:
// Instead of writing try/catch in every single controller function,
// you wrap the function with asyncHandler and it handles errors automatically

// WITHOUT asyncHandler — you'd write this in every controller:
// async (req, res) => {
//   try {
//     const data = await Something.find()
//     res.json(data)
//   } catch (error) {
//     next(error)  // you'd have to remember this every time
//   }
// }

// WITH asyncHandler — clean and simple:
// asyncHandler(async (req, res) => {
//   const data = await Something.find()  // if this fails, error auto-caught
//   res.json(data)
// })


const asyncHandler = (fn) => (req, res, next) => {
  // fn is your controller function
  // Promise.resolve wraps it so even non-promise errors are caught
  // .catch(next) sends any error to Express error middleware automatically
  Promise.resolve(fn(req, res, next)).catch(next)
}

export default asyncHandler