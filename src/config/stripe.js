import { loadStripe } from '@stripe/stripe-js';

// Stripe instance is memoized by the SDK — safe to call loadStripe at module level
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

export default stripePromise;
