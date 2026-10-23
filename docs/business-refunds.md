# Partner plan refunds (runbook)

Policy (public, in /business/terms section 6):
- Cancel within 14 days of the FIRST payment (monthly or yearly): full refund.
- Yearly plan cancelled later: refund the full unused months.
- Monthly plan after 14 days: no refund; cancelling stops the next renewal.
- Our fault (tools down for a meaningful time, or we end the plan without a breach): refund the unused part.
- Refunds go back to the paying card through Stripe. When we refund, the plan ends at that moment.

Nothing in the code needs to change for a refund. The plan follows the Stripe
subscription: `customer.subscription.deleted` reaches /api/stripe/webhooks,
src/lib/business/venue-billing.ts sets place_plans.status = 'canceled', and the
place and city pages are revalidated, so deals, the booking buttons, the featured
event and follower messages stop at once (RLS uses place_has_partner_plan()).

## Steps (Stripe dashboard, live mode)
1. Find the customer by the owner's email (Customers). Check the first payment date and the plan (Partner monthly / yearly).
2. Open the subscription and choose **Cancel subscription -> Immediately** (NOT "at period end": the terms say the plan ends when we refund).
3. Refund:
   - 14-day case or our-fault case: refund the full last payment.
   - Yearly, later: refund a **custom amount** = 79 / 12 x (full unused months), rounded down to cents. Do not use Stripe's day-based proration.
   Use **Refund** on the invoice's payment; if Stripe offers to issue a credit note, accept it (keeps VAT records right).
4. Check /admin/business: the place shows Free within a minute. If not, check the webhook delivery in Stripe (Developers -> Webhooks -> plantspack endpoint).
5. Reply to the owner: amount, 5 to 10 days to arrive, free tools stay.

A refund is never needed to stop renewals: owners cancel themselves from Plan and billing -> Manage billing (Stripe billing page, cancel at period end).
