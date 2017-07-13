var VoltDom = (function() {
  function getById(id) {
    return document.getElementById(id)
  }

  function create(tag, html) {
    var dom = document.createElement(tag)
    dom.innerHTML = html
    return dom
  }

  function renderText(el, text) {
    text = text !== undefined && text !== null ? String(text) : ''

    if (el.firstChild) {
      el.firstChild.nodeValue = text
    } else {
      el.appendChild(document.createTextNode(text))
    }
  }

  function replaceNode(oldNode, newNode) {
    oldNode.parentNode.replaceChild(newNode, oldNode)
  }

  function removeNode(el) {
    el.parentNode.removeChild(el)
  }

  function removeNodes(remove) {
    for (var i = 0, l = remove.length; i < l; ++i) {
      removeNode(remove[i])
    }
  }

  function createFragment() {
    return document.createDocumentFragment()
  }

  function setAttribute(el, name, value) {
    el.setAttribute(name, value)
  }

  function getAttribute(el, name) {
    return el.getAttribute(name)
  }
  
  function addAttribute(el, name) {
    el.setAttribute(name, '')
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
    remove: removeNode,
    removeMulti: removeNodes,
    replace: replaceNode,
    fragment: createFragment,
    setAttribute: setAttribute,
    getAttribute: getAttribute,
    addAttribute: addAttribute,
    renderText: renderText
  }
})();
