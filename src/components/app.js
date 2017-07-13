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

  <button @click="toggleFirst">Toggle First Condition</button>
  <button @click="toggleSecond">Toggle Second Condition</button>
  <div>
    <img style="height:100px" @src="getSrc">
    <button @click="changeImgSrc">Change Image</button>
  </div>
  <div @if="first" @for="user in users" style="border: 1px solid green">
    <div @text="user.id"></div>
    <div @text="user.name"></div>
    <div @text="user.pantone_value"></div>
  </div>
  <button @click="getUsers">Get Users API</button>
  <button @click="removeUsers">Remove Users</button>
  <div @text="city"></div>
  <example id="blah" name="blah" @click="logMessage">
    <div @text="city"></div>
    <div>Arya</div>
  </example>

  <router-view></router-view>
  <example ref="lolref" fnFromProps="fnAsProp" number="50">
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
  },

  data: function() {
    return {
      userInfo: null,
      users: [{name: 'Arya', id: '12345'}, {name: 'Bob', id: '54321'}],
      rando: this.$bindState('rando'),
      first: true,
      second: false,
      src: 'http://res.cloudinary.com/taapesh/image/upload/v1473863792/cat.gif',
      sources: [
        'http://res.cloudinary.com/taapesh/image/upload/v1473863792/cat.gif',
        'https://s-media-cache-ak0.pinimg.com/originals/ac/5d/fd/ac5dfde5520e6b7ad52711fe31817f22.jpg'
      ],
      srcIndex: 0,
      name: {
        firstName: 'Arya',
        lastName: 'Mohades'
      },
      city: this.$bindState('auth.user.location'),
    }
  },

  methods: function() {
    return {
      changeImgSrc: function(e) {
        this.$setData('srcIndex', 1 - this.srcIndex)
      },

      getSrc: this.$bindData('srcIndex', function(idx) {
        return this.sources[idx]
      }),

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

      changeRandomValue: function() {
        Volt.setState('randomValue', Math.random())
      },

      logMessage: function(e) {
        this.$action('logMessage', 'Hello ' + this.name.firstName)
      },

      getGreeting: this.$bindData('name', function(name) {
        return 'Hello ' + name + '!'
      }),

      fullName: this.$bindData(['userInfo.first_name', 'userInfo.last_name'],
        function(firstName, lastName) {
          if (firstName && lastName) {
            return firstName + ' ' + lastName
          }
        }
      ),

      getUser: this.$request('getUser', {
        params: {
          id: 1
        },
        query: {
          q: 'hello'
        },
        success: function(res) {
          this.$setData('userInfo', res.data.data)
        }
      }),

      getUsers: this.$request('getUsers', {
          success: function(res) {
            console.log('Success', res)
            this.$setData('users', res.data.data)
          },
          error: function(err) {
            console.log('Error', err)
          }
        }
      ),

      removeUsers: function(e) {
        this.$setData('users', null)
      }
    }
  }
})
