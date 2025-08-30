// src/modules/auth/email.service.ts

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sgMail from '@sendgrid/mail';

@Injectable()
export class EmailService {
  constructor(private configService: ConfigService) {
    sgMail.setApiKey(this.configService.get('SENDGRID_API_KEY'));
  }

  async sendPasswordResetEmail(email: string, token: string) {
    const resetUrl = `${this.configService.get('FRONTEND_URL')}/reset-password?token=${token}`;
    
    const msg = {
      to: email,
      from: this.configService.get('EMAIL_FROM'),
      subject: 'Reset Your LifeBox Password',
      html: `
        <h1>Password Reset Request</h1>
        <p>You requested to reset your password. Click the link below to proceed:</p>
        <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `,
    };
    
    try {
      await sgMail.send(msg);
    } catch (error) {
      console.error('Email sending failed:', error);
      throw new Error('Failed to send password reset email');
    }
  }
}