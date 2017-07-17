Volt.template('another', `
<div>
  <div>My city:</div>
  <div @text="city"></div>
  <span @text="value"></span>
  <button @click="changeValue">Change Random Value</button>
</div>
`)

Volt.component('another', {
  render: 'another',
  tagName: 'another',

  props: {
    city: {
      type: Volt.PropTypes.String,
      default: 'Nowhere'
    }
  },

  data: function() {
    return {
      city: this.$props.city,
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
