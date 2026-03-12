import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
    private readonly logger = new Logger(EmailService.name);
    private apiKey: string;
    private templateId: number;
    private fromEmail: string;
    private fromName: string;
    private portalUrl: string;

    constructor(private readonly config: ConfigService) {
        this.apiKey = this.config.get<string>('BREVO_API_KEY', '');
        this.templateId = parseInt(this.config.get<string>('BREVO_TEMPLATE_ID', '0'), 10);
        this.fromEmail = this.config.get<string>('SMTP_FROM_EMAIL', 'noreply@careformance.com');
        this.fromName = this.config.get<string>('SMTP_FROM_NAME', 'Careformance Audio');
        this.portalUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:3838');
    }

    isConfigured(): boolean {
        return Boolean(this.apiKey && this.templateId && this.fromEmail);
    }

    async sendWelcomeEmail(user: {
        email: string;
        firstName?: string;
        lastName?: string;
    }): Promise<{ success: boolean; message: string }> {
        if (!this.isConfigured()) {
            this.logger.warn('Email configuration incomplete – skipping send');
            return { success: false, message: 'Email configuration incomplete (BREVO_API_KEY, BREVO_TEMPLATE_ID, SMTP_FROM_EMAIL required)' };
        }

        try {
            const payload = {
                templateId: this.templateId,
                to: [{ email: user.email, name: `${user.firstName || ''} ${user.lastName || ''}`.trim() }],
                sender: { email: this.fromEmail, name: this.fromName },
                params: {
                    firstName: user.firstName || '',
                    lastName: user.lastName || '',
                    email: user.email,
                    provisionalPassword: 'care1234!',
                    portalUrl: this.portalUrl,
                },
            };

            this.logger.log(`Sending welcome email to ${user.email} (template ${this.templateId})`);
            const res = await fetch('https://api.brevo.com/v3/smtp/email', {
                method: 'POST',
                headers: {
                    'accept': 'application/json',
                    'api-key': this.apiKey,
                    'content-type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err?.message || `Brevo API error ${res.status}`);
            }
            this.logger.log(`Welcome email sent to ${user.email}`);

            return { success: true, message: `Email envoyé à ${user.email}` };
        } catch (error: any) {
            this.logger.error(`Failed to send email to ${user.email}`, error?.message || error);
            return { success: false, message: `Échec de l'envoi: ${error?.message || 'Erreur inconnue'}` };
        }
    }
}
