class GetReadingsHandler {
  constructor ({ pulseCounterManager }) {
    this.pulseCounterManager = pulseCounterManager

    // NB bind handler so fn handler can be passed direct to express route
    this.requestHandler = this.requestHandler.bind(this)
  }

  requestHandler (req, res) {
    this.pulseCounterManager.getPulseCounters().then(pulseCounters => {
      const response = pulseCounters.map(pulseCounter => pulseCounter.getDisplayInfo())
      res.status(200)
      res.header('content-type', 'application/json')
      res.send(JSON.stringify(response))
    }).catch(error => {
      res.status(500)
      logger.error({eventType: '/server/meter/water-rates failed', message: error.message, stack: error.stack})
      res.header('content-type', 'application/json')
      res.send({error: error.message, stack: error.stack})
    })
  }
}

module.exports = GetReadingsHandler