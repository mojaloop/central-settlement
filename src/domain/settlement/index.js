
'use strict'

const Db = require('../../lib/db')
const Config = require('../../lib/config')
const getWTFforNow = async function () {
  await Db.connect(Config.DATABASE)
  const transferId = '154cbf04-bac7-444d-aa66-76f66126d7f5'
  const status = 'error'
  const knex = await Db.getKnex()
  return knex.transaction(async (trx) => {
    try {
      await knex.from(knex.raw('transferParticipantStateChange (transferParticipantId, windowSettlementStateId, reason)'))
        .transacting(trx)
        .insert(function () {
          this.from('transferParticipant AS TP')
            .innerJoin('participantCurrency AS PC', 'TP.participantCurrencyId', 'PC.participantCurrencyId')
            .innerJoin('settlementModel AS S', 'PC.ledgerAccountTypeId', 'S.ledgerAccountTypeId')
            .innerJoin('settlementGranularity AS G', 'S.settlementGranularityId', 'G.settlementGranularityId')
            .leftOuterJoin('settlementWindowState AS SW1', function () { this.on('G.name', '=', knex.raw('?', ['NET'])).andOn('SW1.settlementWindowStateId', '=', knex.raw('?', ['OPEN'])) })
            .leftOuterJoin('settlementWindowState AS SW2', function () { this.on('G.name', '=', knex.raw('?', ['GROSS'])).onIn('SW2.settlementWindowStateId', ['OPEN', 'PENDING_SETTLEMENT', 'SETTLED']) })
            .leftOuterJoin('settlementWindowState AS SW3', function () { this.on(knex.raw('?', [status]), '=', knex.raw('?', ['error'])).andOn('SW3.settlementWindowStateId', '=', 'ABORTED') })
            .distinct(knex.raw('TP.transferParticipantId, IFNULL(? , IFNULL(?, ?)), ?', ['SW3.settlementWindowStateId', 'SW2.settlementWindowStateId', 'SW1.settlementWindowStateId', 'Automatically generated from Transfer fulfil']))
            .where(function () {
              this.where({ 'TP.transferId': transferId })
              this.andWhere(function () {
                this.andWhere({ 'S.currencyId': 'PC.currencyId' })
                this.orWhere(function () {
                  this.where({ 'S.currencyId': null })
                  this.whereNotIn('PC.currencyId', knex('settlementModel as S1').select('S1.currencyId').whereNotNull('S1.currencyId').andWhere({ 'S1.ledgerAccountTypeId': 'S.ledgerAccountTypeId' }))
                })
              })
              this.whereNotExists(function () {
                knex('transferParticipantStateChange AS TPSC').select('*').where({ 'TPSC.transferParticipantId': transferId })
              })
            })
        })
      await trx.commit
      return 'committed'
    } catch (err) {
      await trx.rollback
      return 'failed'
    }
  })
}

console.log(getWTFforNow())
