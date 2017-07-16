const VoltRouter = (function() {
  const _supportsPushState = typeof window.history.pushState === 'function'
  const _callAsync = typeof setImmediate === 'function' ? setImmediate : setTimeout
  const _routes = []
  let _beforeEachHook
  let _asyncId

  const _router = {
    query: {},
    params: {},
    hash: null,
    name: null,
    path: null,
    fullPath: null
  }

  function debounceAsync(callback) {
    return () => {
      if (_asyncId != null) {
        return
      }
      _asyncId = _callAsync(() => {
        _asyncId = null
        callback()
      })
    }
  }

  function normalize(fragment) {
    let data = window.location[fragment].replace(/(?:%[a-f89][a-f0-9])+/gim, decodeURIComponent)

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
    const queryData = {}
    const entries = string.split('&')

    for (let entry of entries) {
      const parts = entry.split('=')
      const numParts = parts.length

      if (numParts === 1) {
        VoltUtil.pushQueryParam(parts[0], '', queryData)
      } else if (numParts === 2 && parts[0] && parts[1]) {
        VoltUtil.pushQueryParam(parts[0], parts[1], queryData)
      }
    }

    return queryData
  }

  function parsePath(path, data) {
    const queryIndex = path.indexOf('?')
    const hashIndex = path.indexOf('#')
    const pathEnd = queryIndex > -1 ? queryIndex : hashIndex > -1 ? hashIndex : path.length

    data.query = {}

    if (queryIndex !== -1) {
      const queryEnd = hashIndex !== -1 ? hashIndex : path.length
      data.query = parseQuery(path.slice(queryIndex + 1, queryEnd))
    }

    data.hash = (hashIndex !== -1) ? path.slice(hashIndex + 1) : null

    return path.slice(0, pathEnd)
  }

  function replacePathParams(routePath, pathname, matcher, data) {
    pathname.replace(matcher, () => {
      const keys = routePath.match(/:[^\/]+/g) || []
      const values = [].slice.call(arguments, 1, -2)

      for (let i = 0, l = keys.length; i < l; ++i) {
        data.params[keys[i].replace(/:|\./g, '')] = values[i]
      }
    })
  }

  function prepareRoute() {
    const path = getPath()
    const data = { params: {} }
    const pathname = parsePath(path, data)

    for (let route of _routes) {
      const routePath = route.path === '*'
        ? '/' + route.path
        : route.path

      const matcher = new RegExp('^' + routePath.replace(/:[^\/]+?\.{3}/g, '(.*?)').replace(/:[^\/]+/g, '([^\\/]+)') + '\/?$')
      
      if (matcher.test(pathname)) {
        replacePathParams(routePath, pathname, matcher, data)

        const toRoute = {
          name: route.name,
          path: pathname,
          fullPath: path,
          params: data.params,
          query: data.query,
          hash: data.hash
        }

        const fromRoute = VoltUtil.clone(_router)

        const resolveNext = () => {
          Object.assign(_router, toRoute)
          // TODO: init component stuff
        }

        const resolveChain = prev => () => {
          return prev(_router, toRoute, resolveNext)
        }

        let beforeHook, beforeEachHook

        if (_beforeEachHook) {
          beforeEachHook = typeof _beforeEachHook === 'string'
            ? VoltAction.get(_beforeEachHook)
            : _beforeEachHook
        }

        if (route.before) {
          beforeHook = typeof route.before === 'string'
            ? VoltAction.get(route.before)
            : route.before
        }

        const hook = beforeEachHook ? beforeEachHook : beforeHook ? beforeHook : null
        const next = beforeEachHook && beforeHook ? resolveChain(beforeHook) : resolveNext

        hook ? hook(fromRoute, toRoute, next) : resolveNext()

        return
      }
    }
  }

  function beforeRoute(hook) {
    _beforeEachHook = hook
  }

  function go(options) {
    const name = options.name

    for (let route of _routes) {
      if (route.name === name) {
        let path = route.path

        path = path.replace(/:([^\/]+)/g, (match, token) => {
          return options.params[token]
        })

        path += VoltUtil.buildQueryString(options.query)

        if (options.hash) {
          path += '#' + options.hash
        }

        if (_supportsPushState) {
          const title = options.title ? options.title : route.meta ? route.meta.title : null

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

  function init() {
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
