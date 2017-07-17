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
  <button @click="goToUserDetail">Go To User Detail</button>
  <div @ref="lol" @text="modifiedName(name.firstName)"></div>
  <div>
    <img style="height:100px" @src="getSrc">
    <button @click="changeImgSrc">Change Image</button>
  </div>
  <div @text="fullName"></div>
  <button @click="getUser">Get User API</button>
  <div @text="rando"></div>
  <button @click="changeRando">Change Rando</button>

  <div><span>First Condition: </span><span @text="first"></span></div>
  <div><span>Second Condition: </span><span @text="second"></span></div>

  <button @click="toggleFirst">Toggle First Condition</button>
  <button @click="toggleSecond">Toggle Second Condition</button>
  
  <div @if="first" @for="user in users" style="border: 1px solid green">
    <div>Hello</div>
    <div @text="user.id"></div>
    <div @text="user.first_name"></div>
    <div @text="user.last_name"></div>
    <img @src="user.avatar">
    <div @for="post in user.posts" @text="post"></div>
    <button @click="methodWithArgs(user.first_name)">Method with args</button>
  </div>
  <div @else-if="second" @text="user.first_name" @for="user in users" style="border: 1px solid purple"></div>
  <div @else>hey</div>
  <button @click="getUsers">Get Users API</button>
  <button @click="removeUsers">Remove Users</button>
  <div @text="city"></div>
  <example id="blah" name="blah" @click="logMessage">
    <div @text="city"></div>
    <div>Arya</div>
  </example>

  <example @ref="lolref" fnFromProps="fnAsProp" number="50">
    <another></another>
    <button @click="logMessage">Log Message</button>
  </example>
  <div router-view></div>
<!--   <div>Checkbox</div>
  <input type="checkbox" value="checkbox value" @model="checked"> -->
</div>
`)

Volt.component('app', {
  render: 'app',  // Render the 'app' template

  // Components that are children of this component
  components: [
    'example',
    'another'
  ],

  ready() {
  },

  data() {
    return {
      message: 'Hello there',
      checked: true,
      userInfo: null,
      users: [
        {
          first_name: 'Arya',
          id: '12345',
          posts: [
            'Post one',
            'Post two'
          ]
        },
        {
          first_name: 'Bob',
          id: '54321',
          posts: [
            'This is a post',
            'Another one'
          ]
        }
      ],
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

  methods() {
    return {
      methodWithArgs: name => {
        console.log('Hello ' + name)
      },

      modifiedName: name => {
        return 'Mr. ' + name
      },

      goToUserDetail: (e) => {
        this.$go('userDetail', {
          params: {
            id: 2
          },

          query: {
            q: 'Hello'
          }
        })
      },

      changeImgSrc: (e) => this.$setData('srcIndex', 1 - this.srcIndex),

      getSrc: this.$bindData('srcIndex', idx => this.sources[idx]),

      fnAsProp: () => console.log('Ayyy lol im a function from props'),

      changeRando: e => this.$setState('rando', Math.random()),

      toggleFirst: e => this.$setData('first', !this.first),

      toggleSecond: e => this.$setData('second', !this.second),

      changeRandomValue: () => this.$setState('randomValue', Math.random()),

      logMessage: e => this.$action('logMessage', 'Hello ' + this.city),

      fullName: this.$bindData(['userInfo.first_name', 'userInfo.last_name'],
        (firstName, lastName) => {
          if (firstName && lastName) {
            return firstName + ' ' + lastName
          }
        }
      ),

      getUser: () => {
        this.$request('getUser', {
          params: {
            id: 1
          },
          query: {
            q: 'hello'
          },
          success: res => this.$setData('userInfo', res.data.data)
        })
      },

      getUsers: () => {
        this.$request('getUsers', {
          success: res => {
            console.log('Success', res)
            this.$setData('users', res.data.data)
          },
          error: err => {
            console.log('Error', err)
          }
        })
      },

      removeUsers: e => this.$setData('users', null)
    }
  }
})
