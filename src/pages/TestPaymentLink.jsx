import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Copy, Check } from 'lucide-react';

export default function TestPaymentLink() {
  const [caseId, setCaseId] = useState('6a1c6be8d298a2c4aa83e21f');
  const [depositOption, setDepositOption] = useState('Full');
  const [paymentUrl, setPaymentUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const generateLink = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await base44.functions.invoke('generateStripePaymentLink', {
        case_id: caseId,
        deposit_option: depositOption
      });
      
      if (response.data.success) {
        setPaymentUrl(response.data.payment_url);
      } else {
        setError(response.data.error || 'Failed to generate link');
      }
    } catch (err) {
      setError(err.message || 'Failed to generate payment link');
    }
    setLoading(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(paymentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="font-display text-3xl text-foreground mb-2">
            Test Payment Link Generator
          </h1>
          <p className="text-muted-foreground">
            Generate a direct Stripe payment link for any case
          </p>
        </div>

        <Card className="p-6 space-y-4">
          <div>
            <Label htmlFor="caseId">Case ID</Label>
            <Input
              id="caseId"
              value={caseId}
              onChange={(e) => setCaseId(e.target.value)}
              placeholder="Enter case ID"
            />
          </div>

          <div>
            <Label>Deposit Option</Label>
            <div className="flex gap-2 mt-2">
              {['Full', '50%', '25%'].map((option) => (
                <Button
                  key={option}
                  variant={depositOption === option ? 'default' : 'outline'}
                  onClick={() => setDepositOption(option)}
                >
                  {option}
                </Button>
              ))}
            </div>
          </div>

          <Button 
            onClick={generateLink} 
            disabled={loading || !caseId}
            className="w-full"
          >
            {loading ? 'Generating...' : 'Generate Payment Link'}
          </Button>

          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive rounded-lg">
              <p className="text-destructive text-sm">{error}</p>
              <p className="text-xs text-muted-foreground mt-2">
                Note: This requires STRIPE_SECRET_KEY to be set in secrets
              </p>
            </div>
          )}

          {paymentUrl && (
            <div className="space-y-3">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 text-green-700 mb-2">
                  <Check className="w-4 h-4" />
                  <span className="font-semibold">Payment Link Generated</span>
                </div>
                <div className="flex gap-2">
                  <Input 
                    value={paymentUrl} 
                    readOnly 
                    className="text-xs"
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={copyToClipboard}
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                  <Button
                    size="icon"
                    asChild
                  >
                    <a href={paymentUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </Button>
                </div>
              </div>

              <div className="text-center">
                <Button asChild className="gap-2">
                  <a href={paymentUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4" />
                    Open Payment Page
                  </a>
                </Button>
              </div>
            </div>
          )}
        </Card>

        <Card className="p-4 bg-muted/50">
          <h3 className="font-semibold text-sm mb-2">How to use:</h3>
          <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Enter a valid Case ID from your database</li>
            <li>Select the deposit option (Full, 50%, or 25%)</li>
            <li>Click "Generate Payment Link"</li>
            <li>Copy the link or click "Open Payment Page"</li>
            <li>Send the link directly to your client</li>
          </ol>
          <p className="text-xs text-muted-foreground mt-3">
            Note: Requires STRIPE_SECRET_KEY to be configured in app secrets
          </p>
        </Card>
      </div>
    </div>
  );
}