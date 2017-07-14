var VoltComponent = (function() {
  var _components = {}
  var _updateQueue = []
  var _readyQueue = []

  function register(name, component) {
    component._name = name
    _components[name] = component
  }

  function get(name) {
    return _components[name]
  }

  function mountComponent(dom, mount) {
    mount.appendChild(dom)
  }

  function addUpdate(watcher) {
    _updateQueue.push(watcher)
  }

  function processUpdates() {
    while (_updateQueue.length > 0) {
      var watcher = _updateQueue.pop()
      watcher.update()
    }
  }

  function processReadyQueue() {
    for (var i = 0, l = _readyQueue.length; i < l; ++i) {
      var scope = _readyQueue[i]
      if (scope._component.ready) {
        scope._component.ready.bind(scope)()
      }
    }

    _readyQueue = []
  }

  function setData(scope) {
    return function(key, val) {
      var o = {}
      o[key] = val

      var data = VoltUtil.flatten(o)

      for (var field in data) {
        var watchers = scope._dataWatchers[field]

        if (!watchers) {
          continue
        }
        
        var dataValue = data[field]
        VoltUtil.set(scope, field, dataValue)

        for (var i = 0, l = watchers.length; i < l; ++i) {
          var watcher = watchers[i]
          watcher.value = dataValue
          watcher.update()
        }
      }
      
      processUpdates()
    }
  }

  function setupDom(html, scopeObj) {
    var dom = VoltDom.create('div', html)
    var queue = new VoltUtil.Queue()
    processScope(dom, scopeObj, queue)

    while (!queue.isEmpty()) {
      var obj = queue.pop()

      if (obj.el.hasAttribute('@if')) {
        VoltBind.bindElement(obj.el, scopeObj)('@if')
      } else if (obj.el.hasAttribute('@for')) {
        VoltBind.bindElement(obj.el, scopeObj)('@for')
      } else {
        var newScope = setupNewComponent(obj.component, obj.el, {
          scope: scopeObj.scope,
          parentScope: obj.parentScope,
          loopScope: scopeObj.loopScope
        })

        processScope(newScope._el, {
          scope: newScope,
          parentScope: obj.parentScope,
          loopScope: scopeObj.loopScope
        }, queue)
      }
    }

    return dom.firstElementChild
  }

  function processScope(node, scopeObj, componentQueue) {
    var components = {}
    var childComponents = scopeObj.scope._component.components

    if (childComponents) {
      for (var i = 0, l = childComponents.length; i < l; ++i) {
        var component = get(childComponents[i])
        components[component.tagName] = component
      }
    }

    var queue = new VoltUtil.Queue()

    for (var i = 0, l = node.children.length; i < l; ++i) {
      queue.push(node.children[i])
    }

    while (!queue.isEmpty()) {
      var el = queue.pop()
      var tagName = el.tagName.toLowerCase()

      if (components[tagName]) {
        componentQueue.push({
          el: el,
          component: components[tagName],
          parentScope: scopeObj.scope
        })
      } else {
        VoltBind.bindAttributes(el, scopeObj)
      }

      if (!el.hasAttribute('@if') && !el.hasAttribute('@for')) {
        for (var i = 0, l = el.children.length; i < l; ++i) {
          queue.push(el.children[i])
        }
      }
    }
  }

  function setupNewComponent(component, el, scopeObj) {
    var template = VoltTemplate.get(component.render)
    var dom = VoltDom.create('div', template)
    VoltDom.copyAttributes(el, dom.firstElementChild)

    var scope = initializeScope(component)
    scope._el = dom.firstElementChild

    setComponentProps(el, component, {
      scope: scope,
      parentScope: scopeObj.parentScope,
      loopScope: scopeObj.loopScope
    })

    initComponentData(component, scope)
    initComponentMethods(component, scope)

    var slots = getSlots(el)

    if (slots) {
      fillSlots(scope._el, slots.slots, slots.hasMany)
    }

    VoltDom.replace(el, scope._el)
    VoltBind.bindAttributes(scope._el, scopeObj)

    _readyQueue.push(scope)
    return scope
  }

  // function initComponent(component, el, scopeObj) {
  //   var template = VoltTemplate.get(component.render)
  //   var dom = VoltDom.create('div', template)
  //   VoltDom.copyAttributes(el, dom.firstElementChild)

  //   var scope = initializeScope(component)
  //   scope._el = dom.firstElementChild
    
  //   var newScopeObj = {
  //     scope: scope,
  //     parentScope: scopeObj.parentScope,
  //     loopScope: scopeObj.loopScope
  //   }

  //   setComponentProps(el, component, newScopeObj)
  //   initComponentData(component, scope)
  //   initComponentMethods(component, scope)

  //   _readyQueue.push(scope)

  //   return scope
  // }

  function initializeScope(component) {
    var scope = {
      _dataWatchers: {},
      _stateWatchers: {},
      _listeners: [],
      _component: component,
      _for: [],
      _if: []
    }

    scope.$refs = {}
    scope.$props = {}
    scope.$setData = setData(scope)
    scope.$setState = VoltState.setState
    scope.$bind = VoltBind.bind.bind(scope)
    scope.$bindState = VoltBind.bindState.bind(scope)
    scope.$bindData = VoltBind.bindData.bind(scope)
    scope.$request = VoltRequest.prepareRequest.bind(scope)
    scope.$action = VoltAction.dispatch.bind(scope)
    
    return scope
  }

  function setComponentProps(el, component, scopeObj) {
    var scope = scopeObj.scope
    var props = component.props

    if (!props) return

    for (var p in props) {
      var value = el.getAttribute(p)
      var propConfig = props[p]

      if (value) {
        setProp(p, value, propConfig, scopeObj)
      } else {
        if (propConfig.required === true) {
          throw 'Missing prop: ' + p + ' is required by component ' + component._name
        }

        setDefaultProp(p, propConfig, scope)
      }

      scope._el.removeAttribute(p)
    }
  }

  function setProp(prop, value, config, scopeObj) {
    var propValue = VoltUtil.get(scopeObj.loopScope, value)

    if (!propValue) {
      propValue = VoltUtil.get(scopeObj.parentScope, value)
    }

    propValue = propValue !== undefined ? propValue : value

    if (config.type) {
      var convertedValue = VoltProps.convert(propValue, config.type)
      scopeObj.scope.$props[prop] = convertedValue
    } else {
      scopeObj.scope.$props[prop] = propValue
    }
  }

  function setDefaultProp(prop, config, scope) {
    if (config.default !== undefined) {
      scope.$props[prop] = config.default
    } else {
      scope.$props[prop] = null
    }
  }

  function initComponentData(component, scope) {
    if (!component.data) return

    var componentData = component.data.bind(scope)()

    for (var p in componentData) {
      scope[p] = componentData[p]
    }

    var flatData = VoltUtil.flatten(componentData)

    for (var p in flatData) {
      scope._dataWatchers[p] = []
    }
  }

  function initComponentMethods(component, scope) {
    if (!component.methods) return

    var componentMethods = component.methods.bind(scope)()

    for (var p in componentMethods) {
      scope[p] = componentMethods[p]
    }
  }

  function getSlots(el) {
    var slots = {}
    var hasMany = false

    if (!el.firstElementChild) {
      return null
    }

    var namedSlots = el.querySelectorAll('[slot]')

    if (namedSlots.length > 0) {
      hasMany = true

      for (var i = 0, l = namedSlots.length; i < l; ++i) {
        var slotName = namedSlots[i].getAttribute('slot')
        slots[slotName] = namedSlots[i]
      }
    } else {
      var f = VoltDom.fragment()
      slots = VoltDom.transferChildren(el, f)
    }

    return {
      slots: slots,
      hasMany: hasMany
    }
  }

  function fillSlots(el, slots, hasMany) {
    var emptySlots = el.getElementsByTagName('slot')
    var numSlots = emptySlots.length

    if (numSlots === 1) {
      var slot = emptySlots[0]
      if (!slot.hasAttribute('name') && !hasMany) {
        VoltDom.replace(slot, slots)
        return
      }
    } else if (typeof slots !== 'object') {
      return
    }
    
    for (var i = 0; i < numSlots; ++i) {
      var slot = emptySlots[i]
      var name = slot.getAttribute('name')

      if (slots[name]) {
        VoltDom.replace(slot, slots[name])
      }
    }
  }

  function initMain(name) {
    var component = get(name)
    var template = VoltTemplate.get(component.render)
    var scope = initializeScope(component)
    
    initComponentData(component, scope)
    initComponentMethods(component, scope)

    _readyQueue.push(scope)

    var dom = setupDom(template, {
      scope: scope,
      parentScope: null,
      loopScope: null
    })

    processUpdates()
    processReadyQueue()
    
    return dom
  }

  return {
    addUpdate: addUpdate,
    setupDom: setupDom,
    register: register,
    initMain: initMain,
    mountComponent: mountComponent
  }
})();

