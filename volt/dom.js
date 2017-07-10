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
    text = typeof text !== 'undefined' ? String(text) : ''

    if (el.firstChild) {
      el.firstChild.nodeValue = text
    } else {
      el.appendChild(document.createTextNode(text))
    }
  }

  function replaceNode(oldNode, newNode) {
    oldNode.parentNode.replaceChild(newNode, oldNode)
  }

  function createFragment() {
    return document.createDocumentFragment()
  }

  function setAttribute(el, name, value) {
    el.setAttribute(name, value)
  }

  return {
    get: getById,
    create: create,
    replace: replaceNode,
    fragment: createFragment,
    setAttribute: setAttribute,
    renderText: renderText
  }
})();
