var VoltTemplate = (function() {
  var _templates = {}

  function register(name, template) {
    _templates[name] = template
  }

  function get(name) {
    return _templates[name]
  }

  return {
    register: register,
    get: get
  }
})();
