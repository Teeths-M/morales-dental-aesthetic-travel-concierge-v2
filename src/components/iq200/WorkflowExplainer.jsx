import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, Mail, Link as LinkIcon, CheckCircle, Shield } from 'lucide-react';

export default function WorkflowExplainer() {
  return (
    <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 mb-6">
      <CardContent className="pt-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-600" />
          How The Workflow Works (Simple Version)
        </h3>
        
        <div className="grid md:grid-cols-5 gap-4">
          {/* Step 1 */}
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xl font-semibold mx-auto mb-2">1</div>
            <p className="text-sm font-semibold text-slate-900">Patient Submits</p>
            <p className="text-xs text-slate-500 mt-1">Consultation form creates a request</p>
          </div>

          <ArrowRight className="w-5 h-5 text-slate-300 hidden md:block mx-auto" />

          {/* Step 2 */}
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xl font-semibold mx-auto mb-2">2</div>
            <p className="text-sm font-semibold text-slate-900">SAFE-T Review</p>
            <p className="text-xs text-slate-500 mt-1">Auto-check for medical risks</p>
          </div>

          <ArrowRight className="w-5 h-5 text-slate-300 hidden md:block mx-auto" />

          {/* Step 3 */}
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xl font-semibold mx-auto mb-2">3</div>
            <p className="text-sm font-semibold text-slate-900">Assign Doctor</p>
            <p className="text-xs text-slate-500 mt-1">You pick a doctor from the list</p>
          </div>

          <ArrowRight className="w-5 h-5 text-slate-300 hidden md:block mx-auto" />

          {/* Step 4 */}
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xl font-semibold mx-auto mb-2">4</div>
            <p className="text-sm font-semibold text-slate-900">Token Email Sent</p>
            <p className="text-xs text-slate-500 mt-1">Doctor gets secure link via email</p>
          </div>

          <ArrowRight className="w-5 h-5 text-slate-300 hidden md:block mx-auto" />

          {/* Step 5 */}
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl font-semibold mx-auto mb-2">5</div>
            <p className="text-sm font-semibold text-slate-900">Doctor Responds</p>
            <p className="text-xs text-slate-500 mt-1">They submit quote via the link</p>
          </div>
        </div>

        {/* Token Explanation */}
        <div className="mt-6 p-4 bg-white rounded-lg border border-blue-100">
          <h4 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
            <LinkIcon className="w-4 h-4 text-blue-600" />
            What is a "Token"? (Simple Explanation)
          </h4>
          <p className="text-sm text-slate-600 mb-2">
            A <strong>token</strong> is just a secure, one-time web link that we send to the doctor's email. It's like a special key that:
          </p>
          <ul className="text-sm text-slate-600 space-y-1 ml-4 list-disc">
            <li>Lets the doctor see <strong>only this one patient's case</strong> (not your whole system)</li>
            <li>Requires <strong>no login or password</strong> - they just click the link</li>
            <li>Is <strong>unique to this case</strong> - can't be reused for other patients</li>
            <li>Makes it <strong>super easy</strong> for doctors to respond quickly</li>
          </ul>
          <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
            <p className="text-xs text-blue-800 font-mono">
              Example: https://yourapp.com/portal/doctor/<span className="bg-yellow-200 px-1 rounded">abc123xyz_secure_token_here</span>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}