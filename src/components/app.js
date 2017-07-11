Volt.request('getUsers', {
  endpoint: '/users',
  method: 'GET',
  requiresAuth: true
})

Volt.request('getUser', {
  endpoint: '/users/:id',
  method: 'GET',
  requiresAuth: true
})

// Define template
Volt.template('app', `
<div class="page">
  <div @text="fullName"></div>
  <button @click="getUser">Get User API</button>
  <div @text="rando"></div>
  <button @click="changeRando">Change Rando</button>
  <div><span>First Condition: </span><span @text="first"></span></div>
  <div><span>Second Condition: </span><span @text="second"></span></div>
  <div @if="first">
    <div>First: If</div>
  </div>
  <div @else-if="second">
    <div>Second: Else If</div>
  </div>
  <div @else>
    <div>Third: Else</div>
  </div>
  <button @click="toggleFirst">Toggle First Condition</button>
  <button @click="toggleSecond">Toggle Second Condition</button>
  <div>
    <img style="height:100px" @src="src">
    <button @click="changeImg">Change Image</button>
  </div>
  <div @text="users"></div>
  <button @click="getUsers">Get Users API</button>
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
  <div>Nested Loop Test</div>
  <div @for="num in numbers" style="border:1px solid red">
    <example @for="val in num.arr" number="val">
      <span>Slot Content: </span><span @text="num.message"></span>
    </example>
  </div>
  <example @ref="lolref" fnFromProps="fnAsProp" number="50">
    <another></another>
    <button @click="logMessage">Log Message</button>
  </example>
</div>
`)

Volt.component('app', {
  render: 'app',  // Render the 'app' template

  // Components that are children of this component
  components: [
    'example',
    'another'
  ],

  ready: function() {
    console.log('App mounted', this.name)
    console.log('REF', this.$refs.lolref)
  },

  data: function() {
    return {
      userInfo: null,
      rando: this.$bindState('rando'),
      first: true,
      second: false,
      src: 'http://res.cloudinary.com/taapesh/image/upload/v1473863792/cat.gif',
      sources: [
        'http://res.cloudinary.com/taapesh/image/upload/v1473863792/cat.gif',
        'https://s-media-cache-ak0.pinimg.com/originals/ac/5d/fd/ac5dfde5520e6b7ad52711fe31817f22.jpg'
      ],
      srcIndex: 0,
      loadingText: '',
      users: '',
      name: {
        firstName: 'Arya',
        lastName: 'Mohades'
      },
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
      fnAsProp: function() {
        console.log('Ayyy lol im a function from props')
      },
      changeRando: function(e) {
        this.$setState('rando', Math.random())
      },

      toggleFirst: function(e) {
        this.$setData('first', !this.first)
      },

      toggleSecond: function(e) {
        this.$setData('second', !this.second)
      },

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
            message: 'This is a message demonstrating nested loop scope',
            value: 1,
            arr: [10, 20, 30, 40, 50]
          },
          {
            message: 'Hellohellohellohello',
            value: 2,
            arr: [5, 10, 15, 20, 25]
          },
          {
            message: 'yayayayayayaya',
            value: 3,
            arr: [10, 9, 8, 7, 6]
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
      getGreeting: this.$bindData('name', function(name) {
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

      getUser: this.$request('getUser', {
        params: {
          id: 1
        },
        success: function(res) {
          this.$setData('userInfo', res.data.data)
        }
      }),

      fullName: this.$bindData(['userInfo.first_name', 'userInfo.last_name'],
        function(firstName, lastName) {
          if (firstName && lastName) {
            return firstName + ' ' + lastName
          }
        }
      ),

      getUsers: this.$request('getUsers', {
          success: function(res) {
            console.log('Success', res)
            this.$setData('users', JSON.stringify(res.data.data[0]))
          },
          error: function(err) {
            console.log('Error', err)
          }
        }
      )
    }
  }
})
