import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// Verified domain
const FROM_EMAIL = 'Plantspack <hello@plantspack.com>'
const SUPPORT_EMAIL = 'hello@cleareds.com'

export interface SendEmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

export async function sendEmail({ to, subject, html, text }: SendEmailOptions) {
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
    })

    if (error) {
      console.error('[Email] Failed to send:', error)
      return { success: false, error }
    }

    console.log('[Email] Sent successfully:', data?.id)
    return { success: true, id: data?.id }
  } catch (error) {
    console.error('[Email] Error:', error)
    return { success: false, error }
  }
}

// Welcome email for new users
export async function sendWelcomeEmail(to: string, username: string) {
  const subject = 'Welcome to Plantspack!'

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #16a34a; margin: 0;">Welcome to Plantspack!</h1>
      </div>

      <p>Hi <strong>${username}</strong>,</p>

      <p>Thanks for joining Plantspack! We're excited to have you in our community of plant enthusiasts.</p>

      <div style="background: #f0fdf4; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <h3 style="color: #16a34a; margin-top: 0;">Here's what you can do:</h3>
        <ul style="margin: 0; padding-left: 20px;">
          <li>Share photos of your plants</li>
          <li>Connect with other plant lovers</li>
          <li>Get tips and advice from the community</li>
          <li>Join packs (groups) based on your interests</li>
        </ul>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="https://www.plantspack.com" style="background: #16a34a; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
          Start Exploring
        </a>
      </div>

      <p>If you have any questions, feel free to reach out to us at <a href="mailto:${SUPPORT_EMAIL}" style="color: #16a34a;">${SUPPORT_EMAIL}</a></p>

      <p style="margin-top: 30px;">Happy planting!</p>
      <p><strong>The Plantspack Team</strong></p>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
      <p style="font-size: 12px; color: #6b7280; text-align: center;">
        You're receiving this email because you signed up for Plantspack.<br>
        <a href="https://www.plantspack.com" style="color: #16a34a;">www.plantspack.com</a>
      </p>
    </body>
    </html>
  `

  return sendEmail({ to, subject, html })
}

// Notification email templates
export async function sendNotificationEmail(
  to: string,
  username: string,
  type: 'like' | 'comment' | 'reply' | 'follow' | 'mention',
  actorName: string,
  entityUrl?: string
) {
  const typeMessages: Record<string, { subject: string; action: string }> = {
    like: {
      subject: `${actorName} liked your post`,
      action: 'liked your post'
    },
    comment: {
      subject: `${actorName} commented on your post`,
      action: 'commented on your post'
    },
    reply: {
      subject: `${actorName} replied to your comment`,
      action: 'replied to your comment'
    },
    follow: {
      subject: `${actorName} started following you`,
      action: 'started following you'
    },
    mention: {
      subject: `${actorName} mentioned you`,
      action: 'mentioned you in a post'
    }
  }

  const { subject, action } = typeMessages[type] || { subject: 'New notification', action: 'interacted with you' }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h2 style="color: #16a34a; margin: 0;">Plantspack</h2>
      </div>

      <p>Hi <strong>${username}</strong>,</p>

      <div style="background: #f0fdf4; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
        <p style="font-size: 18px; margin: 0;">
          <strong>${actorName}</strong> ${action}
        </p>
      </div>

      ${entityUrl ? `
      <div style="text-align: center; margin: 30px 0;">
        <a href="${entityUrl}" style="background: #16a34a; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
          View on Plantspack
        </a>
      </div>
      ` : ''}

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
      <p style="font-size: 12px; color: #6b7280; text-align: center;">
        You can manage your email preferences in your <a href="https://www.plantspack.com/settings" style="color: #16a34a;">notification settings</a>.<br>
        <a href="https://www.plantspack.com" style="color: #16a34a;">www.plantspack.com</a>
      </p>
    </body>
    </html>
  `

  return sendEmail({ to, subject, html })
}

// Subscription confirmation email
export async function sendSubscriptionEmail(
  to: string,
  username: string,
  tier: 'medium' | 'premium'
) {
  const tierNames = {
    medium: 'Supporter',
    premium: 'Premium'
  }

  const subject = `Welcome to Plantspack ${tierNames[tier]}!`

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #16a34a; margin: 0;">Thank You!</h1>
      </div>

      <p>Hi <strong>${username}</strong>,</p>

      <p>Thank you for upgrading to <strong>Plantspack ${tierNames[tier]}</strong>! Your support helps us build a better community for plant lovers everywhere.</p>

      <div style="background: linear-gradient(135deg, #f0fdf4, #dcfce7); border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
        <h2 style="color: #16a34a; margin: 0 0 10px 0;">${tierNames[tier]} Member</h2>
        <p style="margin: 0; color: #15803d;">Your new benefits are now active!</p>
      </div>

      <h3 style="color: #16a34a;">Your ${tierNames[tier]} benefits:</h3>
      <ul>
        <li>Extended post length (up to 1000 characters)</li>
        <li>Upload up to ${tier === 'premium' ? '5' : '3'} images per post</li>
        <li>Add location to your posts</li>
        <li>Access to analytics</li>
        ${tier === 'premium' ? '<li>Priority support</li>' : ''}
      </ul>

      <div style="background: #f0fdf4; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <h3 style="color: #16a34a; margin-top: 0;">Join the Community</h3>
        <p style="margin: 0 0 16px 0; color: #374151;">Connect with fellow plant-based community members:</p>
        <div style="display: flex; gap: 12px; flex-wrap: wrap;">
          <a href="https://web.telegram.org/a/#-5158658423" style="background: #0088cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
            Join Telegram Channel
          </a>
          <a href="https://discord.gg/dnCsMbXn" style="background: #5865f2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
            Join Discord Server
          </a>
        </div>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="https://www.plantspack.com" style="background: #16a34a; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
          Start Using Your Benefits
        </a>
      </div>

      <p>If you have any questions about your subscription, feel free to reach out to us at <a href="mailto:${SUPPORT_EMAIL}" style="color: #16a34a;">${SUPPORT_EMAIL}</a></p>

      <p style="margin-top: 30px;"><strong>The Plantspack Team</strong></p>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
      <p style="font-size: 12px; color: #6b7280; text-align: center;">
        <a href="https://www.plantspack.com" style="color: #16a34a;">www.plantspack.com</a>
      </p>
    </body>
    </html>
  `

  return sendEmail({ to, subject, html })
}

// Business claim notification email (to admins)
export async function sendClaimRequestEmail(claimData: {
  place_name: string
  place_id: string
  place_address: string
  user_name: string
  first_name: string
  last_name: string
  email: string
  proof_description: string
  claim_id: string
}) {
  const subject = `New Business Claim Request - ${claimData.place_name}`

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #16a34a; margin: 0;">New Business Claim Request</h1>
      </div>

      <div style="background: #f0fdf4; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <h2 style="color: #16a34a; margin-top: 0;">Place Details</h2>
        <p><strong>Name:</strong> ${claimData.place_name}</p>
        <p><strong>Address:</strong> ${claimData.place_address}</p>
        <p><strong>Place ID:</strong> ${claimData.place_id}</p>
        <p style="margin-bottom: 0;">
          <a href="https://www.plantspack.com/place/${claimData.place_id}"
             style="color: #16a34a; text-decoration: underline;">
            View Place Page
          </a>
        </p>
      </div>

      <div style="background: #fefce8; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <h2 style="color: #854d0e; margin-top: 0;">Claimant Details</h2>
        <p><strong>Name:</strong> ${claimData.first_name} ${claimData.last_name}</p>
        <p><strong>Email:</strong> ${claimData.email}</p>
        <p><strong>Username:</strong> ${claimData.user_name}</p>
        <p style="margin-bottom: 0;">
          <a href="https://www.plantspack.com/profile/${claimData.user_name}"
             style="color: #854d0e; text-decoration: underline;">
            View Profile
          </a>
        </p>
      </div>

      <div style="background: #eff6ff; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <h2 style="color: #1e40af; margin-top: 0;">Proof of Ownership</h2>
        <p style="white-space: pre-wrap; background: white; padding: 15px; border-radius: 4px; border-left: 4px solid #1e40af;">${claimData.proof_description}</p>
      </div>

      <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <h3 style="margin-top: 0;">Manual Approval Required</h3>
        <p>To approve this claim, execute the following SQL in Supabase:</p>
        <pre style="background: #1f2937; color: #f9fafb; padding: 15px; border-radius: 4px; overflow-x: auto; font-size: 12px;">-- Approve claim and create owner
BEGIN;

UPDATE place_claim_requests
SET
  status = 'approved',
  reviewed_by = 'YOUR_ADMIN_USER_ID',
  reviewed_at = NOW()
WHERE id = '${claimData.claim_id}';

INSERT INTO place_owners (place_id, user_id, claim_request_id, verified_by)
SELECT
  place_id,
  user_id,
  id,
  'YOUR_ADMIN_USER_ID'
FROM place_claim_requests
WHERE id = '${claimData.claim_id}';

COMMIT;</pre>

        <p style="margin-top: 15px;">To reject this claim:</p>
        <pre style="background: #7f1d1d; color: #f9fafb; padding: 15px; border-radius: 4px; overflow-x: auto; font-size: 12px;">UPDATE place_claim_requests
SET
  status = 'rejected',
  reviewed_by = 'YOUR_ADMIN_USER_ID',
  reviewed_at = NOW(),
  rejection_reason = 'Reason here...'
WHERE id = '${claimData.claim_id}';</pre>
      </div>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
      <p style="font-size: 12px; color: #6b7280; text-align: center;">
        Claim ID: ${claimData.claim_id}<br>
        <a href="https://www.plantspack.com" style="color: #16a34a;">www.plantspack.com</a>
      </p>
    </body>
    </html>
  `

  return sendEmail({ to: SUPPORT_EMAIL, subject, html })
}

// Claim approved email (to user)
export async function sendClaimApprovedEmail(
  to: string,
  userName: string,
  placeName: string,
  placeUrl: string
) {
  const subject = `Your claim for ${placeName} has been approved!`

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #16a34a; margin: 0;">Congratulations!</h1>
      </div>

      <p>Hi <strong>${userName}</strong>,</p>

      <div style="background: linear-gradient(135deg, #f0fdf4, #dcfce7); border-radius: 8px; padding: 30px; margin: 20px 0; text-align: center;">
        <h2 style="color: #16a34a; margin: 0 0 15px 0;">Your Business Claim Has Been Approved</h2>
        <p style="font-size: 18px; margin: 0; color: #15803d;">
          You are now the verified owner of <strong>${placeName}</strong>!
        </p>
      </div>

      <p>Your business ownership has been verified and your profile now displays an owner badge linking to your place.</p>

      <div style="background: #f0fdf4; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <h3 style="color: #16a34a; margin-top: 0;">What's Next?</h3>
        <ul style="margin: 0; padding-left: 20px;">
          <li>Your verified owner status is now visible on the place page</li>
          <li>An owner badge appears on your profile</li>
          <li>Users can see you're the verified owner</li>
        </ul>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${placeUrl}" style="background: #16a34a; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
          View Your Place
        </a>
      </div>

      <p>If you have any questions, feel free to reach out to us at <a href="mailto:${SUPPORT_EMAIL}" style="color: #16a34a;">${SUPPORT_EMAIL}</a></p>

      <p style="margin-top: 30px;"><strong>The Plantspack Team</strong></p>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
      <p style="font-size: 12px; color: #6b7280; text-align: center;">
        <a href="https://www.plantspack.com" style="color: #16a34a;">www.plantspack.com</a>
      </p>
    </body>
    </html>
  `

  return sendEmail({ to, subject, html })
}

// Claim rejected email (to user)
export async function sendClaimRejectedEmail(
  to: string,
  userName: string,
  placeName: string,
  rejectionReason: string
) {
  const subject = `Update on your claim for ${placeName}`

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #dc2626; margin: 0;">Claim Update</h1>
      </div>

      <p>Hi <strong>${userName}</strong>,</p>

      <p>Thank you for your interest in claiming ownership of <strong>${placeName}</strong>.</p>

      <div style="background: #fef2f2; border-left: 4px solid #dc2626; border-radius: 4px; padding: 20px; margin: 20px 0;">
        <p style="margin: 0;">Unfortunately, we were unable to verify your ownership claim at this time.</p>
      </div>

      <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <h3 style="margin-top: 0;">Reason:</h3>
        <p style="white-space: pre-wrap; margin: 0;">${rejectionReason}</p>
      </div>

      <div style="background: #eff6ff; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <h3 style="color: #1e40af; margin-top: 0;">What You Can Do</h3>
        <ul style="margin: 0; padding-left: 20px;">
          <li>Review the rejection reason above</li>
          <li>Gather additional proof of ownership if needed</li>
          <li>Submit a new claim request with updated information</li>
        </ul>
      </div>

      <p>If you believe this was an error or have additional information to support your claim, please contact us at <a href="mailto:${SUPPORT_EMAIL}" style="color: #16a34a;">${SUPPORT_EMAIL}</a></p>

      <p style="margin-top: 30px;"><strong>The Plantspack Team</strong></p>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
      <p style="font-size: 12px; color: #6b7280; text-align: center;">
        <a href="https://www.plantspack.com" style="color: #16a34a;">www.plantspack.com</a>
      </p>
    </body>
    </html>
  `

  return sendEmail({ to, subject, html })
}
