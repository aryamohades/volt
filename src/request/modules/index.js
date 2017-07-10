// Validator to be used somewhere else, for example, on a @blur event
// Returns { valid: boolean, errors: [] }
// Can define validator with an object to combine multiple validators
Volt.validator('validateEmail', {
  validators: [
    Volt.validate('required'),
    Volt.validate('isEmail'),
    Volt.validate('customValidator')
  ],
  validateAll: false
})

// OR
// Define a custom validator with a function
Volt.validator('customValidator', value => {
  // Check if value is valid

  // Return object with optional message
  return {
    valid: true,
    message: 'That value is valid'  // optional
  }
  // OR: return { valid: false, error: 'An error message' }
  // OR: just return true / false
})


// Do not have to put validation here
// Could put validation in a @change or @blur listener
// This way, changes can be validated as you type or edit, before hitting submit
// Define validator on fields here
Volt.request('login', {
  endpoint: '/auth/login',
  method: 'POST',
})

Volt.request('userDetail', {
  endpoint: '/user/:id',
  method: 'GET',
  requiresAuth: true
})
