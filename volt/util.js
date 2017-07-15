const VoltUtil = (function() {
  const hyphenateRE = /([^-])([A-Z])/g

  function hyphenate(str) {
    return str
      .replace(hyphenateRE, '$1-$2')
      .replace(hyphenateRE, '$1-$2')
      .toLowerCase()
  }

  function lowerCaseFirst(str) {
    return str.charAt(0).toLowerCase() + str.slice(1)
  }

  function isObject(obj) {
    return obj !== null && typeof obj === 'object'
  }

  function set(obj, field, value) {
    if (!isObject(obj)) {
      return
    }

    const parts = field.split('.')
    const l = parts.length

    if (l === 1) {
      obj[field] = value
    } else {
      let cur, i

      for (i = 0; i < l - 1; ++i) {        
        if (obj[parts[i]]) {
          cur = obj[parts[i]]
        } else {
          cur = {}
          obj[parts[i]] = cur
        }
      }

      cur[parts[i]] = value
    }
  }

  function get(obj, field) {
    if (!isObject(obj)) {
      return
    }

    const parts = field.split('.')
    const l = parts.length

    if (l === 1) {
      return obj[field]
    } else {
      let cur, i

      for (i = 0; i < l - 1; ++i) {
        cur = obj[parts[i]]

        if (!isObject(cur)) {
          return
        }
      }

      return cur[parts[i]]
    }
  }

  function assign(to, _from) {
    Object.assign(to, _from)
  }

  function clone(obj) {
    return Object.assign({}, obj)
  }

  function flatten(data) {
    const res = {}

    const recurse = (cur, prop) => {
      if (Object(cur) !== cur || Array.isArray(cur)) {
        res[prop] = cur
      } else {
        let isEmpty = true

        for (const p in cur) {
          isEmpty = false
          recurse(cur[p], prop ? prop + '.' + p : p)
        }

        if (isEmpty) {
          res[prop] = {}
        }
      }
    }

    recurse(data, '')
    return res
  }

  function pushQueryParam(key, value, obj) {
    let cur = obj[key]

    if (!cur) {
      obj[key] = value
    } else {
      Array.isArray(cur) ? cur.push(value) : obj[key] = [cur, value]
    }
  }

  function push(key, value, obj) {
    obj[key] ? obj[key] = [value] : obj[key].push(value)
  }

  function Queue() {
    let queue  = []
    let offset = 0

    this.push = function(item){
      queue.push(item)
    }

    this.pop = function() {
      if (queue.length == 0) return undefined

      const item = queue[offset]

      if (++offset * 2 >= queue.length){
        queue = queue.slice(offset)
        offset = 0
      }

      return item
    }

    this.isEmpty = function() {
      return queue.length === 0
    }
  }

  return {
    get: get,
    set: set,
    clone: clone,
    assign: assign,
    push: push,
    flatten: flatten,
    isObject: isObject,
    Queue: Queue,
    pushQueryParam: pushQueryParam,
    lowerCaseFirst: lowerCaseFirst,
    hyphenate: hyphenate
  }
})();
