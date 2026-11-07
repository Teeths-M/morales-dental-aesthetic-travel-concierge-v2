import React, { useEffect, useState } from 'react';
import { Receipt, ChevronDown, Download } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { formatIssued, formatUsd, receiptDetails, receiptFileName, receiptKind } from '@/lib/paymentReceipts';

// The patient's official payment receipts. Only the server writes them
// (sendPaymentReceipt), and the read rule scopes them to the signed-in
// patient's own email, so a direct client filter is safe, the same pattern
// VaultDocumentsPanel uses. Renders nothing until there's a receipt.
//
// A receipt is shown from its fields. The emailed copy (receipt_html) is only
// offered as a download, never rendered as live HTML here.

function downloadReceipt(receipt) {
  const blob = new Blob([receipt.receipt_html || ''], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = receiptFileName(receipt);
  a.click();
  URL.revokeObjectURL(url);
}

export default function PaymentReceiptsCard() {
  const { user } = useAuth();
  const [receipts, setReceipts] = useState([]);
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    if (!user?.email) return undefined;
    let cancelled = false;
    base44.entities.PaymentReceipt.filter({ client_email: user.email }, '-issued_at', 50)
      .then((rows) => { if (!cancelled) setReceipts(rows || []); })
      .catch(() => { if (!cancelled) setReceipts([]); });
    return () => { cancelled = true; };
  }, [user?.email]);

  if (receipts.length === 0) return null;

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">Payment receipts</h2>
        <p className="text-xs text-slate-400 mt-0.5">Each one is also emailed to you</p>
      </div>
      {receipts.map((receipt) => {
        const open = openId === receipt.id;
        return (
          <div key={receipt.id} className="bg-white border border-slate-100 rounded-2xl shadow-sm">
            <button
              type="button"
              onClick={() => setOpenId(open ? null : receipt.id)}
              aria-expanded={open}
              className="w-full p-4 flex items-center gap-4 text-left"
            >
              <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                <Receipt className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800">
                  {formatUsd(receipt.amount_paid)} · {receiptKind(receipt)}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                  {formatIssued(receipt.issued_at)} · {receipt.receipt_number}
                </p>
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
              <div className="px-4 pb-4">
                <dl className="border-t border-slate-100 pt-3 space-y-1.5">
                  {receiptDetails(receipt).map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-4 text-xs">
                      <dt className="text-slate-400">{label}</dt>
                      <dd className="text-slate-700 font-medium text-right break-all">{value}</dd>
                    </div>
                  ))}
                </dl>
                <button
                  type="button"
                  onClick={() => downloadReceipt(receipt)}
                  className="mt-3 flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  <Download className="w-3.5 h-3.5" /> Download receipt
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
