module.exports.Enums = {
  settlementWindowStates: {
    'OPEN': {
      'settlementWindowStateId': 'OPEN',
      'enumeration': 'OPEN',
      'description': 'Current window into which Fulfilled transfers are being allocated. Only one window should be open at a time.'
    },
    'CLOSED' :{
      'settlementWindowStateId': 'CLOSED',
      'enumeration': 'CLOSED',
      'description': 'Settlement Window is not accepting any additional transfers. All new transfers are being allocated to the OPEN Settlement Window.'
    },
    'PENDING_SETTLEMENT': {
      'settlementWindowStateId': 'PENDING_SETTLEMENT',
      'enumeration': 'PENDING_SETTLEMENT',
      'description': 'The net settlement report for this window has been taken, with the parameter set to indicate that settlement is to be processed.'
    },
    'SETTLED': {
      'settlementWindowStateId': 'SETTLED',
      'enumeration': 'SETTLED',
      'description': 'The Hub Operator/Settlement Bank has confirmed that all the participants that engaged in the settlement window have now settled their payments in accordance with the net settlement report.'
    }
  },
  settlementStates: {
    'NOT_SETTLED': {
      'settlementStateId': 'NOT_SETTLED',
      'enumeration': 'NOT_SETTLED',
      'description': 'For the particular Settlement Window, the participant was active but has not yet settled.'
    },
    'PENDING_SETTLEMENT': {
      'settlementStateId': 'PENDING_SETTLEMENT',
      'enumeration': 'PENDING_SETTLEMENT',
      'description': 'The net settlement report for this window has been taken, with the parameter set to indicate that settlement is to be processed.'
    },
    'SETTLED': {
      'settlementStateId': 'SETTLED',
      'enumeration': 'SETTLED',
      'description': 'The Hub Operator/Settlement Bank has confirmed that all the participants that engaged in the settlement window have now settled their payments in accordance with the net settlement report.'
    }
  }
}