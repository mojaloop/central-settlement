'use strict'

const Db = require('../index')

module.exports = {
  getBySettlementId: async function ({settlementId}, enums = {}) {
    try {
      return await Db.settlementTransferParticipant.query(builder => {
        return builder
          .select()
          .distinct('settlementWindowId', 'participantCurrencyId')
          .where({settlementId})
      })
    } catch (err) {
      throw err
    }
  }
}
