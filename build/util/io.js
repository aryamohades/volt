const fs   = require('fs')
const path = require('path');

exports.exists = file => {
  return fs.existsSync(file)
}

exports.readDir = dir => {
  return fs.readdirSync(dir)
}

exports.createDir = dir => {
  if (!fs.existsSync(dir)){
    fs.mkdirSync(dir)
  }
}

exports.readFile = file => {
  return fs.readFileSync(file, 'utf8')
}

exports.writeFile = (file, text) => {
  fs.writeFileSync(file, text)
}

exports.appendFile = (file, text) => {
  fs.appendFileSync(file, text)
}

const walkSync = dir => {
  return fs.statSync(dir).isDirectory()
    ? Array.prototype.concat(...fs.readdirSync(dir).map(f => walkSync(path.join(dir, f))))
    : dir
}

exports.walkSync = walkSync