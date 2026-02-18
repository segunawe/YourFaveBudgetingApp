const express = require('express');
const router = express.Router();
const plaidClient = require('../config/plaid');
const { CountryCode, Products } = require('plaid');
const { db } = require('../config/firebase');

// POST /api/plaid/create-link-token
// Create a Link token for Plaid Link initialization
router.post('/create-link-token', async (req, res) => {
  try {
    const userId = req.user.uid;

    const request = {
      user: {
        client_user_id: userId,
      },
      client_name: 'Your Fave Budgeting App',
      products: [Products.Auth, Products.Transactions],
      country_codes: [CountryCode.Us],
      language: 'en',
    };

    const response = await plaidClient.linkTokenCreate(request);

    res.json({
      linkToken: response.data.link_token,
      expiration: response.data.expiration,
    });
  } catch (error) {
    console.error('Error creating link token:', error);
    res.status(500).json({
      error: 'Failed to create link token',
      details: error.message
    });
  }
});

// POST /api/plaid/exchange-public-token
// Exchange public token for access token and fetch accounts
router.post('/exchange-public-token', async (req, res) => {
  try {
    const { publicToken } = req.body;
    const userId = req.user.uid;

    if (!publicToken) {
      return res.status(400).json({ error: 'Public token is required' });
    }

    // Exchange public token for access token
    const exchangeResponse = await plaidClient.itemPublicTokenExchange({
      public_token: publicToken,
    });

    const accessToken = exchangeResponse.data.access_token;
    const itemId = exchangeResponse.data.item_id;

    // Fetch accounts for this item
    const accountsResponse = await plaidClient.accountsGet({
      access_token: accessToken,
    });

    const accounts = accountsResponse.data.accounts.map(account => ({
      id: account.account_id,
      name: account.name,
      mask: account.mask,
      type: account.type,
      subtype: account.subtype,
      balance: {
        current: account.balances.current,
        available: account.balances.available,
        currency: account.balances.iso_currency_code,
      },
    }));

    // Store encrypted access token and accounts in user document
    const userRef = db.collection('users').doc(userId);
    await userRef.set({
      plaidItems: {
        [itemId]: {
          accessToken: accessToken, // In production, encrypt this!
          itemId: itemId,
          accounts: accounts,
          connectedAt: new Date(),
        }
      }
    }, { merge: true });

    res.json({
      success: true,
      accountsCount: accounts.length,
      accounts: accounts,
    });
  } catch (error) {
    console.error('Error exchanging public token:', error);
    res.status(500).json({
      error: 'Failed to exchange token',
      details: error.message
    });
  }
});

// GET /api/plaid/accounts
// Fetch current account balances
router.get('/accounts', async (req, res) => {
  try {
    const userId = req.user.uid;

    // Get user's Plaid items from Firestore
    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists || !userDoc.data().plaidItems) {
      return res.json({ accounts: [], totalBalance: 0 });
    }

    const plaidItems = userDoc.data().plaidItems;
    let allAccounts = [];

    // Fetch fresh balances for each item
    for (const [itemId, item] of Object.entries(plaidItems)) {
      try {
        const accountsResponse = await plaidClient.accountsBalanceGet({
          access_token: item.accessToken,
        });

        const accounts = accountsResponse.data.accounts.map(account => ({
          id: account.account_id,
          name: account.name,
          mask: account.mask,
          type: account.type,
          subtype: account.subtype,
          balance: {
            current: account.balances.current,
            available: account.balances.available,
            currency: account.balances.iso_currency_code,
          },
        }));

        allAccounts = allAccounts.concat(accounts);
      } catch (error) {
        console.error(`Error fetching accounts for item ${itemId}:`, error);
      }
    }

    // Calculate total balance
    const totalBalance = allAccounts.reduce((sum, account) => {
      return sum + (account.balance.current || 0);
    }, 0);

    res.json({
      accounts: allAccounts,
      totalBalance: totalBalance,
    });
  } catch (error) {
    console.error('Error fetching accounts:', error);
    res.status(500).json({
      error: 'Failed to fetch accounts',
      details: error.message
    });
  }
});

// POST /api/plaid/sync-accounts
// Refresh account balances and update Firestore
router.post('/sync-accounts', async (req, res) => {
  try {
    const userId = req.user.uid;

    // Get user's Plaid items
    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists || !userDoc.data().plaidItems) {
      return res.status(404).json({ error: 'No connected accounts found' });
    }

    const plaidItems = userDoc.data().plaidItems;
    const updatedItems = {};

    // Sync each item
    for (const [itemId, item] of Object.entries(plaidItems)) {
      try {
        const accountsResponse = await plaidClient.accountsBalanceGet({
          access_token: item.accessToken,
        });

        const accounts = accountsResponse.data.accounts.map(account => ({
          id: account.account_id,
          name: account.name,
          mask: account.mask,
          type: account.type,
          subtype: account.subtype,
          balance: {
            current: account.balances.current,
            available: account.balances.available,
            currency: account.balances.iso_currency_code,
          },
        }));

        updatedItems[itemId] = {
          ...item,
          accounts: accounts,
          lastSynced: new Date(),
        };
      } catch (error) {
        console.error(`Error syncing item ${itemId}:`, error);
        updatedItems[itemId] = item; // Keep old data if sync fails
      }
    }

    // Update Firestore
    await db.collection('users').doc(userId).update({
      plaidItems: updatedItems,
    });

    // Return all accounts
    let allAccounts = [];
    Object.values(updatedItems).forEach(item => {
      if (item.accounts) {
        allAccounts = allAccounts.concat(item.accounts);
      }
    });

    const totalBalance = allAccounts.reduce((sum, account) => {
      return sum + (account.balance.current || 0);
    }, 0);

    res.json({
      accounts: allAccounts,
      totalBalance: totalBalance,
      updated: true,
    });
  } catch (error) {
    console.error('Error syncing accounts:', error);
    res.status(500).json({
      error: 'Failed to sync accounts',
      details: error.message
    });
  }
});

module.exports = router;
