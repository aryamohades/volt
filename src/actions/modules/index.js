Volt.action('logMessage', message => {
  console.log('Logging message:', message)
})

Volt.action('getUserDetail', id => {
  Volt.makeRequest('userDetail', {
    params: {
      id: id
    },
    query: {

    },
    headers: {

    },
    before: () => console.log('before get user detail'),
    after: () => console.log('after get user detail'),
    success: () => console.log('get user detail success'),
    error: () => console.log('get user detail error')
  })
})
