require('dotenv').config()

let config = {
  "main": "main.js",
  "path": "./dist",
  "template": {
    "name": "index.html",
    "stylesheets": [

    ]
  },
  "jsBundle": {
    "name": "app.[hash].js",
    "hash": false
  },
  "minifyHtml": {
    "enabled": true,
    "options": {
      "removeComments": true,
      "preserveLineBreaks": false,
      "minifyJS": true,
      "minifyCSS": true,
      "caseSensitive": true,
      "collapseInlineTagWhitespace": true,
      "collapseWhitespace": true,
      "removeAttributeQuotes": true,
      "removeRedundantAttributes": true,
      "removeOptionalTags": true
    }
  },
  "minifyJs": {
    "enabled": false,
    "options": {

    }
  },
  "minifyCss": {
    "enabled": true,
    "options": {

    }
  },
  transpileJs: false,
  babelConfig: {
    "presets": [
      [
        "env", {
          "targets": {
            "browsers": ["last 2 versions"]
          }
        }
      ]
    ]
  }
}

module.exports = config