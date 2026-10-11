const CONTACT_ENDPOINT = 'https://formsubmit.co/ajax/contact@universion-closure-logic.com';
const CONTACT_URL = 'https://universion-closure-logic.com/#contact';

export class ContactSubmissionError extends Error {
  constructor(code) {
    super(code);
    this.name = 'ContactSubmissionError';
    this.code = code;
  }
}

// The service must acknowledge the submission before the page shows completion.
// A pending email activation is not a successful submission.
export async function sendContactMessage(fields, { fetchImpl = fetch, timeoutMs = 20000 } = {}) {
  const name = String(fields.name || '').trim();
  const email = String(fields.email || '').trim();
  const message = String(fields.message || '').trim();
  if (fields._honey || !email || !message || name.length > 120 || email.length > 254 || message.length > 5000) {
    throw new ContactSubmissionError('invalid');
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(CONTACT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      credentials: 'omit',
      cache: 'no-store',
      signal: controller.signal,
      body: JSON.stringify({
        name, email, message,
        language: fields.language === 'en' ? 'English' : '日本語',
        _subject: '[UCL Website] お問い合わせ / Contact',
        _template: 'table',
        _url: CONTACT_URL,
        _honey: ''
      })
    });
    if (!response.ok) throw new ContactSubmissionError('failed');
    const result = await response.json();
    if (/activat|confirm (?:your|the) (?:email|form)/i.test(String(result?.message || ''))) {
      throw new ContactSubmissionError('notReady');
    }
    if (result?.success !== true && result?.success !== 'true') {
      throw new ContactSubmissionError('failed');
    }
    return { accepted: true };
  } catch (error) {
    if (controller.signal.aborted) throw new ContactSubmissionError('timeout');
    if (error instanceof ContactSubmissionError) throw error;
    throw new ContactSubmissionError('failed');
  } finally {
    clearTimeout(timer);
  }
}
