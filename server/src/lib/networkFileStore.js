const _ = require('lodash')
const request = require('request')
const Readable = require('stream').Readable;

const FileNotFoundError = require('./errors/fileNotFound')
// written to read / write to a Digi Connect X4 using simple GET for retrieval , and POST multipart/form for file upload
// guarantees:
//     * If I call write to file X twice, the second write will win, and the second write will not begin until the first write has completed

class NetworkFileStore {
  constructor ({url: fileStoreUrl} = {}) {
    this.fileStoreUrl = fileStoreUrl
    this.writesInProgress = {}
    this.writeIdSequence = 0
    this.counts = {
      totalWriteRequests: 0,
      totalActualWrites: 0,
      totalReadRequests: 0
    }

    if (!this.fileStoreUrl) { throw new Error('Filestore config missing file_store.url') }
  }

  // handle 404 etc (request doesn't throw error on 4XX or 5XX
  readFile (fileName) {
    return new Promise((resolve, reject) => {
      const fullUrl = `${this.fileStoreUrl}/FS/WEB/${fileName}`
      this.counts.totalReadRequests++
      request(fullUrl, function (error, response, body) {
        if (error) {
          logger.error({ eventType: 'network_file_get_fail', fileName, error, ...this.counts })
          error.message = `Fail to retrieve ${fileName} at ${fullUrl}: error:${_.get(error, 'message')}`
          return reject(error)
        } else if (response && response.statusCode === 404) {
          logger.error({ eventType: 'network_file_get_fail', fileName, code: response.statusCode, ...this.counts })
          return reject(new FileNotFoundError(fileName, fullUrl))
        } else if (response && response.statusCode >= 400) {
          logger.error({ eventType: 'network_file_get_fail', fileName, code: response.statusCode, ...this.counts })
          const newError = new Error(`Fail to retrieve ${fileName} at ${fullUrl}: code:${_.get(response, 'statusCode')}`)
          newError.code = response.statusCode
          return reject(newError)
        } else {
          logger.info({ eventType: 'network_file_get_success', code: response && response.statusCode, fileName, ...this.counts })
          return resolve(body)
        }
      });
    })
  }

  writeFile (fileName, fileContent) {
    const myWriteId = this.writeIdSequence++
    this.counts.totalWriteRequests++

    if (!_.has(this.writesInProgress, fileName)) { this.writesInProgress[fileName] = [] }
    const myWriteQueue = this.writesInProgress[fileName]

    const clearToWritePromise = (_.isEmpty(myWriteQueue))
        ? Promise.resolve()
        : _.last(myWriteQueue).promise

    const doneWritingPromise = clearToWritePromise
      .then(() => this._writeFile(fileName, fileContent))
      .then((writeResult) => {
        this.writesInProgress[fileName] = this.writesInProgress[fileName].filter(writeQueueEntry => writeQueueEntry.id !== myWriteId)
        return writeResult
      })

    this.writesInProgress[fileName].push({
      id: myWriteId,
      promise: doneWritingPromise
    })

    return doneWritingPromise
  }

  _writeFile (fileName, fileContent, contentType = 'application/json') {
    this.counts.totalActualWrites++
    return new Promise((resolve, reject) => {

      const contentStream = new Readable()
      contentStream._read = () => {}
      contentStream.push(fileContent)
      contentStream.push(null)

      const fullUrl = `${this.fileStoreUrl}/Forms/web_files_new_1`
      var req = request.post(fullUrl, (error, response, body) => {
        if (error) {
          logger.error({ eventType: 'network_file_set_fail', fileName, error, ...this.counts })
          error.message = `Fail to upload ${fileName} at ${fullUrl}: error:${_.get(error, 'message')}`
          return reject(error)
        } else if (response && response.statusCode != 303) {
          logger.error({ eventType: 'network_file_set_fail', fileName, code: response.statusCode, fileContent, ...this.counts })
          const newError = new Error(`Fail to upload '${fileName}' at '${fullUrl}': code:${_.get(response, 'statusCode')}`)
          newError.code = response.statusCode
          return reject(newError)
        } else {
          logger.info({ eventType: 'network_file_set_success', code: response && response.statusCode, fileName, ...this.counts })
          return resolve()
        }
      })
      var form = req.form()
      form.append('currentdirectory', 'WEB/')
      form.append('file', contentStream, {filename: fileName, contentType})
    })
  }
}

module.exports = NetworkFileStore
