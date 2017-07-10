var VoltState = (function() {
  var _state = {}
  var _watchers = {}
  var _synced = {}
  var _isSynced = false
  
  function register(module, state) {
    var obj = {}

    if (typeof module === 'object') {
      obj = module
    } else {
      obj[module] = state
    }

    var flatState = VoltUtil.flatten(obj)

    for (var p in flatState) {
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
    
    var stateWatchers = _watchers[field]

    for (var i = 0, l = stateWatchers.length; i < l; ++i) {
      var watcher = stateWatchers[i]
      watcher.value = value
      watcher.update()
    }
  }

  function syncFields(module, fields) {
    _isSynced = true

    var prefix = ''

    if (fields) {
      prefix += module + '.'
    } else {
      fields = Array.isArray(module) ? module : [module]
    }

    for (var i = 0, l = fields.length; i < l; ++i) {
      var field = fields[i]
      _synced[prefix + field] = true
    }    
  }

  function syncState() {
    if (!_isSynced) return

    var savedState = getSavedState()
    var targetState = savedState ? _state : {}
    var sourceState = savedState ? savedState : _state

    for (var p in _synced) {
      targetState[p] = sourceState[p]
    }

    if (!savedState) {
      setSavedState(targetState)
    }
  }

  function getSavedState() {
    var savedState = localStorage.getItem(Volt.get('storageKey'))

    try {
      return JSON.parse(savedState)
    } catch(e) {
      return null
    }
  }

  function setSavedState(state) {
    localStorage.setItem(Volt.get('storageKey'), JSON.stringify(state))
  }

  function updateSavedState(field, value) {
    var savedState = getSavedState()
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
