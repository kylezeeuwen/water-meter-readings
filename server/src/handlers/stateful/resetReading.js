const _ = require('lodash')

class ResetReading {
  constructor ({ pulseCounterManager }) {
    this.pulseCounterManager = pulseCounterManager

    // NB bind handler so fn handler can be passed direct to express route
    this.requestHandler = this.requestHandler.bind(this)
  }

  requestHandler (req, res) {
    const deviceChannelId = _.get(req, 'params.deviceChannelId', false)
    const newBaseReading = _.get(req, 'body.value', false)

    this.pulseCounterManager.getPulseCounter(deviceChannelId)
      .then(pulseCounter => pulseCounter.resetReading(newBaseReading))
      .then(() => {
        res.status(200)
        res.header('content-type', 'application/json')
        res.send()

      })
      .catch(error => {
        res.status(500)
        logger.error({eventType: '/device-channels/:deviceChannelId/reset-reading failed', message: error.message, stack: error.stack})
        res.header('content-type', 'application/json')
        res.send({error: error.message || error, stack: error.stack})
      })
  }
}

module.exports = ResetReading