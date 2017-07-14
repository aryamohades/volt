var VoltRequest = (function() {
  var _requests = {}
  var _api = {}
  var _beforeEachHook

  function register(name, request) {
    request.method = request.method.toLowerCase()
    _requests[name] = request
  }

  function get(name) {
    return _requests[name]
  }

  function api(options) {
    _api.base = options.base
  }

  function success(req) {
    return req.status >= 200 && req.status < 400
  }

  function attachRequestHandlers(request, options) {
    var scope = this

    request.onload = function() {
      var res = {
        status: request.status
      }

      try {
        res.data = JSON.parse(request.responseText)
      } catch (e) {
        res.data = null
      }

      if (success(request) && options.success) {
        options.success.bind(scope)(res)
      } else if (options.error) {
        options.error.bind(scope)(res)
      }

      if (options.after) {
        options.after.bind(scope)()
      }
    }

    request.onerror = function() {
      if (options.error) {
        options.error.bind(scope)()
      }
    }
  }

  function setRequestHeaders(request, options) {
    for (var p in options.headers) {
      if (options.headers[p]){
        request.setRequestHeader(p, options.headers[p])
      }
    }
  }

  function sendRequest(request, options) {
    options.data ? request.send(JSON.stringify(options.data)) : request.send()
  }

  function makeRequest(options) {
    var scope = this

    if (options.before) {
      options.before.bind(scope)()
    }

    var request = new XMLHttpRequest()
    var requestUrl = _api.base + options.endpoint

    requestUrl = requestUrl.replace(/:([^\/]+)/g, function(match, token) {
      return options.params[token]
    })

    requestUrl += buildQueryString(options.query)

    request.open(options.method, requestUrl, true)

    if (options.method === 'post') {
      request.setRequestHeader('Content-Type', 'application/json; charset=UTF-8')
    }

    attachRequestHandlers.bind(scope)(request, options)
    setRequestHeaders(request, options)
    sendRequest(request, options)
  }

  function prepareRequest(name, options) {
    var request = get(name)

    for (var p in request) {
      options[p] = request[p]
    }

    if (!options.headers) options.headers = {}
    if (!options.params) options.params = {}

    return function() {
      if (_beforeEachHook) {
        _beforeEachHook(options)
      }

      makeRequest.bind(this)(options)
    }
  }

  function beforeRequest(hook) {
    _beforeEachHook = hook
  }

  function buildQueryString(query) {
    if (!query) return ''

    var queryString = '?'

    for (var key in query) {
      queryString += key + '=' + query[key] + '&'
    }

    queryString = queryString.slice(0, -1)
    return queryString
  }

  return {
    register: register,
    beforeRequest: beforeRequest,
    prepareRequest: prepareRequest,
    get: get,
    api: api
  }
})();
