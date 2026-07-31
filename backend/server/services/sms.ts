import AfricasTalking from 'africastalking';

let smsClient: any = null;

function getSMSClient() {
  const username = process.env.AT_USERNAME;
  const apiKey = process.env.AT_API_KEY;

  if (!username || !apiKey) {
    return null;
  }

  if (!smsClient) {
    try {
      const at = AfricasTalking({
        username,
        apiKey
      });
      smsClient = at.SMS;
    } catch (err: any) {
      console.error('[SMS INIT ERROR] Failed to initialize Africa\'s Talking SDK:', err?.message || err);
      return null;
    }
  }
  return smsClient;
}

/**
 * Format phone number into E.164 international format (defaults to Kenya +254 if starting with 0)
 */
export function formatPhoneNumber(phone: string): string {
  let cleaned = (phone || '').trim().replace(/[\s\-\(\)]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '+254' + cleaned.substring(1);
  } else if (cleaned.startsWith('254')) {
    cleaned = '+' + cleaned;
  } else if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }
  return cleaned;
}

/**
 * Sends an SMS message using Africa's Talking SMS API.
 * Handles missing credentials, network errors, and API failures gracefully without throwing.
 */
export async function sendSMS(phone: string, message: string): Promise<boolean> {
  try {
    if (!phone || !message) {
      console.warn('[SMS] Cannot send SMS: Missing recipient phone number or message text.');
      return false;
    }

    const username = process.env.AT_USERNAME;
    const apiKey = process.env.AT_API_KEY;
    const formattedPhone = formatPhoneNumber(phone);

    if (!username || !apiKey) {
      console.log(`[SMS DISPATCH LOG] (Africa's Talking credentials missing in environment) -> To: ${formattedPhone}\nMessage:\n${message}`);
      return false;
    }

    const sms = getSMSClient();
    if (!sms) {
      console.error('[SMS ERROR] Africa\'s Talking SMS client initialization failed.');
      return false;
    }

    const response = await sms.send({
      to: [formattedPhone],
      message: message
    });

    console.log(`[SMS SUCCESS] Dispatched SMS to ${formattedPhone}:`, JSON.stringify(response));
    return true;
  } catch (error: any) {
    console.error(`[SMS FAILURE] Failed to send SMS to ${phone}:`, error?.message || error);
    return false;
  }
}
