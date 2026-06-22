import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit2, Trash2, CheckCircle2, XCircle } from 'lucide-react';

export default function ProviderManager() {
  const [isAddingProvider, setIsAddingProvider] = useState(false);
  const [newProvider, setNewProvider] = useState({
    name: '',
    type: 'doctor',
    email: '',
    phone: '',
    contact_person: ''
  });

  const queryClient = useQueryClient();

  const { data: partners = [], isLoading } = useQuery({
    queryKey: ['portal_partners'],
    queryFn: () => base44.entities.Partner.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Partner.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal_partners'] });
      setIsAddingProvider(false);
      setNewProvider({ name: '', type: 'doctor', email: '', phone: '', contact_person: '' });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, is_active }) => base44.entities.Partner.update(id, { is_active: !is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal_partners'] });
    },
  });

  const typeConfig = {
    doctor: { label: 'Doctor', color: 'bg-blue-100 text-blue-800' },
    travel: { label: 'Travel Agency', color: 'bg-purple-100 text-purple-800' },
    hotel: { label: 'Hotel', color: 'bg-green-100 text-green-800' },
    cab: { label: 'Taxi Service', color: 'bg-orange-100 text-orange-800' },
    other: { label: 'Other', color: 'bg-slate-100 text-slate-800' }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="font-display text-2xl text-foreground">Provider Network</h2>
        <Button
          onClick={() => setIsAddingProvider(!isAddingProvider)}
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Provider
        </Button>
      </div>

      {/* Add Provider Form */}
      {isAddingProvider && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="p-6 bg-secondary/30">
            <div className="grid grid-cols-2 gap-4">
              <Input
                placeholder="Provider Name"
                value={newProvider.name}
                onChange={(e) => setNewProvider({ ...newProvider, name: e.target.value })}
              />
              <select
                value={newProvider.type}
                onChange={(e) => setNewProvider({ ...newProvider, type: e.target.value })}
                className="rounded-md border border-input bg-background px-3 py-2"
              >
                <option value="doctor">Doctor</option>
                <option value="travel">Travel Agency</option>
                <option value="hotel">Hotel</option>
                <option value="cab">Taxi Service</option>
                <option value="other">Other</option>
              </select>
              <Input
                placeholder="Email"
                type="email"
                value={newProvider.email}
                onChange={(e) => setNewProvider({ ...newProvider, email: e.target.value })}
              />
              <Input
                placeholder="Phone"
                value={newProvider.phone}
                onChange={(e) => setNewProvider({ ...newProvider, phone: e.target.value })}
              />
              <Input
                placeholder="Contact Person"
                value={newProvider.contact_person}
                onChange={(e) => setNewProvider({ ...newProvider, contact_person: e.target.value })}
                className="col-span-2"
              />
            </div>
            <div className="flex gap-2 mt-4">
              <Button
                onClick={() => createMutation.mutate(newProvider)}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? 'Creating...' : 'Create Provider'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsAddingProvider(false)}
              >
                Cancel
              </Button>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Provider List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-border border-t-primary rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid gap-4">
          {partners.map((partner, i) => {
            const config = typeConfig[partner.type];
            return (
              <motion.div
                key={partner.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="p-4 border-l-4 border-l-primary">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">{partner.name}</h3>
                      <p className="text-sm text-muted-foreground">{partner.email}</p>
                      <div className="flex gap-2 mt-2">
                        <Badge className={config.color}>{config.label}</Badge>
                        <Badge variant="outline">{partner.contact_person}</Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleActiveMutation.mutate({ id: partner.id, is_active: partner.is_active })}
                        className="p-2 rounded-lg hover:bg-secondary transition"
                      >
                        {partner.is_active ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600" />
                        )}
                      </button>
                      <Button size="sm" variant="ghost">
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}