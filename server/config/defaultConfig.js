module.exports = {
  performance: {
    maxSockets: 500
  },
  port: 8080,
  http_timeout_seconds: 120,
  pulseCounters: {
    maxValue: 2559999
  },
  keyboard: {
    path: '/usr/bin/florence',
    throttle_interval_seconds: 2 // minimum time between open keyboard open commands
  },
  fileStore: {
    type: 'network',
    url: 'http://localhost:8081',
    readingsFileName: 'reading1.json',
    settingsFileName: 'meter-settings.json'
  },
  overflow_detector: {
    polling_interval_seconds: 86400 * 0.5
  }
}
