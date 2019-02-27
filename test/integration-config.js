let config = {
  'CENTRAL_LEDGER_HOST': process.env.CENTRAL_LEDGER_HOST || 'localhost',
  'CENTRAL_LEDGER_PORT': process.env.CENTRAL_LEDGER_PORT || '3001',
  'ML_API_ADAPTER_HOST': process.env.ML_API_ADAPTER_HOST || 'localhost',
  'ML_API_ADAPTER_PORT': process.env.ML_API_ADAPTER_PORT || '3000',
  'SIMULATOR_HOST': process.env.SIMULATOR_HOST || 'localhost',
  'SIMULATOR_PORT': process.env.SIMULATOR_PORT || '8444',
  'SIMULATOR_REMOTE_HOST': process.env.SIMULATOR_REMOTE_HOST || 'localhost',
  'SIMULATOR_REMOTE_PORT': process.env.SIMULATOR_REMOTE_PORT || '8444'
}

module.exports = config
