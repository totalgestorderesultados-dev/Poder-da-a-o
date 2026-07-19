export interface Lead {
  id: string;
  name: string;
  whatsapp: string;
  verifiedAt: string;
}

export interface AdminConfig {
  targetLink: string;
  adminPasscode: string;
}

export interface VerificationSession {
  whatsapp: string;
  code: string;
  expiresAt: number;
}
