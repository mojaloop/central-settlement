const MLNumber = require('@mojaloop/ml-number')
const Config = require('./config')
const Facade = require('../../src/models/transferParticipantStateChange/index')

const execute = function (script, payload) {
  const ledgerEntries = []

  const sandbox = {
    payload,
    log: function (message) {
      console.log(message)
    },
    getTransfer (transferId) {
    /*  const transferObject = await Facade.getTransactionObject(transferId)
      return transferObject.data */
      return {
        transactionId: 'cb4c0f77-286d-40a5-8dfe-b162e64482ee',
        quoteId: 'ad1b4bea-32f4-4f48-a70d-7e13b28b453b',
        payee: {
          partyIdInfo: {
            partyIdType: 'MSISDN',
            partyIdentifier: '27713813914',
            fspId: 'testfsp1',
            extensionList: {
              extension: [
                {
                  key: 'accountType',
                  value: 'Wallet'
                }
              ]
            }
          },
          personalInfo: {
            complexName: {
              firstName: 'testfsp1BankFname',
              lastName: 'testfsp1BankLname'
            },
            dateOfBirth: '1985-05-13'
          }
        },
        payer: {
          partyIdInfo: {
            partyIdType: 'MSISDN',
            partyIdentifier: '27713803912',
            fspId: 'payerfsp',
            extensionList: {
              extension: [
                {
                  key: 'accountType',
                  value: 'Wallet'
                }
              ]
            }
          },
          name: 'payerfspFname payerfspLname'
        },
        amount: {
          amount: '10',
          currency: 'TZS'
        },
        transactionType: {
          scenario: 'TRANSFER',
          initiator: 'PAYER',
          initiatorType: 'CONSUMER'
        }
      }
    },
    multiply (number1, number2) {
      const result = new MLNumber(number1).multiply(number2).toFixed(Config.AMOUNT.SCALE)
      return result
    },
    getExtensionValue (list, key) {
      return list.find((extension) => {
        return extension.key === key
      }).value
    },
    addLedgerEntry: function (transferId, ledgerAccountTypeId, ledgerEntryTypeId, amount, currency, payerFspId, payeeFspId) {
      ledgerEntries.push({
        transferId,
        ledgerAccountTypeId,
        ledgerEntryTypeId,
        amount,
        currency,
        payerFspId,
        payeeFspId
      })
    }
  }

  try {
    //   script.runInNewContext(sandbox, {timeout: 100})
    script.runInNewContext(sandbox)

    return { ledgerEntries }
  } catch (err) {
    console.error('Error in user script')
    console.error(err)
  }
}

module.exports = {
  execute
}
