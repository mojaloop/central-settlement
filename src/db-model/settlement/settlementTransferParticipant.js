module.exports = {
    getBySettlementId: async function ({settlementId}, enums = {}) {
        try {
            return await Db.settlementTransferParticipant.query(async (builder) => {
                return await builder
                    .select()
                    .distinct('settlementWindowId', 'participantCurrencyId')
                    .where({settlementId})
            })
        } catch (err) {
            throw err
        }
    }
}