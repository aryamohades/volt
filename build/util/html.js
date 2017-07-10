const cheerio  = require('cheerio')

const voidElements = new Set([
  'meta',
  'link',
  'img',
  'input'
])

class HtmlBuilder {
  constructor() {
    this.$ = cheerio.load('<!doctype html>')
    this.$('html').attr('lang', 'en')
    this.head = this.$('head')
    this.body = this.$('body')

    this.addMeta()

    this.createAppRoot()
  }

  addMeta() {
    this.create('meta', { charset: 'utf-8' }).appendTo(this.head)

    this.create('title').appendTo(this.head)

    this.create('meta', {
      name: 'viewport',
      content: 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no'
    }).appendTo(this.head)

    this.create('meta', {
      name: 'description',
      content: ''
    }).appendTo(this.head)

    this.create('meta', {
      name: 'keywords',
      content: ''
    }).appendTo(this.head)
  }

  create(tagName, opts) {
    opts = opts || {}
    const tag = this.$(this.createTag(tagName))
    Object.keys(opts).forEach(key => {
      tag.attr(key, opts[key])
    })

    return tag
  }

  toHtml() {
    return this.$.html()
  }

  createTag(tag) {
    if (voidElements.has(tag)) {
      return '<' + tag + '>' 
    } else {
      return '<' + tag + '></' + tag + '>'
    }
  }

  createAppRoot() {
    this.create('div', { id: 'app'}).appendTo(this.body)
  }

  addStylesheet(href) {
    this.create('link', {
      rel: 'stylesheet',
      type: 'text/css',
      href: href
    }).appendTo(this.head)
  }

  addScript(src) {
    this.create('script', {
      src: src
    }).appendTo(this.body)
  }
}

module.exports = HtmlBuilder
