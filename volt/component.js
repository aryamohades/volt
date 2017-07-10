var VoltComponent = (function() {
  var _components = {}
  var _updateQueue = []

  function register(name, component) {
    component._name = name
    _components[name] = component
  }

  function get(name) {
    return _components[name]
  }

  function setData(scope) {
    return function(key, val) {
      var o = {}
      o[key] = val

      var data = VoltUtil.flatten(o)

      for (var field in data) {
        var dataValue = data[field]
        var watchers = scope._dataWatchers[field]
        VoltUtil.set(scope, field, dataValue)

        for (var i = 0, l = watchers.length; i < l; ++i) {
          var watcher = watchers[i]
          watcher.value = dataValue
          watcher.update()
        }
      }
    }
  }

  function processUpdates() {
    while (_updateQueue.length > 0) {
      var watcher = _updateQueue.pop()
      watcher.update()
    }
  }

  function setupDom(html, scope, loopScope) {
    var stack = []

    var dom = VoltDom.create('div', html)

    processScope(dom, scope, loopScope, stack)

    while (stack.length > 0) {
      var obj = stack.pop()
      var el = obj.el
      var component = obj.component
      var parentScope = obj.parentScope

      if (bindFor(el, parentScope, loopScope)) {
        continue
      }

      var componentObj = initComponent(component, el, parentScope, loopScope)
      var componentEl = componentObj.el
      var componentScope = componentObj.scope
      var slots = getSlots(el)

      if (slots) {
        fillSlots(componentEl, slots.slots, slots.hasMany)
      }

      el.parentNode.replaceChild(componentEl, el)

      bindAttributes(componentEl, scope, loopScope)

      processScope(componentEl, componentScope, loopScope, stack)
    }

    return dom.firstElementChild
  }

  function processScope(dom, scope, loopScope, componentStack) {
    var components = {}, component, children
    var childComponents = scope._component.components

    for (var i = 0, l = childComponents.length; i < l; ++i) {
      component = get(childComponents[i])
      components[component.tagName] = component
    }

    var stack = []
    children = dom.children

    for (var i = 0, l = children.length; i < l; ++i) {
      stack.push(children[i])
    }

    while (stack.length > 0) {
      var el = stack.pop()
      var tagName = el.tagName.toLowerCase()

      if (components[tagName]) {
        componentStack.push({
          el: el,
          component: components[tagName],
          parentScope: scope
        })
      } else {
        bindAttributes(el, scope, loopScope)
      }

      if (!el.hasAttribute('@for') && !el.hasAttribute('@if')) {
        children = el.children
        for (var i = 0, l = children.length; i < l; ++i) {
          stack.push(children[i])
        }
      }
    }
  }

  function bindFor(el, scope, loopScope) {
    var value = el.getAttribute('@for')

    if (value) {
      var handler = VoltBind.bindHandlers['v-for']
      handler(el, value, scope, loopScope)
    }

    return value !== null
  }

  function bindAttributes(el, scope, loopScope) {
    var attrs = el.attributes
    
    if (bindFor(el, scope, loopScope)) {
      return
    }

    for (var i = 0, l = attrs.length; i < l; ++i) {
      var attr = attrs[i]
      var name = attr.name
      var value = attr.value

      if (name.startsWith('@')) {
        name = 'v-' + name.slice(1)
        var bindHandler = VoltBind.getBindHandler(name)
        bindHandler(el, value, scope, loopScope)
      }
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

      while (el.childNodes.length > 0) {
        f.appendChild(el.childNodes[0])
      }

      slots = f
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
        slot.parentNode.replaceChild(slots, slot)
        return
      }
    } else if (typeof slots !== 'object') {
      return
    }
    
    for (var i = 0; i < numSlots; ++i) {
      var slot = emptySlots[i]
      var slotName = slot.getAttribute('name')

      if (slots[slotName]) {
        slot.parentNode.replaceChild(slots[slotName], slot)
      }
    }
  }

  function initComponent(component, el, parentScope, loopScope) {
    var template = VoltTemplate.get(component.render)
    var dom = VoltDom.create('div', template)
    var scope = initializeScope(component)
    copyAttrs(el, dom.firstElementChild)
    setProps(el, component, scope, parentScope, loopScope)
    initComponentData(component, scope)
    initComponentMethods(component, scope)

    return {
      el: dom.firstElementChild,
      scope: scope
    }
  }

  function initializeScope(component) {
    var scope = {
      _dataWatchers: {},
      _stateWatchers: {},
      _listeners: [],
      _component: component
    }

    scope.$setData = setData(scope)
    scope.$bind = VoltBind.bind.bind(scope)
    scope.$bindState = VoltBind.bindState.bind(scope)
    scope.$bindData = VoltBind.bindData.bind(scope)
    scope.$request = VoltRequest.prepareRequest.bind(scope)
    scope.$action = VoltAction.dispatch.bind(scope)
    scope.$props = {}

    return scope
  }

  function copyAttrs(fromEl, toEl) {
    var attrs = fromEl.attributes

    for (var i = 0, l = attrs.length; i < l; ++i) {
      var attr = attrs[i]
      var name = attr.name

      if (name.startsWith('@')) {
        name = 'v-' + name.slice(1)
      }

      toEl.setAttribute(name, attr.value)
    }
  }

  function setProps(el, component, scope, parentScope, loopScope) {
    var props = component.props

    if (!props) return

    for (var p in props) {
      var attr = el.getAttribute(p)
      var propConfig = props[p]

      if (attr) {
        setProp(p, attr, propConfig, scope, parentScope, loopScope)
      } else {
        setDefaultProp(p, propConfig, scope)
      }
    }
  }

  function setProp(prop, value, config, scope, parentScope, loopScope) {
    var propValue = VoltUtil.get(loopScope, value)

    if (!propValue) {
      propValue = VoltUtil.get(parentScope, value)
    }

    propValue = propValue !== undefined ? propValue : value

    if (config.type) {
      var convertedValue = VoltProps.convert(propValue, config.type)
      scope.$props[prop] = convertedValue
    } else {
      scope.$props[prop] = propValue
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

  function initMain(name) {
    var component = get(name)
    var template = VoltTemplate.get(component.render)
    var scope = initializeScope(component)
    initComponentData(component, scope)
    initComponentMethods(component, scope)
    var dom = setupDom(template, scope, null)
    processUpdates()
    return dom
  }

  function mountComponent(dom, mount) {
    mount.appendChild(dom)
  }

  function addUpdate(watcher) {
    _updateQueue.push(watcher)
  }

  return {
    addUpdate: addUpdate,
    setupDom: setupDom,
    register: register,
    initMain: initMain,
    mountComponent: mountComponent
  }
})();

