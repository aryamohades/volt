Volt.route([
  {
    name: 'users',
    path: '/users/:id',
    component: 'userDetail',
    before: 'requireAuth',
    meta: {
      title: 'Home',
      description: 'Home page',
      keywords: [
        'Home page',
        'Another one',
        'hey'
      ]
    }
  },
  {
    name: 'notFound',
    path: '*',
    component: 'NotFound',
    meta: {
      title: 'Page not found'
    }
  }
])
