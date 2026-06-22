import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Send, Eye, CheckCircle2, AlertCircle, Loader2, Phone } from 'lucide-react';

const SMS_TYPES = [
  { value: 'booking_confirmation', label: 'Booking Confirmation', params: ['name', 'procedure', 'date'] },
  { value: 'appointment_reminder', label: 'Appointment Reminder', params: ['name', 'procedure', 'date', 'time'] },
  { value: 'status_update', label: 'Status Update', params: ['name', 'status'] },
  { value: 'travel_confirmed', label: 'Travel Confirmed', params: ['name', 'destination', 'date'] },
  { value: 'payment_received', label: 'Payment Received', params: ['name', 'amount'] },
  { value: 'proposal_ready', label: 'Proposal Ready', params: ['name', 'url'] },
  { value: 'custom', label: 'Custom Message', params: ['message'] },
];

export default function SmsNotificationPanel() {
  const [selectedType, setSelectedType] = useState('booking_confirmation');
  const [to, setTo] = useState('');
  const [params, setParams] = useState({});
  const [preview, setPreview] = useState('');
  const [status, setStatus] = useState(null); // null | 'loading' | 'success' | 'error' | 'preview'
  const [resultMsg, setResultMsg] = useState('');

  const currentType = SMS_TYPES.find(t => t.value === selectedType);

  const handleTypeChange = (type) => {
    setSelectedType(type);
    setParams({});
    setPreview('');
    setStatus(null);
  };

  const handlePreview = async () => {
    setStatus('loading');
    const res = await base44.functions.invoke('sendSmsNotification', {
      to: to || '+10000000000',
      type: selectedType,
      params,
      dry_run: true,
    });
    setPreview(res.data?.preview || '');
    setStatus('preview');
  };

  const handleSend = async () => {
    if (!to) {
      setStatus('error');
      setResultMsg('Please enter a phone number.');
      return;
    }
    setStatus('loading');
    const res = await base44.functions.invoke('sendSmsNotification', {
      to,
      type: selectedType,
      params,
      dry_run: false,
    });
    if (res.data?.success) {
      setStatus('success');
      setResultMsg(res.data.message_sid ? `Sent! SID: ${res.data.message_sid}` : 'Message queued successfully.');
    } else {
      setStatus('error');
      setResultMsg(res.data?.error || 'Failed to send SMS.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-primary" />
        <h2 className="font-display text-xl text-foreground">SMS Notifications</h2>
        <Badge variant="secondary" className="text-xs">Twilio</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Compose */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Compose SMS</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Type selector */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">Message Type</label>
              <div className="grid grid-cols-2 gap-2">
                {SMS_TYPES.map(t => (
                  <button
                    key={t.value}
                    onClick={() => handleTypeChange(t.value)}
                    className={`text-left px-3 py-2 rounded-lg border text-sm transition-all ${
                      selectedType === t.value
                        ? 'border-primary bg-primary/5 text-primary font-medium'
                        : 'border-border text-muted-foreground hover:border-primary/40'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Phone number */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">
                Patient Phone (E.164 format)
              </label>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <input
                  type="tel"
                  placeholder="+18005551234"
                  value={to}
                  onChange={e => setTo(e.target.value)}
                  className="flex-1 border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>

            {/* Dynamic params */}
            {currentType?.params.map(param => (
              <div key={param}>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block capitalize">
                  {param.replace(/_/g, ' ')}
                </label>
                {param === 'message' ? (
                  <textarea
                    rows={3}
                    placeholder={`Enter ${param}`}
                    value={params[param] || ''}
                    onChange={e => setParams(p => ({ ...p, [param]: e.target.value }))}
                    className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                  />
                ) : (
                  <input
                    type="text"
                    placeholder={`Enter ${param}`}
                    value={params[param] || ''}
                    onChange={e => setParams(p => ({ ...p, [param]: e.target.value }))}
                    className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                )}
              </div>
            ))}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={handlePreview} disabled={status === 'loading'} className="gap-2">
                <Eye className="w-4 h-4" /> Preview
              </Button>
              <Button size="sm" onClick={handleSend} disabled={status === 'loading'} className="gap-2">
                {status === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Send SMS
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Right: Preview & Status */}
        <div className="space-y-4">
          {/* Message Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Message Preview</CardTitle>
            </CardHeader>
            <CardContent>
              {preview ? (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <MessageSquare className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                    <p className="text-sm text-green-800 leading-relaxed">{preview}</p>
                  </div>
                  <p className="text-xs text-green-600 mt-2">{preview.length} characters</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">Click "Preview" to see how the message will look.</p>
              )}
            </CardContent>
          </Card>

          {/* Result */}
          {(status === 'success' || status === 'error') && (
            <Card className={status === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  {status === 'success'
                    ? <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                    : <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                  }
                  <div>
                    <p className={`text-sm font-semibold ${status === 'success' ? 'text-green-800' : 'text-red-700'}`}>
                      {status === 'success' ? 'SMS Sent!' : 'Send Failed'}
                    </p>
                    <p className={`text-xs mt-0.5 ${status === 'success' ? 'text-green-700' : 'text-red-600'}`}>
                      {resultMsg}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Setup notice */}
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                <div className="text-xs text-green-800">
                  <p className="font-semibold mb-1">Twilio Connected</p>
                  <p>Your Twilio credentials are configured. Click "Send SMS" to deliver real messages.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}