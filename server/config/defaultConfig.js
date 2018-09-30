module.exports = {
  log_level: 'info', // valid values: [ 'trace' | 'debug' | 'info' | 'warn' | 'error' ]
  performance: {
    max_sockets: 500,
    max_event_listeners: 100
  },
  port: 8080,
  http_timeout_seconds: 120,
  pulse_counters: {
    max_value: 2559999
  },
  keyboard: {
    path: '/usr/bin/florence',
    throttle_interval_seconds: 2 // minimum time between open keyboard open commands
  },
  file_store: {
    type: 'network',
    url: 'http://localhost:8081',
    readings_file_name: 'reading1.json',
    settings_file_name: 'meter-settings.json'
  },
  overflow_detector: {
    polling_interval_seconds: 86400 * 0.5
  }
}
