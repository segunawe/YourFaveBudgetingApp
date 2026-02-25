const Stripe = require('stripe');
const key = process.env.STRIPE_SECRET_KEY?.trim();
console.log('[Stripe] Key prefix:', key?.substring(0, 14), '| Length:', key?.length);
module.exports = new Stripe(key);
