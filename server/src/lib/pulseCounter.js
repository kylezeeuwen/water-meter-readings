const _ = require('lodash')

const noop = () => {}

class PulseCounter {
  constructor({
    deviceId = 'id',
    litresPerPulse = 1,
    meterReadingBase = 0,
    pulseCountBase = 0,
    pulseCountMaxValue = 0,
    pulseCountLastObserved = 0,
    pulseCountCurrent = 0,
    overflowCount = 0,
    updateObservations = noop
  }) {
    this.deviceId = deviceId
    this.litresPerPulse = parseFloat(litresPerPulse)
    this.meterReadingBase = parseFloat(meterReadingBase)
    this.pulseCountBase = parseFloat(pulseCountBase)
    this.pulseCountMaxValue = parseFloat(pulseCountMaxValue)
    this.pulseCountLastObserved = parseFloat(pulseCountLastObserved)
    this.pulseCountCurrent = parseFloat(pulseCountCurrent)
    this.overflowCount = parseFloat(overflowCount)
    this.updateObservations = updateObservations

    const invalidMessage = (fieldName, fieldValue, deviceId) => `Invalid '${fieldName}' for device id '${deviceId}': ${fieldValue}`
    if (_.isNaN(this.litresPerPulse)) { throw new Error(invalidMessage(litresPerPulse, this.litresPerPulse, this.deviceId)) }
    if (_.isNaN(this.meterReadingBase)) { throw new Error(invalidMessage(meterReadingBase, this.meterReadingBase, this.deviceId)) }
    if (_.isNaN(this.pulseCountBase)) { throw new Error(invalidMessage(pulseCountBase, this.pulseCountBase, this.deviceId)) }
    if (_.isNaN(this.pulseCountMaxValue)) { throw new Error(invalidMessage(pulseCountMaxValue, this.pulseCountMaxValue, this.deviceId)) }
    if (_.isNaN(this.pulseCountLastObserved)) { throw new Error(invalidMessage(pulseCountLastObserved, this.pulseCountLastObserved, this.deviceId)) }
    if (_.isNaN(this.pulseCountCurrent)) { throw new Error(invalidMessage(pulseCountCurrent, this.pulseCountCurrent, this.deviceId)) }
    if (_.isNaN(this.overflowCount)) { throw new Error(invalidMessage(overflowCount, this.overflowCount, this.deviceId)) }

    this.detectAndCorrectOverflow ()
  }

  detectAndCorrectOverflow () {
    if (this.pulseCountCurrent < this.pulseCountLastObserved) {
      this.overflowCount++
      this.pulseCountLastObserved = this.pulseCountCurrent

      this.updateObservations({
        deviceId: this.deviceId,
        overflowCount: this.overflowCount,
        pulseCountLastObserved: this.pulseCountLastObserved
      })
    }
  }

  getPulseCount () {
    if (this.overflowCount === 0) {
      return this.pulseCountCurrent - this.pulseCountBase
    } else {
      return this.pulseCountMaxValue - this.pulseCountBase +
        (this.overflowCount - 1) * this.pulseCountMaxValue +
        this.pulseCountCurrent
    }
  }

  getMeterReadingInLitres () {
    return this.meterReadingBase + this.getPulseCount() * this.litresPerPulse
  }
}

module.exports = PulseCounter