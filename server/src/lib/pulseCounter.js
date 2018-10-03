const _ = require('lodash')

const noop = () => {}

class PulseCounter {
  constructor({
    id = 'id',
    displayName = this.id,
    time,
    litresPerPulse = 1,
    meterReadingBaseLitres = 0,
    pulseCountBase = 0,
    pulseCountMaxValue = 0,
    pulseCountLastObservedValue = 0,
    pulseCountLastObservedTimestamp = 0,
    maxObservationAgeMilliseconds = 1,
    pulseCountCurrent = 0,
    overflowCount = 0,
    updateSettings = noop
  } = {}) {
    this.id = id
    this.time = time
    this.displayName = displayName
    this.litresPerPulse = parseFloat(litresPerPulse)
    this.meterReadingBaseLitres = parseFloat(meterReadingBaseLitres)
    this.pulseCountBase = parseFloat(pulseCountBase)
    this.pulseCountMaxValue = parseFloat(pulseCountMaxValue)
    this.pulseCountLastObservedValue = parseFloat(pulseCountLastObservedValue)
    this.pulseCountLastObservedTimestamp = parseFloat(pulseCountLastObservedTimestamp)
    this.maxObservationAgeMilliseconds = parseFloat(maxObservationAgeMilliseconds)
    this.pulseCountCurrent = parseFloat(pulseCountCurrent)
    this.overflowCount = parseFloat(overflowCount)
    this.updateSettings = updateSettings

    const invalidMessage = (fieldName, fieldValue, id) => `Invalid '${fieldName}' for device id '${id}': ${fieldValue}`
    if (_.isNaN(this.litresPerPulse)) { throw new Error(invalidMessage('litresPerPulse', this.litresPerPulse, this.id)) }
    if (_.isNaN(this.meterReadingBaseLitres)) { throw new Error(invalidMessage('meterReadingBaseLitres', this.meterReadingBaseLitres, this.id)) }
    if (_.isNaN(this.pulseCountBase)) { throw new Error(invalidMessage('pulseCountBase', this.pulseCountBase, this.id)) }
    if (_.isNaN(this.pulseCountMaxValue)) { throw new Error(invalidMessage('pulseCountMaxValue', this.pulseCountMaxValue, this.id)) }
    if (_.isNaN(this.pulseCountLastObservedValue)) { throw new Error(invalidMessage('pulseCountLastObservedValue', this.pulseCountLastObservedValue, this.id)) }
    if (_.isNaN(this.pulseCountLastObservedTimestamp)) { throw new Error(invalidMessage('pulseCountLastObservedTimestamp', this.pulseCountLastObservedTimestamp, this.id)) }
    if (_.isNaN(this.maxObservationAgeMilliseconds)) { throw new Error(invalidMessage('maxObservationAgeMilliseconds', this.maxObservationAgeMilliseconds, this.id)) }
    if (_.isNaN(this.pulseCountCurrent)) { throw new Error(invalidMessage('pulseCountCurrent', this.pulseCountCurrent, this.id)) }
    if (_.isNaN(this.overflowCount)) { throw new Error(invalidMessage('overflowCount', this.overflowCount, this.id)) }

    this.detectAndCorrectOverflow ()
  }

  detectAndCorrectOverflow () {
    if (this.pulseCountCurrent < this.pulseCountLastObservedValue) {
      this.overflowCount++
      this.pulseCountLastObservedValue = this.pulseCountCurrent
      this.pulseCountLastObservedTimestamp = Date.now()

      this.updateSettings({
        id: this.id,
        fields: {
          overflowCount: this.overflowCount,
          pulseCountLastObservedValue: this.pulseCountLastObservedValue,
          pulseCountLastObservedTimestamp: this.pulseCountLastObservedTimestamp
        }
      })
    } else if (this.pulseCountLastObservedTimestamp + this.maxObservationAgeMilliseconds < Date.now()) {
      this.pulseCountLastObservedValue = this.pulseCountCurrent
      this.pulseCountLastObservedTimestamp = Date.now()

      this.updateSettings({
        id: this.id,
        fields: {
          pulseCountLastObservedValue: this.pulseCountLastObservedValue,
          pulseCountLastObservedTimestamp: this.pulseCountLastObservedTimestamp
        }
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
    return this.meterReadingBaseLitres + this.getPulseCount() * this.litresPerPulse
  }

  getDisplayInfo () {
    return {
      id: this.id,
      displayName: this.displayName,
      litresPerPulse: this.litresPerPulse,
      meterReadingBaseLitres: this.meterReadingBaseLitres,
      overflowCount: this.overflowCount,
      pulseCountBase: this.pulseCountBase,
      pulseCountCurrent: this.pulseCountCurrent,
      pulseCountLastObservedValue: this.pulseCountLastObservedValue,
      pulseCountLastObservedTimestamp: this.pulseCountLastObservedTimestamp,
      pulseCountMaxValue: this.pulseCountMaxValue,
      reading: this.getMeterReadingInLitres(),
      time: this.time
    }
  }

  resetReading (newBaseReadingString) {
    const newBaseReading = parseFloat(newBaseReadingString)
    if (_.isNaN(newBaseReading) || newBaseReading < 0) {
      throw new Error(`Invalid base reading ${newBaseReadingString}: must be positive number`)
    }

    return this.updateSettings({
      id: this.id,
      fields: {
        overflowCount: 0,
        meterReadingBaseLitres: newBaseReading,
        pulseCountBase: this.pulseCountCurrent,
        pulseCountLastObservedValue: this.pulseCountCurrent,
        pulseCountLastObservedTimestamp: this.pulseCountLastObservedTimestamp,
      }
    })
  }
}

module.exports = PulseCounter
