import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X, AlertCircle } from 'lucide-react';

interface Props {
  onScan: (data: string) => void;
  onClose: () => void;
}

export default function QRScanner({ onScan, onClose }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = 'qr-reader';

  useEffect(() => {
    const html5QrCode = new Html5Qrcode(containerId);
    scannerRef.current = html5QrCode;

    const config = { fps: 10, qrbox: { width: 250, height: 250 } };

    html5QrCode
      .start(
        { facingMode: 'environment' },
        config,
        (decodedText) => {
          onScan(decodedText);
          html5QrCode.stop().catch(console.error);
        },
        () => { /* ignore scan errors */ }
      )
      .then(() => setStarted(true))
      .catch(err => {
        console.error('QR scanner error:', err);
        setError('Could not access camera. Please allow camera permissions and try again.');
      });

    return () => {
      if (html5QrCode.isScanning) {
        html5QrCode.stop().catch(console.error);
      }
    };
  }, [onScan]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-orange-500" />
          <h3 className="font-display font-semibold text-[var(--text-primary)]">Scan Restaurant QR</h3>
        </div>
        <button onClick={onClose} className="btn-icon btn-ghost">
          <X className="w-4 h-4" />
        </button>
      </div>

      {error ? (
        <div className="p-4 bg-red-50 dark:bg-red-950/30 rounded-xl border border-red-200 dark:border-red-800 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-[var(--text-muted)]">
            Point your camera at the QR code displayed at the restaurant to verify your visit.
          </p>
          <div
            id={containerId}
            className="w-full rounded-2xl overflow-hidden border-2 border-orange-200 dark:border-orange-800"
          />
          {!started && (
            <p className="text-xs text-center text-[var(--text-muted)] animate-pulse">Starting camera…</p>
          )}
        </>
      )}

      <button onClick={onClose} className="btn btn-secondary w-full">Cancel</button>
    </div>
  );
}
