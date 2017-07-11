const path = require('path')
const cuid = require('cuid')
const babel = require('babel-core')
const UglifyJS = require('uglify-js')
const CleanCSS = require('clean-css')
const postcss = require('postcss')
const autoprefixer = require('autoprefixer')
const minifyHtml = require('html-minifier').minify
const HtmlBuilder = require('./util/html')
const io = require('./util/io')
const config = require('./build.config')

const buildDir = config.path

if (!io.exists(buildDir)) {
  io.createDir(buildDir)
}

let template = config.template

let builder = new HtmlBuilder()

/**
 * Process css text by adding prefixes and minifying
 *
 * @param {string} css The css text to process
 * @returns {Promise}
 */
const processCss = css => {
  return postcss([ autoprefixer ]).process(css).then(result => {
    result.warnings().forEach(warn => {
      console.warn(warn.toString())
    })

    css = result.css

    const minify = config.minifyCss.enabled

    if (minify) {
      const output = new CleanCSS({ level: 2 }).minify(css)
      
      output.warnings.forEach(warn => {
        console.warn(warn)
      })

      css = output.styles
    }

    return css
  })
}

/** 
 * Return file name for bundled js
 * If hash is specified in config, then include hash
 * as part of bundle name.
 * 
 * @returns {string}
 */
const getBundleName = () => {
  let bundleName = config.jsBundle.name

  if (config.jsBundle.hash) {
    const bundleHash = cuid()
    bundleName = bundleName.replace('[hash]', bundleHash)
  } else {
    bundleName = bundleName.replace('[hash]', '')
    const idx = bundleName.indexOf('.')
    bundleName = bundleName.slice(0, idx) + bundleName.slice(idx+1);
  }

  return bundleName
}

/**
 * Add stylesheet links
 */
const addStylesheets = () => {
  for (let s of template.stylesheets) {
    builder.addStylesheet(s)
  }
}

addStylesheets()

const bundleName = getBundleName()

builder.addScript('/' + bundleName)

// TODO: Some html optimization stuff
io.writeFile([buildDir, template.name].join('/'), builder.toHtml())

// Compile core

let coreJs = ''
let srcJs = ''
const voltDir = '/../volt'

const coreFiles = [
  'util.js',
  'props.js',
  'bind.js',
  'dom.js',
  'template.js',
  'state.js',
  'router.js',
  'request.js',
  'action.js',
  'component.js',
  'instance.js'
].map(file => {
  return [voltDir, file].join('/')
}).forEach(file => {
  coreJs += io.readFile(path.join(__dirname, file)) + '\n'
})

coreJs = ";(function() {\n'use strict'\n" + coreJs + "\nwindow.Volt = Volt;\n})();\n"

// Compile source

const srcDir = '/../src'

const dirs = [
  'actions',
  'request',
  'router',
  'state'
].map(dir => {
  return path.join(__dirname, [srcDir, dir].join('/'))
})

// Compile source directory files

dirs.forEach(dir => {
  const files = [
    'constants.js',
    'index.js'
  ]

  files.forEach(file => {
    const filePath = [dir, file].join('/')
    if (io.exists(filePath)) {
      srcJs += io.readFile(filePath) + '\n'
    }
  })
})

// Compile components

io.walkSync(path.join(__dirname, [srcDir, 'components'].join('/'))).forEach(file => {
  if (file.endsWith('.js')) {
    srcJs += io.readFile(file) + '\n'
  }
})

// Compile modules

dirs.map(dir => {
  return path.join(dir, '/modules')
}).forEach(dir => {
  if (io.exists(dir)) {
    io.walkSync(dir).forEach(file => {
      srcJs += io.readFile(file) + '\n'
    })
  }
})

// Add main entry file
srcJs += io.readFile(path.join(__dirname, [srcDir, 'main.js'].join('/'))) + '\n'

let js = coreJs + srcJs

// Transpile js using babel
if (config.babelConfig) {
  js = babel.transform(js, config.babelConfig).code
}

// Minify js
if (config.minifyJs.enabled) {
  js = UglifyJS.minify(js).code
}

// Write javascript to file
io.writeFile([buildDir, bundleName].join('/'), js)
