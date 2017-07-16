const VoltComponent = (function() {
  const _components = {}
  const _updateQueue = []
  let _readyQueue = []

  function register(name, component) {
    component._name = name

    if (!component.tagName) {
      name = VoltUtil.lowerCaseFirst(name)
      component.tagName = VoltUtil.hyphenate(name)
    }

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
      const watcher = _updateQueue.pop()
      watcher.update()
    }
  }

  function processReadyQueue() {
    for (let scope of _readyQueue) {
      if (scope._component.ready) {
        scope._component.ready.bind(scope)()
      }
    }

    _readyQueue = []
  }

  function setData(scope) {
    return (key, val) => {
      const data = VoltUtil.flatten({
        [key]: val
      })

      for (const field in data) {
        VoltUtil.set(scope, field, data[field])

        const watchers = scope._dataWatchers[field] || []

        for (let watcher of watchers) {
          watcher.value = data[field]
          watcher.update()
        }
      }
      
      processUpdates()
    }
  }

  function setupDom(html, scopeObj) {
    const dom = VoltDom.create('div', html)
    const queue = new VoltUtil.Queue()
    processScope(dom, scopeObj, queue)

    while (!queue.isEmpty()) {
      const obj = queue.pop()
      const handler = VoltBind.bindElement(obj.el, scopeObj)

      if (obj.el.hasAttribute('@if')) {
        handler('@if')
      } else if (obj.el.hasAttribute('@for')) {
        handler('@for')
      } else {
        const newScope = setupNewComponent(obj.component, obj.el, {
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

  function processScope(dom, scopeObj, componentQueue) {
    const components = {}
    const childComponents = scopeObj.scope._component.components || []

    for (let child of childComponents) {
      const component = get(child)
      components[component.tagName] = component
    }

    const queue = new VoltUtil.Queue()

    for (let child of dom.children) {
      queue.push(child)
    }

    while (!queue.isEmpty()) {
      const el = queue.pop()
      const tagName = el.tagName.toLowerCase()

      extractChildren(el, queue)

      if (components[tagName]) {
        componentQueue.push({
          el: el,
          component: components[tagName],
          parentScope: scopeObj.scope
        })
      } else {
        VoltBind.bindAttributes(el, scopeObj)
      }
    }
  }

  function extractChildren(el, queue) {
    if (el.hasAttribute('@if') || el.hasAttribute('@for')) {
      return
    }

    for (let child of el.children) {
      if (!child.hasAttribute('@else-if') && !child.hasAttribute('@else')) {
        queue.push(child)
      }
    }
  }

  function setupNewComponent(component, el, scopeObj) {
    const template = VoltTemplate.get(component.render)
    const dom = VoltDom.create('div', template)
    VoltDom.copyAttributes(el, dom.firstElementChild)

    const scope = initializeScope(component)
    scope._el = dom.firstElementChild

    setComponentProps(el, component, {
      scope: scope,
      parentScope: scopeObj.parentScope,
      loopScope: scopeObj.loopScope
    })

    initComponentData(component, scope)
    initComponentMethods(component, scope)

    const slots = getSlots(el)

    if (slots) {
      fillSlots(scope._el, slots.slots, slots.hasMany)
    }

    VoltDom.replace(el, scope._el)
    VoltBind.bindAttributes(scope._el, scopeObj)

    _readyQueue.push(scope)

    return scope
  }

  function initializeScope(component) {
    const scope = {
      _dataWatchers: {},
      _stateWatchers: {},
      _listeners: [],
      _component: component,
      _for: [],
      _if: []
    }

    scope.$refs = {}
    scope.$props = {}
    scope.$route = VoltRouter.router,
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
    const scope = scopeObj.scope
    const props = component.props

    if (!props) {
      return
    }

    for (const p in props) {
      const value = el.getAttribute(p)
      const propConfig = props[p]

      if (value) {
        setProp(p, value, propConfig, scopeObj)
      } else {
        if (propConfig.required === true) {
          throw new Error('Missing prop: ' + p + ' is required by component ' + component._name)
        }

        setDefaultProp(p, propConfig, scope)
      }

      scope._el.removeAttribute(p)
    }
  }

  function setProp(prop, value, config, scopeObj) {
    let propValue = VoltUtil.get(scopeObj.loopScope, value)

    if (!propValue) {
      propValue = VoltUtil.get(scopeObj.parentScope, value)
    }

    propValue = propValue !== undefined ? propValue : value

    if (config.type) {
      const convertedValue = VoltProps.validate(propValue, config.type)
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
    if (!component.data) {
      return
    }

    const data = component.data.bind(scope)()
    const flatData = VoltUtil.flatten(data)

    VoltUtil.assign(scope, data)

    for (const p in flatData) {
      scope._dataWatchers[p] = []
    }
  }

  function initComponentMethods(component, scope) {
    if (!component.methods) {
      return
    }

    const methods = component.methods.bind(scope)()

    VoltUtil.assign(scope, methods)
  }

  function getSlots(el) {
    let slots = {}
    let hasMany = false

    if (!el.firstElementChild) {
      return null
    }

    const namedSlots = el.querySelectorAll('[slot]')

    if (namedSlots.length > 0) {
      hasMany = true

      for (let slot of namedSlots) {
        const slotName = slot.getAttribute('slot')
        slots[slotName] = slot
      }
    } else {
      const f = VoltDom.fragment()
      slots = VoltDom.transferChildren(el, f)
    }

    return {
      slots: slots,
      hasMany: hasMany
    }
  }

  function fillSlots(el, slots, hasMany) {
    const emptySlots = el.getElementsByTagName('slot')

    if (emptySlots.length === 1) {
      let slot = emptySlots[0]

      if (!slot.hasAttribute('name') && !hasMany) {
        return VoltDom.replace(slot, slots)
      }
    }
    
    if (VoltUtil.isObject(slots)) {
      for (let slot of emptySlots) {
        const name = slot.getAttribute('name')

        if (slots[name]) {
          VoltDom.replace(slot, slots[name])
        }
      }
    }
  }

  function initComponent(name) {
    const component = get(name)
    const template = VoltTemplate.get(component.render)
    const scope = initializeScope(component)
    
    initComponentData(component, scope)
    initComponentMethods(component, scope)

    _readyQueue.push(scope)

    const dom = setupDom(template, {
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
    initComponent: initComponent,
    mountComponent: mountComponent
  }
})();

