Volt.template('looptest', `
<div style="margin-top: 25px">
  <div>Loop Test</div>
</div>
`)

Volt.component('looptest', {
  render: 'looptest',
  tagName: 'looptest',

  components: [
    'another'
  ],
  
  data: function() {
    return {
      posts: [
        {
          title: 'This is a post title',
          content: 'This is post content'
        },
        {
          title: 'Another post',
          content: 'Even more content'
        }
      ]
    }
  },

  methods: function() {
    return {

    }
  }
})
