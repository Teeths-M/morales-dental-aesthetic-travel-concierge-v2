import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Syringe, CheckCircle2, Clock, AlertTriangle, MapPin, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export default function VaccinationTrackerTab() {
  const [destination, setDestination] = useState('');
  const [completedVaccines, setCompletedVaccines] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newVaccine, setNewVaccine] = useState({ name: '', date: '' });

  // Fetch vaccination requirements for destination
  const { data: requirements = {} } = useQuery({
    queryKey: ['vaccinationRequirements', destination],
    queryFn: async () => {
      if (!destination) return {};
      const res = await base44.functions.invoke('getCaribeanVaccinationRequirements', { destination });
      return res.data;
    },
    enabled: !!destination,
  });

  // Caribbean destinations
  const caribbeanDestinations = [
    { id: 'antigua_and_barbuda', label: 'Antigua and Barbuda' },
    { id: 'aruba', label: 'Aruba' },
    { id: 'bahamas', label: 'Bahamas' },
    { id: 'barbados', label: 'Barbados' },
    { id: 'belize', label: 'Belize' },
    { id: 'bonaire', label: 'Bonaire' },
    { id: 'cayman_islands', label: 'Cayman Islands' },
    { id: 'curacao', label: 'Curaçao' },
    { id: 'dominica', label: 'Dominica' },
    { id: 'dominican_republic', label: 'Dominican Republic' },
    { id: 'grenada', label: 'Grenada' },
    { id: 'guadeloupe', label: 'Guadeloupe' },
    { id: 'jamaica', label: 'Jamaica' },
    { id: 'martinique', label: 'Martinique' },
    { id: 'montserrat', label: 'Montserrat' },
    { id: 'puerto_rico', label: 'Puerto Rico' },
    { id: 'saint_kitts_nevis', label: 'Saint Kitts and Nevis' },
    { id: 'saint_lucia', label: 'Saint Lucia' },
    { id: 'saint_vincent_grenadines', label: 'Saint Vincent and the Grenadines' },
    { id: 'sint_maarten', label: 'Sint Maarten' },
    { id: 'trinidad_and_tobago', label: 'Trinidad and Tobago' },
    { id: 'turks_caicos', label: 'Turks and Caicos Islands' },
    { id: 'virgin_islands_us', label: 'Virgin Islands, U.S.' },
    { id: 'virgin_islands_british', label: 'Virgin Islands, British' },
  ];

  const handleAddVaccine = () => {
    if (!newVaccine.name || !newVaccine.date) {
      toast.error('Please fill in all fields');
      return;
    }
    setCompletedVaccines([...completedVaccines, { ...newVaccine, id: Date.now() }]);
    setNewVaccine({ name: '', date: '' });
    setShowAddForm(false);
    toast.success('Vaccination recorded');
  };

  const handleRemoveVaccine = (id) => {
    setCompletedVaccines(completedVaccines.filter(v => v.id !== id));
  };

  const allVaccines = [
    ...(requirements.required || []),
    ...(requirements.recommended || []),
    ...(requirements.routine || []).map(name => ({ name, reason: 'Routine vaccination' }))
  ];

  const completionRate = allVaccines.length > 0 
    ? Math.round((completedVaccines.length / allVaccines.length) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      {/* Destination Selector */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <MapPin className="w-5 h-5 text-blue-700" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 text-sm">Travel Destination</h3>
            <p className="text-xs text-slate-400">Select where you're traveling in the Caribbean</p>
          </div>
        </div>
        <select
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white text-sm"
        >
          <option value="">-- Select Caribbean Destination --</option>
          {caribbeanDestinations.map(dest => (
            <option key={dest.id} value={dest.id}>{dest.label}</option>
          ))}
        </select>
      </div>

      {destination && requirements.country && (
        <>
          {/* Progress Summary */}
          <div className="bg-gradient-to-r from-emerald-50 to-blue-50 rounded-2xl border border-emerald-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-slate-800 mb-1">Vaccination Progress</h3>
                <p className="text-sm text-slate-600">{requirements.country}</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-emerald-700">{completionRate}%</div>
                <p className="text-xs text-slate-500">{completedVaccines.length} of {allVaccines.length}</p>
              </div>
            </div>
            <div className="w-full bg-white rounded-full h-2 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-emerald-600 to-blue-600"
                initial={{ width: 0 }}
                animate={{ width: `${completionRate}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          {/* Vaccination Requirements */}
          <div className="space-y-4">
            {/* Required Vaccines */}
            {requirements.required && requirements.required.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <h3 className="font-semibold text-slate-800 text-sm">Required Vaccinations</h3>
                </div>
                <div className="space-y-2">
                  {requirements.required.map((vac, idx) => {
                    const isCompleted = completedVaccines.some(cv => cv.name === vac.name);
                    return (
                      <div key={idx} className={`flex items-center gap-3 p-3 rounded-lg border ${isCompleted ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                        {isCompleted ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        ) : (
                          <Syringe className="w-4 h-4 text-red-600 flex-shrink-0" />
                        )}
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${isCompleted ? 'text-emerald-800' : 'text-red-800'}`}>{vac.name}</p>
                          <p className="text-xs text-slate-500">{vac.reason}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recommended Vaccines */}
            {requirements.recommended && requirements.recommended.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Syringe className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-slate-800 text-sm">Recommended Vaccinations</h3>
                </div>
                <div className="space-y-2">
                  {requirements.recommended.map((vac, idx) => {
                    const isCompleted = completedVaccines.some(cv => cv.name === vac.name);
                    return (
                      <div key={idx} className={`flex items-center gap-3 p-3 rounded-lg border ${isCompleted ? 'bg-emerald-50 border-emerald-100' : 'bg-blue-50 border-blue-100'}`}>
                        {isCompleted ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        ) : (
                          <Clock className="w-4 h-4 text-blue-600 flex-shrink-0" />
                        )}
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${isCompleted ? 'text-emerald-800' : 'text-blue-800'}`}>{vac.name}</p>
                          <p className="text-xs text-slate-500">{vac.reason}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Routine Vaccines */}
            {requirements.routine && requirements.routine.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-semibold text-slate-800 text-sm">Routine Vaccinations</h3>
                </div>
                <div className="space-y-2">
                  {requirements.routine.map((vac, idx) => {
                    const isCompleted = completedVaccines.some(cv => cv.name === vac);
                    return (
                      <div key={idx} className={`flex items-center gap-3 p-3 rounded-lg border ${isCompleted ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
                        {isCompleted ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        ) : (
                          <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        )}
                        <p className={`text-sm font-medium ${isCompleted ? 'text-emerald-800' : 'text-slate-700'}`}>{vac}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Completed Vaccinations */}
          {completedVaccines.length > 0 && (
            <div className="bg-emerald-50 rounded-2xl border border-emerald-100 shadow-sm p-6">
              <h3 className="font-semibold text-emerald-900 text-sm mb-4">Completed Vaccinations</h3>
              <div className="space-y-2">
                {completedVaccines.map(vac => (
                  <div key={vac.id} className="flex items-center justify-between bg-white rounded-lg p-3 border border-emerald-100">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-slate-700">{vac.name}</p>
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {vac.date}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveVaccine(vac.id)}
                      className="text-xs text-red-600 hover:text-red-700 font-medium"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add Vaccination Form */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            {!showAddForm ? (
              <Button
                onClick={() => setShowAddForm(true)}
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white"
              >
                + Log Vaccination
              </Button>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Vaccine Name</label>
                  <input
                    type="text"
                    value={newVaccine.name}
                    onChange={(e) => setNewVaccine({ ...newVaccine, name: e.target.value })}
                    placeholder="e.g., Yellow Fever"
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Date Administered</label>
                  <input
                    type="date"
                    value={newVaccine.date}
                    onChange={(e) => setNewVaccine({ ...newVaccine, date: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleAddVaccine}
                    className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white"
                  >
                    Save
                  </Button>
                  <Button
                    onClick={() => {
                      setShowAddForm(false);
                      setNewVaccine({ name: '', date: '' });
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {!destination && (
        <div className="bg-slate-50 rounded-2xl border border-slate-100 p-8 text-center">
          <Syringe className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 text-sm">Select a Caribbean destination to view vaccination requirements</p>
        </div>
      )}
    </div>
  );
}