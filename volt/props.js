var VoltProps = (function() {
  var PropTypes = {
    Number: 'number',
    String: 'string',
    Array: 'array',
    Object: 'object',
    Function: 'function',
    Boolean: 'boolean'
  }

  function propTypeError(expected, got) {
    return 'Invalid prop type. Expected ' + expected + ', but got ' + got
  }

  function convert(value, type) {
    var ret

    var valueType = value !== null ? typeof value : null

    if (type === PropTypes.Array) {
      if (!Array.isArray(value)) {
        throw propTypeError('array', valueType)
      }
      return value
    }

    if (value === null) {
      throw propTypeError(type, null)
    }

    switch (type) {
      case PropTypes.String:
        if (valueType !== 'string') {
          throw propTypeError('string', valueType)
        }
        ret = value
        break
      case PropTypes.Number:
        if (isNaN(value)) {
          throw propTypeError('number', valueType)
        }
        ret = Number(value)
        break
      case PropTypes.Object:
        if (valueType === 'object') {
          ret = value
        } else if (valueType === 'string') {
          try {
            ret = JSON.parse(value)
          } catch(e) {
            throw propTypeError('object', valueType)
          }
        } else {
          throw propTypeError('object', valueType)
        }
        break
      case PropTypes.Function:
        if (valueType !== 'function') {
          throw propTypeError('function', valueType)
        }
        ret = value
        break
      case PropTypes.Boolean:
        if (valueType === 'boolean') {
          ret = value
        } else if (valueType === 'string') {
          if (value === 'true') {
            ret = true
          } else if (value === 'false') {
            ret = false
          }
        } else {
          throw propTypeError('boolean', valueType)
        }
        break
      default:
        ret = value
        break
    }

    return ret
  }

  return {
    convert: convert,
    PropTypes: PropTypes
  }
})();
