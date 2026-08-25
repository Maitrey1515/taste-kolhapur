import { useEffect, useState } from 'react';
import { Download, QrCode, Loader2 } from 'lucide-react';
import { generateRestaurantQR, downloadQR } from '@/lib/qr';

interface Props {
  slug: string;
  restaurantName: string;
  size?: number;
}

export default function QRDisplay({ slug, restaurantName, size = 200 }: Props) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    generateRestaurantQR(slug)
      .then(setQrDataUrl)
      .finally(() => setLoading(false));
  }, [slug]);

  return (
    <div className="flex flex-col items-center gap-4 p-6 card">
      <div className="flex items-center gap-2 text-[var(--text-primary)]">
        <QrCode className="w-5 h-5 text-orange-500" />
        <h3 className="font-display font-semibold">Verified Visit QR Code</h3>
      </div>

      <p className="text-xs text-[var(--text-muted)] text-center max-w-[220px]">
        Display this at your restaurant. Customers scan it to verify their visit and unlock a verified review badge.
      </p>

      <div className="p-3 bg-white rounded-2xl shadow-inner">
        {loading ? (
          <div className="flex items-center justify-center" style={{ width: size, height: size }}>
            <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
          </div>
        ) : qrDataUrl ? (
          <img
            src={qrDataUrl}
            alt={`QR code for ${restaurantName}`}
            width={size}
            height={size}
            className="rounded-lg"
          />
        ) : (
          <div className="flex items-center justify-center text-red-400" style={{ width: size, height: size }}>
            QR generation failed
          </div>
        )}
      </div>

      {qrDataUrl && (
        <button
          onClick={() => downloadQR(slug, restaurantName)}
          className="btn btn-primary btn-sm"
        >
          <Download className="w-3.5 h-3.5" />
          Download PNG
        </button>
      )}

      <div className="text-[10px] text-[var(--text-muted)] text-center">
        🔒 Each scan is validated server-side. QR refreshes are not needed — it's always valid.
      </div>
    </div>
  );
}
