Volt.state('auth', {
  isAuthenticated: false,
  token: null,
  user: {
    name: 'Arya',
    location: 'Austin'
  },
  loading: false
})

Volt.sync('auth', [
  'isAuthenticated',
  'user.name',
  'token'
])

Volt.state({
  randomValue: Math.random(),
  counter: 1
})

Volt.sync('randomValue')
