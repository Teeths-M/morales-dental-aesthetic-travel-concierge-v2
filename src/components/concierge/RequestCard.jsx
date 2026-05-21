import React from 'react';
import { formatDate } from './dateUtils';

export default function RequestCard({ request, patient, procedure, children }) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-xl font-semibold">{patient?.name || 'Patient'}</h3>
          <p className="text-sm text-muted-foreground">{procedure?.name} in {request.destination_country}</p>
          <p className="text-sm text-muted-foreground">Procedure: {formatDate(request.procedure_datetime)}</p>
        </div>
        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium uppercase tracking-wide">{request.status}</span>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}