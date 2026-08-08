// Shared risk_level -> style mapping for patient-facing procedure risk
// display (ProcedureCard's pill, ProcedureModal's detail row). Same risk
// levels as ProcedureKnowledge/AdminProcedureKnowledge, colors follow this
// app's established safety color language (emerald=low concern, amber/orange
// escalating, red=highest) rather than the admin page's lighter badge tones,
// since these render on the dark patient-facing theme.
export const RISK_PILL_STYLES = {
  Low: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  Medium: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  High: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  'Very High': 'text-red-400 bg-red-500/10 border-red-500/20',
};

export const RISK_TEXT_COLOR = {
  Low: 'text-emerald-600',
  Medium: 'text-amber-600',
  High: 'text-orange-600',
  'Very High': 'text-red-600',
};
