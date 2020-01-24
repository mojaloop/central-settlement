const Enum = require('@mojaloop/central-services-shared').Enum

const getSpanTags = ({ headers }, transactionType, transactionAction) => {
  const tags = {
    transactionType,
    transactionAction
  }
  if (headers && headers[Enum.Http.Headers.FSPIOP.SOURCE]) {
    tags.source = headers[Enum.Http.Headers.FSPIOP.SOURCE]
  }
  if (headers && headers[Enum.Http.Headers.FSPIOP.DESTINATION]) {
    tags.destination = headers[Enum.Http.Headers.FSPIOP.DESTINATION]
  }
  return tags
}

module.exports = {
  getSpanTags
}
