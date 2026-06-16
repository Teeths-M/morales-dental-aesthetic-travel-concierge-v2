import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const GOOGLE_REVIEW_URL = 'https://g.page/r/morales-medical/review';
const TRUSTPILOT_URL = 'https://www.trustpilot.com/evaluate/moralesmedical.com';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const { token, answers } = await req.json();
    if (!token || !answers?.length) {
      return Response.json({ error: 'token and answers required' }, { status: 400 });
    }

    const surveys = await base44.asServiceRole.entities.ReputationSurvey.filter({ token });
    const survey = surveys[0];
    if (!survey) return Response.json({ error: 'Survey not found' }, { status: 404 });
    if (survey.submitted_at) return Response.json({ error: 'Survey already submitted' }, { status: 409 });

    const totalScore = answers.reduce((sum, a) => sum + (a.score || 0), 0);
    const overallScore = parseFloat((totalScore / answers.length).toFixed(2));
    const isPositive = overallScore >= 4;

    await base44.asServiceRole.entities.ReputationSurvey.update(survey.id, {
      answers,
      overall_score: overallScore,
      submitted_at: new Date().toISOString(),
      pushed_to_google: isPositive,
      pushed_to_trustpilot: isPositive,
      push_attempted_at: isPositive ? new Date().toISOString() : null,
      routed_to_support: !isPositive
    });

    if (!isPositive) {
      // Route to support for service recovery
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: 'admin@moralesmedical.com',
        subject: `⚠️ Low Satisfaction Survey — ${survey.patient_name || survey.patient_email} (${overallScore}/5)`,
        body: `A patient has submitted a low satisfaction score.\n\nPatient: ${survey.patient_name || 'Unknown'}\nEmail: ${survey.patient_email}\nScore: ${overallScore}/5\nCase ID: ${survey.case_id || 'N/A'}\n\nAnswers:\n${answers.map((a, i) => `${i + 1}. ${a.question}\nScore: ${a.score}/5\nComment: ${a.comment || 'None'}`).join('\n\n')}\n\nPlease reach out immediately for service recovery.`
      });
    }

    return Response.json({
      success: true,
      overall_score: overallScore,
      is_positive: isPositive,
      review_links: isPositive ? {
        google: GOOGLE_REVIEW_URL,
        trustpilot: TRUSTPILOT_URL
      } : null,
      routed_to_support: !isPositive
    });
  } catch (error) {
    console.error('submitReputationSurvey error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});