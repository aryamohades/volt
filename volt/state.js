const VoltState = (function() {
  const _state = {}
  const _watchers = {}
  const _synced = {}
  
  function register(module, state) {
    let stateObj = {}

    if (VoltUtil.isObject(module)) {
      stateObj = module
    } else {
      stateObj[module] = state
    }

    const flatState = VoltUtil.flatten(stateObj)

    for (const p in flatState) {
      _state[p] = flatState[p]
      _watchers[p] = []
    }
  }

  function getState(field) {
    return _state[field]
  }

  function setState(field, value) {
    _state[field] = value

    if (_synced[field]) {
      updateSavedState(field, value)
    }

    for (let watcher of _watchers[field]) {
      watcher.value = value
      watcher.update()
    }
  }

  function syncFields(module, fields) {
    let prefix = ''

    if (fields === undefined) {
      fields = Array.isArray(module) ? module : [module]
    } else {
      prefix = module + '.'
    }

    for (let field of fields) {
      _synced[prefix + field] = true
    }
  }

  function syncState() {
    if (Object.keys(_synced).length === 0) {
      return
    }

    const savedState = getSavedState()
    const targetState = savedState ? _state : {}
    const sourceState = savedState ? savedState : _state

    VoltUtil.assign(targetState, sourceState)

    if (!savedState) {
      setSavedState(targetState)
    }
  }

  function getSavedState() {
    const storageKey = Volt.get('storageKey')
    const savedState = localStorage.getItem(storageKey)

    try {
      return JSON.parse(savedState)
    } catch(e) {
      return null
    }
  }

  function setSavedState(state) {
    const storageKey = Volt.get('storageKey')
    localStorage.setItem(storageKey, JSON.stringify(state))
  }

  function updateSavedState(field, value) {
    const savedState = getSavedState()
    savedState[field] = value
    setSavedState(savedState)
  }

  function init() {
    syncState()
  }

  return {
    watchers: _watchers,
    register: register,
    getState: getState,
    setState: setState,
    syncFields: syncFields,
    init: init
  }
})();
