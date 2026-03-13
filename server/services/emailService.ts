import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private isConfigured: boolean = false;

  constructor() {
    this.initialize();
  }

  private initialize() {
    const {
      SMTP_HOST,
      SMTP_PORT,
      SMTP_USER,
      SMTP_PASS,
      SMTP_FROM
    } = process.env;

    // Check if email is configured
    if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
      console.warn('⚠️  Email service not configured. Email notifications will be logged but not sent.');
      this.isConfigured = false;
      return;
    }

    try {
      this.transporter = nodemailer.createTransporter({
        host: SMTP_HOST,
        port: parseInt(SMTP_PORT),
        secure: parseInt(SMTP_PORT) === 465, // true for 465, false for other ports
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS,
        },
      });

      this.isConfigured = true;
      console.log('✅ Email service configured successfully');
    } catch (error) {
      console.error('❌ Failed to configure email service:', error);
      this.isConfigured = false;
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.isConfigured || !this.transporter) {
      console.log('📧 [Email Mock] Would send email to:', options.to);
      console.log('   Subject:', options.subject);
      console.log('   Preview:', options.text?.substring(0, 100) || options.html.substring(0, 100));
      return true; // Return true for mock sending
    }

    try {
      const from = process.env.SMTP_FROM || process.env.SMTP_USER;

      await this.transporter.sendMail({
        from,
        ...options
      });

      console.log('✅ Email sent successfully to:', options.to);
      return true;
    } catch (error) {
      console.error('❌ Failed to send email:', error);
      return false;
    }
  }

  async sendStatusChangeNotification(
    recipientEmail: string,
    recipientName: string,
    ideaTitle: string,
    oldStatus: string,
    newStatus: string,
    actorName: string,
    ideaUrl: string
  ): Promise<boolean> {
    const subject = `Idea Status Update: ${ideaTitle}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
            .status-badge { display: inline-block; padding: 8px 16px; border-radius: 20px; font-weight: 600; margin: 0 4px; }
            .status-old { background: #f3f4f6; color: #6b7280; }
            .status-new { background: #10b981; color: white; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 24px;">🔔 Idea Status Updated</h1>
            </div>
            <div class="content">
              <p>Hi ${recipientName},</p>
              <p>Your idea <strong>"${ideaTitle}"</strong> has been updated by ${actorName}.</p>

              <div style="margin: 30px 0; padding: 20px; background: #f9fafb; border-radius: 8px; text-align: center;">
                <p style="margin: 0 0 15px 0; color: #6b7280; font-size: 14px;">Status changed from:</p>
                <div>
                  <span class="status-badge status-old">${this.formatStatus(oldStatus)}</span>
                  <span style="color: #6b7280; font-size: 20px;">→</span>
                  <span class="status-badge status-new">${this.formatStatus(newStatus)}</span>
                </div>
              </div>

              <p>You can view the full details and timeline of your idea by clicking the button below:</p>

              <a href="${ideaUrl}" class="button">View Idea Details</a>

              <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
                This is an automated notification from FikraOS Idea Management System.
              </p>
            </div>
            <div class="footer">
              <p>FikraOS - Innovation Management Platform</p>
              <p style="font-size: 12px;">To manage your notification preferences, visit your account settings.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
Hi ${recipientName},

Your idea "${ideaTitle}" has been updated by ${actorName}.

Status changed from: ${this.formatStatus(oldStatus)} → ${this.formatStatus(newStatus)}

View your idea: ${ideaUrl}

This is an automated notification from FikraOS Idea Management System.
    `.trim();

    return this.sendEmail({
      to: recipientEmail,
      subject,
      html,
      text
    });
  }

  async sendMentorBookingNotification(
    mentorEmail: string,
    mentorName: string,
    bookerName: string,
    bookedDate: string,
    bookedTime: string,
    durationMinutes: number,
    ideaTitle?: string,
    hasPitchDeck?: boolean,
    dashboardUrl?: string
  ): Promise<boolean> {
    const subject = `New Booking Request from ${bookerName}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
            .detail-row { display: flex; align-items: center; margin: 12px 0; padding: 12px; background: #f9fafb; border-radius: 8px; }
            .detail-label { font-weight: 600; color: #6b7280; font-size: 13px; min-width: 120px; }
            .detail-value { color: #111827; font-size: 14px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; font-weight: 600; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 24px;">📅 New Session Request</h1>
            </div>
            <div class="content">
              <p>Hi ${mentorName},</p>
              <p><strong>${bookerName}</strong> has requested a mentoring session with you.</p>

              <div style="margin: 24px 0;">
                <div class="detail-row">
                  <span class="detail-label">📅 Date</span>
                  <span class="detail-value">${bookedDate}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">🕐 Time</span>
                  <span class="detail-value">${bookedTime}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">⏱ Duration</span>
                  <span class="detail-value">${durationMinutes} minutes</span>
                </div>
                ${ideaTitle ? `
                <div class="detail-row">
                  <span class="detail-label">💡 Topic</span>
                  <span class="detail-value">${ideaTitle}</span>
                </div>` : ''}
                ${hasPitchDeck ? `
                <div class="detail-row">
                  <span class="detail-label">📊 Pitch Deck</span>
                  <span class="detail-value">Attached (view in dashboard)</span>
                </div>` : ''}
              </div>

              <p>Please confirm or decline this request from your mentor dashboard.</p>

              ${dashboardUrl ? `<a href="${dashboardUrl}" class="button">View Booking Request</a>` : ''}

              <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
                This is an automated notification from FikraOS.
              </p>
            </div>
            <div class="footer">
              <p>FikraOS - Innovation Management Platform</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
Hi ${mentorName},

${bookerName} has requested a mentoring session with you.

Date: ${bookedDate}
Time: ${bookedTime}
Duration: ${durationMinutes} minutes${ideaTitle ? `\nTopic: ${ideaTitle}` : ''}${hasPitchDeck ? '\nPitch Deck: Attached' : ''}

Please log in to your mentor dashboard to confirm or decline this request.
${dashboardUrl ? `\nDashboard: ${dashboardUrl}` : ''}

This is an automated notification from FikraOS.
    `.trim();

    return this.sendEmail({ to: mentorEmail, subject, html, text });
  }

  private formatStatus(status: string): string {
    return status
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  async sendReviewAssignmentNotification(
    recipientEmail: string,
    recipientName: string,
    ideaTitle: string,
    assignedBy: string,
    ideaUrl: string
  ): Promise<boolean> {
    const subject = `Review Request: ${ideaTitle}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 24px;">📋 New Review Request</h1>
            </div>
            <div class="content">
              <p>Hi ${recipientName},</p>
              <p>${assignedBy} has requested your review for the idea:</p>
              <h2 style="color: #667eea; margin: 20px 0;">"${ideaTitle}"</h2>
              <p>Your expertise and feedback would be valuable for evaluating this idea.</p>

              <a href="${ideaUrl}" class="button">Review Idea</a>

              <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
                This is an automated notification from FikraOS Idea Management System.
              </p>
            </div>
            <div class="footer">
              <p>FikraOS - Innovation Management Platform</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
Hi ${recipientName},

${assignedBy} has requested your review for the idea: "${ideaTitle}"

Review the idea: ${ideaUrl}

This is an automated notification from FikraOS Idea Management System.
    `.trim();

    return this.sendEmail({
      to: recipientEmail,
      subject,
      html,
      text
    });
  }
}

export const emailService = new EmailService();
