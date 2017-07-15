const VoltDom = (function() {
  function getById(id) {
    return document.getElementById(id)
  }

  function create(tag, html) {
    const dom = document.createElement(tag)
    dom.innerHTML = html
    return dom
  }

  function renderText(el, text) {
    text = text !== undefined && text !== null
      ? String(text)
      : ''

    el.firstChild !== null
      ? el.firstChild.nodeValue = text
      : el.appendChild(document.createTextNode(text))
  }

  function replace(oldNode, newNode) {
    oldNode.parentNode.replaceChild(newNode, oldNode)
  }

  function remove(el) {
    el.parentNode.removeChild(el)
  }

  function removeMulti(els) {
    for (let i = 0, l = els.length; i < l; ++i) {
      remove(els[i])
    }
  }

  function fragment() {
    return document.createDocumentFragment()
  }

  function addAttribute(el, name) {
    el.setAttribute(name, '')
  }

  function copyAttributes(_from, to) {
    const attrs = _from.attributes

    for (let i = 0, l = attrs.length; i < l; ++i) {
      const attr = attrs[i]
      let name = attr.name

      if (name.startsWith('@')) {
        name = 'v-' + name.slice(1)
      }

      to.setAttribute(name, attr.value)
    }
  }

  function transferChildren(_from, to) {
    while (_from.childNodes.length > 0) {
      to.appendChild(_from.childNodes[0])
    }
    
    return to
  }

  function hide(el) {
    el.style.display = 'none'
  }

  function show(el) {
    el.style.display = ''
  }

  function clear(el) {
    el.innerHTML = ''
  }

  return {
    get: getById,
    create: create,
    hide: hide,
    show: show,
    clear: clear,
    replace: replace,
    remove: remove,
    removeMulti: removeMulti,
    addAttribute: addAttribute,
    transferChildren: transferChildren,
    copyAttributes: copyAttributes,
    fragment: fragment,
    renderText: renderText
  }
})();
