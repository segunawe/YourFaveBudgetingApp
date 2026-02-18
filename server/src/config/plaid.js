const { Configuration, PlaidApi, PlaidEnvironments } = require('plaid');

// Initialize Plaid configuration
const configuration = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV || 'sandbox'],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SECRET,
    },
  },
});

// Create Plaid client
const plaidClient = new PlaidApi(configuration);

module.exports = plaidClient;
