Volt.template('userDetail', `
<div>
  <div>User Detail View</div>
  <img @src="user.avatar">
  <div @text="user.id"></div>
  <div @text="user.first_name"></div>
  <div @text="user.last_name"></div>
</div>
`)

Volt.component('userDetail', {
  render: 'userDetail',
  
  ready() {
    this.getUser()
  },

  data() {
    return {
      user: null
    }
  },

  methods() {
    return {
      getUser: () => {
        const uid = this.$route.params.id

        this.$request('getUser', {
          params: {
            id: uid
          },

          success: res => this.$setData('user', res.data.data)
        })
      }
    }
  }
})