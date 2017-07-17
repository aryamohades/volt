const VoltUpdate = (function() {

  function updateAttribute() {
    const watcher = this
    watcher.value = getUpdateValue(watcher)
    watcher.el.setAttribute(watcher.attr, watcher.value)
  }

  function updateText() {
    const watcher = this
    watcher.value = getUpdateValue(watcher)
    VoltDom.renderText(watcher.el, watcher.value)
  }

  function updateFor() {
    const watcher = this
    const scope = watcher.scopeObj.scope
    watcher.value = getUpdateValue(watcher)

    if (!Array.isArray(watcher.value)) {
      clearFor(watcher)
      return hideAnchor(watcher)
    }

    const frag = VoltDom.fragment()

    if (watcher.value.length === 0) {
      return hideAnchor(watcher)
    }

    replaceFor(watcher, getForDom(watcher))
  }

  function updateIf() {
    const watcher = this

    const watcherObj = getActiveIf(watcher)
    const activeWatcher = watcherObj.watcher
    const hasActive = watcherObj.hasActive

    if (activeWatcher) {
      VoltDom.replace(watcher.anchor, activeWatcher.newNode)

      for (let w of watcher.chain) {
        w.activeWatcher = activeWatcher
        w.anchor = activeWatcher.newNode
      }
    } else if (!hasActive) {
      hideAnchor(watcher)

      for (let w of watcher.chain) {
        w.activeWatcher = null
      }
    }
  }

  function updateModelText(watcher) {
    watcher.el.value = watcher.value
  }

  function updateModelChecked(watcher) {
    watcher.el.checked = watcher.value
  }
  
  function updateModelColor(watcher) {
    watcher.el.value = watcher.value
  }

  const _modelUpdaters = {
    text: updateModelText,
    checkbox: updateModelChecked,
    radio: updateModelChecked,
    color: updateModelColor
  }

  function updateModel() {
    const watcher = this
    const updater = _modelUpdaters[watcher.type]
    updater(watcher)
  }

  function getForDom(watcher) {
    const loopScope = watcher.scopeObj.loopScope || {}
    const dom = VoltDom.fragment()
    
    for (let entry of watcher.value) {
      loopScope[watcher.var] = entry

      const node = VoltComponent.setupDom(watcher.html, {
        scope: watcher.scopeObj.scope,
        parentScope: watcher.scopeObj.parentScope,
        loopScope: loopScope
      })

      watcher.newEls.push(node)
      dom.appendChild(node)
    }

    return dom
  }

  function replaceFor(watcher, dom) {
    const scope = watcher.scopeObj.scope
    const newAnchor = watcher.newEls[0]

    for (let w of scope._if) {
      if (w.anchor === watcher.anchor) {
        for (let node of w.chain) {
          node.anchor = newAnchor
        }

        break
      }
    }

    clearFor(watcher)

    for (let el of watcher.newEls) {
      watcher.els.push(el)
    }

    watcher.newEls = []
    VoltDom.replace(watcher.anchor, dom)
    watcher.anchor = newAnchor
    VoltDom.show(watcher.anchor)
  }

  function disposeFor(watcher) {
    clearFor(watcher)

    const scope = watcher.scopeObj.scope

    const watcherIdx = scope._for.indexOf(watcher)

    if (watcherIdx !== -1) {
      scope._for.splice(watcherIdx, 1)
    }

    for (let field of watcher.dataFields) {
      const watchers = scope._dataWatchers[field]
      const idxFound = watchers.indexOf(watcher)

      if (idxFound !== -1) {
        watchers.splice(idxFound, 1)
      }
    }
  }

  function clearFor(watcher) {
    for (let i = 1, l = watcher.els.length; i < l; ++i) {
      VoltDom.remove(watcher.els[i])
    }

    watcher.els = []
  }

  function getActiveIf(watcher) {
    let activeWatcher = null
    let hasActive = false
    let deactivate

    for (let w of watcher.chain) {
      w.value = getUpdateValue(w)

      if (w.value === true && w !== w.activeWatcher && !hasActive) {
        if (w.activeWatcher) {
          deactivate = w.activeWatcher.anchor
        }

        activeWatcher = w
        activeWatcher.newNode = VoltComponent.setupDom(w.html, w.scopeObj)
      } else if (w.value === false && w === w.activeWatcher) {
        deactivate = w.anchor
      }

      if (w.value === true) {
        hasActive = true
      }
    }

    if (deactivate) {
      deactivateShared(watcher.scopeObj.scope, deactivate)
    }

    return {
      watcher: activeWatcher,
      hasActive: hasActive
    }
  }

  function hideAnchor(watcher) {
    VoltDom.hide(watcher.anchor)
    VoltDom.clear(watcher.anchor)
  }

  function deactivateShared(scope, anchor) {
    for (let watcher of scope._for) {
      if (watcher.anchor === anchor) {
        disposeFor(watcher)
        break
      }
    }
  }

  function getUpdateValue(watcher) {
    const scope = watcher.scopeObj.scope
    let value

    if (watcher.fn) {
      const stateArgs = watcher.stateFields.map(field => VoltState.getState(field))
      const dataArgs = watcher.dataFields.map(field => VoltUtil.get(scope, field))
      value = watcher.fn.apply(this, stateArgs.concat(dataArgs))
    } else {
      value = watcher.value
    }

    scope[watcher.bindTo] = value
    return value
  }

  return {
    updateText: updateText,
    updateAttribute: updateAttribute,
    updateFor: updateFor,
    updateIf: updateIf,
    updateModel: updateModel
  }
})()
