import { createHandler } from '../_shared/createHandler.ts';

Deno.serve(createHandler(async ({ base44, user, body }) => {
    // Fetch with limits to prevent unbounded full-table scans
    const [allCases, allWorkflows, allDoctors] = await Promise.all([
      base44.asServiceRole.entities.CaseRecord.list('-created_date', 500),
      base44.asServiceRole.entities.WorkflowEvent.list('-created_date', 1000),
      base44.asServiceRole.entities.Doctor.list('-updated_date', 200),
    ]);

    const now = new Date();

    // 1. Pipeline Funnel - Cases per stage
    const stageCounts = {};
    const CASE_STAGES = [
      'Submitted', 'Safe-T-Reviewed', 'Doctor-Pending', 'Vendor-Pending',
      'Admin-Review', 'Proposal-Sent', 'PMP-25', 'PMP-50', 'Deposit-Paid',
      'Travel-Coordination', 'Ready-For-Travel', 'Procedure-In-Progress',
      'SURGICAL_EXECUTION_WINDOW', 'RECOVERY_PHASE_7_DAY', 'Recovery', 'Completed'
    ];

    CASE_STAGES.forEach(stage => stageCounts[stage] = 0);
    
    allCases.forEach(c => {
      if (stageCounts[c.status] !== undefined) {
        stageCounts[c.status]++;
      }
    });

    const pipelineFunnel = CASE_STAGES.map(stage => ({
      stage,
      count: stageCounts[stage],
    }));

    // 2. Average Time Per Stage (bottleneck detection)
    const stageTimes = {};
    CASE_STAGES.forEach(stage => {
      stageTimes[stage] = { totalDays: 0, count: 0, avgDays: 0 };
    });

    allCases.forEach(c => {
      const createdDate = new Date(c.created_date);
      const daysInStage = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
      
      if (stageTimes[c.status]) {
        stageTimes[c.status].totalDays += daysInStage;
        stageTimes[c.status].count++;
      }
    });

    Object.keys(stageTimes).forEach(stage => {
      if (stageTimes[stage].count > 0) {
        stageTimes[stage].avgDays = Math.round(
          (stageTimes[stage].totalDays / stageTimes[stage].count) * 10
        ) / 10;
      }
    });

    const avgTimePerStage = CASE_STAGES.map(stage => ({
      stage,
      avgDays: stageTimes[stage].avgDays,
      caseCount: stageTimes[stage].count,
    })).filter(s => s.caseCount > 0);

    // 3. Doctor Response Rate & Quote Turnaround
    const doctorStats = {};
    
    allDoctors.forEach(doc => {
      doctorStats[doc.id] = {
        doctor_id: doc.id,
        doctor_name: doc.full_name,
        total_cases_assigned: 0,
        confirmed_count: 0,
        declined_count: 0,
        pending_count: 0,
        avg_response_time_hours: null,
        response_times: [],
      };
    });

    allWorkflows.forEach(wf => {
      if (!wf.assigned_doctor_id) return;
      
      const docId = wf.assigned_doctor_id;
      if (!doctorStats[docId]) return;

      doctorStats[docId].total_cases_assigned++;

      if (wf.doctor_status === 'confirmed') {
        doctorStats[docId].confirmed_count++;
        
        // Calculate response time if we have timestamps
        if (wf.doctor_confirmed_date) {
          const confirmedDate = new Date(wf.doctor_confirmed_date);
          const workflowCreated = new Date(wf.created_date);
          const hoursToRespond = (confirmedDate.getTime() - workflowCreated.getTime()) / (1000 * 60 * 60);
          if (hoursToRespond > 0 && hoursToRespond < 720) { // Less than 30 days
            doctorStats[docId].response_times.push(hoursToRespond);
          }
        }
      } else if (wf.doctor_status === 'declined') {
        doctorStats[docId].declined_count++;
      } else if (wf.doctor_status === 'pending') {
        doctorStats[docId].pending_count++;
      }
    });

    // Calculate average response time per doctor
    Object.keys(doctorStats).forEach(docId => {
      const stats = doctorStats[docId];
      if (stats.response_times.length > 0) {
        const avgHours = stats.response_times.reduce((a, b) => a + b, 0) / stats.response_times.length;
        stats.avg_response_time_hours = Math.round(avgHours * 10) / 10;
      }
      delete stats.response_times; // Remove internal data
    });

    const doctorPerformance = Object.values(doctorStats).filter(d => d.total_cases_assigned > 0);

    // Calculate overall metrics
    const totalCases = allCases.length;
    const completedCases = stageCounts['Completed'] || 0;
    const activeCases = totalCases - completedCases;
    const overallCompletionRate = totalCases > 0 ? Math.round((completedCases / totalCases) * 100) : 0;

    const doctorsWithResponses = doctorPerformance.filter(d => d.avg_response_time_hours !== null);
    const overallAvgResponseTime = doctorsWithResponses.length > 0
      ? Math.round(
          (doctorsWithResponses.reduce((sum, d) => sum + d.avg_response_time_hours, 0) / doctorsWithResponses.length) * 10
        ) / 10
      : null;

    return Response.json({
      summary: {
        total_cases: totalCases,
        active_cases: activeCases,
        completed_cases: completedCases,
        completion_rate: overallCompletionRate,
        overall_avg_doctor_response_hours: overallAvgResponseTime,
      },
      pipeline_funnel: pipelineFunnel,
      avg_time_per_stage: avgTimePerStage,
      doctor_performance: doctorPerformance,
      generated_at: now.toISOString(),
    });
}, { name: 'getAnalyticsDashboard', allowedRoles: ['admin', 'platform_admin'] }));
