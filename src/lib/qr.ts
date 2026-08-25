// ─── QR Code Generation & TOTP-style Token Validation ────────────────────
import QRCode from 'qrcode';

const APP_URL = import.meta.env.VITE_APP_URL || window.location.origin;

// ─── Generate a QR code Data URL for a restaurant ────────────────────────
export async function generateRestaurantQR(slug: string): Promise<string> {
  // The QR encodes the verify URL; actual token validation is server-side
  const url = `${APP_URL}/verify/${slug}`;
  const dataUrl = await QRCode.toDataURL(url, {
    width: 400,
    margin: 2,
    color: {
      dark:  '#1a1210',
      light: '#ffffff',
    },
    errorCorrectionLevel: 'H',
  });
  return dataUrl;
}

// ─── Download QR as PNG ───────────────────────────────────────────────────
export async function downloadQR(slug: string, restaurantName: string): Promise<void> {
  const dataUrl = await generateRestaurantQR(slug);
  const link = document.createElement('a');
  link.download = `${restaurantName}-TasteKolhapur-QR.png`;
  link.href = dataUrl;
  link.click();
}

// ─── Client-side: parse verify URL from scanned QR ───────────────────────
export function parseVerifyUrl(url: string): { slug: string } | null {
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(/\/verify\/([^/?#]+)/);
    if (match) {
      return { slug: match[1] };
    }
    return null;
  } catch {
    return null;
  }
}

// ─── TOTP-style client token (for display only — validation is server-side)
// Window: 15 minutes = 900 seconds
export function getCurrentTokenWindow(): number {
  return Math.floor(Date.now() / 1000 / 900);
}

// ─── Simple hash (for display — the real HMAC is server-side) ────────────
async function simpleHash(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const arr = Array.from(new Uint8Array(hash));
  return arr.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 8);
}

// ─── Generate display token (NOT the secret one) ─────────────────────────
export async function generateDisplayToken(slug: string): Promise<string> {
  const window = getCurrentTokenWindow();
  return simpleHash(`${slug}-${window}`);
}

// ─── Validate scanned QR (calls Supabase Edge Function) ──────────────────
export async function validateVisitToken(
  slug: string,
  supabaseUrl: string,
  supabaseAnonKey: string,
): Promise<{ valid: boolean; error?: string }> {
  try {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/validate-visit-token`,
      {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({ slug }),
      }
    );
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { valid: false, error: err.error || 'Validation failed' };
    }
    const data = await response.json();
    return { valid: data.valid === true };
  } catch (err) {
    console.error('QR validation error:', err);
    return { valid: false, error: 'Network error during validation' };
  }
}
