import nodemailer from 'nodemailer';
import crypto from 'crypto';

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

export interface MatchNotificationData {
  userName: string;
  matchType: string;
  subjects: string[];
  fromClass: string;
  toClass: string;
  otherParticipants: string[];
  matchId: string;
  dashboardUrl: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private fromEmail: string;

  constructor() {
    this.fromEmail = process.env.EMAIL_FROM || 'noreply@unclassed.isep.ipp.pt';
    this.initializeTransporter();
  }

  private initializeTransporter() {
    try {
      // Check if we have email credentials configured
      if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        // Use configured email service
        this.transporter = nodemailer.createTransport({
          host: process.env.EMAIL_HOST,
          port: parseInt(process.env.EMAIL_PORT || '587'),
          secure: process.env.EMAIL_SECURE === 'true',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
          }
        });
        console.log(`📧 Email service initialized with ${process.env.EMAIL_HOST}`);
      } else if (process.env.NODE_ENV === 'development') {
        this.transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: 'ethereal.user@ethereal.email',
            pass: 'ethereal.pass'
          }
        });
        console.log('📧 Using Ethereal Email for development (test emails)');
      } else {
        console.warn('⚠️ No email configuration found - emails will not be sent');
      }
    } catch (error) {
      console.error('Failed to initialize email transporter:', error);
    }
  }

  generateVerificationToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  generatePasswordResetToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private getPasswordResetEmailTemplate(userName: string, resetUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333333; background-color: #ffffff; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff; }
            .header { background: #2563eb; color: #ffffff; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; color: #333333; }
            .button { display: inline-block; background: #2563eb; color: #ffffff !important; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
            .footer { text-align: center; margin-top: 20px; font-size: 14px; color: #6b7280; }
            h1, h2, h3 { color: #333333; }
            p { color: #333333; }
            code { background: #e5e7eb; padding: 2px 4px; border-radius: 3px; color: #333333; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Unclassed - ISEP</h1>
              <p>Recuperação de Password</p>
            </div>
            <div class="content">
              <h2>Olá ${userName}!</h2>
              <p>Recebemos um pedido para recuperar a password da tua conta. Se foste tu que fizeste este pedido, clica no botão abaixo para criar uma nova password:</p>
              <p style="text-align: center;">
                <a href="${resetUrl}" class="button">Recuperar Password</a>
              </p>
              <p>Se não conseguires clicar no botão, copia e cola o seguinte link no teu navegador:</p>
              <p><code>${resetUrl}</code></p>
              <p><strong>Nota:</strong> Este link de recuperação expira em 1 hora.</p>
              <p>Se não pediste para recuperar a password, podes ignorar este email em segurança.</p>
            </div>
            <div class="footer">
              <p>© 2025 Unclassed - NEI-ISEP</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private getVerificationEmailTemplate(userName: string, verificationUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333333; background-color: #ffffff; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff; }
            .header { background: #2563eb; color: #ffffff; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; color: #333333; }
            .button { display: inline-block; background: #2563eb; color: #ffffff !important; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
            .footer { text-align: center; margin-top: 20px; font-size: 14px; color: #6b7280; }
            h1, h2, h3 { color: #333333; }
            p { color: #333333; }
            code { background: #e5e7eb; padding: 2px 4px; border-radius: 3px; color: #333333; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎓 Unclassed - ISEP</h1>
              <p>Verificação de Email</p>
            </div>
            <div class="content">
              <h2>Olá ${userName}!</h2>
              <p>Obrigado por te registares na plataforma Unclassed. Para completar o teu registo, por favor verifica o teu endereço de email clicando no botão abaixo:</p>
              <p style="text-align: center;">
                <a href="${verificationUrl}" class="button">Verificar Email</a>
              </p>
              <p>Se não conseguires clicar no botão, copia e cola o seguinte link no teu navegador:</p>
              <p><code>${verificationUrl}</code></p>
              <p><strong>Nota:</strong> Este link de verificação expira em 24 horas.</p>
              <p>Se não criaste uma conta na Unclassed, podes ignorar este email.</p>
            </div>
            <div class="footer">
              <p>© 2025 Unclassed - NEI-ISEP</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private getMatchNotificationTemplate(data: MatchNotificationData): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333333; background-color: #ffffff; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff; }
            .header { background: #059669; color: #ffffff; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f0fdf4; padding: 30px; border: 1px solid #dcfce7; border-top: none; color: #333333; }
            .match-details { background: #ffffff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #059669; color: #333333; }
            .button { display: inline-block; background: #059669; color: #ffffff !important; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
            .footer { text-align: center; margin-top: 20px; font-size: 14px; color: #6b7280; }
            .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 6px; margin: 15px 0; color: #333333; }
            h1, h2, h3 { color: #333333; }
            p { color: #333333; }
            strong { color: #333333; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎯 Match Encontrado!</h1>
              <p>Nova troca disponível</p>
            </div>
            <div class="content">
              <h2>Olá ${data.userName}!</h2>
              <p>Ótimas notícias! Encontramos um match para a tua solicitação de troca:</p>
              
              <div class="match-details">
                <h3>📋 Detalhes da Troca</h3>
                <p><strong>Tipo:</strong> ${data.matchType}</p>
                ${data.subjects.length > 0 ? `<p><strong>Disciplinas:</strong> ${data.subjects.join(', ')}</p>` : ''}
                <p><strong>Da turma:</strong> ${data.fromClass}</p>
                <p><strong>Para a turma:</strong> ${data.toClass}</p>
                <p><strong>Outros participantes:</strong> ${data.otherParticipants.join(', ')}</p>
              </div>

              <div class="warning">
                <p><strong>⏰ Ação Necessária!</strong></p>
                <p>Por favor, revisa e aceita esta troca o mais rápido possível. Outros estudantes estão à espera da tua resposta.</p>
              </div>

              <p style="text-align: center;">
                <a href="${data.dashboardUrl}/matches" class="button">Ver Match</a>
              </p>
              
              <p>Podes ver todos os detalhes e aceitar/rejeitar esta troca na tua dashboard.</p>
            </div>
            <div class="footer">
              <p>© 2025 Unclassed - NEI-ISEP</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  async sendVerificationEmail(userEmail: string, userName: string, verificationToken: string): Promise<boolean> {
    if (!this.transporter) {
      console.error('Email transporter not initialized');
      return false;
    }

    try {
      const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const verificationUrl = `${baseUrl}/auth/verify-email?token=${verificationToken}`;

      const mailOptions = {
        from: this.fromEmail,
        to: userEmail,
        subject: '🎓 Verifica o teu email - Unclassed ISEP',
        html: this.getVerificationEmailTemplate(userName, verificationUrl)
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Verification email sent:', result.messageId);

      if (process.env.NODE_ENV === 'development') {
        console.log('🔗 Preview URL:', nodemailer.getTestMessageUrl(result));
      }

      return true;
    } catch (error) {
      console.error('❌ Failed to send verification email:', error);
      return false;
    }
  }

  async sendPasswordResetEmail(userEmail: string, userName: string, resetToken: string): Promise<boolean> {
    if (!this.transporter) {
      console.error('Email transporter not initialized');
      return false;
    }

    try {
      const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;

      const mailOptions = {
        from: this.fromEmail,
        to: userEmail,
        subject: '🔐 Recuperação de Password - Unclassed ISEP',
        html: this.getPasswordResetEmailTemplate(userName, resetUrl)
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Password reset email sent:', result.messageId);

      if (process.env.NODE_ENV === 'development') {
        console.log('🔗 Preview URL:', nodemailer.getTestMessageUrl(result));
      }

      return true;
    } catch (error) {
      console.error('❌ Failed to send password reset email:', error);
      return false;
    }
  }

  async sendMatchNotification(userEmail: string, data: MatchNotificationData): Promise<boolean> {
    if (!this.transporter) {
      console.error('Email transporter not initialized');
      return false;
    }

    try {
      const mailOptions = {
        from: this.fromEmail,
        to: userEmail,
        subject: `🎯 Novo Match Encontrado - ${data.matchType}`,
        html: this.getMatchNotificationTemplate(data)
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Match notification sent:', result.messageId);

      if (process.env.NODE_ENV === 'development') {
        console.log('🔗 Preview URL:', nodemailer.getTestMessageUrl(result));
      }

      return true;
    } catch (error) {
      console.error('❌ Failed to send match notification:', error);
      return false;
    }
  }

  async sendMatchStatusUpdate(userEmail: string, userName: string, matchId: string, status: string, details: string): Promise<boolean> {
    if (!this.transporter) {
      console.error('Email transporter not initialized');
      return false;
    }

    const statusEmoji = {
      'ACCEPTED': '✅',
      'REJECTED': '❌',
      'COMPLETED': '🎉',
      'CANCELLED': '⚠️'
    };

    const emoji = statusEmoji[status as keyof typeof statusEmoji] || '📋';

    try {
      const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

      const mailOptions = {
        from: this.fromEmail,
        to: userEmail,
        subject: `${emoji} Atualização do Match - Unclassed`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>${emoji} Atualização do teu Match</h2>
            <p>Olá ${userName},</p>
            <p>O estado do teu match foi atualizado:</p>
            <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Estado:</strong> ${status}</p>
              <p><strong>Detalhes:</strong> ${details}</p>
            </div>
            <p>
              <a href="${baseUrl}/matches" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Ver Matches</a>
            </p>
          </div>
        `
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Match status update sent:', result.messageId);
      return true;
    } catch (error) {
      console.error('❌ Failed to send match status update:', error);
      return false;
    }
  }

  async verifyConnection(): Promise<boolean> {
    if (!this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      console.log('✅ Email service connection verified');
      return true;
    } catch (error) {
      console.error('❌ Email service connection failed:', error);
      return false;
    }
  }
}

export const emailService = new EmailService();
