Volt.template('dbmonster', `
<div>
  <div>DBMONSTER</div>
  <div @for="x in a">
    <div @for="b in x">
      <div @for="y in b" @text="y"></div>
    </div>
  </div>
</div>
`)

Volt.component('dbmonster', {
  render: 'dbmonster',
  tagName: 'dbmonster',

  props: {
  },

  ready() {
    const a = []

    for (let i = 0; i < 10; ++i) {
      const b = []

      for (let j = 0; j < 5; ++j) {
        const c = []

        for (let k = 0; k < 5; ++k) {
          c.push(k)
        }

        b.push(c)
      }

      a.push(b)
    }

    this.$setData('a', a)
  },

  data() {
    return {
      a: []
    }
  },

  methods() {
    return {
      
    }
  }
})
