Volt.template('example', `
<div>
  <span>Number: </span><span @text="number"></span>
  <slot></slot>
</div>
`)

Volt.component('example', {
  render: 'example',
  tagName: 'example',

  props: {
    number: {
      type: Volt.PropTypes.Number,
      default: 0
    },
    fnFromProps: {
      type: Volt.PropTypes.Function,
      default: function() {
        console.log('default props function')
      }
    }
  },

  data: function() {
    return {
      number: this.$props.number,
    }
  },

  methods: function() {
    return {

    }
  }
})
