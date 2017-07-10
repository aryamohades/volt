Volt.request('loginTest', {
  endpoint: '/users',
  method: 'GET',
  requiresAuth: true
})

// Define template
Volt.template('app', `
<div class="page">
  <div @if="condition">Hello</div>
  <img style="height:100px" @src="src">
  <button @click="changeImg">Change Image</button>
  <div @text="response"></div>
  <button @click="apiTest">API Test</button>
  <span>Function text: </span>
  <span @text="fnText"></span>
  <div @text="city"></div>
  <example id="blah" name="blah" @click="logMessage" number="100">
    <div @text="city"></div>
    <div>Arya</div>
  </example>
  <example number="5" @for="post in posts">
    <div @text="post.title"></div>
    <div @text="post.content"></div>
  </example>
  <button @click="another">Method Test</button>
  <router-view></router-view>
  <div @for="num in numbers">
    <span @for="val in values" @text="val"></span>
    <span>City: </span>
    <span @text="city"></span>
    <span @text="name"></span>
    <span @text="num.value"></span>
    <span @for="val in num.arr" @text="val">
      <example number="val"></example>
    </span>
  </div>
</div>
`)

Volt.component('app', {
  render: 'app',  // Render the 'app' template

  // Components that are children of this component
  components: [
    'example'
  ],

  ready: function() {
    console.log('App mounted')
  },

  data: function() {
    return {
      condition: true,
      src: 'http://res.cloudinary.com/taapesh/image/upload/v1473863792/cat.gif',
      sources: [
        'http://res.cloudinary.com/taapesh/image/upload/v1473863792/cat.gif',
        'https://s-media-cache-ak0.pinimg.com/originals/ac/5d/fd/ac5dfde5520e6b7ad52711fe31817f22.jpg'
      ],
      srcIndex: 0,
      loadingText: '',
      response: '',
      name: 'Arya',
      posts: [
        {
          title: 'Post title',
          content: 'Post content'
        },
        {
          title: 'Another post here',
          content: 'Even more content'
        }
      ],
      message: 'Hello there',
      city: this.$bindState('auth.user.location'),
      user: {
        location: this.$bindState('auth.user.location'),
        email: 'test@test.com'
      }
    }
  },

  methods: function() {
    return {
      changeImg: function(e) {
        this.srcIndex = 1 - this.srcIndex
        var src = this.sources[this.srcIndex]
        this.$setData('src', src)
      },
      fnText: function() {
        return 'Hey there'
      },
      values: function() {
        return [10, 4, 3, 2, 1]
      },
      numbers: function() {
        return [
          {
            value: 1,
            arr: [10, 20, 30, 40, 50]
          },
          {
            value: 2,
            arr: [5, 10, 15, 20, 25]
          }
        ]
      },
      changeFullName: function() {
        this.$setData('name', {
          firstName: 'Alice',
          lastName: 'Jane'
        })
      },

      changeState: function() {
        Volt.setState('auth.user.location', 'California')
      },

      changeRandomValue: function() {
        Volt.setState('randomValue', Math.random())
      },

      logMessage: function(e) {
        this.$action('logMessage', this.message)
      },

      another: function() {
        console.log('MESSAGE:', this.message)
        this.anotherOne()
      },

      anotherOne: function() {
        console.log('Another component method!!!!')
      },

      // If an element depends on this
      // it will not change if first name changes
      // because bindData was not used
      getStaticGreeting: function() {
        return 'Hello ' + this.firstName + '!'
      },

      // Example of bind data with a single field
      // bad example, don't do this, but it shows how
      // you can have reactive functions that only run
      // if the props that it depends on change
      getGreeting: this.$bindData('firstName', function(name) {
        return 'Hello ' + name + '!'
      }),

      // Example of bind data with multiple properties
      getFullName: this.$bindData(['firstName','lastName'],
        function(firstName, lastName) {
          return firstName + ' ' + lastName
        }
      ),

      // // Bind state with function example
      bindStateFnExample: this.$bindState('randomValue', function(value) {
        return 'Number: ' + value
      }),

      // Example of binding state and data in a single function
      // use the generic this.bind method and pass in an object with
      // data and state fields, as well as the function
      stateAndData: this.$bind(
        {
          state: 'counter',
          data: ['firstName', 'user.email']
        },
        function(counter, firstName, email) {
          return counter + firstName + email
        }
      ),

      changeName: function() {
        this.$setData('firstName', 'Bob')
      },

      apiTest: this.$request('loginTest', {
          before: function() {
            this.$setData('loadingText', 'loading...')
          },
          after: function() {
            console.log('After Request')
            this.$setData('loadingText', '')
          },
          success: function(res) {
            console.log('Success', res)
            this.$setData('response', JSON.stringify(res.data.data[0]))
          },
          error: function(err) {
            console.log('Error', err)
          },
          data: {
            email: this.email,
            password: this.password
          }
        }
      )
    }
  }
})
