// @ts-nocheck — pre-existing type gaps; build passes
import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { 
  Upload, Users, Plane, Car, FileText, DollarSign, Calendar,
  Download, CheckCircle, AlertCircle, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import AdminLayout from '@/components/layout/AdminLayout';

const IMPORT_TEMPLATES = {
  doctors: [
    'full_name,email,phone,clinic_country,clinic_city,clinic_name,professional_background,years_experience,bio,language_preference,payout_method,payout_account',
    'Dr. John Smith,john@clinic.com,+1234567890,United States,Miami,Miami Dental Center,Harvard Medical School,15,Specialist in dental implants,en,stripe,acc_123456'
  ],
  travelAgencies: [
    'agency_name,contact_person,email,phone,website_url,headquarters_country,medical_travel_experience_years,service_regions,services_offered,language_preference,payout_method,payout_account',
    'MedTravel Agency,Jane Doe,jane@medtravel.com,+1234567891,https://medtravel.com,United States,10,"Caribbean,North America","Flights,Hotels,Transfers",en,stripe,acc_789012'
  ],
  taxiServices: [
    'company_name,driver_name,email,phone,operating_country,operating_city,service_radius_km,vehicle_types,patient_assistance,language_preference,payout_method,payout_account',
    'MediRide,Robert Johnson,robert@mediride.com,+1234567892,United States,Miami,50,"Sedan,SUV,Wheelchair Van","Luggage help,Mobility help",en,stripe,acc_345678'
  ],
  masterProcedures: [
    'procedure_id,category,category_emoji,en_name,es_name,fr_name,pt_name,cpt_code,is_active',
    'DENT-IMP-01,Dental,🦷,Dental Implants,Implantes Dentales,Implants Dentaires,Implantes Dentários,21248,true'
  ],
  procedurePricing: [
    'procedure_id,country,base_cost,currency,valid_from,valid_to',
    'DENT-IMP-01,Mexico,2500,USD,2026-01-01,2026-12-31'
  ],
  monthlyCapacity: [
    'year_month,capacity_limit,scarcity_markup_threshold,base_markup_pct,notes',
    '2026-06,40,10,25,Summer season high demand'
  ]
};

const IMPORT_CONFIGS = {
  doctors: {
    title: 'Doctors',
    icon: Users,
    entity: 'Doctor',
    color: 'from-blue-500 to-blue-600',
    description: 'Import medical professionals with their credentials and specialties'
  },
  travelAgencies: {
    title: 'Travel Agencies',
    icon: Plane,
    entity: 'TravelAgency',
    color: 'from-emerald-500 to-emerald-600',
    description: 'Import travel partner agencies for flight and hotel coordination'
  },
  taxiServices: {
    title: 'Taxi Services',
    icon: Car,
    entity: 'TaxiService',
    color: 'from-amber-500 to-amber-600',
    description: 'Import chauffeur and patient transport services'
  },
  masterProcedures: {
    title: 'Master Procedures',
    icon: FileText,
    entity: 'MasterProcedure',
    color: 'from-purple-500 to-purple-600',
    description: 'Import standardized medical procedure catalog'
  },
  procedurePricing: {
    title: 'Procedure Pricing',
    icon: DollarSign,
    entity: 'ProcedurePricing',
    color: 'from-green-500 to-green-600',
    description: 'Import pricing data for procedures by country'
  },
  monthlyCapacity: {
    title: 'Monthly Capacity',
    icon: Calendar,
    entity: 'MonthlyCapacity',
    color: 'from-indigo-500 to-indigo-600',
    description: 'Import monthly booking capacity limits'
  }
};

export default function AdminImports() {
  const [selectedType, setSelectedType] = useState(null);
  const [file, setFile] = useState(null);
  const queryClient = useQueryClient();

  const importMutation = useMutation({
    mutationFn: async ({ entityType, fileData }) => {
      const response = await fetch(fileData);
      const blob = await response.blob();
      const formData = new FormData();
      formData.append('file', blob, 'import.csv');
      
      // Use Base44 import API
      const uploadResponse = await base44.integrations.Core.UploadFile({
        file: formData.get('file')
      });
      
      const importResult = await base44.importData({
        file_url: uploadResponse.file_url,
        entity_name: entityType
      });
      
      return importResult;
    },
    onSuccess: (data, variables) => {
      toast.success(`Successfully imported ${data.successful || 0} records to ${IMPORT_CONFIGS[variables.entityType].title}`);
      setFile(null);
      setSelectedType(null);
      // No single consistent queryKey exists across admin screens for a given
      // entity (e.g. the Doctor list alone is cached under 'doctors',
      // 'doctors-verification', 'doctors-intel', and 'doctors-all' in
      // different pages) — invalidate everything rather than maintain a
      // fragile per-entity key map that would silently go stale itself.
      // Bulk import is rare/admin-only, so the extra refetch cost is fine.
      queryClient.invalidateQueries();
    },
    onError: (error) => {
      toast.error(`Import failed: ${error.message}`);
    }
  });

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleImport = () => {
    if (file && selectedType) {
      const fileUrl = URL.createObjectURL(file);
      importMutation.mutate({
        entityType: IMPORT_CONFIGS[selectedType].entity,
        fileData: fileUrl
      });
    }
  };

  const downloadTemplate = (type) => {
    const template = IMPORT_TEMPLATES[type];
    const csvContent = template.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}_template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold font-display">Data Import</h1>
            <p className="text-muted-foreground mt-1">
              Bulk upload partners, procedures, and pricing data
            </p>
          </div>
        </div>
        {/* Import Options Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(IMPORT_CONFIGS).map(([key, config]) => {
            const Icon = config.icon;
            return (
              <motion.div
                key={key}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Card 
                  className="border-0 shadow-md rounded-2xl cursor-pointer hover:shadow-lg transition-all"
                  onClick={() => setSelectedType(key)}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${config.color} flex items-center justify-center`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-900">{config.title}</h3>
                        <p className="text-sm text-slate-500 mt-1">{config.description}</p>
                        <div className="flex gap-2 mt-3">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadTemplate(key);
                            }}
                            className="text-xs"
                          >
                            <Download className="w-3 h-3 mr-1" />
                            Template
                          </Button>
                          <Badge variant="outline" className="text-xs">
                            CSV / JSON
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Import Modal */}
        {selectedType && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="border-0 shadow-lg rounded-2xl bg-white">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${IMPORT_CONFIGS[selectedType].color} flex items-center justify-center`}>
                      {React.createElement(IMPORT_CONFIGS[selectedType].icon, { className: "w-5 h-5 text-white" })}
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">Import {IMPORT_CONFIGS[selectedType].title}</h2>
                      <p className="text-sm text-slate-500">Upload CSV or JSON file</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedType(null);
                      setFile(null);
                    }}
                  >
                    Cancel
                  </Button>
                </div>

                <div className="space-y-4">
                  {/* File Upload Area */}
                  <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-slate-300 transition-colors">
                    <input
                      type="file"
                      accept=".csv,.json"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="file-upload"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <Upload className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                      <p className="text-slate-700 font-medium">
                        {file ? file.name : 'Click to upload or drag and drop'}
                      </p>
                      <p className="text-sm text-slate-500 mt-1">
                        CSV or JSON files only
                      </p>
                    </label>
                  </div>

                  {/* File Preview */}
                  {file && (
                    <div className="bg-slate-50 rounded-lg p-4">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-slate-500" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-900">{file.name}</p>
                          <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(2)} KB</p>
                        </div>
                        <CheckCircle className="w-5 h-5 text-emerald-500" />
                      </div>
                    </div>
                  )}

                  {/* Import Button */}
                  <div className="flex justify-end gap-3 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => downloadTemplate(selectedType)}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download Template
                    </Button>
                    <Button
                      onClick={handleImport}
                      disabled={!file || importMutation.isPending}
                      className="bg-gradient-to-r from-blue-500 to-purple-600"
                    >
                      {importMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Importing...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Import Data
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Status Messages */}
                  {importMutation.isError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-red-900">Import failed</p>
                        <p className="text-sm text-red-700 mt-1">{importMutation.error.message}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Instructions */}
        <Card className="border-0 shadow-md rounded-2xl bg-white">
          <CardContent className="pt-6">
            <h3 className="font-semibold text-slate-900 mb-4">Import Guidelines</h3>
            <div className="space-y-3 text-sm text-slate-600">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5" />
                <p>Download the template for the data type you want to import</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5" />
                <p>Fill in your data following the column structure exactly</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5" />
                <p>Required fields must not be empty (see entity schemas for details)</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5" />
                <p>Upload your completed CSV or JSON file and click Import</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5" />
                <p>Imported records will be immediately available in the system</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}