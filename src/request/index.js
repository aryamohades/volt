Volt.set('API_BASE', 'https://reqres.in/api')

Volt.api({
  base: Volt.get('API_BASE')
})

// Before any request, do the following
Volt.beforeRequest(req => {
  // Can add a universal header or anything here
  if (req.requiresAuth) {
    req.headers['Authorization'] = 'JWT ' + Volt.getState('auth.token')
  }
})