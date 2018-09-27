module.exports = {
  performance: {
    maxSockets: 500
  },
  port: 8080,
  http_timeout_seconds: 120,
  handlerConfig: {
    keyboard: {
      path: '/usr/bin/florence',
      throttle_interval_seconds: 2 // minimum time between open keyboard open commands
    }
  },
  fileStore: {
    type: 'network',
    url: 'http://localhost:8081',
    readingsFileName: 'reading1.json',
    settingsFileName: 'meter-settings.json'
  }
}
