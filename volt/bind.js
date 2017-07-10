var VoltBind = (function() {
  var _bindHandlers = {
    'v-click': bindClick,
    'v-text': bindText,
    'v-for': bindFor,
    'v-if': bindIf
  }

  function getBindHandler(name) {
    var handler

    if (_bindHandlers[name]) {
      handler = _bindHandlers[name]
    } else if (name.startsWith('@')) {
      name = 'v-' + name.slice(1)
      handler = _bindHandlers[name] ? _bindHandlers[name] : bindAttribute
    }

    return handler
  }

  function getValueFromScope(name, scope, parentScope, loopScope) {
    var value, inLoopScope = false

    if (loopScope) {
      value = VoltUtil.get(loopScope, name)

      if (value !== undefined) {
        inLoopScope = true
      }
    }

    if (value === undefined) {
      value = VoltUtil.get(scope, name)
    }

    if (value === undefined) {
      value = VoltUtil.get(parentScope, name)
    }

    return {
      value: value,
      inLoopScope: inLoopScope
    }
  }

  function convertValue(baseType, value, bindTo, watcher, scope) {
    var type = typeof value

    var matchesBaseType = !baseType || type === baseType
    var matchesArrayType = baseType === 'array' && Array.isArray(value)

    if (matchesArrayType) {
      watcher.dataFields = [bindTo]
      scope._dataWatchers[bindTo].push(watcher)
    } else if (type === 'object' && value.bind) {
      watcher = value.bind.apply(scope, [watcher])
    } else if (type === 'function') {
      watcher.value = value()
    } else if (matchesBaseType) {
      watcher.dataFields = [bindTo]
      scope._dataWatchers[bindTo].push(watcher)
    }
  }

  function bindAttribute(el, bindTo, scope, parentScope, loopScope) {
    var valueObj = getValueFromScope(bindTo, scope, parentScope, loopScope)
    var value = valueObj.value
    var inLoopScope = valueObj.inLoopScope

    var watcher = {
      el: el,
      name: bindTo,
      value: value,
      update: updateAttribute,
      scope: scope,
      parentScope: parentScope,
      loopScope: loopScope
    }

    if (!inLoopScope) {
      convertValue('string', value, bindTo, watcher, scope)
    }

    VoltComponent.addUpdate(watcher)
  }

  function bindText(el, bindTo, scope, parentScope, loopScope) {
    var valueObj = getValueFromScope(bindTo, scope, parentScope, loopScope)
    var value = valueObj.value
    var inLoopScope = valueObj.inLoopScope

    var watcher = {
      el: el,
      value: value,
      update: updateText,
      scope: scope,
      parentScope: parentScope,
      loopScope: loopScope
    }

    if (!inLoopScope) {
      convertValue(null, value, bindTo, watcher, scope)
    }
    
    VoltComponent.addUpdate(watcher)
  }

  function bindFor(el, bindTo, scope, parentScope, loopScope) {
    el.removeAttribute('@for')
    var parsed = parseForAttr(bindTo)

    var valueObj = getValueFromScope(parsed.src, scope, parentScope, loopScope)
    var value = valueObj.value
    var inLoopScope = valueObj.inLoopScope

    var watcher = {
      var: parsed.var,
      html: el.outerHTML,
      els: [],
      anchor: el,
      value: value,
      update: updateFor,
      scope: scope,
      parentScope: parentScope,
      loopScope: VoltUtil.shallowCopy(loopScope)
    }

    if (!inLoopScope) {
      convertValue('array', value, parsed.src, watcher, scope)
    }

    el.innerHTML = ''

    VoltComponent.addUpdate(watcher)
  }

  function bindIfNode(el, bindTo, bindType, chain, scope, parentScope, loopScope) {
    el.removeAttribute(bindType)

    var value, inLoopScope = false

    if (bindType !== '@else') {
      var valueObj = getValueFromScope(bindTo, scope, parentScope, loopScope)
      value = valueObj.value
      inLoopScope = valueObj.inLoopScope
    }

    var watcher = {
      anchor: el,
      chain: chain,
      html: el.outerHTML,
      value: value,
      update: updateIf,
      loopScope: loopScope,
      scope: scope,
      parentScope: parentScope,
      loopScope: loopScope
    }

    if (bindType === '@else') {
      watcher.value = true
    } else if (!inLoopScope) {
      convertValue('boolean', value, bindTo, watcher, scope)
    }

    chain.push(watcher)

    return watcher
  }

  function bindIf(el, bindTo, scope, parentScope, loopScope) {
    var remove = []
    var chain = []
    var watcher = bindIfNode(el, bindTo, '@if', chain, scope, parentScope, loopScope)

    var next = el.nextElementSibling
    var elseIfAttr = next !== null ? next.getAttribute('@else-if') : null

    while (elseIfAttr !== null) {
      remove.push(next)
      bindIfNode(next, elseIfAttr, '@else-if', chain, scope, parentScope, loopScope)
      next = next.nextElementSibling
      elseIfAttr = next !== null ? next.getAttribute('@else-if') : null
    }

    if (next && next.hasAttribute('@else')) {
      remove.push(next)
      bindIfNode(next, null, '@else', chain, scope, parentScope, loopScope)
    }

    el.innerHTML = ''

    VoltDom.removeMulti(remove)

    VoltComponent.addUpdate(watcher)
  }

  function bindClick(el, bindTo, scope, parentScope, loopScope) {
    var handler = scope[bindTo].bind(scope)
    var listener = {
      el: el,
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

    var node, newAnchor
    var loopScope = {}

    var frag = VoltDom.fragment()

    var arr = watcher.value

    for (var i = 0, l = arr.length; i < l; ++i) {
      loopScope[watcher.var] = arr[i]

      var html = watcher.html
      var scope = watcher.scope
      var parentScope = watcher.parentScope

      for (var p in watcher.loopScope) {
        loopScope[p] = watcher.loopScope[p]
      }

      node = VoltComponent.setupDom(html, scope, parentScope, loopScope)
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

  function updateIf() {
    var watcher = this
    var chain = watcher.chain
    var newNode

    for (var i = 0, l = chain.length; i < l; ++i) {
      var watcherNode = chain[i]
      watcherNode.value = getUpdateValue(watcherNode)
      
      if (watcherNode.value === true) {
        var html = watcherNode.html
        var scope = watcherNode.scope
        var parentScope = watcherNode.parentScope
        var loopScope = watcherNode.loopScope  
        newNode = VoltComponent.setupDom(html, scope, parentScope, loopScope)
        break
      }
    }

    if (newNode) {
      VoltDom.replace(watcher.anchor, newNode)

      for (var i = 0, l = chain.length; i < l; ++i) {
        chain[i].anchor = newNode
      }
    } else {
      watcher.anchor.innerHTML = ''
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
