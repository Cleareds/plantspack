// Promotional subscription utilities

import { supabase } from './supabase'

export interface PromotionalInfo {
  earlyBirdAvailable: boolean
  earlyBirdUsersLeft: number
  earlyPurchaserAvailable: boolean 
  earlyPurchasersLeft: number
}

/**
 * Get current promotional status
 */
export async function getPromotionalInfo(): Promise<PromotionalInfo> {
  try {
    // Check early bird status (first 100 registered users)
    const { data: userCount, error: countError } = await supabase
      .from('users')
      .select('id', { count: 'exact' })
      
    if (countError) {
      console.error('Error fetching user count:', countError)
    }
    
    const totalUsers = userCount?.length || 0
    const earlyBirdUsersLeft = Math.max(0, 100 - totalUsers)
    
    // Check early purchaser status (first 100 purchasers of $3 subscription)
    const { data: purchasers, error: purchaserError } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('tier', 'medium')
      .eq('status', 'active')
      .not('stripe_subscription_id', 'is', null)
      
    if (purchaserError) {
      console.error('Error fetching purchaser count:', purchaserError)
    }
    
    const totalPurchasers = purchasers?.length || 0
    const earlyPurchasersLeft = Math.max(0, 100 - totalPurchasers)
    
    return {
      earlyBirdAvailable: earlyBirdUsersLeft > 0,
      earlyBirdUsersLeft,
      earlyPurchaserAvailable: earlyPurchasersLeft > 0,
      earlyPurchasersLeft
    }
  } catch (error) {
    console.error('Error getting promotional info:', error)
    return {
      earlyBirdAvailable: false,
      earlyBirdUsersLeft: 0,
      earlyPurchaserAvailable: false,
      earlyPurchasersLeft: 0
    }
  }
}

/**
 * Check if current user has any promotional subscriptions
 */
export async function getUserPromotionalStatus(userId: string) {
  try {
    // First, just get subscription_tier which we know exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('subscription_tier')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      console.warn('Error fetching user subscription status:', userError)
      return null
    }

    // Try to get promotional subscriptions if table exists
    let promotionalSubs = null
    try {
      const { data: promoData, error: promoError } = await supabase
        .from('promotional_subscriptions')
        .select('promotion_type, promotional_tier, granted_at, expires_at, is_active')
        .eq('user_id', userId)
        .eq('is_active', true)

      if (!promoError) {
        promotionalSubs = promoData
      }
    } catch (promoError) {
      // Promotional subscriptions table may not exist yet
      console.log('Promotional subscriptions not available')
    }

    return {
      isPromotionalSubscriber: false, // Default to false if columns don't exist
      promotionalType: null,
      promotionalGrantedAt: null,
      registrationNumber: null,
      currentTier: user.subscription_tier,
      activePromotions: promotionalSubs || []
    }
  } catch (error) {
    console.error('Error getting user promotional status:', error)
    return null
  }
}