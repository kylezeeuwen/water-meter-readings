const _ = require('lodash')
const moment = require('moment')
const request = require('request')
const Readable = require('stream').Readable;


const defaultConfig = {
  durationSeconds: 60,
  updateFrequencySeconds: 3,
  fileStore: {
    url: 'http://localhost:8081',
    readingsFileName: 'reading_simulation.json',
  },
  pulseCounters: [
    { device: 'D1', description: 'foo', basePulses: 1, maxPulses: 10, baseTime: Date.now(), pulseRatePerSecond: 1 },
  ]
}

const argParser = require('yargs')
const commandLineOverrides = argParser.argv
const config = _.merge(defaultConfig, commandLineOverrides)

const intervalHandle = setInterval(() => {
  const readingsFileContents = buildReadingsFile(config.pulseCounters)
  writeFile(config.fileStore.readingsFileName, JSON.stringify(readingsFileContents, {}, 2))
    .then(() => console.log(`wrote to file ${config.fileStore.readingsFileName}`))
    .catch(error => console.error(`fail to write ${config.fileStore.readingsFileName}: `, error))
}, config.updateFrequencySeconds * 1000)

setTimeout(() => {
  clearInterval(intervalHandle)
}, config.durationSeconds * 1000)

function buildReadingsFile (pulseCounters) {
  const pulseCount = (channel) => {
    const secondsSinceStart = (Date.now() - channel.baseTime) / 1000
    const pulsesBeforeOverflow = Math.floor(parseInt(channel.basePulses) + secondsSinceStart * parseFloat(channel.pulseRatePerSecond))
    return (channel.maxPulses)
      ? pulsesBeforeOverflow % channel.maxPulses
      : pulsesBeforeOverflow
  }

  const devices = _(pulseCounters)
    .groupBy('device')
    .map((channels, device) => {
      return {
        channels: channels.map((channel, index) => ({
          unit: 'cnt',
          perm: 1,
          name: `pulse_counter_${index+1}`,
          value: pulseCount(channel),
          time: moment().format('YYYY-MM-DD HH:mm:ss')
        })),
        name: device
      }
    })
    .value()

  return {
    devices: devices,
    settings: { polling: 0 }
  }
}

// from networkFileStore
function writeFile (fileName, fileContent, contentType = 'application/json') {
  return new Promise((resolve, reject) => {

    const contentStream = new Readable()
    contentStream._read = () => {}
    contentStream.push(fileContent)
    contentStream.push(null)

    const fullUrl = `${config.fileStore.url}/Forms/web_files_new_1`
    var req = request.post(fullUrl, function (error, response, body) {
      if (error) {
        console.log({ eventType: 'network_file_set_fail', fileName, error })
        error.message = `Fail to upload ${fileName} at ${fullUrl}: error:${_.get(error, 'message')}`
        return reject(error)
      } else if (response && response.statusCode != 303) {
        console.log({ eventType: 'network_file_set_fail', fileName, code: response.statusCode, fileContent })
        const newError = new Error(`Fail to upload '${fileName}' at '${fullUrl}': code:${_.get(response, 'statusCode')}`)
        newError.code = response.statusCode
        return reject(newError)
      } else {
        console.log({ eventType: 'network_file_set_success', code: response && response.statusCode, fileName })
        return resolve()
      }
    })
    var form = req.form()
    form.append('currentdirectory', 'WEB/')
    form.append('file', contentStream, {filename: fileName, contentType})
  })
}