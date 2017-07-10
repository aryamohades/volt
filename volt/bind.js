var VoltBind = (function() {
  var _bindHandlers = {
    'v-click': bindClick,
    'v-text': bindText,
    'v-for': bindFor,
    'v-if': bindIf
  }

  function getBindHandler(name) {
    if (_bindHandlers[name]) {
      return _bindHandlers[name]
    }

    return bindAttribute
  }

  function bindAttribute(el, bindTo, scope, loopScope) {
    var value, inLoopScope = false

    el.removeAttribute(bindTo.replace('v-', '@'))

    if (loopScope) {
      value = VoltUtil.get(loopScope, bindTo)
      if (value) inLoopScope = true
    }

    if (!value) {
      value = VoltUtil.get(scope, bindTo)
    }

    var watcher = {
      dataFields: [bindTo],
      el: el,
      name: bindTo,
      value: value,
      update: updateAttribute,
      scope: scope
    }

    if (!inLoopScope) {
      var type = typeof value

      if (type === 'string') {
        scope._dataWatchers[bindTo].push(watcher)
      } else if (type === 'object' && value.bind) {
        watcher = value.bind.apply(scope, [watcher])
      } else if (type === 'function') {
        watcher.value = value()
      }
    }

    VoltComponent.addUpdate(watcher)
  }

  function bindText(el, bindTo, scope, loopScope) {
    var text, inLoopScope = false

    if (loopScope) {
      text = VoltUtil.get(loopScope, bindTo)
      if (text) inLoopScope = true
    }

    if (!text) {
      text = VoltUtil.get(scope, bindTo)
    }

    var watcher = {
      el: el,
      dataFields: [bindTo],
      value: text,
      update: updateText,
      scope: scope
    }

    if (!inLoopScope) {
      var type = typeof text

      if (type === 'string') {
        scope._dataWatchers[bindTo].push(watcher)
      } else if (type === 'object' && text.bind) {
        watcher = text.bind.apply(scope, [watcher])
      } else if (type === 'function') {
        watcher.value = text()
      }
    }
    
    VoltComponent.addUpdate(watcher)
  }

  function bindFor(el, bindTo, scope, loopScope) {
    var arr, inLoopScope = false

    el.removeAttribute('@for')
    var parsed = parseForAttr(bindTo)

    if (loopScope) {
      arr = VoltUtil.get(loopScope, parsed.src)
      if (arr) inLoopScope = true
    }

    if (!arr) {
      arr = VoltUtil.get(scope, parsed.src)
    }

    var watcher = {
      dataFields: [parsed.src],
      var: parsed.var,
      html: el.outerHTML,
      els: [],
      anchor: el,
      value: arr,
      update: updateFor,
      scope: scope
    }

    if (!inLoopScope) {
      var type = typeof arr

      if (Array.isArray(arr) && !inLoopScope) {
        scope._dataWatchers[parsed.src].push(watcher)
      } else if (type === 'object' && arr.bind) {
        watcher = arr.bind.apply(scope, [watcher])
      } else if (type === 'function') {
        watcher.value = arr()
      }
    }

    el.innerHTML = ''

    VoltComponent.addUpdate(watcher)
  }

  function bindIf(el, bindTo, scope, loopScope) {
    console.log('Bind if')
  }

  function bindClick(el, bindTo, scope, loopScope) {
    var handler = scope[bindTo].bind(scope)
    var listener = {
      type: 'click',
      handler: handler
    }

    scope._listeners.push(listener)
    el.addEventListener('click', handler)
  }

  function updateAttribute() {
    var watcher = this
    watcher.value = getUpdateValue(watcher)

    var el = watcher.el
    var name = watcher.name
    var value = watcher.value

    VoltDom.setAttribute(el, name, value)
  }

  function updateText() {
    var watcher = this
    watcher.value = getUpdateValue(watcher)
    VoltDom.renderText(watcher.el, watcher.value)
  }

  function updateFor() {
    var watcher = this
    watcher.value = getUpdateValue(watcher)

    var node, newAnchor, loopScope = {}

    var frag = VoltDom.fragment()

    var arr = watcher.value

    for (var i = 0, l = arr.length; i < l; ++i) {
      loopScope[watcher.var] = arr[i]
      node = VoltComponent.setupDom(watcher.html, watcher.scope, loopScope)
      frag.appendChild(node)

      if (i === 0) {
        newAnchor = node
      }
    }

    if (newAnchor) {
      VoltDom.replace(watcher.anchor, frag)
      watcher.anchor = newAnchor
    }
  }

  function bind(options, fn) {
    var stateFields = options.state
    var dataFields = options.data

    if (stateFields && !Array.isArray(stateFields)) stateFields = [stateFields]
    if (dataFields && !Array.isArray(dataFields)) dataFields = [dataFields] 

    return {
      bind: function(watcher) {
        options = options || {}

        watcher.fn = fn ? fn.bind(this) : null

        if (!watcher.dataFields) {
          watcher.dataFields = dataFields
        }

        if (!watcher.stateFields) {
          watcher.stateFields = stateFields
        }

        if (stateFields) {
          addStateWatcher(watcher, this)
        }

        if (dataFields) {
          addDataWatcher(watcher, this)
        }

        return watcher
      }
    }
  }

  function bindState(fields, fn) {
    return bind({
      state: fields,
      data: null
    }, fn)
  }

  function bindData(fields, fn) {
    return bind({
      state: null,
      data: fields
    }, fn)
  }

  function addStateWatcher(watcher, scope) {
    for (var i = 0, l = watcher.stateFields.length; i < l; ++i) {
      var field = watcher.stateFields[i]
      watcher.value = VoltState.get(field)
      VoltState.watchers[field].push(watcher)
      if (scope._stateWatchers[field]) {
        scope._stateWatchers[field].push(watcher)
      } else {
        scope._stateWatchers[field] = [watcher]
      }
    }
  }

  function addDataWatcher(watcher, scope) {
    for (var i = 0, l = watcher.dataFields.length; i < l; ++i) {
      var field = watcher.dataFields[i]
      scope._dataWatchers[field].push(watcher)
    }
  }

  function getDataValues(fields, scope) {
    if (!fields) return []

    var values = []
    for (var i = 0, l = fields.length; i < l; ++i) {
      values.push(VoltUtil.get(scope, fields[i]))
    }
    return values
  }

  function getStateValues(fields) {
    if (!fields) return []

    var values = []
    for (var i = 0, l = fields.length; i < l; ++i) {
      values.push(VoltState.get(fields[i]))
    }
    return values
  }

  function getUpdateValue(watcher) {
    var value

    if (watcher.fn) {
      var stateArgs = getStateValues(watcher.stateFields)
      var dataArgs = getDataValues(watcher.dataFields, watcher.scope)
      value = watcher.fn.apply(this, stateArgs.concat(dataArgs))
    } else {
      value = watcher.value
    }

    return value
  }

  function parseForAttr(attr) {
    var parts = attr.split(' ')
    if (parts.length !== 3 || parts[1] !== 'in') {
      throw 'Invalid attribute ' + attr
    }
    return {
      var: parts[0],
      src: parts[2]
    }
  }

  return {
    bind: bind,
    bindState: bindState,
    bindData: bindData,
    bindHandlers: _bindHandlers,
    getBindHandler: getBindHandler
  }
})();
