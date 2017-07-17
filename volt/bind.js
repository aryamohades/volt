const VoltBind = (function() {

  const _bindHandlers = {
    'v-text': bindText,
    'v-for': bindFor,
    'v-if': bindIf
  }

  const _interactHandlers = {
    'v-click': bindClick
  }

  const _modelBindings = {
    checkbox: null
  }

  function bindElement(el, scopeObj) {
    const watcher = {
      el: el,
      scopeObj: scopeObj,
      stateFields: [],
      dataFields: []
    }

    return type => {
      let bindTo

      if (type === '@for') {
        const parsed = parseFor(el.getAttribute('@for'))
        bindTo = parsed.src
        watcher.var = parsed.var
      } else {
        bindTo = el.getAttribute(type)
      }

      const methodObj = getMethodArgs(bindTo)
      bindTo = methodObj.method
      const args = methodObj.args

      el.removeAttribute(type)

      if (type.startsWith('@')) {
        type = 'v-' + type.slice(1)
      }

      if (_interactHandlers[type]) {
        return _interactHandlers[type](el, bindTo, scopeObj, args)
      }

      const found = getValueFromScope(bindTo, scopeObj)
      const value = found.value

      if (type === 'v-ref') {
        return bindRef(el, bindTo, value, scopeObj, args)
      }

      watcher.value = value
      watcher.type = type
      watcher.bindTo = bindTo

      if (!found.inLoop) {
        processValue(value, bindTo, watcher, args)
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
    let value
    let inLoop = false

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

  function processValue(value, bindTo, watcher, args) {
    const scope = watcher.scopeObj.scope
    const type = typeof value

    if (VoltUtil.isObject(value) && value._bind) {
      value._bind.bind(scope)(watcher)
    } else if (type === 'function') {
      watcher.value = call(value, args, watcher.scopeObj)
    } else {
      watcher.dataFields = [bindTo]
      VoltUtil.push(bindTo, watcher, scope._dataWatchers)
    }
  }

  function bindAttributes(el, scopeObj) {
    const binder = bindElement(el, scopeObj)
    
    if (el.hasAttribute('@if')) {
      binder('@if')
      el.removeAttribute('@for')
    } else if (el.hasAttribute('@for')) {
      binder('@for')
    } else {
      const attrs = [].slice.call(el.attributes)

      for (let attr of attrs) {
        const type = attr.name
        const value = attr.value

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
    watcher.newEls = []
    watcher.anchor = watcher.el
    watcher.scopeObj.scope._for.push(watcher)
    VoltDom.clear(watcher.el)
  }

  function bindRef(el, bindTo, value, scopeObj, args) {
    const scope = scopeObj.scope

    if (typeof value === 'function') {
      scope.$refs[call(value, args, scopeObj)] = el
    } else if (typeof value === 'string') {
      scope.$refs[value] = el
    } else {
      scope.$refs[bindTo] = el
    }
  }

  function bindIfNode(chain, remove, scope, watcher) {
    watcher.anchor = watcher.el

    return (el, attr, type) => {
      const watcherNode = type === '@if'
        ? watcher
        : VoltUtil.clone(watcher)

      scope._if.push(watcherNode)
      chain.push(watcherNode)

      if (type === '@else-if') {
        const found = getValueFromScope(attr, watcher.scopeObj)
        watcherNode.value = found.value

        if (!found.inLoop) {
          processValue(watcherNode.value, attr, watcherNode)
        } else {
          watcher.dataFields = []
        }
      } else if (type === '@else') {
        watcherNode.value = true
        watcherNode.dataFields = []
      }

      watcherNode.html = el.outerHTML
      watcherNode.chain = chain
      watcherNode.bindTo = attr
      watcherNode.update = updateIf
      watcherNode.type = type
      watcherNode.el = el

      if (type !== '@if') {
        remove.push(el)
        el.removeAttribute(type)
      } else {
        VoltDom.clear(el)
      }
    }
  }

  function bindIf(watcher) {
    const scope = watcher.scopeObj.scope
    const remove = []
    const chain = []

    const binder = bindIfNode(chain, remove, scope, watcher)

    binder(watcher.el, null, '@if')

    let next = watcher.el.nextElementSibling
    let elseIf = next !== null ? next.getAttribute('@else-if') : null

    while (elseIf !== null) {
      binder(next, elseIf, '@else-if')
      next = next.nextElementSibling
      elseIf = next !== null ? next.getAttribute('@else-if') : null
    }

    if (next && next.hasAttribute('@else')) {
      binder(next, null, '@else')
    }

    VoltDom.removeMulti(remove)
  }

  function getClickHandler(method, args, scopeObj) {
    if (args) {
      args = args.map(param => getValueFromScope(param, scopeObj).value)
    }
    
    const scope = scopeObj.scope

    return function() {
      if (args) {
        scope[method].apply(scope, args)
      } else {
        scope[method].bind(scope)()
      }
    }
  }

  function bindClick(el, method, scopeObj, args) {
    const handler = getClickHandler(method, args, scopeObj)

    const listener = {
      el: el,
      type: 'click',
      handler: handler
    }

    scopeObj.scope._listeners.push(listener)
    el.addEventListener('click', handler)
  }

  function updateAttribute() {
    const watcher = this
    watcher.value = getWatcherValue(watcher)
    watcher.el.setAttribute(watcher.attr, watcher.value)
  }

  function updateText() {
    const watcher = this
    watcher.value = getWatcherValue(watcher)
    VoltDom.renderText(watcher.el, watcher.value)
  }

  function hideAnchor(watcher) {
    VoltDom.hide(watcher.anchor)
    VoltDom.clear(watcher.anchor)
  }

  function replaceFor(watcher, dom) {
    const scope = watcher.scopeObj.scope
    const newAnchor = watcher.newEls[0]

    for (let w of scope._if) {
      if (w.anchor === watcher.anchor) {
        for (let node of w.chain) {
          node.anchor = newAnchor
        }

        break
      }
    }

    clearFor(watcher)

    for (let el of watcher.newEls) {
      watcher.els.push(el)
    }

    watcher.newEls = []
    VoltDom.replace(watcher.anchor, dom)
    watcher.anchor = newAnchor
    VoltDom.show(watcher.anchor)
  }

  function getForDom(watcher) {
    const loopScope = watcher.scopeObj.loopScope || {}
    const dom = VoltDom.fragment()
    
    for (let entry of watcher.value) {
      loopScope[watcher.var] = entry

      const node = VoltComponent.setupDom(watcher.html, {
        scope: watcher.scopeObj.scope,
        parentScope: watcher.scopeObj.parentScope,
        loopScope: loopScope
      })

      watcher.newEls.push(node)
      dom.appendChild(node)
    }

    return dom
  }

  function updateFor() {
    const watcher = this
    const scope = watcher.scopeObj.scope
    watcher.value = getWatcherValue(watcher)

    if (!Array.isArray(watcher.value)) {
      clearFor(watcher)
      return hideAnchor(watcher)
    }

    const frag = VoltDom.fragment()

    if (watcher.value.length === 0) {
      return hideAnchor(watcher)
    }

    replaceFor(watcher, getForDom(watcher))
  }

  function deactivateShared(scope, anchor) {
    for (let watcher of scope._for) {
      if (watcher.anchor === anchor) {
        disposeFor(watcher)
        break
      }
    }
  }

  function getActiveIf(watcher) {
    let activeWatcher = null
    let hasActive = false
    let deactivate

    for (let w of watcher.chain) {
      w.value = getWatcherValue(w)

      if (w.value  === true && w !== w.activeWatcher && !hasActive) {
        if (w.activeWatcher) {
          deactivate = w.activeWatcher.anchor
        }
        
        activeWatcher = w
        activeWatcher.newNode = VoltComponent.setupDom(w.html, w.scopeObj)
      } else if (w.value === false && w === w.activeWatcher) {
        deactivate = w.anchor
      }

      if (w.value === true) {
        hasActive = true
      }
    }

    if (deactivate) {
      deactivateShared(watcher.scopeObj.scope, deactivate)
    }

    return activeWatcher
  }

  function updateIf() {
    const watcher = this

    const activeWatcher = getActiveIf(watcher)

    if (activeWatcher) {
      VoltDom.replace(watcher.anchor, activeWatcher.newNode)

      for (let w of watcher.chain) {
        w.activeWatcher = activeWatcher
        w.anchor = activeWatcher.newNode
      }
    }

    if (!watcher.activeWatcher) {
      hideAnchor(watcher)
    }
  }

  function disposeFor(watcher) {
    clearFor(watcher)

    const scope = watcher.scopeObj.scope

    const watcherIdx = scope._for.indexOf(watcher)

    if (watcherIdx !== -1) {
      scope._for.splice(watcherIdx, 1)
    }

    for (let field of watcher.dataFields) {
      const watchers = scope._dataWatchers[field]
      const idxFound = watchers.indexOf(watcher)

      if (idxFound !== -1) {
        watchers.splice(idxFound, 1)
      }
    }
  }

  function clearFor(watcher) {
    for (let i = 1, l = watcher.els.length; i < l; ++i) {
      VoltDom.remove(watcher.els[i])
    }

    watcher.els = []
  }
  
  function bind(options, fn) {
    let stateFields = options.state
    let dataFields = options.data

    if (stateFields && !Array.isArray(stateFields)) {
      stateFields = [stateFields]
    }

    if (dataFields && !Array.isArray(dataFields)) {
      dataFields = [dataFields]
    }

    return {
      _bind: function(watcher) {
        watcher.fn = fn ? fn.bind(this) : null
        watcher.dataFields = dataFields
        watcher.stateFields = stateFields
        addStateWatcher(watcher, this)
        addDataWatcher(watcher, this)
        return watcher
      }
    }
  }

  function bindState(fields, fn) {
    return bind({
      state: fields,
      data: []
    }, fn)
  }

  function bindData(fields, fn) {
    return bind({
      state: [],
      data: fields
    }, fn)
  }

  function addStateWatcher(watcher, scope) {
    for (let field of watcher.stateFields) {
      watcher.value = VoltState.getState(field)
      VoltState.watchers[field].push(watcher)
      VoltUtil.push(field, watcher, scope._stateWatchers)
    }
  }

  function addDataWatcher(watcher, scope) {
    for (let field of watcher.dataFields) {
      VoltUtil.push(field, watcher, scope._dataWatchers)
    }
  }

  function getWatcherValue(watcher) {
    const scope = watcher.scopeObj.scope
    let value

    if (watcher.fn) {
      const stateArgs = watcher.stateFields.map(field => VoltState.getState(field))
      const dataArgs = watcher.dataFields.map(field => VoltUtil.get(scope, field))
      value = watcher.fn.apply(this, stateArgs.concat(dataArgs))
    } else {
      value = watcher.value
    }

    scope[watcher.bindTo] = value
    return value
  }

  function getMethodArgs(bindTo) {
    let method, args

    const indexParen = bindTo.indexOf('(')

    if (indexParen !== -1) {
      method = bindTo.slice(0, indexParen)
      args = /\(\s*([^)]+?)\s*\)/.exec(bindTo)

      if (args && args[1]) {
        args = args[1].split(/\s*,\s*/);
      }
    } else {
      method = bindTo
    }

    return {
      method: method,
      args: args
    }
  }

  function call(fn, args, scopeObj) {
    let value

    if (args) {
      args = args.map(param => getValueFromScope(param, scopeObj).value)
      value = fn.apply(scopeObj.scope, args)
    } else {
      value = value()
    }

    return value
  }

  function parseFor(value) {
    const parts = value.split(' ')

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
