import nodemailer from "nodemailer";

import { env } from "@/lib/env";
import {
  getMatchNotificationTemplate,
  getMatchStatusUpdateTemplate,
  type MatchNotificationData,
} from "./emailTemplates";

export type { MatchNotificationData } from "./emailTemplates";

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private fromEmail: string;

  constructor() {
    this.fromEmail = env.EMAIL_FROM;
    this.initializeTransporter();
  }

  private initializeTransporter() {
    try {
      // Check if we have email credentials configured
      if (
        env.EMAIL_HOST &&
        env.EMAIL_USER &&
        env.EMAIL_PASS
      ) {
        // Use configured email service
        this.transporter = nodemailer.createTransport({
          host: env.EMAIL_HOST,
          port: env.EMAIL_PORT,
          secure: env.EMAIL_SECURE,
          auth: {
            user: env.EMAIL_USER,
            pass: env.EMAIL_PASS,
          },
        });
        console.log(
          `📧 Email service initialized with ${env.EMAIL_HOST}`
        );
      } else {
        console.warn(
          "⚠️ No email configuration found - emails will not be sent"
        );
      }
    } catch (error) {
      console.error("Failed to initialize email transporter:", error);
    }
  }

  async sendMatchNotification(
    userEmail: string,
    data: MatchNotificationData
  ): Promise<boolean> {
    if (!this.transporter) {
      console.error("Email transporter not initialized");
      return false;
    }

    try {
      const mailOptions = {
        from: this.fromEmail,
        to: userEmail,
        subject: `🎯 Novo Match Encontrado - ${data.matchType}`,
        html: getMatchNotificationTemplate(data),
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log("✅ Match notification sent:", result.messageId);

      return true;
    } catch (error) {
      console.error("❌ Failed to send match notification:", error);
      return false;
    }
  }

  async sendMatchStatusUpdate(
    userEmail: string,
    userName: string,
    matchId: string,
    status: string,
    details: string
  ): Promise<boolean> {
    if (!this.transporter) {
      console.error("Email transporter not initialized");
      return false;
    }

    const statusEmoji = {
      ACCEPTED: "✅",
      REJECTED: "❌",
      COMPLETED: "🎉",
      CANCELLED: "⚠️",
    };

    const emoji = statusEmoji[status as keyof typeof statusEmoji] || "📋";

    try {
      const baseUrl =
        env.APP_BASE_URL || env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

      const mailOptions = {
        from: this.fromEmail,
        to: userEmail,
        subject: `${emoji} Atualização do Match - Unclassed`,
        html: getMatchStatusUpdateTemplate({
          userName,
          status,
          details,
          matchesUrl: `${baseUrl.replace(/\/$/, "")}/matches`,
        }),
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log("✅ Match status update sent:", result.messageId);
      return true;
    } catch (error) {
      console.error("❌ Failed to send match status update:", error);
      return false;
    }
  }

  async verifyConnection(): Promise<boolean> {
    if (!this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      console.log("✅ Email service connection verified");
      return true;
    } catch (error) {
      console.error("❌ Email service connection failed:", error);
      return false;
    }
  }
}

export const emailService = new EmailService();
