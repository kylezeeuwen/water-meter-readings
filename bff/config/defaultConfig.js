module.exports = {
  performance: {
    maxSockets: 500
  },
  port: 8080,
  http_timeout_seconds: 120,
  keyboard: {
    path: '/usr/bin/florence',
    openCommand: '',
  },
  fileStore: {
    type: 'network',
    url: 'http://localhost:8081',
    readingsFileName: 'reading1.json',
    settingsFileName: 'meter-settings.json'
  }
}
