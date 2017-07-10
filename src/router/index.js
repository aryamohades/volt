Volt.action('requireAuth', (from, to, next) => {
  console.log('REQUIRE AUTH')
  next()
})

Volt.beforeRoute((from, to, next) => {
  console.log('BEFORE EACH')
  next()
})
