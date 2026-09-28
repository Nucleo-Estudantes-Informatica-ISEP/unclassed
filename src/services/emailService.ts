import nodemailer from "nodemailer";

import { env } from "@/lib/env";
import { logger, safeError } from "@/lib/logger";

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
      if (env.EMAIL_HOST && env.EMAIL_USER && env.EMAIL_PASS) {
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
        logger.info("Email service initialized with");
      } else {
        logger.warn("No email configuration found - emails will not be sent");
      }
    } catch (error) {
      logger.error(safeError(error), "Failed to initialize email transporter:");
    }
  }

  async sendMatchNotification(
    userEmail: string,
    data: MatchNotificationData
  ): Promise<boolean> {
    if (!this.transporter) {
      logger.error("Email transporter not initialized");
      return false;
    }

    try {
      const mailOptions = {
        from: this.fromEmail,
        to: userEmail,
        subject: `🎯 Novo Match Encontrado - ${data.matchType}`,
        html: getMatchNotificationTemplate(data),
      };

      await this.transporter.sendMail(mailOptions);
      logger.info("Match notification sent");

      return true;
    } catch (error) {
      logger.error(safeError(error), "Failed to send match notification:");
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
      logger.error("Email transporter not initialized");
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

      await this.transporter.sendMail(mailOptions);
      logger.info("Match status update sent");
      return true;
    } catch (error) {
      logger.error(safeError(error), "Failed to send match status update:");
      return false;
    }
  }

  async verifyConnection(): Promise<boolean> {
    if (!this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      logger.info("Email service connection verified");
      return true;
    } catch (error) {
      logger.error(safeError(error), "Email service connection failed:");
      return false;
    }
  }
}

export const emailService = new EmailService();
