var VoltRouter = (function() {
  var _supportsPushState = typeof window.history.pushState === 'function'
  var _callAsync = typeof setImmediate === 'function' ? setImmediate : setTimeout
  var _routes = []
  var _beforeEachHook
  var _asyncId

  var _router = {
    query: {},
    params: {},
    hash: null,
    name: null,
    path: null,
    fullPath: null
  }

  function debounceAsync(callback) {
    return function() {
      if (_asyncId != null) {
        return
      }
      _asyncId = _callAsync(function() {
        _asyncId = null
        callback()
      })
    }
  }

  function normalize(fragment) {
    var data = window.location[fragment].replace(/(?:%[a-f89][a-f0-9])+/gim, decodeURIComponent)

    if (fragment === 'pathname' && data[0] !== '/') {
      data = '/' + data
    }

    return data
  }

  function getPath() {
    return normalize('pathname') + normalize('search') + normalize('hash')
  }

  function register(route) {
    Array.isArray(route) ? _routes.push.apply(_routes, route) : _routes.push(route)
  }

  function parseQuery(string) {
    var queryData = {}
    var entries = string.split('&')

    for (var i = 0, l = entries.length; i < l; ++i) {
      var entry = entries[i]
      var parts = entry.split('=')
      var numParts = parts.length

      if (numParts === 1) {
        VoltUtil.pushQueryParam(parts[0], '', queryData)
      } else if (numParts === 2 && parts[0] && parts[1]) {
        VoltUtil.pushQueryParam(parts[0], parts[1], queryData)
      }
    }

    return queryData
  }

  function buildQueryString(query) {
    if (!query) return null

    var queryString = '?'

    for (var key in query) {
      queryString += key + '=' + query[key] + '&'
    }

    queryString = queryString.slice(0, -1)
    return queryString
  }

  function parsePath(path, data) {
    var queryIndex = path.indexOf('?')
    var hashIndex = path.indexOf('#')
    var pathEnd = queryIndex > -1 ? queryIndex : hashIndex > -1 ? hashIndex : path.length

    data.query = {}

    if (queryIndex !== -1) {
      var queryEnd = hashIndex !== -1 ? hashIndex : path.length
      data.query = parseQuery(path.slice(queryIndex + 1, queryEnd))
    }

    data.hash = (hashIndex !== -1) ? path.slice(hashIndex + 1) : null

    return path.slice(0, pathEnd)
  }

  function replacePathParams(routePath, pathname, matcher, data) {
    pathname.replace(matcher, function() {
      var keys = routePath.match(/:[^\/]+/g) || []
      var values = [].slice.call(arguments, 1, -2)

      for (var i = 0, l = keys.length; i < l; ++i) {
        data.params[keys[i].replace(/:|\./g, '')] = values[i]
      }
    })
  }

  function prepareRoute() {
    var path = getPath()
    var data = { params: {} }
    var pathname = parsePath(path, data)

    for (var i = 0, l = _routes.length; i < l; ++i) {
      var route = _routes[i]
      var routePath = route.path

      if (routePath === '*') {
        routePath = '/' + routePath
      }

      var matcher = new RegExp('^' + routePath.replace(/:[^\/]+?\.{3}/g, '(.*?)').replace(/:[^\/]+/g, '([^\\/]+)') + '\/?$')
      
      if (matcher.test(pathname)) {
        replacePathParams(routePath, pathname, matcher, data)

        var toRoute = {
          name: route.name,
          path: pathname,
          fullPath: path,
          params: data.params,
          query: data.query,
          hash: data.hash
        }

        var fromRoute = VoltUtil.clone(_router)

        function resolveNext() {
          for (var p in toRoute) {
            _router[p] = toRoute[p]
          }
          // TODO: init component stuff
        }

        function resolveChain(prev) {
          return function() {
            prev(_router, toRoute, resolveNext)
          }
        }

        var beforeHook, beforeEachHook

        if (_beforeEachHook) {
          beforeEachHook = typeof _beforeEachHook === 'string' ? VoltAction.get(_beforeEachHook) : _beforeEachHook
        }

        if (route.before) {
          beforeHook = typeof route.before === 'string' ? VoltAction.get(route.before) : route.before
        }

        var hook = beforeEachHook ? beforeEachHook : beforeHook ? beforeHook : null
        var next = beforeEachHook && beforeHook ? resolveChain(beforeHook) : resolveNext

        if (hook) {
          hook(fromRoute, toRoute, next)
        } else {
          resolveNext()
        }

        return
      }
    }
  }

  function beforeRoute(hook) {
    _beforeEachHook = hook
  }

  function go(options) {
    var name = options.name

    for (var i = 0, l = _routes.length; i < l; ++i) {
      var route = _routes[i]

      if (route.name === name) {
        var path = route.path

        path = path.replace(/:([^\/]+)/g, function(match, token) {
          return options.params[token]
        })

        var queryString = buildQueryString(options.query)

        if (queryString) {
          path += queryString
        }

        if (options.hash) {
          path += '#' + options.hash
        }

        if (_supportsPushState) {
          var title = options.title ? options.title : route.meta ? route.meta.title : null

          if (options.replace) {
            window.history.replaceState({}, title, path)
          } else {
            window.history.pushState({}, title, path)
          }

          prepareRoute()
        } else {
          window.location.href = path
        }

        return
      }
    }

    // TODO: Handle no route path match, use default * route or error if none exists
  }

  var init = function() {
    if (_supportsPushState) {
      window.onpopstate = debounceAsync(prepareRoute)
    }

    prepareRoute()
  }

  return {
    go: go,
    router: _router,
    register: register,
    beforeRoute: beforeRoute,
    init: init
  }
})();
