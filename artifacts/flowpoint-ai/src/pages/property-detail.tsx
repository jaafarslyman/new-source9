import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle, ArrowLeft, Building2, Check, FileText, Loader2,
  MapPin, MessageSquare, Pencil, RefreshCw, ShieldAlert, Trash2, Users,
  Wrench, X, Zap,
} from 'lucide-react';
import { useLocation, useParams } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/lib/supabase';
import { propertyAddress, propertyCategoryLabel, propertyStatusLabel, propertyTypeLabel, type Property, type PropertyDraft } from '@/lib/propertiesTypes';
import PropertySetupForm, { type PropertyOwnerDraft, type PropertyRenterDraft } from '@/components/properties/PropertySetupForm';
import PropertyUnitManager, { type UnitSavePayload } from '@/components/PropertyUnitManager';
import { formatMoney, type Unit } from '@/lib/unitsTypes';
import type { Contact, ContactPropertyRelationship } from '@/lib/contactsTypes';

function StatusPill({ status }: { status: string | null }) {
  const tone = status === 'active' ? 'bg-[#edf7ef] text-[#327443] border-[#d6ecd9]' : status === 'inactive' ? 'bg-[#fff7e6] text-[#a36810] border-[#f1dfb8]' : 'bg-[#f1f0ee] text-[#77736d] border-[#e1dfda]';
  return <span data-testid="status-property-detail" className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${tone}`}>{propertyStatusLabel(status)}</span>;
}

function InfoRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  return <div className="border-b border-[#f0eeeb] py-3 last:border-0"><p className="text-[10px] font-semibold uppercase tracking-[.08em] text-[#9b968d]">{label}</p><p data-testid={`value-property-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} className="mt-1 whitespace-pre-wrap text-[13px] leading-[1.5] text-[#37342f]">{value === null || value === undefined || value === '' ? <span className="italic text-[#b1aca4]">Unavailable</span> : value}</p></div>;
}

function OwnerSection({ property, contacts, ownerships }: { property: Property; contacts: Contact[]; ownerships: ContactPropertyRelationship[] }) {
  const linked = ownerships.filter((relationship) => relationship.property_id === property.id && !relationship.unit_id && relationship.relationship_type === 'owner');
  return <section className="mt-4 rounded-[14px] border border-[#e9e6e1] bg-white p-5"><div className="mb-3 flex items-center justify-between"><div><h2 className="text-[13px] font-semibold text-[#302d28]">{property.property_type === 'apartment_building' ? 'Building owners' : 'Property owners'}</h2><p className="mt-1 text-[11px] text-[#9a958d]">{property.property_type === 'multifamily_units' ? 'Owners are assigned separately to each home unit.' : 'Contacts who own this property.'}</p></div><Users size={16} className="text-[#aaa59d]" /></div>{linked.length === 0 ? <p className="rounded-[10px] border border-dashed border-[#d9d5ce] px-4 py-6 text-center text-[11px] text-[#97928a]">{property.property_type === 'multifamily_units' ? 'No building-level owners. Add owners when creating each unit.' : 'No owners linked to this property.'}</p> : <div className="grid gap-2 sm:grid-cols-2">{linked.map((relationship) => { const contact = contacts.find((item) => item.id === relationship.contact_id); const ownership = relationship.ownership_percentage !== null && relationship.ownership_percentage !== undefined ? `${relationship.ownership_percentage}% ownership` : relationship.ownership_scope || 'Sole building owner'; return <div key={relationship.id} className="flex items-center justify-between gap-3 rounded-[10px] border border-[#f0eeeb] px-3 py-2.5"><div className="min-w-0"><p className="truncate text-[12px] font-semibold text-[#35322e]">{contact?.name ?? 'Contact unavailable'}</p><p className="mt-0.5 truncate text-[10px] text-[#9b968d]">{contact?.email ?? contact?.phone ?? 'No contact details'}</p></div><span className="max-w-[45%] text-right text-[10px] font-semibold text-[#625e57]">{ownership}</span></div>; })}</div>}</section>;
}

function FutureSection({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  return <div className="flex items-start gap-3 rounded-[12px] border border-dashed border-[#dedad3] bg-[#faf9f7] p-4"><div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[9px] bg-[#efede8] text-[#858078]"><Icon size={15} strokeWidth={1.7} /></div><div><p className="text-[12px] font-semibold text-[#4b4741]">{title}</p><p className="mt-1 text-[11px] leading-[1.5] text-[#9b968d]">{description}</p><span className="mt-2 inline-flex rounded-full border border-[#e3dfd9] bg-white px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[.06em] text-[#aaa59d]">Not connected</span></div></div>;
}

function ConfirmDelete({ name, deleting, onCancel, onConfirm }: { name: string; deleting: boolean; onCancel: () => void; onConfirm: () => void }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4"><motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={deleting ? undefined : onCancel} className="absolute inset-0 bg-[#171511]/30 backdrop-blur-[2px]" /><motion.div initial={{ opacity: 0, y: 8, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: .98 }} className="relative w-full max-w-[380px] rounded-[16px] border border-[#e4e2de] bg-[#fbfaf8] p-6 text-center shadow-[0_24px_80px_rgba(25,22,18,.18)]"><div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-[#f0cbc6] bg-[#fff3f1] text-[#b33d32]"><Trash2 size={17} /></div><h2 className="mt-4 text-[15px] font-semibold text-[#24211e]">Delete {name}?</h2><p className="mt-1 text-[12px] leading-[1.5] text-[#8f8980]">This property record will be permanently removed. This action cannot be undone.</p><div className="mt-5 flex gap-2"><button data-testid="button-cancel-delete-property" onClick={onCancel} disabled={deleting} className="h-9 flex-1 rounded-[9px] border border-[#e4e2de] text-[12px] font-medium text-[#625e57] hover:bg-[#f0eeea] disabled:opacity-50">Cancel</button><button data-testid="button-confirm-delete-property" onClick={onConfirm} disabled={deleting} className="flex h-9 flex-1 items-center justify-center gap-2 rounded-[9px] bg-[#b33d32] text-[12px] font-semibold text-white hover:bg-[#96342b] disabled:opacity-50">{deleting && <Loader2 size={13} className="animate-spin" />}Delete property</button></div></motion.div></div>;
}

function ownerDraftsFor(property: Property | null, contacts: Contact[], relationships: ContactPropertyRelationship[]): PropertyOwnerDraft[] {
  if (!property) return [];
  return relationships
    .filter((row) => row.property_id === property.id && row.relationship_type === 'owner' && !row.unit_id)
    .map((row) => {
      const contact = contacts.find((item) => String(item.id) === String(row.contact_id));
      return {
        id: row.id,
        source: 'existing' as const,
        contact_id: String(row.contact_id),
        entity_type: contact?.contact_type === 'company' ? 'company' as const : 'individual' as const,
        name: contact?.name ?? '',
        email: contact?.email ?? '',
        phone: contact?.phone ?? '',
        ownership_percentage: row.ownership_percentage == null ? '' : String(row.ownership_percentage),
        ownership_scope: row.ownership_scope ?? '',
      };
    });
}

function renterDraftFor(property: Property | null, contacts: Contact[], relationships: ContactPropertyRelationship[]): PropertyRenterDraft | null {
  if (!property?.is_rented) return null;
  const row = relationships.find((item) => item.property_id === property.id && !item.unit_id && item.relationship_type === 'tenant');
  const contact = contacts.find((item) => String(item.id) === String(row?.contact_id));
  return {
    source: row ? 'existing' : 'new',
    contact_id: row ? String(row.contact_id) : '',
    name: contact?.name ?? '',
    email: contact?.email ?? '',
    phone: contact?.phone ?? '',
    monthly_rent: property.monthly_rent == null ? '' : String(property.monthly_rent),
    lease_term_type: property.lease_term_type ?? 'fixed',
    lease_start_date: property.lease_start_date ?? row?.start_date ?? '',
    lease_end_date: property.lease_end_date ?? row?.end_date ?? '',
  };
}

export default function PropertyDetailPage() {
  useAuth();
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [property, setProperty] = useState<Property | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [ownerships, setOwnerships] = useState<ContactPropertyRelationship[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);

  const loadProperty = useCallback(async () => {
    if (!params.id) return;
    setLoading(true); setError(null);
    const [propertyResult, contactsResult, ownershipsResult, unitsResult] = await Promise.all([
      supabase.from('properties').select('*').eq('id', params.id).maybeSingle(),
      supabase.from('contacts').select('*').order('name', { ascending: true }),
      supabase.from('contact_property_relationships').select('id, company_id, contact_id, property_id, unit_id, relationship_type, start_date, end_date, notes, ownership_percentage, ownership_scope').eq('property_id', params.id),
      supabase.from('units').select('*').eq('property_id', params.id).order('unit_number', { ascending: true }),
    ]);
    const { data, error: loadError } = propertyResult;
    if (loadError || contactsResult.error || ownershipsResult.error || unitsResult.error) setError(loadError?.message ?? contactsResult.error?.message ?? ownershipsResult.error?.message ?? unitsResult.error?.message ?? 'Unable to load property records.');
    else if (!data) setError('This property could not be found.');
    else setProperty(data as Property);
    if (!contactsResult.error) setContacts((contactsResult.data as Contact[]) ?? []);
    if (!ownershipsResult.error) setOwnerships((ownershipsResult.data as ContactPropertyRelationship[]) ?? []);
    if (!unitsResult.error) setUnits((unitsResult.data as Unit[]) ?? []);
    setLoading(false);
  }, [params.id]);
  useEffect(() => { void loadProperty(); }, [loadProperty]);

  const initialOwners = useMemo(() => ownerDraftsFor(property, contacts, ownerships), [property, contacts, ownerships]);
  const initialRenter = useMemo(() => renterDraftFor(property, contacts, ownerships), [property, contacts, ownerships]);

  const resolveContact = async (
    selection: PropertyOwnerDraft | PropertyRenterDraft,
    role: 'owner' | 'tenant',
    resolvedContacts: Contact[],
  ) => {
    if (selection.source === 'existing') {
      const selected = resolvedContacts.find((item) => String(item.id) === selection.contact_id);
      if (!selected) throw new Error('The selected contact is no longer available.');
      if (role === 'owner' && 'entity_type' in selection) {
        const matches = selection.entity_type === 'company' ? selected.contact_type === 'company' : selected.contact_type !== 'company';
        if (!matches) throw new Error(`Choose a ${selection.entity_type} contact for this owner.`);
      }
      return selected;
    }
    const name = selection.name.trim();
    const email = selection.email.trim();
    const phone = selection.phone.trim();
    const sameName = resolvedContacts.filter((item) => item.name.trim().toLowerCase() === name.toLowerCase());
    let found = sameName.find((item) =>
      (email && item.email?.trim().toLowerCase() === email.toLowerCase())
      || (phone && item.phone?.replace(/\D/g, '') === phone.replace(/\D/g, '')),
    ) ?? (sameName.length === 1 ? sameName[0] : undefined);
    const entityType = 'entity_type' in selection ? selection.entity_type : 'individual';
    if (found && role === 'owner' && (entityType === 'company' ? found.contact_type !== 'company' : found.contact_type === 'company')) found = undefined;
    if (found) return found;
    const { data, error: insertError } = await supabase.from('contacts').insert([{
      name,
      email: email || null,
      phone: phone || null,
      contact_type: role === 'tenant' ? 'tenant' : entityType === 'company' ? 'company' : 'property_owner',
      status: 'active',
      preferred_channel: email ? 'email' : 'phone',
    }]).select().single();
    if (insertError) throw new Error(`Unable to add ${role === 'tenant' ? 'renter' : 'owner'} contact: ${insertError.message}`);
    const created = data as Contact;
    resolvedContacts.push(created);
    return created;
  };

  const updateProperty = async (draft: PropertyDraft, ownerDrafts: PropertyOwnerDraft[], renterDraft: PropertyRenterDraft | null) => {
    if (!property) return;
    const propertyUnits = units.filter((unit) => unit.property_id === property.id);
    if (property.property_type !== draft.property_type && propertyUnits.length) {
      throw new Error('This property has units. Its type cannot be changed until those units are removed.');
    }
    if (draft.property_type === 'apartment_building') {
      if (!ownerDrafts.length) throw new Error('An apartment building needs at least one building owner.');
      if (ownerDrafts.length > 1) {
        for (const unit of propertyUnits) {
          const number = Number(unit.unit_number.trim());
          const matches = ownerDrafts.filter((owner) => Number.isInteger(number) && owner.ownership_scope.split(',').some((part) => {
            const text = part.trim();
            const range = text.match(/^(\d+)\s*(?:-|–|—|to)\s*(\d+)$/i);
            if (range) return number >= Math.min(Number(range[1]), Number(range[2])) && number <= Math.max(Number(range[1]), Number(range[2]));
            return /^\d+$/.test(text) && Number(text) === number;
          }));
          if (matches.length !== 1) throw new Error(`Unit ${unit.unit_number} must match exactly one building owner scope.`);
        }
      }
    }
    const { data, error: updateError } = await supabase.from('properties').update(draft).eq('id', property.id).select().single();
    if (updateError) throw new Error(updateError.message);

    const resolvedContacts = [...contacts];
    const rows: Array<Record<string, unknown>> = [];
    for (const owner of ownerDrafts) {
      const contact = await resolveContact(owner, 'owner', resolvedContacts);
      rows.push({
        contact_id: contact.id,
        property_id: property.id,
        unit_id: null,
        relationship_type: 'owner',
        start_date: null,
        end_date: null,
        notes: null,
        ownership_percentage: owner.ownership_percentage ? Number(owner.ownership_percentage) : null,
        ownership_scope: owner.ownership_scope || null,
      });
    }
    if (draft.property_type === 'single_family_home' && renterDraft) {
      const contact = await resolveContact(renterDraft, 'tenant', resolvedContacts);
      rows.push({
        contact_id: contact.id,
        property_id: property.id,
        unit_id: null,
        relationship_type: 'tenant',
        start_date: renterDraft.lease_start_date || null,
        end_date: renterDraft.lease_term_type === 'fixed' ? renterDraft.lease_end_date || null : null,
        notes: null,
        ownership_percentage: null,
        ownership_scope: null,
      });
    }
    const { error: deleteError } = await supabase.from('contact_property_relationships')
      .delete().eq('property_id', property.id).is('unit_id', null).in('relationship_type', ['owner', 'tenant']);
    if (deleteError) throw new Error(`Unable to replace property contacts: ${deleteError.message}`);
    const { data: relationData, error: insertError } = rows.length
      ? await supabase.from('contact_property_relationships').insert(rows).select('id, company_id, contact_id, property_id, unit_id, relationship_type, start_date, end_date, notes, ownership_percentage, ownership_scope')
      : { data: [], error: null };
    if (insertError) throw new Error(`Unable to save property contacts: ${insertError.message}`);
    setContacts(resolvedContacts);
    setOwnerships((current) => [
      ...current.filter((item) => !(item.property_id === property.id && !item.unit_id && (item.relationship_type === 'owner' || item.relationship_type === 'tenant'))),
      ...((relationData as ContactPropertyRelationship[]) ?? []),
    ]);
    setProperty(data as Property);
    setFeedback({ tone: 'success', message: 'Property, ownership, and rental changes saved.' });
  };

  const saveUnit = async (payload: UnitSavePayload, existingUnit: Unit | null) => {
    const result = existingUnit
      ? await supabase.from('units').update(payload.draft).eq('id', existingUnit.id).select().single()
      : await supabase.from('units').insert([payload.draft]).select().single();
    if (result.error) throw new Error(result.error.message);
    const saved = result.data as Unit;
    const resolvedContacts = [...contacts];
    try {
      const rows: Array<Record<string, unknown>> = [];
      if (payload.draft.unit_type === 'house') {
        for (const owner of payload.owners) {
          const contact = await resolveContact(owner, 'owner', resolvedContacts);
          rows.push({ contact_id: contact.id, property_id: saved.property_id, unit_id: saved.id, relationship_type: 'owner', start_date: null, end_date: null, notes: null, ownership_percentage: Number(owner.ownership_percentage), ownership_scope: null });
        }
      }
      if (payload.renter) {
        const contact = await resolveContact(payload.renter, 'tenant', resolvedContacts);
        rows.push({ contact_id: contact.id, property_id: saved.property_id, unit_id: saved.id, relationship_type: 'tenant', start_date: payload.renter.lease_start_date || null, end_date: payload.renter.lease_term_type === 'fixed' ? payload.renter.lease_end_date || null : null, notes: null, ownership_percentage: null, ownership_scope: null });
      }
      const { error: clearError } = await supabase.from('contact_property_relationships').delete().eq('unit_id', saved.id);
      if (clearError) throw new Error(`Unable to replace unit contacts: ${clearError.message}`);
      const { data, error: insertError } = rows.length
        ? await supabase.from('contact_property_relationships').insert(rows).select('id, company_id, contact_id, property_id, unit_id, relationship_type, start_date, end_date, notes, ownership_percentage, ownership_scope')
        : { data: [], error: null };
      if (insertError) throw new Error(`Unable to save unit contacts: ${insertError.message}`);
      setContacts(resolvedContacts);
      setUnits((current) => existingUnit ? current.map((item) => item.id === saved.id ? saved : item) : [...current, saved]);
      setOwnerships((current) => [...current.filter((item) => item.unit_id !== saved.id), ...((data as ContactPropertyRelationship[]) ?? [])]);
      setFeedback({ tone: 'success', message: existingUnit ? 'Unit changes saved.' : 'Unit added.' });
    } catch (error) {
      if (!existingUnit) await supabase.from('units').delete().eq('id', saved.id);
      throw error;
    }
  };

  const deleteUnit = async (unit: Unit) => {
    const { error: deleteError } = await supabase.from('units').delete().eq('id', unit.id);
    if (deleteError) throw new Error(deleteError.message);
    setUnits((current) => current.filter((item) => item.id !== unit.id));
    setOwnerships((current) => current.filter((item) => item.unit_id !== unit.id));
  };

  const deleteProperty = async () => {
    if (!property) return;
    setDeleting(true);
    const { error: deleteError } = await supabase.from('properties').delete().eq('id', property.id);
    if (deleteError) {
      setFeedback({ tone: 'error', message: deleteError.message });
      setDeleting(false); setDeleteOpen(false);
      return;
    }
    navigate('/properties');
  };

  const propertyUnits = units.filter((unit) => unit.property_id === property?.id);
  const propertyOwners = ownerships.filter((row) => row.property_id === property?.id && !row.unit_id && row.relationship_type === 'owner');
  const isSingleHome = property?.property_type === 'single_family_home';
  const totalUnits = isSingleHome ? 1 : property?.units_count ?? null;
  const occupiedUnits = isSingleHome ? Number(Boolean(property?.is_rented)) : propertyUnits.filter((unit) => unit.status === 'occupied').length;
  const vacantUnits = isSingleHome ? Number(!property?.is_rented) : propertyUnits.filter((unit) => unit.status === 'vacant').length;
  const buildingOwnerNames = propertyOwners.map((row) => contacts.find((contact) => String(contact.id) === String(row.contact_id))?.name).filter(Boolean).join(', ');
  const propertyRenter = ownerships.find((row) => row.property_id === property?.id && !row.unit_id && row.relationship_type === 'tenant');
  const propertyRenterName = contacts.find((contact) => String(contact.id) === String(propertyRenter?.contact_id))?.name;

  return <AppLayout><div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#f8f7f5]">
    <header className="flex flex-shrink-0 items-center justify-between border-b border-[#e9e6e1] bg-[#fbfaf8] px-5 py-3 sm:px-8"><button data-testid="button-back-to-properties" onClick={() => navigate('/properties')} className="flex items-center gap-2 text-[12px] font-medium text-[#77736d] hover:text-[#151412]"><ArrowLeft size={15} />Back to properties</button>{property && <div className="flex items-center gap-2"><button data-testid="button-edit-property" onClick={() => setEditOpen(true)} className="flex h-8 items-center gap-1.5 rounded-[8px] border border-[#e0ddd7] bg-white px-3 text-[11px] font-semibold text-[#4d4942] hover:bg-[#f2f0ec]"><Pencil size={12} />Edit</button><button data-testid="button-delete-property" onClick={() => setDeleteOpen(true)} className="flex h-8 items-center gap-1.5 rounded-[8px] border border-[#efd0cc] bg-white px-3 text-[11px] font-semibold text-[#b33d32] hover:bg-[#fff2f0]"><Trash2 size={12} />Delete</button></div>}</header>
    <div className="min-h-0 flex-1 overflow-y-auto"><div className="mx-auto max-w-[1120px] px-5 py-6 sm:px-8 sm:py-8">
      {feedback && <div data-testid={`feedback-property-detail-${feedback.tone}`} className={`mb-5 flex items-center justify-between rounded-[10px] border px-3 py-2.5 text-[12px] ${feedback.tone === 'success' ? 'border-[#d2ead7] bg-[#f2faf3] text-[#327443]' : 'border-[#f0c8c3] bg-[#fff7f6] text-[#a33a30]'}`}><span className="flex items-center gap-2">{feedback.tone === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}{feedback.message}</span><button data-testid="button-dismiss-property-feedback" onClick={() => setFeedback(null)}><X size={14} /></button></div>}
      {loading && <div data-testid="loading-property-detail" className="animate-pulse"><div className="h-8 w-64 rounded bg-[#eae7e2]" /><div className="mt-3 h-4 w-96 rounded bg-[#eeebe7]" /><div className="mt-8 grid gap-4 lg:grid-cols-[1.2fr_.8fr]"><div className="h-[350px] rounded-[14px] bg-[#eeebe7]" /><div className="h-[350px] rounded-[14px] bg-[#eeebe7]" /></div></div>}
      {!loading && error && <div data-testid="error-property-detail" className="flex flex-col items-center justify-center rounded-[14px] border border-[#f0c8c3] bg-[#fff9f8] px-6 py-20 text-center"><AlertCircle size={24} className="text-[#b33d32]" /><p className="mt-3 text-[13px] font-semibold text-[#4d2c28]">Property could not be loaded</p><p className="mt-1 max-w-[380px] text-[12px] text-[#9d716b]">{error}</p><div className="mt-4 flex gap-2"><button data-testid="button-retry-property-detail" onClick={loadProperty} className="flex h-8 items-center gap-2 rounded-[8px] border border-[#e6c2bd] px-3 text-[12px] font-medium text-[#8e3a31] hover:bg-[#fff0ee]"><RefreshCw size={12} />Try again</button><button data-testid="button-return-properties-error" onClick={() => navigate('/properties')} className="h-8 rounded-[8px] bg-[#151412] px-3 text-[12px] font-medium text-white">Back to properties</button></div></div>}
      {!loading && !error && property && <><div className="mb-6"><div className="flex flex-wrap items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#eeebe5] text-[#706b62]"><Building2 size={18} strokeWidth={1.6} /></span><div><div className="flex flex-wrap items-center gap-2"><h1 data-testid="heading-property-detail" className="text-[21px] font-semibold tracking-[-.025em] text-[#151412]">{property.name}</h1><StatusPill status={property.status} /></div><p data-testid="text-property-detail-address" className="mt-1 flex items-center gap-1.5 text-[12px] text-[#858078]"><MapPin size={12} />{propertyAddress(property) || 'Address unavailable'}</p></div></div></div>
        <div className="grid gap-4 lg:grid-cols-[1.1fr_.9fr]"><section className="rounded-[14px] border border-[#e9e6e1] bg-white p-5"><div className="mb-3 flex items-center justify-between"><div><h2 className="text-[13px] font-semibold text-[#302d28]">Property overview</h2><p className="mt-1 text-[11px] text-[#9a958d]">The essentials your team needs at a glance.</p></div><Building2 size={16} className="text-[#aaa59d]" /></div><div className="grid gap-x-7 sm:grid-cols-2"><InfoRow label="Category" value={propertyCategoryLabel(property.property_category)} /><InfoRow label="Property type" value={propertyTypeLabel(property.property_type)} /><InfoRow label="Units" value={totalUnits} /><InfoRow label="Units recorded" value={propertyUnits.length} /><InfoRow label="Building floors" value={property.floor_count} /><InfoRow label="Rooms" value={property.room_count} /><InfoRow label="Floor capacities" value={property.floor_unit_counts?.map((count, index) => `${index === 0 ? 'Ground floor' : `Floor ${index}`}: ${count}`).join(' · ')} /><InfoRow label="Address line 1" value={property.address_line1} /><InfoRow label="Address line 2" value={property.address_line2} /><InfoRow label="City" value={property.city} /><InfoRow label="State / region" value={property.state} /><InfoRow label="Postal code" value={property.postal_code} /><InfoRow label="Country" value={property.country} /></div><div className="mt-3 border-t border-[#f0eeeb] pt-1"><InfoRow label="Description" value={property.description} /></div></section>
          <section className="rounded-[14px] border border-[#e9e6e1] bg-white p-5"><div className="mb-3 flex items-center justify-between"><div><h2 className="text-[13px] font-semibold text-[#302d28]">Workspace signals</h2><p className="mt-1 text-[11px] text-[#9a958d]">Connected records will appear here as they become available.</p></div><Zap size={16} className="text-[#aaa59d]" /></div><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1"><div className="flex items-center justify-between rounded-[9px] bg-[#faf9f7] px-3 py-2.5"><span className="flex items-center gap-2 text-[11px] text-[#77736d]"><Users size={14} />Owner</span><span data-testid="value-property-owner" className="text-[11px] italic text-[#aaa59d]">Unavailable</span></div><div className="flex items-center justify-between rounded-[9px] bg-[#faf9f7] px-3 py-2.5"><span className="flex items-center gap-2 text-[11px] text-[#77736d]"><Users size={14} />Manager</span><span data-testid="value-property-manager" className="text-[11px] italic text-[#aaa59d]">Unavailable</span></div><div className="flex items-center justify-between rounded-[9px] bg-[#faf9f7] px-3 py-2.5"><span className="flex items-center gap-2 text-[11px] text-[#77736d]"><Building2 size={14} />Occupied units</span><span data-testid="value-property-occupied-units" className="text-[11px] italic text-[#aaa59d]">Unavailable</span></div><div className="flex items-center justify-between rounded-[9px] bg-[#faf9f7] px-3 py-2.5"><span className="flex items-center gap-2 text-[11px] text-[#77736d]"><Building2 size={14} />Vacant units</span><span data-testid="value-property-vacant-units" className="text-[11px] italic text-[#aaa59d]">Unavailable</span></div><div className="flex items-center justify-between rounded-[9px] bg-[#faf9f7] px-3 py-2.5"><span className="flex items-center gap-2 text-[11px] text-[#77736d]"><ShieldAlert size={14} />Active issues</span><span data-testid="value-property-active-issues" className="text-[11px] italic text-[#aaa59d]">Unavailable</span></div></div></section></div>
          <OwnerSection property={property} contacts={contacts} ownerships={ownerships} />
          <section className="mt-4 rounded-[14px] border border-[#e9e6e1] bg-white p-5"><div className="mb-4"><h2 className="text-[13px] font-semibold text-[#302d28]">Property specifications and rental</h2><p className="mt-1 text-[11px] text-[#9a958d]">Facilities, tenancy terms, and operating notes.</p></div><div className="grid gap-x-7 sm:grid-cols-2"><InfoRow label="Facilities" value={[...(property.facilities ?? []), ...(property.custom_facilities ?? [])].join(', ')} /><InfoRow label="Rented" value={property.is_rented ? 'Yes' : isSingleHome ? 'No' : null} /><InfoRow label="Renter" value={property.is_rented ? propertyRenterName ?? (propertyRenter ? 'Contact unavailable' : 'Renter not linked') : null} /><InfoRow label="Monthly rent (USD)" value={property.is_rented ? formatMoney(property.monthly_rent) : null} /><InfoRow label="Lease duration" value={property.is_rented ? property.lease_term_type === 'until_termination' ? 'Until termination' : property.lease_term_type === 'fixed' ? 'Fixed term' : null : null} /><InfoRow label="Lease start" value={property.is_rented ? property.lease_start_date : null} /><InfoRow label="Lease end" value={property.is_rented && property.lease_term_type === 'fixed' ? property.lease_end_date : null} /><InfoRow label="Amenities" value={property.amenities} /><InfoRow label="Property rules" value={property.property_rules} /><InfoRow label="Parking information" value={property.parking_information} /><InfoRow label="Access information" value={property.access_information} /><InfoRow label="Utilities information" value={property.utilities_information} /><InfoRow label="Emergency information" value={property.emergency_information} /><div className="sm:col-span-2"><InfoRow label="Internal notes" value={property.notes} /></div></div></section>
          <PropertyUnitManager property={property} units={units} contacts={contacts} relationships={ownerships} onSave={saveUnit} onDelete={deleteUnit} />
          <section className="mt-4"><div className="mb-3"><h2 className="text-[13px] font-semibold text-[#302d28]">Property workspace</h2><p className="mt-1 text-[11px] text-[#9a958d]">Additional connected services and records.</p></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><FutureSection icon={Users} title="Contacts" description="Residents and vendors connected to this property." /><FutureSection icon={Wrench} title="Issues" description="Maintenance requests and issue history for this property." /><FutureSection icon={Zap} title="Services" description="Recurring services and provider schedules." /><FutureSection icon={FileText} title="Documents" description="Leases, inspections, and property files." /><FutureSection icon={MessageSquare} title="Conversations" description="A shared timeline for property-related communication." /></div></section>
      </>}
    </div></div>
    <AnimatePresence>{editOpen && property && <PropertySetupForm property={property} contacts={contacts} initialOwners={initialOwners} initialRenter={initialRenter} existingUnits={units} onSave={async (draft, owners, renter) => { await updateProperty(draft, owners, renter); setEditOpen(false); }} onClose={() => setEditOpen(false)} />}</AnimatePresence>
    <AnimatePresence>{deleteOpen && property && <ConfirmDelete name={property.name} deleting={deleting} onCancel={() => setDeleteOpen(false)} onConfirm={deleteProperty} />}</AnimatePresence>
  </div></AppLayout>;
}