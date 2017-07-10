Volt.template('example', `
<div>
  <span>Number: </span><span @text="number"></span>
  <slot></slot>
</div>
`)

Volt.component('example', {
  render: 'example',
  tagName: 'example',

  components: [
  ],

  props: {
    number: {
      type: Volt.PropTypes.Number,
      default: 0
    },
    fnFromProps: {
      type: Volt.PropTypes.Function,
      default: function() {
        console.log('Im the default props function')
      }
    }
  },

  ready: function() {
    // this.$props.fnFromProps()
  },

  data: function() {
    return {
      number: this.$props.number,
      comments: [
        {
          user: 'Arya',
          message: 'Nice'
        },
        {
          user: 'Bob',
          message: 'Lol noob'
        }
      ]
    }
  },

  methods: function() {
    return {

    }
  }
})
