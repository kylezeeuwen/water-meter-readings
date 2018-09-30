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
    pulseCountLastObserved = 0,
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
    this.pulseCountLastObserved = parseFloat(pulseCountLastObserved) // TODO bad name, will confuse ppl
    this.pulseCountCurrent = parseFloat(pulseCountCurrent)
    this.overflowCount = parseFloat(overflowCount)
    this.updateSettings = updateSettings

    const invalidMessage = (fieldName, fieldValue, id) => `Invalid '${fieldName}' for device id '${id}': ${fieldValue}`
    if (_.isNaN(this.litresPerPulse)) { throw new Error(invalidMessage('litresPerPulse', this.litresPerPulse, this.id)) }
    if (_.isNaN(this.meterReadingBaseLitres)) { throw new Error(invalidMessage('meterReadingBaseLitres', this.meterReadingBaseLitres, this.id)) }
    if (_.isNaN(this.pulseCountBase)) { throw new Error(invalidMessage('pulseCountBase', this.pulseCountBase, this.id)) }
    if (_.isNaN(this.pulseCountMaxValue)) { throw new Error(invalidMessage('pulseCountMaxValue', this.pulseCountMaxValue, this.id)) }
    if (_.isNaN(this.pulseCountLastObserved)) { throw new Error(invalidMessage('pulseCountLastObserved', this.pulseCountLastObserved, this.id)) }
    if (_.isNaN(this.pulseCountCurrent)) { throw new Error(invalidMessage('pulseCountCurrent', this.pulseCountCurrent, this.id)) }
    if (_.isNaN(this.overflowCount)) { throw new Error(invalidMessage('overflowCount', this.overflowCount, this.id)) }

    this.detectAndCorrectOverflow ()
  }

  detectAndCorrectOverflow () {
    if (this.pulseCountCurrent < this.pulseCountLastObserved) {
      this.overflowCount++
      this.pulseCountLastObserved = this.pulseCountCurrent

      this.updateSettings({
        id: this.id,
        fields: {
          overflowCount: this.overflowCount,
          pulseCountLastObserved: this.pulseCountLastObserved
        }
      })
    } else {
      this.overflowDetetionComplete = true
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
      pulseCountLastObserved: this.pulseCountLastObserved,
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
        pulseCountLastObserved: this.pulseCountCurrent
      }
    })

  }
}

module.exports = PulseCounter