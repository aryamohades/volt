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

  function setupDom(html, scope, parentScope, loopScope) {
    var queue = new VoltUtil.Queue()

    var dom = VoltDom.create('div', html)

    processScope(dom, scope, parentScope, loopScope, queue)

    while (!queue.isEmpty()) {
      var obj = queue.pop()
      var el = obj.el
      var component = obj.component
      var parentScope = obj.parentScope

      if (bindIf(el, scope, parentScope, loopScope)) {
        continue
      }

      if (bindFor(el, scope, parentScope, loopScope)) {
        continue
      }

      var componentObj = initComponent(component, el, parentScope, loopScope)
      var componentEl = componentObj.el
      var componentScope = componentObj.scope
      var slots = getSlots(el)

      if (slots) {
        fillSlots(componentEl, slots.slots, slots.hasMany)
      }

      VoltDom.replace(el, componentEl)

      bindAttributes(componentEl, scope, parentScope, loopScope)

      processScope(componentEl, componentScope, parentScope, loopScope, queue)
    }

    return dom.firstElementChild
  }

  function processScope(node, scope, parentScope, loopScope, componentQueue) {
    var components = {}
    var childComponents = scope._component.components || []

    for (var i = 0, l = childComponents.length; i < l; ++i) {
      var component = get(childComponents[i])
      components[component.tagName] = component
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
          parentScope: scope
        })
      } else {
        bindAttributes(el, scope, parentScope, loopScope)
      }

      if (!el.hasAttribute('@for') && !el.hasAttribute('@if')) {
        for (var i = 0, l = el.children.length; i < l; ++i) {
          queue.push(el.children[i])
        }
      }
    }
  }

  function bindIf(el, scope, parentScope, loopScope) {
    var value = el.getAttribute('@if')

    if (value) {
      var handler = VoltBind.getBindHandler('v-if')
      handler(el, value, scope, parentScope, loopScope)
    }

    return value !== null
  }

  function bindFor(el, scope, parentScope, loopScope) {
    var value = el.getAttribute('@for')

    if (value) {
      var handler = VoltBind.getBindHandler('v-for')
      handler(el, value, scope, parentScope, loopScope)
    }

    return value !== null
  }

  function bindAttributes(el, scope, parentScope, loopScope) {
    var attrs = [].slice.call(el.attributes)
    
    if (bindIf(el, scope, parentScope, loopScope)) {
      return
    }

    if (bindFor(el, scope, parentScope, loopScope)) {
      return
    }

    for (var i = 0, l = attrs.length; i < l; ++i) {
      var attr = attrs[i]
      var name = attr.name
      var value = attr.value

      var bindHandler = VoltBind.getBindHandler(name)

      if (bindHandler) {
        el.removeAttribute(name)
        bindHandler(el, value, scope, parentScope, loopScope)
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

  function initComponent(component, el, parentScope, loopScope) {
    var template = VoltTemplate.get(component.render)
    var dom = VoltDom.create('div', template)
    var scope = initializeScope(component)
    copyAttrs(el, dom.firstElementChild)
    setProps(el, component, scope, parentScope, loopScope)
    initComponentData(component, scope)
    initComponentMethods(component, scope)

    if (component.ready) {
      component.ready.bind(scope)()
    }

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

    scope.$setState = VoltState.setState
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

    if (component.ready) {
      component.ready.bind(scope)()
    }

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

