export const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const toDateOnly = (date) => {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

export const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

export const formatDate = (date) => new Date(date).toLocaleDateString(undefined, {
  weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
});

export const isoDate = (date) => new Date(date).toISOString().slice(0, 10);

export const canReachProcedureDate = (procedureDate, flightDays = [], bufferDays = 1) => {
  const deadline = addDays(toDateOnly(procedureDate), -Number(bufferDays || 1));
  for (let i = 0; i <= 14; i += 1) {
    const candidate = addDays(deadline, -i);
    if (flightDays.includes(candidate.getDay())) return true;
  }
  return false;
};

export const recommendedDates = (procedureDateTime, recoveryDays, destination) => {
  const flightDays = destination?.flight_days || [];
  const bufferDays = Number(destination?.default_buffer_days || 1);
  const procedureDate = new Date(procedureDateTime);
  const latestArrivalDeadline = addDays(toDateOnly(procedureDate), -bufferDays);

  let arrival = latestArrivalDeadline;
  while (!flightDays.includes(arrival.getDay())) arrival = addDays(arrival, -1);

  let departure = addDays(procedureDate, Number(recoveryDays || 0));
  departure = toDateOnly(departure);
  while (!flightDays.includes(departure.getDay())) departure = addDays(departure, 1);

  const explanation = `Arrive on ${formatDate(arrival)} because flights to ${destination.country} operate on ${flightDays.map(d => dayNames[d]).join(' and ')} and the patient needs ${bufferDays} buffer day(s) before the procedure. Depart on ${formatDate(departure)} because recovery requires ${recoveryDays} day(s) and this is the next available flight day.`;

  return { arrival: isoDate(arrival), departure: isoDate(departure), explanation };
};