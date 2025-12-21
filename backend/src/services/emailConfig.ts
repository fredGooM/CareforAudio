import fs from 'fs';
import path from 'path';

export interface EmailConfig {
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPass: string;
  fromName: string;
  fromEmail: string;
  templateId?: number;
}

const DEFAULT_EMAIL_CONFIG: EmailConfig = {
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587,
  smtpSecure: process.env.SMTP_SECURE === 'true',
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  fromName: process.env.SMTP_FROM_NAME || 'Careformance Audio',
  fromEmail: process.env.SMTP_FROM_EMAIL || '',
  templateId: process.env.BREVO_TEMPLATE_ID ? parseInt(process.env.BREVO_TEMPLATE_ID, 10) : undefined
};

const CONFIG_DIR = path.join(process.cwd(), 'config');
const CONFIG_PATH = path.join(CONFIG_DIR, 'email.json');

function ensureConfigFile(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  if (!fs.existsSync(CONFIG_PATH)) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_EMAIL_CONFIG, null, 2));
  }
}

export function loadEmailConfig(): EmailConfig {
  try {
    ensureConfigFile();
    const content = fs.readFileSync(CONFIG_PATH, 'utf-8');
    const parsed = JSON.parse(content);
    const merged: EmailConfig = { ...DEFAULT_EMAIL_CONFIG };

    if (parsed.smtpHost) merged.smtpHost = parsed.smtpHost;
    if (parsed.smtpPort) merged.smtpPort = Number(parsed.smtpPort);
    if (typeof parsed.smtpSecure === 'boolean') merged.smtpSecure = parsed.smtpSecure;
    if (parsed.smtpUser) merged.smtpUser = parsed.smtpUser;
    if (parsed.smtpPass) merged.smtpPass = parsed.smtpPass;
    if (parsed.fromName) merged.fromName = parsed.fromName;
    if (parsed.fromEmail) merged.fromEmail = parsed.fromEmail;
    if (parsed.templateId) merged.templateId = Number(parsed.templateId);

    return merged;
  } catch (error) {
    console.error('Unable to load email config, using defaults', error);
    return DEFAULT_EMAIL_CONFIG;
  }
}

export function emailConfigReady(config: EmailConfig): boolean {
  return Boolean(
    config.fromEmail &&
    config.templateId
  );
}
