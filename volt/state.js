const VoltState = (function() {
  const _state = {}
  const _watchers = {}
  const _synced = {}
  let _isSynced = false
  
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
    
    const stateWatchers = _watchers[field]

    for (let i = 0, l = stateWatchers.length; i < l; ++i) {
      const watcher = stateWatchers[i]
      watcher.value = value
      watcher.update()
    }
  }

  function syncFields(module, fields) {
    if (fields === undefined) {
      fields = Array.isArray(module) ? module : [module]
    }

    let prefix = fields !== undefined ? module + '.' : ''

    for (let i = 0, l = fields.length; i < l; ++i) {
      _isSynced = true
      _synced[prefix + fields[i]] = true
    }
  }

  function syncState() {
    if (!_isSynced) {
      return
    }

    const savedState = getSavedState()
    const targetState = savedState ? _state : {}
    const sourceState = savedState ? savedState : _state

    for (const p in _synced) {
      targetState[p] = sourceState[p]
    }

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
