const VoltAction = (function() {
  const _actions = {}

  function register(name, action) {
    _actions[name] = action
  }

  function get(name) {
    return _actions[name]
  }

  function dispatch(name, args) {
    const action = get(name)
    return Array.isArray(args) ? action.apply(this, args) : action(args)
  }

  return {
    register: register,
    dispatch: dispatch,
    get: get
  }
})();
