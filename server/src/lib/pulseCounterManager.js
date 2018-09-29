const _ = require('lodash')
const PulseCounter = require('./pulseCounter')

class PulseCounterManager {
  constructor ({ pulseCounterMaxValue, readingsFileName, fileStore, meterSettings }) {
    this.fileStore = fileStore
    this.meterSettings = meterSettings
    this.readingsFileName = readingsFileName
    this.pulseCounterMaxValue = pulseCounterMaxValue
  }

  getRawReadingData () {
    return this.fileStore.readFile(this.readingsFileName)
      .then(JSON.parse)
      .then(meterReading => {
        return _(meterReading.devices)
          .flatMap(({ name: deviceName, channels }) => {
            return channels.filter(({name}) => name.match('^pulse_counter_.'))
              .map(channel => {
                return {
                  id: `${deviceName}-${channel.name}`,
                  value: channel.value,
                  time: channel.time // format "2018-08-15 17:33:03" , TODO UTC or local ?
                }
              })
          })
          .value()
      })
  }

  _initialiseSettingsFrom(pulseCounterData) {
    return {
      displayName: pulseCounterData.id,
      litresPerPulse: 1,
      meterReadingBase: 0,
      pulseCountBase: pulseCounterData.value,
      pulseCountLastObserved: pulseCounterData.value,
      overflowCount: 0,
    }
  }

  getPulseCounters () {
    return Promise.all([this.getRawReadingData(), this.meterSettings.getAllPulseCounterSettings()]).then(([pulseCountersData, pulseCountersSettings]) => {
      return pulseCountersData.map(data => {
        console.log('pulseCountersSettings')
        console.log(JSON.stringify(pulseCountersSettings, {}, 2))


        if (!_.has(pulseCountersSettings, data.id)) {
          const initialSettings = this._initialiseSettingsFrom(data)
          pulseCountersSettings[data.id] = initialSettings
          this.meterSettings.setPulseCounterFields(data.id, initialSettings)
        }

        const settings = pulseCountersSettings[data.id]

        return new PulseCounter({
          id: data.id,
          displayName: settings.displayName,
          litresPerPulse: settings.litresPerPulse,
          meterReadingBase: settings.meterReadingBase,
          pulseCountBase: settings.pulseCountBase,
          pulseCountMaxValue: this.pulseCounterMaxValue,
          pulseCountLastObserved: settings.pulseCountLastObserved,
          pulseCountCurrent: data.value,
          overflowCount: settings.overflowCount,
          updateObservations: ({id, overflowCount, pulseCountLastObserved}) => {
            return this.meterSettings.setPulseCounterFields(id, {pulseCountLastObserved, overflowCount})
          }
        })
      })
    })
  }
}

module.exports = PulseCounterManager