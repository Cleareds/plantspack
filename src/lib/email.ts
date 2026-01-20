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
