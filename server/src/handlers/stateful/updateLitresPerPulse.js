const _ = require('lodash')

class UpdateLitresPerPulse {
  constructor ({ meterSettings }) {
    this.meterSettings = meterSettings

    // NB bind handler so fn handler can be passed direct to express route
    this.requestHandler = this.requestHandler.bind(this)
  }

  requestHandler (req, res) {

    const pulseCounterId = _.get(req, 'params.pulseCounterId', false)
    const litresPerPulse = parseFloat(_.get(req, 'body.value', false))

    // NB !pulseCounterId should not ever happen (cannot get here unless pulseCounterId in path
    if (!pulseCounterId) {this._sendValidationError(res, 'missing pulseCounterId')}
    else if (_.isNaN(litresPerPulse)) {this._sendValidationError(res,'value is not a valid number')}
    else if (litresPerPulse < 0) {this._sendValidationError(res,'value cannot be negative')}
    else {
      this.meterSettings.setPulseCounterField(pulseCounterId, 'litresPerPulse', litresPerPulse)
        .then(() => {
          res.status(200)
          res.send()
        })
        .catch(error => {
          res.status(500)
          logger.error({eventType: `update-litres-per-pulse-failed`, path: req.path, message: error.message, stack: error.stack})
          res.header('content-type', 'application/json')
          res.send({error: error.message, stack: error.stack})
        })
    }
  }

  _sendValidationError (res, message) {
    res.status(400)
    res.header('content-type', 'application/json')
    res.send(JSON.stringify({message}))
  }
}

module.exports = UpdateLitresPerPulse