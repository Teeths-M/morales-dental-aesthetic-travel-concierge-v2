import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const SURVEY_QUESTIONS = {
  patient: [
    'How would you rate your overall medical tourism experience?',
    'How satisfied were you with your doctor and clinical care?',
    'How well were your travel and logistics coordinated?',
    'How safe and supported did you feel throughout your journey?',
    'How likely are you to recommend Morales Medical to others?'
  ],
  doctor: [
    'How would you rate the quality of patient referrals you received?',
    'How efficient was the case coordination process?',
    'How clear and complete was the patient information provided?',
    'How responsive was the Morales support team?',
    'How likely are you to continue partnering with Morales Medical?'
  ],
  travel_agency: [
    'How well-organized were the travel requirements you received?',
    'How timely were bookings and confirmations from the platform?',
    'How satisfied are you with the commission structure?',
    'How responsive is the Morales coordination team?',
    'How likely are you to continue this partnership?'
  ]
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || (user.role !== 'admin' && user.role !== 'platform_admin')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { case_id, patient_email, patient_name, role = 'patient' } = await req.json();
    if (!patient_email) return Response.json({ error: 'patient_email required' }, { status: 400 });

    const token = crypto.randomUUID();
    const appUrl = Deno.env.get('APP_URL') || 'https://app.moralesmedical.com';
    const surveyUrl = `${appUrl}/survey/${token}`;

    await base44.asServiceRole.entities.ReputationSurvey.create({
      case_id: case_id || null,
      patient_email,
      patient_name: patient_name || '',
      role,
      token,
      submitted_at: null,
      overall_score: null,
      pushed_to_google: false,
      pushed_to_trustpilot: false
    });

    const questions = SURVEY_QUESTIONS[role] || SURVEY_QUESTIONS.patient;
    const questionsHtml = questions.map((q, i) =>
      `<p style="margin:12px 0"><strong>${i + 1}. ${q}</strong></p>`
    ).join('');

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: patient_email,
      subject: '⭐ How was your Morales Medical experience?',
      body: `Dear ${patient_name || 'Valued Partner'},\n\nThank you for being part of the Morales Medical family. Your feedback helps us deliver world-class care.\n\nPlease take 2 minutes to complete your experience survey:\n${surveyUrl}\n\nYour honest feedback means everything to us.\n\nWarm regards,\nMorales Medical Team`
    });

    return Response.json({ success: true, token, survey_url: surveyUrl });
  } catch (error) {
    console.error('sendReputationSurvey error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});