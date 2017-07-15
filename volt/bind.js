var VoltBind = (function() {

  var _bindHandlers = {
    'v-text': bindText,
    'v-for': bindFor,
    'v-if': bindIf
  }

  var _interactHandlers = {
    'v-click': bindClick
  }

  var _modelBindings = {
    checkbox: null
  }

  function bindElement(el, scopeObj) {
    var watcher = {
      el: el,
      scopeObj: scopeObj
    }

    return function(type) {
      var bindTo

      if (type === '@for') {
        var parsed = parseFor(el.getAttribute('@for'))
        bindTo = parsed.src
        watcher.var = parsed.var
      } else {
        bindTo = el.getAttribute(type)
      }

      el.removeAttribute(type)

      if (type.startsWith('@')) {
        type = 'v-' + type.slice(1)
      }

      if (_interactHandlers[type]) {
        _interactHandlers[type](el, bindTo, scopeObj.scope)
        return
      }

      var found = getValueFromScope(bindTo, scopeObj)
      var value = found.value

      if (type === 'v-ref') {
        bindRef(el, bindTo, value, scopeObj.scope)
        return
      }

      watcher.value = value
      watcher.type = type
      watcher.bindTo = bindTo

      if (!found.inLoop) {
        processValue(value, bindTo, watcher)
      }

      if (_bindHandlers[type]) {
        _bindHandlers[type](watcher)
      } else {
        bindAttribute(watcher)
      }

      VoltComponent.addUpdate(watcher)
      return watcher
    }
  }

  function getValueFromScope(name, scopeObj) {
    var value, inLoop = false

    if (scopeObj.loopScope) {
      value = VoltUtil.get(scopeObj.loopScope, name)

      if (value !== undefined) {
        inLoop = true
      }
    }

    if (value === undefined) {
      value = VoltUtil.get(scopeObj.scope, name)
    }

    if (value === undefined) {
      value = VoltUtil.get(scopeObj.parentScope, name)
    }

    return {
      value: value,
      inLoop: inLoop
    }
  }

  function processValue(value, bindTo, watcher) {
    var scope = watcher.scopeObj.scope
    var type = typeof value

    if (value !== null && type === 'object' && value._bind) {
      value._bind.bind(scope)(watcher)
    } else if (type === 'function') {
      watcher.value = value()
    } else {
      watcher.dataFields = [bindTo]
      if (scope._dataWatchers[bindTo]) {
        scope._dataWatchers[bindTo].push(watcher)
      } else {
        scope._dataWatchers[bindTo] = [watcher]
      }
    }
  }

  function bindAttributes(el, scopeObj) {
    var binder = bindElement(el, scopeObj)
    
    if (el.hasAttribute('@if')) {
      binder('@if')
      if (el.hasAttribute('@for')) {
        el.removeAttribute('@for')
      }
    } else if (el.hasAttribute('@for')) {
      binder('@for')
    } else {
      var attrs = [].slice.call(el.attributes)

      for (var i = 0, l = attrs.length; i < l; ++i) {
        var type = attrs[i].name
        var value = attrs[i].value

        if (type.startsWith('@') || type.startsWith('v-')) {
          binder(type)
        }
      }
    }
  }

  function bindAttribute(watcher) {
    watcher.update = updateAttribute
    watcher.attr = watcher.type.replace('v-', '')
  }

  function bindText(watcher) {
    watcher.update = updateText
  }

  function bindFor(watcher) {
    watcher.update = updateFor
    watcher.html = watcher.el.outerHTML
    watcher.els = []
    watcher.anchor = watcher.el
    watcher.scopeObj.scope._for.push(watcher)
    VoltDom.clear(watcher.el)
  }

  function bindRef(el, bindTo, value, scope) {
    if (typeof value === 'function') {
      value = value()
    }

    if (typeof value === 'string') {
      scope.$refs[value] = el
    } else {
      scope.$refs[bindTo] = el
    }
  }

  function bindIf(watcher) {
    var scope = watcher.scopeObj.scope
    var remove = []
    var chain = [watcher]
    watcher.anchor = watcher.el
    watcher.html = watcher.el.outerHTML
    watcher.update = updateIf
    watcher.chain = chain
    scope._if.push(watcher)

    function bindElseNode(el, attr, type) {
      el.removeAttribute(type)

      var nodeWatcher = VoltUtil.clone(watcher)
      var value

      if (type === '@else') {
        value = true
        nodeWatcher.dataFields = []
      } else {
        var valueObj = getValueFromScope(attr, watcher.scopeObj)
        value = valueObj.value

        if (!valueObj.inLoop) {
          processValue(valueObj.value, attr, nodeWatcher)
        }
      }

      nodeWatcher.bindTo = attr
      nodeWatcher.value = value
      nodeWatcher.type = type
      nodeWatcher.el = el
      nodeWatcher.html = el.outerHTML
      
      scope._if.push(nodeWatcher)
      chain.push(nodeWatcher)
      remove.push(el)
    }

    var next = watcher.el.nextElementSibling
    var elseIfAttr = next !== null ? next.getAttribute('@else-if') : null

    while (elseIfAttr !== null) {
      bindElseNode(next, elseIfAttr, '@else-if')
      next = next.nextElementSibling
      elseIfAttr = next !== null ? next.getAttribute('@else-if') : null
    }

    if (next && next.hasAttribute('@else')) {
      bindElseNode(next, null, '@else')
    }

    VoltDom.clear(watcher.el)
    VoltDom.removeMulti(remove)
  }

  function bindClick(el, bindTo, scope) {
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
    watcher.el.setAttribute(watcher.attr, watcher.value)
  }

  function updateText() {
    var watcher = this
    watcher.value = getUpdateValue(watcher)
    VoltDom.renderText(watcher.el, watcher.value)
  }

  function updateFor() {
    var watcher = this
    var scope = watcher.scopeObj.scope
    watcher.value = getUpdateValue(watcher)

    clearFor(watcher)

    if (!Array.isArray(watcher.value)) {
      VoltDom.hide(watcher.anchor)
      VoltDom.clear(watcher.anchor)
      return
    }

    var frag = VoltDom.fragment()

    var newAnchor

    for (var i = 0, l = watcher.value.length; i < l; ++i) {
      var loopScope = {}
      VoltUtil.assign(loopScope, watcher.scopeObj.loopScope)
      loopScope[watcher.var] = watcher.value[i]

      var node = VoltComponent.setupDom(watcher.html, {
        scope: scope,
        parentScope: watcher.scopeObj.parentScope,
        loopScope: loopScope
      })

      watcher.els.push(node)
      frag.appendChild(node)

      if (i === 0) {
        newAnchor = node
      }
    }

    if (newAnchor) {
      for (var i = 0, l = scope._if.length; i < l; ++i) {
        var w = scope._if[i]

        if (w.anchor === watcher.anchor) {
          w.anchor = newAnchor
        }
      }

      VoltDom.replace(watcher.anchor, frag)
      watcher.anchor = newAnchor
      VoltDom.show(watcher.anchor)
    } else {
      VoltDom.hide(watcher.anchor)
      VoltDom.clear(watcher.anchor)
    }
  }

  function updateIf() {
    var watcher = this
    var scope = watcher.scopeObj.scope
    var newAnchor, activeNode, deactivate, hasActive = false

    for (var i = 0, l = watcher.chain.length; i < l; ++i) {
      var watcherNode = watcher.chain[i]
      watcherNode.value = getUpdateValue(watcherNode)

      if (watcherNode.value === true && watcher.activeNode !== watcherNode && !hasActive) {
        if (watcher.activeNode) {
          deactivate = watcher.activeNode
        }

        activeNode = watcherNode
        newAnchor = VoltComponent.setupDom(watcherNode.html, watcher.scopeObj)
      }

      if (watcherNode.value === true) {
        hasActive = true
      }
    }

    if (deactivate) {
      for (var i = 0, l = scope._for.length; i < l; ++i) {
        if (scope._for[i].anchor === deactivate.anchor) {
          disposeFor(scope._for[i])
          break
        }
      }
    }

    if (newAnchor) {
      VoltDom.replace(watcher.anchor, newAnchor)

      for (var i = 0, l = watcher.chain.length; i < l; ++i) {
        if (watcher.chain[i].el === watcher.anchor) {
          watcher.chain[i].el = newAnchor
        }

        watcher.chain[i].activeNode = activeNode
        watcher.chain[i].anchor = newAnchor
      }
    }

    if (!hasActive) {
      VoltDom.hide(watcher.anchor)
      VoltDom.clear(watcher.anchor)
    }
  }

  function disposeFor(watcher) {
    clearFor(watcher)

    var scope = watcher.scopeObj.scope

    for (var i = 0, l = scope._for.length; i < l; ++i) {
      var w = scope._for[i]
      if (watcher === w) {
        scope._for.splice(i, 1)
        break
      }
    }

    for (var i = 0, l = watcher.dataFields.length; i < l; ++i) {
      var field = watcher.dataFields[i]
      var watchers = watcher.scopeObj.scope._dataWatchers[field]
      var idxFound = watchers.indexOf(watcher)

      if (idxFound !== -1) {
        watchers.splice(idxFound, 1)
      }
    }
  }

  function clearFor(watcher) {
    for (var i = 1, l = watcher.els.length; i < l; ++i) {
      VoltDom.remove(watcher.els[i])
    }
    watcher.els = []
  }
  
  function bind(options, fn) {
    var stateFields = options.state
    var dataFields = options.data

    if (stateFields && !Array.isArray(stateFields)) stateFields = [stateFields]
    if (dataFields && !Array.isArray(dataFields)) dataFields = [dataFields] 

    return {
      _bind: function(watcher) {
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
      watcher.value = VoltState.getState(field)
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
      if (scope._dataWatchers[field]) {
        scope._dataWatchers[field].push(watcher)
      } else {
        scope._dataWatchers[field] = [watcher]
      }
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
      var dataArgs = getDataValues(watcher.dataFields, watcher.scopeObj.scope)
      value = watcher.fn.apply(this, stateArgs.concat(dataArgs))
    } else {
      value = watcher.value
    }

    return value
  }

  function parseFor(value) {
    var parts = value.split(' ')

    if (parts.length !== 3 || parts[1] !== 'in') {
      throw new Error('Invalid attribute ' + attr)
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
    bindElement: bindElement,
    bindAttributes: bindAttributes,
  }
})();
