-- Stripe Checkout creates a session before the eventual PaymentIntent exists.
-- Keep the provider payment ID nullable until a verified webhook settles the payment.
ALTER TABLE payments
  ALTER COLUMN provider_payment_id DROP NOT NULL;
