const _ = require('lodash')

class OverflowDetector {
  constructor( { pulseCounterManager, pollIntervalMilliseconds }) {
    this.pulseCounterManager = pulseCounterManager
    this.pollIntervalMilliseconds = parseInt(pollIntervalMilliseconds)
    if (_.isNaN(this.pollIntervalMilliseconds) || this.pollIntervalMilliseconds < 1000) {
      throw new Error(`Invalid pollIntervalMilliseconds '${this.pollIntervalMilliseconds}. Must be valid number >= 1000`)
    }
  }

  start () {
    logger.info({ eventType: 'start_overflow_detector', interval_in_minutes: parseFloat(this.pollIntervalMilliseconds / (1000 * 60)).toFixed(), interval_in_days: parseFloat(this.pollIntervalMilliseconds / (1000 * 86400)).toFixed(2) })
    this.pollingHandle = setInterval(() => {
      this.detectOverflowAndUpdateObservations()
    }, this.pollIntervalMilliseconds)
  }

  stop () {
    logger.info({ eventType: 'stop_overflow_detector' })
    clearInterval(this.pollingHandle)
  }

  detectOverflowAndUpdateObservations () {
    logger.info({ eventType: 'overflow_detector_run' })
    this.pulseCounterManager.getPulseCounters() // this will auto trigger the overflow detection and updating
  }
}

module.exports = OverflowDetector