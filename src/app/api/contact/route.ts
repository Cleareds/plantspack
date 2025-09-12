import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

interface ContactFormData {
  name: string
  email: string
  subject: string
  message: string
}

export async function POST(request: NextRequest) {
  try {
    const { name, email, subject, message }: ContactFormData = await request.json()

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Send email notification
    try {
      await sendEmailNotification({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        subject: subject.trim(),
        message: message.trim()
      })
    } catch (emailError) {
      console.error('Email notification failed:', emailError)
      return NextResponse.json(
        { error: 'Failed to send message. Please try again.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Your message has been sent successfully!'
    })

  } catch (error) {
    console.error('Contact form error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function sendEmailNotification(data: ContactFormData) {
  // Check if Gmail SMTP is configured
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error('SMTP credentials not configured. Missing:', {
      SMTP_USER: !process.env.SMTP_USER ? 'missing' : 'configured',
      SMTP_PASS: !process.env.SMTP_PASS ? 'missing' : 'configured',
      CONTACT_EMAIL: !process.env.CONTACT_EMAIL ? 'missing' : 'configured'
    })
    throw new Error('Email service not configured. Please contact support.')
  }

  console.log('Attempting to send email with config:', {
    from: process.env.SMTP_USER,
    to: process.env.CONTACT_EMAIL || 'hello@cleareds.com',
    subject: `New Contact Form: ${data.subject}`
  })

  try {
    const nodemailer = await import('nodemailer')
    
    // Create Gmail SMTP transporter
    const transporter = nodemailer.default.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER, // your-email@gmail.com
        pass: process.env.SMTP_PASS  // app-specific password
      }
    })

    await transporter.sendMail({
      from: `"Vegan Social Contact" <${process.env.SMTP_USER}>`,
      to: process.env.CONTACT_EMAIL || 'hello@cleareds.com',
      replyTo: data.email,
      subject: `New Contact Form: ${data.subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #16a34a;">New Vegan Social Contact Form Submission</h2>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Name:</strong> ${data.name}</p>
            <p><strong>Email:</strong> ${data.email}</p>
            <p><strong>Subject:</strong> ${data.subject}</p>
          </div>
          
          <div style="background: white; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
            <h3 style="margin-top: 0; color: #374151;">Message:</h3>
            <p style="white-space: pre-line; line-height: 1.6;">${data.message}</p>
          </div>
          
          <div style="margin-top: 20px; padding: 15px; background: #dcfce7; border-radius: 8px;">
            <p style="margin: 0; color: #166534; font-size: 14px;">
              💡 <strong>Reply directly to this email</strong> to respond to ${data.name} at ${data.email}
            </p>
          </div>
        </div>
      `
    })

    console.log('✅ Email notification sent successfully to:', process.env.CONTACT_EMAIL || 'hello@cleareds.com')
  } catch (error) {
    console.error('Failed to send email notification:', error)
    throw error
  }
}