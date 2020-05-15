
'use strict'

const Db = require('../../lib/db')
const Config = require('../../lib/config')

const getWTFforNow = async function () {
  try {
    await connect()
    const transferId = '154cbf04-bac7-444d-aa66-76f66126d7f5'
    const status = 'error'
    const knex = await Db.getKnex()
    // knex.on('query', console.log)

    return knex.transaction(async (trx) => {
      try {
        await knex.from(knex.raw('transferParticipantStateChange (transferParticipantId, settlementWindowStateId, reason)'))
          .transacting(trx)
          .insert(function () {
            this.from('transferParticipant AS TP')
              .innerJoin('participantCurrency AS PC', 'TP.participantCurrencyId', 'PC.participantCurrencyId')
              .innerJoin('settlementModel AS S', 'PC.ledgerAccountTypeId', 'S.ledgerAccountTypeId')
              .innerJoin('settlementGranularity AS G', 'S.settlementGranularityId', 'G.settlementGranularityId')
              .leftOuterJoin('settlementWindowState AS SW1', function () { this.on('G.name', '=', knex.raw('?', ['NET'])).andOn('SW1.settlementWindowStateId', '=', knex.raw('?', ['OPEN'])) })
              .leftOuterJoin('settlementWindowState AS SW2', function () { this.on('G.name', '=', knex.raw('?', ['GROSS'])).onIn('SW2.settlementWindowStateId', ['OPEN', 'PENDING_SETTLEMENT', 'SETTLED']) })
              .leftOuterJoin('settlementWindowState AS SW3', function () { this.on(knex.raw('?', [status]), '=', knex.raw('?', ['error'])).andOn('SW3.settlementWindowStateId', '=', knex.raw('?', ['ABORTED'])) })
              .distinct(knex.raw('TP.transferParticipantId, IFNULL(?? , IFNULL(??, ??)), ?', ['SW3.settlementWindowStateId', 'SW2.settlementWindowStateId', 'SW1.settlementWindowStateId', 'Automatically generated from Transfer fulfil']))
              .where(function () {
                this.where({ 'TP.transferId': transferId })
                this.andWhere(function () {
                  this.andWhere({ 'S.currencyId': 'PC.currencyId' })
                  this.orWhere(function () {
                    this.whereNull('S.currencyId')
                    this.whereNotIn('PC.currencyId', knex('settlementModel AS S1').select('S1.currencyId').where({ 'S1.ledgerAccountTypeId': 'S.ledgerAccountTypeId' }).whereNotNull('S1.currencyId'))
                  })
                })
                this.whereNotExists(function () {
                  this.select('*').from('transferParticipantStateChange AS TSC')
                  this.innerJoin('transferParticipant AS TP1', 'TSC.transferParticipantId', 'TP1.transferParticipantId')
                  this.where({ 'TP1.transferId': transferId })
                })
              }).toSQL()
          })
        await trx.commit
        return 'committed'
      } catch (err) {
        console.log('Error ' + err)
        // console.log('Here is my query' + query.toSQL().sql);
        await trx.rollback
        return 'failed'
      } finally {
        // await knex.destroy()
        return 'finaly'
      }
    })
  } catch (e) {
    console.log('error 2 : ' + e)
  }
}

async function connect () {
  return Db.connect(Config.DATABASE)
}

async function main () {
  try {
    console.log(await getWTFforNow())
  } catch (e) {
    console.log(e)
  }
}

main()
