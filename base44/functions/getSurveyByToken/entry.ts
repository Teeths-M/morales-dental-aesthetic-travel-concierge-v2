import { createHandler, ok, err } from '../_shared/createHandler.ts';

// Public, anonymous — /survey/:token has no login. Returns only what SurveyPage
// needs to render the questionnaire; never patient_email or case_id.
Deno.serve(createHandler(async ({ base44, body }) => {
  const { token } = await body();
  if (!token) return err('token is required');

  const surveys = await base44.asServiceRole.entities.ReputationSurvey.filter({ token });
  const survey = surveys[0];
  if (!survey) return ok({ found: false });

  return ok({
    found: true,
    submitted: !!survey.submitted_at,
    role: survey.role || 'default',
    patient_name: survey.patient_name || null,
  });
}, { name: 'getSurveyByToken', requireAuth: false }));
