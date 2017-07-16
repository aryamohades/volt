const VoltProps = (function() {
  const PropTypes = {
    Number: 'number',
    String: 'string',
    Array: 'array',
    Object: 'object',
    Function: 'function',
    Boolean: 'boolean'
  }

  function propTypeError(expected, got) {
    throw new Error('Invalid prop type. Expected ' + expected + ', but got ' + got)
  }

  function validatorFn(value, expect, type) {
    const reject = () => {
      if (value === null) {
        propTypeError(expect, null)
      }

      propTypeError(expect, type)
    }

    return function(fn) {
      return fn(value, type, reject)
    }
  }

  function isDef(value, type, reject) {
    if (value === undefined || value === null) {
      reject()
    }
  }

  function isString(value, type, reject) {
    if (type !== PropTypes.String) {
      reject()
    }

    return value
  }

  function isNumber(value, type, reject) {
    if (isNaN(value)) {
      reject()
    }

    return Number(value)
  }

  function isBoolean(value, type, reject) {
    if (type === PropTypes.String) {
      if (value === 'true') {
        return true
      } else if (value === 'false') {
        return false
      } else {
        reject()
      }
    } else if (type !== PropTypes.Boolean) {
      reject()
    }

    return value
  }

  function isArray(value, type, reject) {
    if (!Array.isArray(value)) {
      reject()
    }

    return value
  }

  function isObject(value, type, reject) {
    if (type === PropTypes.String) {
      try {
        return JSON.parse(value)
      } catch (e) {
        reject()
      }
    } else if (!VoltUtil.isObject(value)) {
      reject()
    }

    return value
  }

  function isFunction(value, type, reject) {
    if (type !== PropTypes.Function) {
      reject()
    }

    return value
  }

  function validate(value, expect) {
    const validator = validatorFn(value, expect, typeof value)
    
    validator(isDef)

    switch (expect) {
      case PropTypes.String:
        return validator(isString)
      case PropTypes.Number:
        return validator(isNumber)
      case PropTypes.Array:
        return validator(isArray)
      case PropTypes.Boolean:
        return validator(isBoolean)
      case PropTypes.Object:
        return validator(isObject)
      case PropTypes.Function:
        return validator(isFunction)
      default:
        return value
    }
  }

  return {
    validate: validate,
    PropTypes: PropTypes
  }
})();
