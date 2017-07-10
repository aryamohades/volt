Volt.template('another', `
<div>
  <span @text="value"></span>
  <button @click="changeValue">Change Random Value</button>
</div>
`)

Volt.component('another', {
  render: 'another',
  tagName: 'another',

  data: function() {
    return {
      message: 'Hi there',
      value: 'Value: ' + Math.random()
    }
  },

  methods: function() {
    return {
      changeValue: function() {
        this.$setData('value', 'New value: ' + Math.random())
      }
    }
  }
})
