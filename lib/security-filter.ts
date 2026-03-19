/**
 * Security Filter for Zoho Account Emails
 * 
 * Detects and restricts visibility of sensitive Zoho security emails
 * (password reset, OTP, verification codes) without hiding them from the inbox.
 */

// Zoho domains to check against
const ZOHO_SECURITY_DOMAINS = [
  'zohoaccounts.com',
  'zohomail.com',
  'zoho.com',
  'zohocorp.com',
];

// Keywords that indicate a security-sensitive email
const SECURITY_KEYWORDS = [
  'reset password',
  'password reset',
  'otp',
  'one-time password',
  'one time password',
  'verification code',
  'verify your',
  'account recovery',
  'security alert',
  'change password',
  'confirm your email',
  'verify email',
  'security code',
  'login attempt',
  'sign-in attempt',
  'two-factor',
  '2fa',
  'authentication code',
];

// Restricted content message
const RESTRICTED_MESSAGE = 
  'This message contains sensitive account security information and cannot be displayed here.';

/**
 * Extracts the domain from an email address string
 */
function extractDomain(emailAddress: string): string {
  if (!emailAddress) return '';
  
  // Handle "Name <email@domain.com>" format
  const match = emailAddress.match(/<([^>]+)>/) || emailAddress.match(/([^\s<>]+@[^\s<>]+)/);
  const email = match ? match[1] : emailAddress;
  
  const parts = email.split('@');
  return parts.length > 1 ? parts[1].toLowerCase().trim() : '';
}

/**
 * Checks if the sender is from a Zoho domain
 */
function isZohoDomain(senderAddress: string): boolean {
  const domain = extractDomain(senderAddress);
  return ZOHO_SECURITY_DOMAINS.some(zohoDomain => 
    domain === zohoDomain || domain.endsWith('.' + zohoDomain)
  );
}

/**
 * Checks if the content contains security-related keywords
 */
function containsSecurityKeywords(subject: string, body: string): boolean {
  const combinedText = `${subject || ''} ${body || ''}`.toLowerCase();
  return SECURITY_KEYWORDS.some(keyword => combinedText.includes(keyword));
}

/**
 * Determines if an email should be restricted as a security email
 */
export function isRestrictedSecurityEmail(email: {
  sender?: string;
  fromAddress?: string;
  subject?: string;
  summary?: string;
  content?: string;
  htmlContent?: string;
  textContent?: string;
}): boolean {
  const senderAddress = email.sender || email.fromAddress || '';
  
  // Must be from Zoho domain
  if (!isZohoDomain(senderAddress)) {
    return false;
  }
  
  // Check subject and body for security keywords
  const body = email.htmlContent || email.textContent || email.content || email.summary || '';
  return containsSecurityKeywords(email.subject || '', body);
}

/**
 * Redacts sensitive content from an email for list display
 * - Keeps subject visible (so user knows what the email is about)
 * - Redacts summary/preview text
 */
export function redactEmailForList(email: Record<string, unknown>): Record<string, unknown> {
  return {
    ...email,
    summary: RESTRICTED_MESSAGE,
    restricted_security_email: true,
  };
}

/**
 * Fully restricts an email for detail view
 * - Replaces all body content
 * - Removes links and sensitive data
 */
export function redactEmailForDetail(email: Record<string, unknown>): Record<string, unknown> {
  return {
    ...email,
    content: RESTRICTED_MESSAGE,
    htmlContent: '',
    textContent: RESTRICTED_MESSAGE,
    summary: RESTRICTED_MESSAGE,
    restricted_security_email: true,
  };
}

/**
 * Process a list of emails, marking and redacting restricted ones
 */
export function processEmailList(emails: Record<string, unknown>[]): Record<string, unknown>[] {
  return emails.map(email => {
    if (isRestrictedSecurityEmail(email as Parameters<typeof isRestrictedSecurityEmail>[0])) {
      return redactEmailForList(email);
    }
    return email;
  });
}

/**
 * Process a single message for detail view
 */
export function processMessageDetail(message: Record<string, unknown>): Record<string, unknown> {
  if (isRestrictedSecurityEmail(message as Parameters<typeof isRestrictedSecurityEmail>[0])) {
    return redactEmailForDetail(message);
  }
  return message;
}
