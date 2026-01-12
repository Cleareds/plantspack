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

    // Note: promotional_subscriptions table is not yet created in production
    // Returning default response for now to avoid 404 errors
    // TODO: Run migration 20250905000000_promotional_subscriptions.sql

    return {
      isPromotionalSubscriber: false,
      promotionalType: null,
      promotionalGrantedAt: null,
      registrationNumber: null,
      currentTier: user.subscription_tier,
      activePromotions: []
    }
  } catch (error) {
    console.error('Error getting user promotional status:', error)
    return null
  }
}