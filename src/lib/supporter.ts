/**
 * Who counts as a PlantsPack supporter. Paid Supporter = subscription_tier
 * 'medium' (EUR 3/month); legacy 'premium' counts too. Same rule as the
 * scanner quota (tool-quota.ts) and the mobile app.
 */
export function isActiveSupporter(u: { subscription_tier?: string | null; subscription_status?: string | null } | null | undefined): boolean {
  if (!u) return false
  return (u.subscription_tier === 'medium' || u.subscription_tier === 'premium') && u.subscription_status === 'active'
}
