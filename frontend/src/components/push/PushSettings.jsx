import { useEffect, useState } from 'react';
import { BellRing, BellOff } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { currentPushSubscription, disableBrowserPush, enableBrowserPush, pushSupported } from '../../services/pushClient';

export default function PushSettings() {
  const { apiFetch } = useAuth();
  const [supported, setSupported] = useState(null);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    const ok = pushSupported();
    setSupported(ok);
    if (ok) currentPushSubscription().then(sub => { if (active) setEnabled(Boolean(sub) && Notification.permission === 'granted'); })
      .catch(() => { if (active) setError('Không đọc được trạng thái Push của trình duyệt.'); });
    return () => { active = false; };
  }, []);
  async function toggle() {
    if (busy) return;
    setBusy(true); setError(''); setMessage('');
    try {
      if (enabled) {
        await disableBrowserPush(apiFetch);
        setEnabled(false); setMessage('Đã tắt cảnh báo Push trên trình duyệt này.');
      } else {
        await enableBrowserPush(apiFetch);
        setEnabled(true); setMessage('Đã bật Push. Có thể đóng tab và nhận cảnh báo khi Backend còn chạy.');
      }
    } catch (e) { setError(e?.message || 'Không thể thay đổi cài đặt Push.'); }
    finally { setBusy(false); }
  }
  return (
    <section className="rounded-xl border border-line bg-panel p-5 space-y-3" aria-label="Web Push settings">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-ink"><BellRing size={19} className="text-brand"/> Cảnh báo khi đóng website</h2>
      <p className="text-sm text-muted">Bật thông báo hệ thống khi Monitor phát hiện sự cố hoặc phục hồi. Không gửi AI tự động, không yêu cầu mở tab liên tục.</p>
      <p className="text-sm text-muted">Trạng thái thiết bị: <strong className="text-ink">{supported === null ? 'Đang kiểm tra...' : !supported ? 'Không hỗ trợ / cần HTTPS' : enabled ? 'Đã bật' : 'Đã tắt'}</strong></p>
      {error && <p role="alert" className="text-sm text-down">{error}</p>}
      {message && <p role="status" className="text-sm text-up">{message}</p>}
      <button type="button" disabled={!supported || busy} onClick={toggle}
        className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50">
        {enabled ? <BellOff size={16}/> : <BellRing size={16}/>}
        {busy ? 'Đang xử lý...' : enabled ? 'Tắt cảnh báo trên thiết bị này' : 'Bật cảnh báo Push'}
      </button>
      <p className="text-xs text-muted">Chrome trên localhost dùng được. Điện thoại hoặc truy cập IP LAN thường cần HTTPS. Sau khi đăng xuất, thiết bị sẽ được hủy đăng ký.</p>
    </section>
  );
}
