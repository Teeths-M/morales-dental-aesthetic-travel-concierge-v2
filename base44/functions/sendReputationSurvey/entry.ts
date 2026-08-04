import { createHandler, ok, err } from '../../shared/createHandler.ts';
import { internalOrAdminAuthorized } from '../../shared/internalAuth.ts';

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

Deno.serve(createHandler(async ({ base44, body }) => {
    const { case_id, patient_email, patient_name, role = 'patient', internal_secret } = await body();

    // Admin session (manual partner-survey trigger) OR internal secret
    // (submitRecoveryCheckin firing the patient variant on recovery completion —
    // function-to-function, no forwardable user session).
    if (!(await internalOrAdminAuthorized(internal_secret, base44))) {
      return err('Forbidden', 403);
    }

    if (!patient_email) return err('patient_email required');

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

    return ok({ success: true, token, survey_url: surveyUrl });
}, { name: 'sendReputationSurvey', requireAuth: false }));