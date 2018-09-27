
class PulseCounter {
  constructor({
    deviceId,
    litresPerPulse,
    meterReadingBase,
    pulseCountBase,
    pulseCountMaxValue,
    pulseCountLastObserved,
    pulseCountCurrent,
    overflowCount,
    updateObservations
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
      })
    }
  }

  // feels wrong given we are using pulseCountBase twice ??
  getMeterReadingInLitres () {
    const pulseCountAdjusted =
      this.overflowCount * this.pulseCountMaxValue +
      this.pulseCountCurrent -
      this.pulseCountBase

    const pulseDelta =
      pulseCountAdjusted - this.pulseCountBase

    return this.meterReadingBase + pulseDelta * this.litresPerPulse
  }
}

module.exports = PulseCounter