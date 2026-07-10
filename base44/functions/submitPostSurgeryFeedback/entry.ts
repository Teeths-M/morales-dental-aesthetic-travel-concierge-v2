import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { createHandler } from '../_shared/createHandler.ts';

Deno.serve(createHandler(async ({ req }) => {
  try {
    const base44 = createClientFromRequest(req);
    const { token, rating, comment } = await req.json();

    if (!token || !rating) {
      return Response.json({ error: 'token and rating are required' }, { status: 400 });
    }
    if (rating < 1 || rating > 5) {
      return Response.json({ error: 'Rating must be between 1 and 5' }, { status: 400 });
    }

    const sessions = await base44.asServiceRole.entities.RecoverySession.filter({ feedback_token: token });
    const session = sessions[0];
    if (!session) return Response.json({ error: 'Invalid or expired feedback link' }, { status: 404 });

    if (session.feedback_submitted_at) {
      return Response.json({ error: 'Feedback already submitted' }, { status: 409 });
    }

    await base44.asServiceRole.entities.RecoverySession.update(session.id, {
      feedback_rating: rating,
      feedback_comment: comment || '',
      feedback_submitted_at: new Date().toISOString(),
    });

    return Response.json({ success: true, patient_name: session.patient_name });
  } catch (error) {
    // BUG-R13-02 FIX: SEC-10
    console.error('[submitPostSurgeryFeedback]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
}, { name: 'submitPostSurgeryFeedback', requireAuth: false }));
