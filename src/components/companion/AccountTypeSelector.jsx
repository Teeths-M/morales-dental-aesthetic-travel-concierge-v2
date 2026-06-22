import React from 'react';
import { User, Building2, CheckCircle } from 'lucide-react';

export const ACCOUNT_TYPES = {
  INDIVIDUAL: 'individual',
  AGENCY: 'agency',
};

export function AccountTypeSelector({ accountType, onAccountTypeChange }) {
  return (
    <div className="space-y-4 mb-6">
      <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide text-center">
        Choose Your Account Type
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <AccountTypeCard
          type={ACCOUNT_TYPES.INDIVIDUAL}
          isSelected={accountType === ACCOUNT_TYPES.INDIVIDUAL}
          onSelect={onAccountTypeChange}
          icon={User}
          title="Individual Caregiver"
          description="Mothers & caregivers 40+ offering personal care services"
        />
        <AccountTypeCard
          type={ACCOUNT_TYPES.AGENCY}
          isSelected={accountType === ACCOUNT_TYPES.AGENCY}
          onSelect={onAccountTypeChange}
          icon={Building2}
          title="Agency / Tour Guide"
          description="Agencies providing tour guide & companion services"
        />
      </div>
    </div>
  );
}

function AccountTypeCard({ type, isSelected, onSelect, icon: Icon, title, description }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(type)}
      className={`p-6 rounded-xl border-2 transition-all text-left hover:shadow-lg relative ${
        isSelected
          ? 'border-emerald-600 bg-emerald-50 shadow-md'
          : 'border-gray-200 hover:border-emerald-400'
      }`}
    >
      {isSelected && (
        <div className="absolute top-3 right-3 w-6 h-6 bg-emerald-600 rounded-full flex items-center justify-center">
          <CheckCircle className="w-4 h-4 text-white" />
        </div>
      )}
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
          isSelected ? 'bg-emerald-600 text-white' : 'bg-gray-100'
        }`}>
          <Icon className="w-6 h-6" />
        </div>
        <h3 className="font-bold text-lg">{title}</h3>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </button>
  );
}