import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Edit2, Save, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ConfirmDialog } from '@/components/ui-system';

export default function DoctorPricingManager({ doctorId, language = 'en' }) {
  const [editingId, setEditingId] = useState(null);
  const [editPrice, setEditPrice] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const queryClient = useQueryClient();

  const { data: pricing, isLoading } = useQuery({
    queryKey: ['doctor-pricing', doctorId],
    queryFn: () => base44.entities.DoctorPricing.filter({ doctor_id: doctorId }),
    initialData: [],
  });

  const { data: procedures } = useQuery({
    queryKey: ['master-procedures'],
    queryFn: () => base44.entities.MasterProcedure.list(),
    initialData: [],
  });

  const createPricingMutation = useMutation({
    mutationFn: (newPricing) => base44.entities.DoctorPricing.create(newPricing),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-pricing'] });
    },
  });

  const updatePricingMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.DoctorPricing.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-pricing'] });
      setEditingId(null);
    },
  });

  const deletePricingMutation = useMutation({
    mutationFn: (id) => base44.entities.DoctorPricing.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-pricing'] });
    },
  });

  const handleAddPricing = (procedure) => {
    const basePrice = procedure.base_price_usd || 5000;
    createPricingMutation.mutate({
      doctor_id: doctorId,
      doctor_name: '',
      procedure_id: procedure.procedure_id,
      procedure_name: procedure.en_name,
      doctor_price_usd: basePrice,
      price_markup_pct: 0,
      specialty_expertise_level: 'intermediate',
      promotional_discount_pct: 0,
      approved_by_admin: false,
    });
  };

  const handleSavePrice = (pricingItem) => {
    updatePricingMutation.mutate({
      id: pricingItem.id,
      data: { doctor_price_usd: parseFloat(editPrice) },
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deletePricingMutation.mutate(deleteTarget);
    setDeleteTarget(null);
  };

  const getText = (_key) => {
    const texts = {
      en: {
        title: 'My Pricing',
        subtitle: 'Set your prices for procedures',
        noPricing: 'No pricing set yet. Add prices for procedures below.',
        addPrice: 'Add Price',
        save: 'Save',
        cancel: 'Cancel',
        delete: 'Delete',
        edit: 'Edit',
        basePrice: 'Base Price:',
        yourPrice: 'Your Price:',
        addNewPricing: 'Add New Pricing',
        selectProcedure: 'Select a procedure to add pricing',
      },
      es: {
        title: 'Mis Precios',
        subtitle: 'Establezca sus precios para procedimientos',
        noPricing: 'No hay precios establecidos aún. Agregue precios para procedimientos abajo.',
        addPrice: 'Agregar Precio',
        save: 'Guardar',
        cancel: 'Cancelar',
        delete: 'Eliminar',
        edit: 'Editar',
        basePrice: 'Precio Base:',
        yourPrice: 'Su Precio:',
        addNewPricing: 'Agregar Nuevo Precio',
        selectProcedure: 'Seleccione un procedimiento para agregar precio',
      },
      fr: {
        title: 'Mes Prix',
        subtitle: 'Définissez vos prix pour les procédures',
        noPricing: 'Aucun prix défini. Ajoutez des prix pour les procédures ci-dessous.',
        addPrice: 'Ajouter Prix',
        save: 'Enregistrer',
        cancel: 'Annuler',
        delete: 'Supprimer',
        edit: 'Modifier',
        basePrice: 'Prix Base:',
        yourPrice: 'Votre Prix:',
        addNewPricing: 'Ajouter Nouveau Prix',
        selectProcedure: 'Sélectionnez une procédure pour ajouter un prix',
      },
    };
    return texts[language] || texts.en;
  };

  const t = getText(language);

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading pricing...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Current Pricing */}
      <div className="bg-gradient-to-br from-accent/10 to-primary/10 border border-accent/20 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">{t.title}</h3>
        {pricing.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t.noPricing}</p>
        ) : (
          <div className="space-y-3">
            {pricing.map((p) => (
              <div key={p.id} className="bg-white rounded-lg p-4 border border-border">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">{p.procedure_name}</p>
                    {editingId === p.id ? (
                      <div className="flex items-center gap-2 mt-2">
                        <Input
                          type="number"
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value)}
                          className="w-32"
                          placeholder="USD"
                        />
                        <Button
                          size="sm"
                          onClick={() => handleSavePrice(p)}
                          disabled={updatePricingMutation.isPending}
                        >
                          <Save className="w-4 h-4 mr-1" /> {t.save}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingId(null);
                            setEditPrice('');
                          }}
                        >
                          <X className="w-4 h-4 mr-1" /> {t.cancel}
                        </Button>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground mt-1">
                        {t.yourPrice} <span className="font-semibold text-primary">${p.doctor_price_usd.toLocaleString()}</span> USD
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {editingId === p.id ? null : (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingId(p.id);
                            setEditPrice(p.doctor_price_usd.toString());
                          }}
                        >
                          <Edit2 className="w-4 h-4 mr-1" /> {t.edit}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setDeleteTarget(p.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                      p.approved_by_admin 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {p.approved_by_admin ? 'Approved' : 'Pending Review'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add New Pricing */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h4 className="font-semibold text-foreground mb-4">{t.addNewPricing}</h4>
        <p className="text-sm text-muted-foreground mb-4">{t.selectProcedure}</p>
        <div className="grid gap-2 max-h-64 overflow-y-auto">
          {procedures
            .filter((proc) => !pricing.some((p) => p.procedure_id === proc.procedure_id))
            .slice(0, 20)
            .map((proc) => (
              <button
                key={proc.procedure_id}
                onClick={() => handleAddPricing(proc)}
                className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-secondary/50 transition-colors text-left"
              >
                <div>
                  <p className="font-medium text-foreground">{proc.en_name}</p>
                  {proc.cpt_code && (
                    <p className="text-xs text-muted-foreground">CPT: {proc.cpt_code}</p>
                  )}
                </div>
                <Plus className="w-5 h-5 text-primary" />
              </button>
            ))}
        </div>
      </div>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Remove this price?"
        message="Patients will no longer see a price from you for this procedure. You can add it back at any time."
        confirmLabel="Remove price"
        variant="danger"
        icon={Trash2}
      />
    </div>
  );
}