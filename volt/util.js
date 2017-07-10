var VoltUtil = (function() {

  function set(obj, field, value) {
    var parts = field.split('.')
    var l = parts.length

    if (l === 1) {
      obj[field] = value
    } else {
      var cur, i

      for (i = 0; i < l - 1; ++i) {
        var part = parts[i]
        cur = obj[part]
      }

      cur[parts[i]] = value
    }
  }

  function get(obj, field) {
    if (!obj) return

    var parts = field.split('.')
    var l = parts.length

    if (l === 1) {
      return obj[field]
    } else {
      var cur, i

      for (i = 0; i < l - 1; ++i) {
        cur = obj[parts[i]]
      }

      return cur[parts[i]] 
    }
  }

  function shallowCopy(obj) {
    var res = {}
    for (var p in obj) {
      res[p] = obj[p]
    }

    return res
  }

  function flatten(data) {
    var result = {}

    function recurse (cur, prop) {
      if (Object(cur) !== cur || Array.isArray(cur)) {
        result[prop] = cur
      } else {
        var isEmpty = true

        for (var p in cur) {
          isEmpty = false
          recurse(cur[p], prop ? prop + '.' + p : p)
        }
        if (isEmpty) {
          result[prop] = {}
        }
      }
    }
    recurse(data, '')
    return result
  }

  function unflatten(data) {
    if (Object(data) !== data) {
      return data
    }

    var result = {}, cur, prop, idx, last, temp

    for (var p in data) {
      cur = result, prop = '', last = 0

      do {
        idx = p.indexOf('.', last)
        temp = p.substring(last, idx !== -1 ? idx : undefined)
        cur = cur[prop] || (cur[prop] = {})
        prop = temp
        last = idx + 1
      } while (idx >= 0)

      cur[prop] = data[p]
    }

    return result['']
  }

  function push(key, value, data) {
    var curr = data[key]

    if (!curr) {
      data[key] = value
    } else {
      Array.isArray(curr) ? curr.push(value) : data[key] = [curr, value]
    }
  }

  function Queue() {
    var queue  = []
    var offset = 0

    this.push = function(item){
      queue.push(item);
    }

    this.pop = function() {
      if (queue.length == 0) return undefined

      var item = queue[offset]

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
    flatten: flatten,
    unflatten: unflatten,
    push: push,
    shallowCopy: shallowCopy,
    Queue: Queue
  }
})();
