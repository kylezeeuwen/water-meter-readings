const _ = require('lodash')

class ResetReading {
  constructor ({ pulseCounterManager }) {
    this.pulseCounterManager = pulseCounterManager

    // NB bind handler so fn handler can be passed direct to express route
    this.requestHandler = this.requestHandler.bind(this)
  }

  requestHandler (req, res) {
    const pulseCounterId = _.get(req, 'params.pulseCounterId', false)
    const newBaseReadingLitres = _.get(req, 'body.value', false)

    this.pulseCounterManager.getPulseCounter(pulseCounterId)
      .then(pulseCounter => pulseCounter.resetReading(newBaseReadingLitres))
      .then(() => this.pulseCounterManager.getPulseCounter(pulseCounterId))
      .then(pulseCounter => {
        const { reading } = pulseCounter.getDisplayInfo()
        return reading
      })
      .then((reading) => {
        res.status(200)
        res.header('content-type', 'application/json')
        res.send({ newReading: reading })
      })
      .catch(error => {
        res.status(500)
        logger.error({eventType: `reset-reading-failed`, path: req.path, message: error.message, stack: error.stack})
        res.header('content-type', 'application/json')
        res.send({error: error.message || error, stack: error.stack})
      })
  }
}

module.exports = ResetReading