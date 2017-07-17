Volt.template('emptyroot', `
<div>
  <div router-view></div>
</div>
`)

Volt.component('emptyroot', {
  render: 'emptyroot',
  tagName: 'emptyroot',

  props: {
  },

  data() {
    return {

    }
  },

  methods() {
    return {
      
    }
  }
})
