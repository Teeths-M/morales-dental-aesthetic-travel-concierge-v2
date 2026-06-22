/**
 * Email Queue Service
 * 
 * Asynchronous email dispatch using background job queue.
 * Eliminates 2-5s blocking on API responses.
 * 
 * Usage:
 *   import { queueEmail } from '@/lib/emailQueue.js';
 *   
 *   // Instead of: await base44.integrations.Core.SendEmail({...})
 *   // Use: await queueEmail(base44, {...})
 *   
 *   // Returns immediately, email sent in background
 */

import { base44 } from '@/api/base44Client';

// ── Exponential Backoff Configuration ────────────────────────────────────────

const RETRY_DELAYS = [
  5 * 1000,    // 1st retry: 5s
  30 * 1000,   // 2nd retry: 30s
  2 * 60 * 1000, // 3rd retry: 2min
];

// ── Queue Email Function ─────────────────────────────────────────────────────

/**
 * Queue an email for background delivery
 * 
 * @param {Object} emailData - Email data
 * @param {string} emailData.to - Recipient email
 * @param {string} emailData.subject - Email subject
 * @param {string} emailData.body - Email body (HTML)
 * @param {string} [emailData.from_name] - Sender name
 * @param {string} [emailData.template_type] - Type: welcome, password_reset, notification, receipt, transactional, custom
 * @param {string} [emailData.priority] - Priority: low, normal, high, critical
 * @param {Object} [emailData.metadata] - Additional metadata
 * @returns {Promise<{job_id: string, status: string}>}
 */
export async function queueEmail(emailData) {
  const job_id = `EMAIL_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    await base44.entities.EmailQueue.create({
      job_id,
      recipient_email: emailData.to,
      subject: emailData.subject,
      body_html: emailData.body,
      body_text: emailData.body.replace(/<[^>]*>/g, ''), // Strip HTML for text version
      from_name: emailData.from_name,
      template_type: emailData.template_type || 'custom',
      priority: emailData.priority || 'normal',
      status: 'pending',
      retry_count: 0,
      max_retries: 3,
      metadata: emailData.metadata || {},
      created_at: new Date().toISOString(),
      created_by: 'system',
    });
    
    console.log(`[EmailQueue] Job ${job_id} queued for ${emailData.to}`);
    
    return { job_id, status: 'queued' };
  } catch (error) {
    console.error(`[EmailQueue] Failed to queue job ${job_id}:`, error.message);
    // Fallback: try to send immediately if queue fails
    try {
      await base44.integrations.Core.SendEmail({
        to: emailData.to,
        subject: emailData.subject,
        body: emailData.body,
        from_name: emailData.from_name,
      });
      console.log(`[EmailQueue] Fallback send succeeded for ${emailData.to}`);
      return { job_id: null, status: 'sent_fallback' };
    } catch (fallbackError) {
      console.error(`[EmailQueue] Fallback send failed:`, fallbackError.message);
      return { job_id: null, status: 'failed', error: fallbackError.message };
    }
  }
}

// ── Process Queue Function (Background Worker) ───────────────────────────────

/**
 * Process pending email queue jobs
 * Call this from a scheduled automation (e.g., every 30s)
 * 
 * @param {Object} base44Service - Base44 SDK with service role
 */
export async function processEmailQueue(base44Service) {
  const now = new Date().toISOString();
  
  // Get pending jobs (ordered by priority, then created_at)
  const pendingJobs = await base44Service.entities.EmailQueue.filter(
    { status: 'pending' },
    '-created_at',
    50 // Process max 50 jobs per run
  );
  
  // Also get jobs ready for retry
  const retryJobs = await base44Service.entities.EmailQueue.filter(
    { 
      status: 'retrying',
      next_retry_at: { $lte: now }
    },
    '-next_retry_at',
    50
  );
  
  const jobsToProcess = [...pendingJobs, ...retryJobs];
  
  console.log(`[EmailQueue] Processing ${jobsToProcess.length} jobs`);
  
  for (const job of jobsToProcess) {
    try {
      // Update to processing
      await base44Service.entities.EmailQueue.update(job.id, {
        status: 'processing',
      });
      
      // Send email
      await base44Service.integrations.Core.SendEmail({
        to: job.recipient_email,
        subject: job.subject,
        body: job.body_html,
        from_name: job.from_name,
      });
      
      // Mark as sent
      await base44Service.entities.EmailQueue.update(job.id, {
        status: 'sent',
        sent_at: new Date().toISOString(),
      });
      
      console.log(`[EmailQueue] Job ${job.job_id} sent to ${job.recipient_email}`);
      
    } catch (error) {
      console.error(`[EmailQueue] Job ${job.job_id} failed:`, error.message);
      
      const retryCount = job.retry_count + 1;
      
      if (retryCount < job.max_retries) {
        // Schedule retry with exponential backoff
        const delay = RETRY_DELAYS[Math.min(retryCount - 1, RETRY_DELAYS.length - 1)];
        const nextRetryAt = new Date(Date.now() + delay).toISOString();
        
        await base44Service.entities.EmailQueue.update(job.id, {
          status: 'retrying',
          retry_count: retryCount,
          next_retry_at: nextRetryAt,
          last_error: error.message,
        });
        
        console.log(`[EmailQueue] Job ${job.job_id} scheduled for retry #${retryCount} at ${nextRetryAt}`);
      } else {
        // Max retries exceeded, mark as failed
        await base44Service.entities.EmailQueue.update(job.id, {
          status: 'failed',
          last_error: error.message,
        });
        
        console.error(`[EmailQueue] Job ${job.job_id} failed permanently after ${retryCount} retries`);
        
        // Log failure for admin review
        console.error(`[EmailQueue] FAILED JOB DETAILS:`, {
          job_id: job.job_id,
          recipient: job.recipient_email,
          subject: job.subject,
          template_type: job.template_type,
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }
}

// ── Convenience Wrappers ─────────────────────────────────────────────────────

/**
 * Queue a welcome email
 */
export async function queueWelcomeEmail(to, userName) {
  return queueEmail({
    to,
    subject: 'Welcome to Morales Platform',
    body: `<h1>Welcome, ${userName}!</h1><p>We're thrilled to have you on board.</p>`,
    from_name: 'Morales Platform',
    template_type: 'welcome',
  });
}

/**
 * Queue a password reset email
 */
export async function queuePasswordReset(to, resetLink) {
  return queueEmail({
    to,
    subject: 'Reset Your Password',
    body: `<p>Click here to reset your password:</p><a href="${resetLink}">${resetLink}</a>`,
    from_name: 'Morales Platform',
    template_type: 'password_reset',
    priority: 'high',
  });
}

/**
 * Queue a payment receipt email
 */
export async function queuePaymentReceipt(to, amount, transactionId) {
  return queueEmail({
    to,
    subject: 'Payment Receipt',
    body: `<p>Thank you for your payment of $${amount}.</p><p>Transaction ID: ${transactionId}</p>`,
    from_name: 'Morales Platform',
    template_type: 'receipt',
  });
}

/**
 * Queue a notification email
 */
export async function queueNotification(to, subject, body, priority = 'normal') {
  return queueEmail({
    to,
    subject,
    body,
    from_name: 'Morales Platform',
    template_type: 'notification',
    priority,
  });
}