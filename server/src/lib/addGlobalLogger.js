// cheap logging hack. must be done before importing anything that assumes logger is global
function isObject(obj) {
  return (obj !== null && typeof obj === 'object')
}

module.exports = function addGlobalLogger (globalLogLevel) {
  const rootLogger = require('loglevel')
  const originalFactory = rootLogger.methodFactory;

  rootLogger.methodFactory = function (methodName, logLevel, loggerName) {
    const rawMethod = originalFactory(methodName, logLevel, loggerName)
    return function (messageData) {
      if (isObject(messageData)) {
        rawMethod(JSON.stringify({ logLevel: methodName, timestamp: (new Date()).toISOString(), ...messageData }))
      } else {
        rawMethod(JSON.stringify({ logLevel: methodName, timestamp: (new Date()).toISOString(), message: messageData }))
      }
    }
  }

  rootLogger.setLevel(globalLogLevel)
  global['logger'] = rootLogger
}