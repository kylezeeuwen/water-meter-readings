const _ = require('lodash')
const request = require('request')
const Readable = require('stream').Readable;

const FileNotFoundError = require('./errors/fileNotFound')
// written to read / write to a Digi Connect X4 using simple GET for retrieval , and POST multipart/form for file upload
// guarantees:
//     * If I call write to file X twice, the second write will win
//     * All writes to file X within writeDelayThreshold milliseconds will be amortised into a single write, using the contents of the last write call within the period



class NetworkFileStore {

  static get writeStatuses () {
    return {
      PENDING: 'PENDING',
      WRITING: 'WRITING'
    }
  }

  constructor ({url: fileStoreUrl, writeDelayThreshold = 50 } = {}) {
    this.fileStoreUrl = fileStoreUrl
    this.pendingWrites = {}
    this.writeIdSequence = 1
    this.writeDelayThreshold = writeDelayThreshold
    this.counts = {
      totalWriteRequests: 0,
      totalActualWrites: 0,
      totalReadRequests: 0
    }

    if (!this.fileStoreUrl) { throw new Error('Filestore config missing file_store.url') }
  }

  // handle 404 etc (request doesn't throw error on 4XX or 5XX
  readFile (filePath) {
    return new Promise((resolve, reject) => {
      const fullUrl = `${this.fileStoreUrl}${filePath}`
      this.counts.totalReadRequests++
      request(fullUrl, function (error, response, body) {
        if (error) {
          logger.error({ eventType: 'network_file_get_fail', filePath, error, ...this.counts })
          error.message = `Fail to retrieve ${filePath} at ${fullUrl}: error:${_.get(error, 'message')}`
          return reject(error)
        } else if (response && response.statusCode === 404) {
          logger.warn({ eventType: 'network_file_get_fail', filePath, code: response.statusCode, ...this.counts })
          return reject(new FileNotFoundError(filePath, fullUrl))
        } else if (response && response.statusCode >= 400) {
          logger.error({ eventType: 'network_file_get_fail', filePath, code: response.statusCode, ...this.counts })
          const newError = new Error(`Fail to retrieve ${filePath} at ${fullUrl}: code:${_.get(response, 'statusCode')}`)
          newError.code = response.statusCode
          return reject(newError)
        } else {
          logger.info({ eventType: 'network_file_get_success', code: response && response.statusCode, filePath, ...this.counts })
          return resolve(body)
        }
      });
    })
  }

  writeFile (fileName, fileContent) {
    const myWriteId = this.writeIdSequence++
    this.counts.totalWriteRequests++

    if (!_.has(this.pendingWrites, fileName)) { this.pendingWrites[fileName] = [] }
    const doneWritingPromise = new Promise((resolve, reject) => {
      this.pendingWrites[fileName].push({
        writeId: myWriteId,
        fileContent,
        status: NetworkFileStore.writeStatuses.PENDING,
        resolve,
        reject,
        contentType: 'application/json'
      })

      logger.debug({ eventType: 'write_file_outer_called', ...this.counts,
        writeId: myWriteId,
        fileName,
        status: NetworkFileStore.writeStatuses.PENDING,
        pendingWriteQueue: this.getWriteQueueSummary(fileName),
        ...this.counts,
      })
    })

    const newWriteRecord = _.find(this.pendingWrites[fileName], {writeId: myWriteId})
    if (newWriteRecord) { newWriteRecord.promise = doneWritingPromise }

    // TODO handle reject here as this is not returned
    delay(this.writeDelayThreshold)
      .then(() => this._processWriteQueueFor(fileName, myWriteId))

    return doneWritingPromise
  }

  _processWriteQueueFor (fileName, requestedWriteId) {
    const myWriteQueue = this.pendingWrites[fileName]
    const writeInProgress = _.findLast(myWriteQueue, {status: NetworkFileStore.writeStatuses.WRITING})
    const writeInProgressId = _.get(writeInProgress, 'writeId', null)

    const useCurrentWriteInProgress = (writeInProgress && writeInProgressId >= requestedWriteId)
    const waitForCurrentWriteToCompleteThenWriteAgain = (writeInProgress && writeInProgressId < requestedWriteId)

    logger.debug({
      eventType: 'process_write_queue',
      fileName,
      requestedWriteId,
      writeInProgress: (writeInProgress) ? 'true' : 'false',
      writeInProgressId,
      useCurrentWriteInProgress: (useCurrentWriteInProgress) ? 'true' : 'false',
      waitForCurrentWriteToCompleteThenWriteAgain: (waitForCurrentWriteToCompleteThenWriteAgain) ? 'true' : 'false',
      pendingWriteQueue: this.getWriteQueueSummary(fileName),
      ...this.counts,
    })

    if (useCurrentWriteInProgress) {
      return writeInProgress.promise
    } else if (waitForCurrentWriteToCompleteThenWriteAgain) {
      return writeInProgress.promise
        .then(() => this._actuallyWriteFile(fileName))
    } else {
      return this._actuallyWriteFile(fileName)
    }
  }

  _actuallyWriteFile(fileName) {
    const myWriteQueue = this.pendingWrites[fileName]
    const mostRecentPendingWriteRequest = _.findLast(myWriteQueue, {status: NetworkFileStore.writeStatuses.PENDING})

    if (mostRecentPendingWriteRequest) {
      mostRecentPendingWriteRequest.status = NetworkFileStore.writeStatuses.WRITING
      const {fileContent, contentType, writeId} = mostRecentPendingWriteRequest
      logger.debug({
        eventType: 'actually_write_file_begin',
        fileName,
        writeId,
        pendingWriteQueue: this.getWriteQueueSummary(fileName),
        ...this.counts,
      })
      return this._networkWrite({fileName, fileContent, contentType, writeId})
        .then(writeId => {
          const completedRequests = this.pendingWrites[fileName].filter(writeRecord => writeRecord.writeId <= writeId)
          completedRequests.map(completedRequest => completedRequest.resolve())
          this.pendingWrites[fileName] = this.pendingWrites[fileName].filter(writeRecord => writeRecord.writeId > writeId)
          logger.debug({
            eventType: 'actually_write_file_success',
            writeId,
            resolvedPromiseCount: completedRequests.length,
            pendingWriteQueue: this.getWriteQueueSummary(fileName),
            ...this.counts,
          })
        })
        .catch(error => {
          const failedRequests = this.pendingWrites[fileName].filter(writeRecord => writeRecord.writeId <= writeId)
          failedRequests.map(failedRequest => failedRequest.reject(error))
          this.pendingWrites[fileName] = this.pendingWrites[fileName].filter(writeRecord => writeRecord.writeId > writeId)
          logger.error({
            eventType: 'actually_write_file_fail',
            error,
            writeId,
            rejectedPromiseCount: failedRequests.length,
            pendingWriteQueue: this.getWriteQueueSummary(fileName),
            ...this.counts,
          })
        })
    } else {
      logger.warn({
        eventType: 'actually_write_file_no_pending_writes',
        pendingWriteQueue: this.getWriteQueueSummary(fileName),
        ...this.counts,
      })
      return Promise.resolve(null)
    }
  }

  _networkWrite ({ fileName, fileContent, contentType, writeId }) {
    return new Promise((resolve, reject) => {

      const contentStream = new Readable()
      contentStream._read = () => {}
      contentStream.push(fileContent)
      contentStream.push(null)

      const fullUrl = `${this.fileStoreUrl}/Forms/web_files_new_1`
      var req = request.post(fullUrl, (error, response, body) => {
        this.counts.totalActualWrites++
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
          return resolve(writeId)
        }
      })
      var form = req.form()
      form.append('currentdirectory', 'WEB/')
      form.append('file', contentStream, {filename: fileName, contentType})
    })
  }

  getWriteQueueSummary (fileName) {
    return '[' + this.pendingWrites[fileName].map(({status, writeId}) => `${writeId}:${status}`).join(', ') + ']'
  }
}

function delay(t, v = x => x) {
  return new Promise(function(resolve) {
    setTimeout(resolve.bind(null, v), t)
  });
}

module.exports = NetworkFileStore

