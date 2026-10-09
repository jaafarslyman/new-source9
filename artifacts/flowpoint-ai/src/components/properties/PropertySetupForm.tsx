import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle, Building2, Check, Loader2, Plus, Trash2, UserRound, X,
} from 'lucide-react';
import FlowPointSelect from '@/components/FlowPointSelect';
import { UnitSetupModal, type UnitSavePayload } from '@/components/PropertyUnitManager';
import {
  APARTMENT_BUILDING_FACILITIES,
  blankProperty,
  COMMERCIAL_FACILITIES,
  HOSPITALITY_SPACE_TYPES,
  HOME_FACILITIES,
  MIXED_USE_COMPONENTS,
  PROPERTY_CATEGORIES,
  PROPERTY_TYPES_BY_CATEGORY,
  RETAIL_CENTER_TYPES,
  type Property,
  type PropertyDraft,
} from '@/lib/propertiesTypes';
import type { Contact, ContactPropertyRelationship } from '@/lib/contactsTypes';
import { unitTypeLabel, type Unit } from '@/lib/unitsTypes';

export interface PropertyOwnerDraft {
  id?: string | number;
  source: 'existing' | 'new';
  contact_id: string;
  entity_type: 'individual' | 'company';
  name: string;
  email: string;
  phone: string;
  ownership_percentage: string;
  ownership_scope: string;
}

export interface PropertyRenterDraft {
  source: 'existing' | 'new';
  contact_id: string;
  name: string;
  email: string;
  phone: string;
  monthly_rent: string;
  lease_term_type: 'fixed' | 'until_termination';
  lease_start_date: string;
  lease_end_date: string;
}

interface PropertySetupFormProps {
  property: Property | null;
  contacts: Contact[];
  initialOwners: PropertyOwnerDraft[];
  initialRenter: PropertyRenterDraft | null;
  existingUnits: Unit[];
  onSave: (draft: PropertyDraft, owners: PropertyOwnerDraft[], renter: PropertyRenterDraft | null, units: UnitSavePayload[]) => Promise<void>;
  onClose: () => void;
}

type PropertyCategory = keyof typeof PROPERTY_TYPES_BY_CATEGORY;
type OwnerDraft = PropertyOwnerDraft;
type Errors = Record<string, string>;

const inputClass = 'h-10 w-full rounded-[9px] border border-[#e4e2de] bg-white px-3 text-[13px] text-[#24211e] outline-none transition-colors placeholder:text-[#b3afa8] focus:border-[#587b70] focus:ring-2 focus:ring-[#587b70]/10 disabled:cursor-not-allowed disabled:bg-[#f5f3f0]';

function categoryForType(type: string | null | undefined): PropertyCategory | '' {
  if (type && PROPERTY_TYPES_BY_CATEGORY.residential.some((option) => option.value === type) || ['single_family', 'condo', 'townhouse'].includes(type ?? '')) return 'residential';
  if (type && PROPERTY_TYPES_BY_CATEGORY.commercial.some((option) => option.value === type) || type === 'commercial' || type === 'mixed_use') return 'commercial';
  if (type && PROPERTY_TYPES_BY_CATEGORY.industrial.some((option) => option.value === type)) return 'industrial';
  return '';
}

function normalizedSubtype(type: string | null | undefined): string {
  if (type === 'single_family') return 'single_family_home';
  if (type === 'mixed_use') return 'mixed_use_development';
  return type ?? '';
}

function blankOwner(): OwnerDraft {
  return { source: 'new', contact_id: '', entity_type: 'individual', name: '', email: '', phone: '', ownership_percentage: '', ownership_scope: '' };
}

function blankRenter(): PropertyRenterDraft {
  return { source: 'new', contact_id: '', name: '', email: '', phone: '', monthly_rent: '', lease_term_type: 'fixed', lease_start_date: '', lease_end_date: '' };
}

function readExtra(property: Property | null, key: string, fallback = ''): string {
  const value = property as (Property & Record<string, unknown>) | null;
  const extra = value?.[key];
  return extra === null || extra === undefined ? fallback : String(extra);
}

function Field({ label, children, hint, required }: { label: string; children: React.ReactNode; hint?: string; required?: boolean }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[.085em] text-[#77736d]">
        {label}{required && <span className="ml-1 text-[#b24d40]">*</span>}
        {hint && <span className="ml-1.5 normal-case font-normal tracking-normal text-[#a19b92]">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

function FormError({ message, testId }: { message?: string; testId?: string }) {
  if (!message) return null;
  return <p data-testid={testId} className="mt-1.5 flex items-start gap-1.5 text-[11px] leading-4 text-[#a33e34]"><AlertCircle size={12} className="mt-0.5 shrink-0" />{message}</p>;
}

function SectionHeading({ eyebrow, title, description, index }: { eyebrow: string; title: string; description: string; index: string }) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#d8e1da] bg-[#edf3ee] font-mono text-[10px] font-semibold text-[#55776b]">{index}</span>
      <div><p className="text-[9px] font-semibold uppercase tracking-[.16em] text-[#82948a]">{eyebrow}</p><h3 className="mt-0.5 text-[14px] font-semibold tracking-[-.02em] text-[#282722]">{title}</h3><p className="mt-1 text-[11px] leading-4 text-[#8b877f]">{description}</p></div>
    </div>
  );
}

function ContactFields({
  row, index, kind, contacts, entityType, onChange,
}: {
  row: OwnerDraft | PropertyRenterDraft;
  index: number;
  kind: 'owner' | 'renter';
  contacts: Contact[];
  entityType?: OwnerDraft['entity_type'];
  onChange: (patch: Partial<OwnerDraft> | Partial<PropertyRenterDraft>) => void;
}) {
  const selected = contacts.find((contact) => String(contact.id) === row.contact_id);
  const contactOptions = contacts.filter((contact) => {
    if (kind === 'owner') {
      if (entityType === 'company') return contact.contact_type === 'company' || String(contact.id) === row.contact_id;
      return contact.contact_type !== 'company' || String(contact.id) === row.contact_id;
    }
    return true;
  });
  return (
    <>
      <div className="mb-3 flex rounded-[9px] bg-[#f2f1ed] p-1" role="group" aria-label={`${kind} contact source`}>
        <button type="button" data-testid={`button-${kind}-${index}-existing`} onClick={() => onChange({ source: 'existing', contact_id: '', name: '', email: '', phone: '' })} className={`flex-1 rounded-[7px] px-2 py-2 text-[11px] font-semibold transition-colors ${row.source === 'existing' ? 'bg-white text-[#34332e] shadow-[0_1px_3px_rgba(32,29,24,.10)]' : 'text-[#89867e] hover:text-[#4b4943]'}`}>Existing contact</button>
        <button type="button" data-testid={`button-${kind}-${index}-new`} onClick={() => onChange({ source: 'new', contact_id: '', name: '', email: '', phone: '' })} className={`flex-1 rounded-[7px] px-2 py-2 text-[11px] font-semibold transition-colors ${row.source === 'new' ? 'bg-white text-[#34332e] shadow-[0_1px_3px_rgba(32,29,24,.10)]' : 'text-[#89867e] hover:text-[#4b4943]'}`}>New contact</button>
      </div>
      {row.source === 'existing' ? (
        <Field label="Contact" required>
          <FlowPointSelect
            testId={`select-${kind}-${index}-contact`}
            value={row.contact_id}
            onChange={(value) => {
              const contact = contacts.find((item) => String(item.id) === value);
              onChange({ contact_id: value, name: contact?.name ?? '', email: contact?.email ?? '', phone: contact?.phone ?? '' });
            }}
            placeholder={`Select a ${kind}`}
            options={contactOptions.map((contact) => ({ value: String(contact.id), label: contact.name, secondary: contact.company_name ?? contact.email ?? contact.phone ?? undefined }))}
            emptyLabel="No contacts found. Add a new contact instead."
          />
          {selected && <p data-testid={`text-${kind}-${index}-contact-summary`} className="mt-1.5 text-[10px] text-[#8c8981]">{selected.email || selected.phone || selected.customer_id || 'Contact selected'}</p>}
        </Field>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Name" required><input data-testid={`input-${kind}-${index}-name`} className={inputClass} value={row.name} onChange={(event) => onChange({ name: event.target.value })} placeholder="Person or company" /></Field>
          <Field label="Email" hint="or phone"><input data-testid={`input-${kind}-${index}-email`} className={inputClass} type="email" value={row.email} onChange={(event) => onChange({ email: event.target.value })} placeholder="name@example.com" /></Field>
          <div className="sm:col-span-2"><Field label="Phone" hint="optional if email is provided"><input data-testid={`input-${kind}-${index}-phone`} className={inputClass} type="tel" value={row.phone} onChange={(event) => onChange({ phone: event.target.value })} placeholder="Phone number" /></Field></div>
        </div>
      )}
    </>
  );
}

export default function PropertySetupForm({ property, contacts, initialOwners, initialRenter, existingUnits, onSave, onClose }: PropertySetupFormProps) {
  const [form, setForm] = useState<PropertyDraft>(() => ({ ...blankProperty }));
  const [category, setCategory] = useState<PropertyCategory | ''>('');
  const [roomCount, setRoomCount] = useState('');
  const [floorCount, setFloorCount] = useState('');
  const [floorCapacities, setFloorCapacities] = useState<string[]>([]);
  const [officeInBuilding, setOfficeInBuilding] = useState<boolean | null>(null);
  const [officeFloor, setOfficeFloor] = useState('');
  const [commercialSpaceType, setCommercialSpaceType] = useState('');
  const [mixedUseComponents, setMixedUseComponents] = useState<string[]>([]);
  const [facilities, setFacilities] = useState<string[]>([]);
  const [customFacilities, setCustomFacilities] = useState<string[]>([]);
  const [customFacility, setCustomFacility] = useState('');
  const [owners, setOwners] = useState<OwnerDraft[]>([blankOwner()]);
  const [rented, setRented] = useState<boolean | null>(null);
  const [renter, setRenter] = useState<PropertyRenterDraft>(blankRenter());
  const [pendingUnits, setPendingUnits] = useState<UnitSavePayload[]>([]);
  const [unitEditorOpen, setUnitEditorOpen] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const ownersSignature = JSON.stringify(initialOwners);

  useEffect(() => {
    const propertyType = normalizedSubtype(property?.property_type);
    const initialCategory = (property?.property_category as PropertyCategory | null) || categoryForType(propertyType);
    const current = property ? {
      ...blankProperty,
      ...property,
      property_type: propertyType,
      name: property.name ?? '',
      address_line1: property.address_line1 ?? '',
      address_line2: property.address_line2 ?? '',
      city: property.city ?? '',
      state: property.state ?? '',
      postal_code: property.postal_code ?? '',
      country: property.country ?? '',
      description: property.description ?? '',
      amenities: property.amenities ?? '',
      property_rules: property.property_rules ?? '',
      parking_information: property.parking_information ?? '',
      access_information: property.access_information ?? '',
      utilities_information: property.utilities_information ?? '',
      emergency_information: property.emergency_information ?? '',
      notes: property.notes ?? '',
    } : { ...blankProperty, property_type: '' };
    setForm(current);
    setCategory(initialCategory);
    setRoomCount(readExtra(property, 'room_count'));
    setFloorCount(readExtra(property, 'floor_count'));
    const savedOfficeInBuilding = property?.office_in_building;
    setOfficeInBuilding(typeof savedOfficeInBuilding === 'boolean' ? savedOfficeInBuilding : null);
    setOfficeFloor(readExtra(property, 'office_floor'));
    setCommercialSpaceType(readExtra(property, 'commercial_space_type'));
    setMixedUseComponents(property?.mixed_use_components ?? []);
    const savedCapacities = property?.floor_unit_counts ?? [];
    let capacities = savedCapacities.map(String);
    if (!capacities.length && Number(readExtra(property, 'floor_count')) > 0) capacities = Array.from({ length: Math.min(Number(readExtra(property, 'floor_count')), 100) }, () => '');
    setFloorCapacities(capacities);
    setFacilities(property?.facilities ?? []);
    setCustomFacilities(property?.custom_facilities ?? []);
    setCustomFacility('');
    setOwners(initialOwners.length ? initialOwners.map((owner) => ({ ...owner, entity_type: owner.entity_type ?? 'individual' })) : [blankOwner()]);
    setRented(property?.is_rented ?? null);
    setRenter({
      ...blankRenter(),
      ...(initialRenter ?? {}),
      source: initialRenter?.source ?? 'new',
      contact_id: initialRenter?.contact_id ?? '',
      name: initialRenter?.name ?? '',
      email: initialRenter?.email ?? '',
      phone: initialRenter?.phone ?? '',
      monthly_rent: initialRenter?.monthly_rent ?? (property?.monthly_rent == null ? '' : String(property.monthly_rent)),
      lease_term_type: property?.lease_term_type ?? initialRenter?.lease_term_type ?? 'fixed',
      lease_start_date: property?.lease_start_date ?? initialRenter?.lease_start_date ?? '',
      lease_end_date: property?.lease_end_date ?? initialRenter?.lease_end_date ?? '',
    });
    setPendingUnits([]);
    setUnitEditorOpen(false);
    setSaveError('');
  }, [property, ownersSignature, initialRenter]);

  const subtype = form.property_type ?? '';
  const residential = category === 'residential';
  const singleFamily = subtype === 'single_family_home';
  const multifamily = subtype === 'multifamily_units';
  const apartment = subtype === 'apartment_building';
  const commercial = category === 'commercial';
  const officeBuilding = subtype === 'office_building';
  const retailCenter = subtype === 'retail_center';
  const hospitalitySpace = subtype === 'restaurant_hospitality';
  const mixedUse = subtype === 'mixed_use_development';
  const propertyCanRent = singleFamily || (commercial && !mixedUse);
  const selectedFacilities = useMemo(() => new Set(facilities), [facilities]);
  const previewProperty = useMemo<Property>(() => ({
    ...blankProperty,
    ...(property ?? {}),
    id: property?.id ?? 'pending-property',
    company_id: property?.company_id ?? null,
    created_at: property?.created_at ?? '',
    updated_at: property?.updated_at ?? '',
    name: form.name || 'New property',
    property_category: category || 'residential',
    property_type: subtype,
    units_count: multifamily || apartment ? form.units_count : null,
    floor_count: singleFamily || apartment || mixedUse ? (floorCount ? Number(floorCount) : null) : null,
    floor_unit_counts: apartment ? floorCapacities.map((capacity) => Number(capacity) || 0) : [],
    room_count: singleFamily ? (roomCount ? Number(roomCount) : null) : null,
    facilities,
    custom_facilities: customFacilities,
    office_in_building: officeBuilding ? officeInBuilding : null,
    office_floor: officeBuilding && officeInBuilding ? Number(officeFloor) : null,
    commercial_space_type: retailCenter || hospitalitySpace ? commercialSpaceType || null : null,
    mixed_use_components: mixedUse ? mixedUseComponents : [],
    is_rented: propertyCanRent ? Boolean(rented) : false,
    monthly_rent: propertyCanRent && rented ? Number(renter.monthly_rent) || null : null,
    lease_term_type: propertyCanRent && rented ? renter.lease_term_type : null,
    lease_start_date: propertyCanRent && rented ? renter.lease_start_date || null : null,
    lease_end_date: propertyCanRent && rented && renter.lease_term_type === 'fixed' ? renter.lease_end_date || null : null,
  }), [property, form, category, subtype, multifamily, apartment, singleFamily, officeBuilding, officeInBuilding, officeFloor, retailCenter, hospitalitySpace, commercialSpaceType, mixedUse, mixedUseComponents, propertyCanRent, floorCount, floorCapacities, roomCount, facilities, customFacilities, rented, renter]);
  const inlineOwnerData = useMemo(() => {
    const syntheticContacts: Contact[] = [];
    const relations: ContactPropertyRelationship[] = [];
    if (apartment) owners.forEach((owner, index) => {
      const selectedContact = contacts.find((contact) => String(contact.id) === owner.contact_id);
      const contactId = owner.source === 'existing' && owner.contact_id ? Number(owner.contact_id) : -(index + 1);
      if (owner.source === 'new') syntheticContacts.push({
        id: contactId,
        company_id: null,
        created_at: '',
        updated_at: null,
        name: owner.name,
        email: owner.email || null,
        phone: owner.phone || null,
        business_name: null,
        notes: null,
        customer_id: null,
        contact_type: owner.entity_type === 'company' ? 'company' : 'property_owner',
        status: 'active',
        preferred_channel: owner.email ? 'email' : 'phone',
        alternate_phone: null,
        address: null,
        city: null,
        state: null,
        zip_code: null,
        country: null,
        company_name: null,
        ai_summary: null,
        internal_notes: null,
        last_contacted_at: null,
      });
      relations.push({
        id: `pending-building-owner-${index}`,
        company_id: null,
        contact_id: selectedContact ? Number(selectedContact.id) : contactId,
        property_id: previewProperty.id,
        unit_id: null,
        relationship_type: 'owner',
        start_date: null,
        end_date: null,
        notes: null,
        ownership_percentage: apartment && owners.length > 1 ? null : Number(owner.ownership_percentage) || null,
        ownership_scope: apartment && owners.length > 1 ? owner.ownership_scope : null,
      });
    });
    return { contacts: [...contacts, ...syntheticContacts], relationships: relations };
  }, [apartment, owners, contacts, previewProperty.id]);
  const inlineUnitRecords = useMemo<Unit[]>(() => pendingUnits.map((item, index) => ({
    ...item.draft,
    id: `pending-unit-${index}`,
    company_id: null,
    created_at: '',
    updated_at: '',
    property_id: previewProperty.id,
  })), [pendingUnits, previewProperty.id]);
  const configuredUnits = Number(previewProperty.units_count) || 0;
  const inlineUnitLimitReached = configuredUnits > 0 && inlineUnitRecords.length >= configuredUnits;
  const inlineLayoutReady = mixedUse
    ? mixedUseComponents.length > 0 && Number.isInteger(Number(floorCount)) && Number(floorCount) > 0
    : configuredUnits > 0 && Number.isInteger(configuredUnits)
    && (!apartment || (
      Number(floorCount) > 0
      && floorCapacities.length === Number(floorCount)
      && floorCapacities.every((capacity) => capacity.trim() !== '' && Number.isInteger(Number(capacity)) && Number(capacity) >= 0)
      && floorCapacities.reduce((sum, capacity) => sum + Number(capacity), 0) === configuredUnits
    ));

  const setField = (key: keyof PropertyDraft, value: string | number | null) => setForm((current) => ({ ...current, [key]: value }));
  const setOwner = (index: number, patch: Partial<OwnerDraft>) => setOwners((current) => current.map((owner, i) => i === index ? { ...owner, ...patch } : owner));
  const setRenterFields = (patch: Partial<PropertyRenterDraft>) => setRenter((current) => ({ ...current, ...patch }));
  const toggleFacility = (facility: string) => setFacilities((current) => current.includes(facility) ? current.filter((item) => item !== facility) : [...current, facility]);

  const validation = useMemo((): Errors => {
    const next: Errors = {};
    if (!form.name.trim()) next.name = 'Property name is required.';
    if (!subtype) next.subtype = 'Choose a property subtype.';
    if (!form.address_line1?.trim()) next.address_line1 = 'Address line 1 is required.';
    if (!form.city?.trim()) next.city = 'City is required.';
    if (singleFamily) {
      if (!roomCount.trim() || !Number.isInteger(Number(roomCount)) || Number(roomCount) <= 0) next.room_count = 'Enter a whole-number room count greater than 0.';
      if (!floorCount.trim() || !Number.isInteger(Number(floorCount)) || Number(floorCount) <= 0) next.floor_count = 'Enter a whole-number floor count greater than 0.';
    }
    if (multifamily && (!form.units_count || !Number.isInteger(Number(form.units_count)) || Number(form.units_count) <= 0)) next.units_count = 'Enter a whole-number unit count greater than 0.';
    if ((multifamily || apartment) && Number.isInteger(Number(form.units_count)) && Number(form.units_count) > 0 && pendingUnits.length > Number(form.units_count)) {
      next.inline_units = `The property is configured for ${form.units_count} units, but ${pendingUnits.length} have been added.`;
    }
    if (apartment) {
      if (!floorCount.trim() || !Number.isInteger(Number(floorCount)) || Number(floorCount) <= 0) next.floor_count = 'Enter a whole-number floor count greater than 0.';
      if (!form.units_count || !Number.isInteger(Number(form.units_count)) || Number(form.units_count) <= 0) next.units_count = 'Enter a whole-number unit count greater than 0.';
      const expectedFloors = Number(floorCount);
      if (expectedFloors > 0 && floorCapacities.length !== expectedFloors) next.floor_capacities = 'Add capacity for every floor.';
      else if (floorCapacities.length && floorCapacities.some((capacity) => capacity.trim() === '' || !Number.isInteger(Number(capacity)) || Number(capacity) < 0)) next.floor_capacities = 'Use a whole-number capacity of 0 or more for each floor.';
      else if (floorCapacities.length && Number(form.units_count) > 0 && floorCapacities.reduce((sum, value) => sum + Number(value), 0) !== Number(form.units_count)) next.floor_capacities = `Floor capacities must add up to ${form.units_count}.`;
      if (floorCapacities.length === expectedFloors && pendingUnits.length) {
        const assignedByFloor = Array.from({ length: expectedFloors }, () => 0);
        pendingUnits.forEach(({ draft }) => {
          if (draft.floor !== null && draft.floor >= 0 && draft.floor < expectedFloors) assignedByFloor[draft.floor] += 1;
        });
        if (assignedByFloor.some((count, index) => count > Number(floorCapacities[index] || 0))) {
          next.inline_floor_capacity = 'The units already added exceed the capacity of at least one floor.';
        }
      }
    }
    if (officeBuilding) {
      if (officeInBuilding === null) next.office_in_building = 'Choose whether this office is inside a building.';
      if (officeInBuilding && (!officeFloor.trim() || !Number.isInteger(Number(officeFloor)) || Number(officeFloor) < 0)) {
        next.office_floor = 'Enter a whole-number floor. Use 0 for the ground floor.';
      }
    }
    if ((retailCenter || hospitalitySpace) && !commercialSpaceType) {
      next.commercial_space_type = `Choose the ${retailCenter ? 'retail center' : 'hospitality space'} type.`;
    }
    if (mixedUse) {
      if (!mixedUseComponents.length) next.mixed_use_components = 'Choose at least one use included in this property.';
      if (!floorCount.trim() || !Number.isInteger(Number(floorCount)) || Number(floorCount) <= 0) {
        next.floor_count = 'Enter a whole-number floor count greater than 0.';
      }
      const mixedUnits = property
        ? existingUnits
        : pendingUnits.map((item) => item.draft);
      const unitTypes = new Set(mixedUnits.map((unit) => unit.unit_type).filter(Boolean));
      if (!property && mixedUseComponents.some((component) => !unitTypes.has(component))) {
        next.inline_units = 'Add at least one mapped unit for every selected use.';
      }
      if (property && existingUnits.some((unit) => unit.unit_type && !mixedUseComponents.includes(unit.unit_type))) {
        next.inline_units = 'Remove or reclassify every space for a use before removing that use.';
      }
      const floorTotal = Number(floorCount);
      if (Number.isInteger(floorTotal) && floorTotal > 0 && mixedUnits.some((unit) =>
        unit.floor === null || !Number.isInteger(unit.floor) || unit.floor < 0 || unit.floor >= floorTotal,
      )) {
        next.inline_floor = 'Every unit must be assigned to a floor within this property.';
      }
    }
    if ((singleFamily || apartment || commercial) && owners.length === 0) next.owners = 'Add at least one owner.';
    if (singleFamily || apartment || commercial) {
      owners.forEach((owner, index) => {
        if (owner.source === 'existing' && !owner.contact_id) next[`owner_${index}`] = 'Select an existing contact.';
        if (owner.source === 'new' && !owner.name.trim()) next[`owner_${index}`] = 'Owner name is required.';
        if (owner.source === 'new' && !owner.email.trim() && !owner.phone.trim()) next[`owner_${index}`] = 'Add an email or phone number.';
        if (owner.source === 'new' && owner.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(owner.email.trim())) next[`owner_${index}`] = 'Enter a valid email address.';
        if (!apartment) {
          const pct = Number(owner.ownership_percentage);
          if (!owner.ownership_percentage.trim() || !Number.isFinite(pct) || pct <= 0 || pct > 100) next[`owner_share_${index}`] = 'Enter a percentage greater than 0 and no more than 100.';
        } else if (owners.length > 1 && !/^\d+(?:\s*[-–—]\s*\d+)?(?:\s*,\s*\d+(?:\s*[-–—]\s*\d+)?)*$/.test(owner.ownership_scope.trim())) {
          next[`owner_share_${index}`] = 'List the units or ranges this owner holds (for example, 1–4, 8).';
        }
      });
      if (!apartment && owners.length && owners.every((owner) => owner.ownership_percentage.trim() && Number.isFinite(Number(owner.ownership_percentage)) && Number(owner.ownership_percentage) > 0 && Number(owner.ownership_percentage) <= 100)) {
        const sum = owners.reduce((total, owner) => total + Number(owner.ownership_percentage), 0);
        if (Math.abs(sum - 100) > 0.001) next.owner_total = `Ownership percentages must total 100% (currently ${sum}%).`;
      }
    }
    if (propertyCanRent && rented === null) next.rented = `Choose whether this ${singleFamily ? 'home' : 'property'} is rented.`;
    if (propertyCanRent && rented) {
      if (renter.source === 'existing' && !renter.contact_id) next.renter_contact = 'Select an existing renter.';
      if (renter.source === 'new' && !renter.name.trim()) next.renter_contact = 'Renter name is required.';
      if (renter.source === 'new' && !renter.email.trim() && !renter.phone.trim()) next.renter_contact = 'Add an email or phone number.';
      if (renter.source === 'new' && renter.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(renter.email.trim())) next.renter_contact = 'Enter a valid email address.';
      const rent = Number(renter.monthly_rent);
      if (!renter.monthly_rent.trim() || !Number.isFinite(rent) || rent <= 0) next.monthly_rent = 'Enter a monthly rent greater than $0.';
      if (!renter.lease_start_date) next.lease_start_date = 'Choose a lease start date.';
      if (renter.lease_term_type === 'fixed') {
        if (!renter.lease_end_date) next.lease_end_date = 'Choose a lease end date.';
        if (renter.lease_start_date && renter.lease_end_date && renter.lease_end_date < renter.lease_start_date) next.lease_end_date = 'End date must be after the start date.';
      }
    }
    return next;
  }, [form, subtype, singleFamily, multifamily, apartment, commercial, officeBuilding, officeInBuilding, officeFloor, retailCenter, hospitalitySpace, commercialSpaceType, mixedUse, mixedUseComponents, property, existingUnits, propertyCanRent, roomCount, floorCount, floorCapacities, owners, rented, renter, pendingUnits]);

  const canSave = Object.keys(validation).length === 0 && !saving;
  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    setSaveError('');
    const extras = {
      ...form,
      name: form.name.trim(),
      property_type: subtype,
      address_line1: form.address_line1?.trim() ?? '',
      address_line2: form.address_line2?.trim() || null,
      city: form.city?.trim() || null,
      state: form.state?.trim() || null,
      postal_code: form.postal_code?.trim() || null,
      country: form.country?.trim() || null,
      units_count: multifamily || apartment ? Number(form.units_count) : null,
      property_category: category,
      facilities,
      custom_facilities: customFacilities,
      room_count: singleFamily ? Number(roomCount) : null,
      floor_count: singleFamily || apartment || mixedUse ? Number(floorCount) : null,
      floor_unit_counts: apartment ? floorCapacities.map(Number) : [],
      office_in_building: officeBuilding ? officeInBuilding : null,
      office_floor: officeBuilding && officeInBuilding ? Number(officeFloor) : null,
      commercial_space_type: retailCenter || hospitalitySpace ? commercialSpaceType : null,
      mixed_use_components: mixedUse ? mixedUseComponents : [],
      is_rented: propertyCanRent ? Boolean(rented) : false,
      monthly_rent: propertyCanRent && rented ? Number(renter.monthly_rent) : null,
      lease_term_type: propertyCanRent && rented ? renter.lease_term_type : null,
      lease_start_date: propertyCanRent && rented ? renter.lease_start_date : null,
      lease_end_date: propertyCanRent && rented && renter.lease_term_type === 'fixed' ? renter.lease_end_date : null,
    } as PropertyDraft;
    const ownerRows = singleFamily || apartment || commercial ? owners.map((owner) => ({
      ...owner,
      name: owner.name.trim(),
      email: owner.email.trim(),
      phone: owner.phone.trim(),
      ownership_percentage: apartment && owners.length > 1 ? '' : owner.ownership_percentage.trim(),
      ownership_scope: apartment && owners.length > 1 ? owner.ownership_scope.trim() : '',
    })) : [];
    const renterRow = propertyCanRent && rented ? {
      ...renter,
      name: renter.name.trim(),
      email: renter.email.trim(),
      phone: renter.phone.trim(),
      monthly_rent: renter.monthly_rent.trim(),
    } : null;
    try {
      await onSave(extras, ownerRows, renterRow, pendingUnits);
      onClose();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'We could not save this property. Please try again.');
      setSaving(false);
    }
  };

  return (
    <div data-testid="property-setup-form" className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      <motion.button type="button" aria-label="Close property setup" data-testid="button-property-setup-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={saving ? undefined : onClose} className="absolute inset-0 cursor-default bg-[#171a17]/35 backdrop-blur-[3px]" />
      <motion.section role="dialog" aria-modal="true" aria-labelledby="property-setup-title" initial={{ opacity: 0, y: 12, scale: .985 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="relative flex max-h-[94dvh] w-full max-w-[760px] flex-col overflow-hidden rounded-[17px] border border-[#e6e3dd] bg-[#fbfaf8] shadow-[0_28px_90px_rgba(29,31,27,.2)]">
        <header className="flex shrink-0 items-start justify-between border-b border-[#e9e6e0] px-5 py-4 sm:px-7 sm:py-5">
          <div className="flex items-start gap-3.5">
            <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-[11px] bg-[#eaf0e9] text-[#55776b]"><Building2 size={17} /></div>
            <div><p className="text-[9px] font-semibold uppercase tracking-[.18em] text-[#82948a]">Property setup</p><h2 id="property-setup-title" data-testid="text-property-form-title" className="mt-0.5 text-[17px] font-semibold tracking-[-.035em] text-[#282722]">{property ? 'Update property' : 'Add a property'}</h2><p className="mt-1 text-[11px] text-[#8d8981]">Start with the essentials. We’ll tailor the setup to this property.</p></div>
          </div>
          <button type="button" data-testid="button-close-property-setup" aria-label="Close form" onClick={onClose} disabled={saving} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#e5e2dc] text-[#817d75] transition-colors hover:bg-[#f0eeea] hover:text-[#383630] disabled:opacity-50"><X size={15} /></button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
          <div className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><Field label="Property name" required><input autoFocus data-testid="input-property-name" className={inputClass} value={form.name} onChange={(event) => setField('name', event.target.value)} placeholder="e.g. Harbor View Residences" /></Field><FormError message={validation.name} testId="error-property-name" /></div>
            <div className="sm:col-span-2">
              <Field label="Property type" required>
                <div data-testid="select-property-category" className="grid grid-cols-1 gap-2 sm:grid-cols-3" role="group" aria-label="Property type">
                  {PROPERTY_CATEGORIES.map((option) => {
                    const selected = category === option.value;
                    return <button
                      key={option.value}
                      type="button"
                      data-testid={`button-property-category-${option.value}`}
                      aria-pressed={selected}
                      onClick={() => {
                        setCategory(option.value);
                        setField('property_category', option.value);
                        setField('property_type', '');
                        setField('units_count', null);
                        setFloorCount('');
                        setFloorCapacities([]);
                        setPendingUnits([]);
                        setOfficeInBuilding(null);
                        setOfficeFloor('');
                        setCommercialSpaceType('');
                        setMixedUseComponents([]);
                      }}
                      className={`min-h-10 rounded-[9px] border px-3 text-left text-[12px] font-semibold transition-colors ${selected ? 'border-[#97ad9b] bg-[#eff4ee] text-[#455c4b]' : 'border-[#e4e2de] bg-white text-[#625e57] hover:border-[#cbd7ce] hover:bg-[#f8faf7]'}`}
                    >
                      {option.label}
                    </button>;
                  })}
                </div>
              </Field>
            </div>
            {category && <div className="sm:col-span-2">
              <Field label={`${PROPERTY_CATEGORIES.find((option) => option.value === category)?.label ?? 'Property'} subtype`} required>
                <FlowPointSelect testId="select-property-subtype" value={subtype} onChange={(value) => { setField('property_type', value); setField('units_count', null); setFloorCount(''); setFloorCapacities([]); setPendingUnits([]); setOfficeInBuilding(null); setOfficeFloor(''); setCommercialSpaceType(''); setMixedUseComponents([]); }} placeholder="Choose a subtype" options={[...PROPERTY_TYPES_BY_CATEGORY[category]]} />
              </Field>
            </div>}
            <div className="sm:col-span-2"><FormError message={validation.subtype} testId="error-property-subtype" /></div>
            <div className="sm:col-span-2"><Field label="Address line 1" required><input data-testid="input-property-address-line1" className={inputClass} value={form.address_line1 ?? ''} onChange={(event) => setField('address_line1', event.target.value)} placeholder="Street address" /></Field><FormError message={validation.address_line1} testId="error-property-address-line1" /></div>
            <div className="sm:col-span-2"><Field label="Address line 2" hint="optional"><input data-testid="input-property-address-line2" className={inputClass} value={form.address_line2 ?? ''} onChange={(event) => setField('address_line2', event.target.value)} placeholder="Suite, floor, or building" /></Field></div>
            <Field label="City" required><input data-testid="input-property-city" className={inputClass} value={form.city ?? ''} onChange={(event) => setField('city', event.target.value)} placeholder="City" /><FormError message={validation.city} testId="error-property-city" /></Field>
            <Field label="State / region" hint="optional"><input data-testid="input-property-region" className={inputClass} value={form.state ?? ''} onChange={(event) => setField('state', event.target.value)} placeholder="State or region" /></Field>
            <Field label="Postal code" hint="optional"><input data-testid="input-property-postal-code" className={inputClass} value={form.postal_code ?? ''} onChange={(event) => setField('postal_code', event.target.value)} placeholder="Postal code" /></Field>
            <Field label="Country" hint="optional"><input data-testid="input-property-country" className={inputClass} value={form.country ?? ''} onChange={(event) => setField('country', event.target.value)} placeholder="Country" /></Field>
          </div>

          <AnimatePresence initial={false}>
            {subtype && (
              <motion.div key={subtype} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: .18 }} data-testid="section-property-details" className="mt-7 border-t border-[#e9e6e0] pt-6">
                <div className="mb-6 flex items-center gap-2 rounded-[10px] border border-[#e3e8e1] bg-[#f3f6f1] px-3.5 py-2.5 text-[11px] text-[#65786c]">
                  <Check size={13} className="shrink-0" />
                  <span><strong className="font-semibold text-[#485d51]">{PROPERTY_TYPES_BY_CATEGORY[category as PropertyCategory]?.find((option) => option.value === subtype)?.label}</strong> setup · Add operational details that help your team manage this property.</span>
                </div>

                {(residential || commercial) && (
                  <>
                    {residential && <section className="mb-7" data-testid="section-property-layout">
                      <SectionHeading index="01" eyebrow="Layout" title="Set the footprint" description="Capture the essentials your team will use to organize the property." />
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {singleFamily && <><Field label="Rooms" required><input data-testid="input-property-room-count" className={inputClass} type="number" min="1" step="1" value={roomCount} onChange={(event) => setRoomCount(event.target.value)} placeholder="e.g. 5" /></Field><Field label="Floors" required><input data-testid="input-property-floor-count" className={inputClass} type="number" min="1" step="1" value={floorCount} onChange={(event) => { const value = event.target.value; setFloorCount(value); setFloorCapacities(Array.from({ length: Math.min(Number(value) || 0, 100) }, (_, index) => floorCapacities[index] ?? '')); }} placeholder="e.g. 2" /></Field></>}
                        {apartment && <><Field label="Floors" required><input data-testid="input-property-floor-count" className={inputClass} type="number" min="1" step="1" value={floorCount} onChange={(event) => { const value = event.target.value; setFloorCount(value); setFloorCapacities(Array.from({ length: Math.min(Number(value) || 0, 100) }, (_, index) => floorCapacities[index] ?? '')); }} placeholder="e.g. 4" /></Field><Field label="Total units" required><input data-testid="input-property-unit-count" className={inputClass} type="number" min="1" step="1" value={form.units_count ?? ''} onChange={(event) => setField('units_count', event.target.value ? Number(event.target.value) : null)} placeholder="e.g. 24" /><FormError message={validation.units_count} testId="error-property-unit-count" /></Field></>}
                        {multifamily && <div className="sm:col-span-2"><Field label="Number of units" required><input data-testid="input-property-unit-count" className={inputClass} type="number" min="1" step="1" value={form.units_count ?? ''} onChange={(event) => setField('units_count', event.target.value ? Number(event.target.value) : null)} placeholder="e.g. 8" /></Field><FormError message={validation.units_count} testId="error-property-unit-count" /><p className="mt-1.5 text-[10px] text-[#969188]">You can add units now or later from the property card.</p></div>}
                      </div>
                      {singleFamily && <div className="mt-1 grid grid-cols-1 gap-3 sm:grid-cols-2"><FormError message={validation.room_count} testId="error-property-room-count" /><FormError message={validation.floor_count} testId="error-property-floor-count" /></div>}
                      {apartment && <>
                        <div className="mt-4 rounded-[11px] border border-[#e8e5de] bg-[#f8f7f4] p-3.5">
                          <div className="flex items-start justify-between gap-4"><div><p className="text-[11px] font-semibold text-[#48463f]">Units per floor</p><p className="mt-1 text-[10px] text-[#929087]">Capacities across all floors must equal the total units.</p></div><span data-testid="text-floor-capacity-total" className="shrink-0 font-mono text-[11px] text-[#6d7f72]">{floorCapacities.reduce((sum, value) => sum + (Number(value) || 0), 0)} / {form.units_count || 0}</span></div>
                          {floorCapacities.length > 0 && <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">{floorCapacities.map((capacity, index) => <Field key={index} label={index === 0 ? 'Ground floor' : `Floor ${index}`}><input data-testid={`input-property-floor-capacity-${index}`} className={inputClass} type="number" min="0" step="1" value={capacity} onChange={(event) => setFloorCapacities((current) => current.map((value, i) => i === index ? event.target.value : value))} placeholder="Units" /></Field>)}</div>}
                          <FormError message={validation.floor_count || validation.floor_capacities} testId="error-property-floor-capacities" />
                        </div>
                      </>}
                    </section>}

                    {commercial && <section className="mb-7" data-testid="section-commercial-details">
                      <SectionHeading index="01" eyebrow="Commercial details" title="Configure this property type" description="Add the details that describe this commercial space." />
                      {officeBuilding && <div className="space-y-3">
                        <Field label="Is this office inside a building?" required>
                          <div className="grid grid-cols-2 gap-2" role="group" aria-label="Office building location">
                            {[{ value: true, label: 'Yes, in a building' }, { value: false, label: 'No, standalone' }].map((choice) => <button key={String(choice.value)} type="button" data-testid={`button-office-in-building-${choice.value ? 'yes' : 'no'}`} aria-pressed={officeInBuilding === choice.value} onClick={() => setOfficeInBuilding(choice.value)} className={`rounded-[9px] border p-3 text-left text-[11px] font-semibold ${officeInBuilding === choice.value ? 'border-[#97ad9b] bg-[#eff4ee] text-[#455c4b]' : 'border-[#e7e4de] bg-white text-[#6f6b63]'}`}>{choice.label}</button>)}
                          </div>
                          <FormError message={validation.office_in_building} />
                        </Field>
                        {officeInBuilding && <Field label="Floor" required hint="Use 0 for ground floor">
                          <input data-testid="input-office-floor" className={inputClass} type="number" min="0" step="1" value={officeFloor} onChange={(event) => setOfficeFloor(event.target.value)} placeholder="e.g. 4" />
                          <FormError message={validation.office_floor} />
                        </Field>}
                      </div>}
                      {retailCenter && <div className="max-w-[440px]">
                        <Field label="Retail center type" required>
                          <FlowPointSelect testId="select-commercial-space-type" value={commercialSpaceType} onChange={setCommercialSpaceType} placeholder="Choose a retail center type" options={[...RETAIL_CENTER_TYPES]} />
                        </Field>
                        <FormError message={validation.commercial_space_type} />
                      </div>}
                      {hospitalitySpace && <div className="max-w-[440px]">
                        <Field label="Hospitality space type" required>
                          <FlowPointSelect testId="select-commercial-space-type" value={commercialSpaceType} onChange={setCommercialSpaceType} placeholder="Choose a space type" options={[...HOSPITALITY_SPACE_TYPES]} />
                        </Field>
                        <FormError message={validation.commercial_space_type} />
                      </div>}
                      {mixedUse && <>
                        <div>
                          <Field label="What does this property include?" required>
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                              {MIXED_USE_COMPONENTS.map((component) => {
                                const checked = mixedUseComponents.includes(component.value);
                                return <button key={component.value} type="button" data-testid={`button-mixed-use-component-${component.value}`} aria-pressed={checked} onClick={() => setMixedUseComponents((current) => checked ? current.filter((value) => value !== component.value) : [...current, component.value])} className={`flex min-h-10 items-center gap-2 rounded-[9px] border px-3 text-left text-[11px] font-medium ${checked ? 'border-[#b9cabe] bg-[#edf4ee] text-[#4d6a59]' : 'border-[#e7e4de] bg-white text-[#69665f]'}`}><span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border ${checked ? 'border-[#63816e] bg-[#63816e] text-white' : 'border-[#d5d2ca] bg-white'}`}>{checked && <Check size={11} />}</span>{component.label}</button>;
                              })}
                            </div>
                          </Field>
                          <FormError message={validation.mixed_use_components} />
                        </div>
                        <div className="mt-4 max-w-[260px]">
                          <Field label="Number of floors" required><input data-testid="input-property-floor-count" className={inputClass} type="number" min="1" step="1" value={floorCount} onChange={(event) => setFloorCount(event.target.value)} placeholder="e.g. 6" /></Field>
                          <FormError message={validation.floor_count} />
                        </div>
                        <p className="mt-3 rounded-[9px] bg-[#f6f5f1] px-3 py-2.5 text-[10px] leading-4 text-[#817d75]">Each space is added below with its type and building floor, plus its own owners, renter, lease, and facilities.</p>
                      </>}
                    </section>}

                    {(singleFamily || multifamily || apartment || commercial) && (
                      <section className="mb-7" data-testid="section-property-facilities">
                        <SectionHeading index="02" eyebrow="Shared spaces" title="Facilities & features" description={commercial ? 'Select the commercial property facilities. You can also add a facility that isn’t listed.' : apartment ? 'Select the building amenities and any home-style shared facilities.' : 'Select what’s available. You can add a facility that isn’t listed.'} />
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                          {(commercial ? COMMERCIAL_FACILITIES : [...HOME_FACILITIES, ...(apartment ? APARTMENT_BUILDING_FACILITIES : [])]).map((facility) => {
                            const checked = selectedFacilities.has(facility.value);
                            return <button key={facility.value} type="button" data-testid={`button-facility-${facility.value}`} aria-pressed={checked} onClick={() => toggleFacility(facility.value)} className={`flex min-h-10 items-center gap-2 rounded-[9px] border px-3 text-left text-[11px] font-medium transition-colors ${checked ? 'border-[#b9cabe] bg-[#edf4ee] text-[#4d6a59]' : 'border-[#e7e4de] bg-white text-[#69665f] hover:border-[#ccd7ce] hover:bg-[#f8faf7]'}`}><span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border ${checked ? 'border-[#63816e] bg-[#63816e] text-white' : 'border-[#d5d2ca] bg-white'}`}>{checked && <Check size={11} />}</span>{facility.label}</button>;
                          })}
                        </div>
                        <div className="mt-3 flex gap-2"><input data-testid="input-property-custom-facility" className={inputClass} value={customFacility} onChange={(event) => setCustomFacility(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); if (customFacility.trim() && !customFacilities.includes(customFacility.trim())) setCustomFacilities((current) => [...current, customFacility.trim()]); setCustomFacility(''); } }} placeholder="Add another facility" /><button type="button" data-testid="button-add-custom-facility" onClick={() => { if (customFacility.trim() && !customFacilities.includes(customFacility.trim())) setCustomFacilities((current) => [...current, customFacility.trim()]); setCustomFacility(''); }} disabled={!customFacility.trim()} className="flex h-10 shrink-0 items-center gap-1.5 rounded-[9px] border border-[#dcd9d2] px-3 text-[11px] font-semibold text-[#66635b] transition-colors hover:bg-[#f3f2ee] disabled:cursor-not-allowed disabled:opacity-45"><Plus size={13} />Add</button></div>
                        {customFacilities.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{customFacilities.map((facility) => <span key={facility} data-testid={`chip-custom-facility-${facility}`} className="inline-flex items-center gap-1 rounded-full bg-[#eaf0e9] px-2.5 py-1 text-[10px] text-[#526d5b]">{facility}<button type="button" data-testid={`button-remove-facility-${facility}`} aria-label={`Remove ${facility}`} onClick={() => setCustomFacilities((current) => current.filter((item) => item !== facility))}><X size={11} /></button></span>)}</div>}
                      </section>
                    )}

                    {(singleFamily || apartment || commercial) && <section className="mb-7" data-testid="section-property-owners">
                      <SectionHeading index="03" eyebrow="Ownership" title="Who owns this property?" description={apartment ? 'Building owners share the property. With multiple owners, record each one’s unit scope.' : 'Add one or more owners. Ownership shares must total 100%.'} />
                      <div className="space-y-3">
                        {owners.map((owner, index) => (
                          <article key={owner.id ?? `owner-${index}`} data-testid={`card-property-owner-${index}`} className="rounded-[12px] border border-[#e7e4de] bg-white p-3.5 sm:p-4">
                            <div className="mb-3 flex items-center justify-between gap-3"><div className="flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#f0f2ec] text-[#7e8a77]"><UserRound size={13} /></span><div><p className="text-[12px] font-semibold text-[#37362f]">{owners.length > 1 ? `Owner ${index + 1}` : 'Property owner'}</p><p className="mt-0.5 text-[10px] text-[#969188]">Select a contact or add one</p></div></div>{owners.length > 1 && <button type="button" data-testid={`button-remove-owner-${index}`} onClick={() => setOwners((current) => current.filter((_, ownerIndex) => ownerIndex !== index))} aria-label={`Remove owner ${index + 1}`} className="flex h-7 w-7 items-center justify-center rounded-full text-[#938e85] hover:bg-[#fbefed] hover:text-[#a33e34]"><Trash2 size={13} /></button>}</div>
                            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                               <Field label="Entity type" required><FlowPointSelect testId={`select-owner-${index}-entity-type`} value={owner.entity_type} onChange={(value) => setOwner(index, { entity_type: value as OwnerDraft['entity_type'], contact_id: '', source: 'existing' })} placeholder="Choose entity type" options={[{ value: 'individual', label: 'Individual' }, { value: 'company', label: 'Company' }]} /></Field>
                              {apartment ? owners.length > 1 ? <Field label="Unit scope" required hint="units or ranges"><input data-testid={`input-owner-${index}-scope`} className={inputClass} value={owner.ownership_scope} onChange={(event) => setOwner(index, { ownership_scope: event.target.value })} placeholder="e.g. 1–4, 8" /></Field> : <div className="flex items-center rounded-[9px] bg-[#f6f5f1] px-3 text-[10px] text-[#87837b]">Sole building owner</div> : <Field label="Ownership share" required><div className="relative"><input data-testid={`input-owner-${index}-percentage`} className={`${inputClass} pr-8`} type="number" min="0" max="100" step="0.01" value={owner.ownership_percentage} onChange={(event) => setOwner(index, { ownership_percentage: event.target.value })} placeholder="e.g. 100" /><span className="pointer-events-none absolute right-3 top-[11px] text-[11px] text-[#929087]">%</span></div></Field>}
                            </div>
                             <div className="mt-3"><ContactFields row={owner} index={index} kind="owner" contacts={contacts} entityType={owner.entity_type} onChange={(patch) => setOwner(index, patch as Partial<OwnerDraft>)} /></div>
                            <FormError message={validation[`owner_${index}`] || validation[`owner_share_${index}`]} testId={`error-property-owner-${index}`} />
                          </article>
                        ))}
                      </div>
                      {owners.length < 20 && <button type="button" data-testid="button-add-property-owner" onClick={() => setOwners((current) => [...current, blankOwner()])} className="mt-3 flex h-9 items-center gap-2 rounded-[9px] border border-dashed border-[#d8d5ce] px-3 text-[11px] font-semibold text-[#6f6b63] transition-colors hover:border-[#aebcaf] hover:bg-[#f3f6f1] hover:text-[#4f6d58]"><Plus size={13} />Add another owner</button>}
                      <FormError message={validation.owners || validation.owner_total} testId="error-property-owner-total" />
                    </section>}

                    {propertyCanRent && (
                      <section data-testid="section-property-rental">
                        <SectionHeading index="04" eyebrow="Occupancy" title={`Is this ${singleFamily ? 'home' : 'property'} rented?`} description={`Add the current renter and lease details, or leave the ${singleFamily ? 'home' : 'property'} unoccupied.`} />
                        <div className="grid grid-cols-2 gap-2" role="group" aria-label="Rental status">
                          {[{ value: false, title: 'Not rented', copy: 'No active renter' }, { value: true, title: 'Rented', copy: 'Add renter & lease' }].map((choice) => <button key={String(choice.value)} type="button" data-testid={`button-property-rented-${choice.value ? 'yes' : 'no'}`} aria-pressed={rented === choice.value} onClick={() => setRented(choice.value)} className={`rounded-[10px] border p-3 text-left transition-colors ${rented === choice.value ? 'border-[#97ad9b] bg-[#eff4ee]' : 'border-[#e7e4de] bg-white hover:border-[#d1d7cd]'}`}><span className="block text-[12px] font-semibold text-[#45443d]">{choice.title}</span><span className="mt-1 block text-[10px] text-[#949087]">{choice.copy}</span></button>)}
                        </div>
                        <FormError message={validation.rented} testId="error-property-rented" />
                        {rented && <div data-testid="section-property-renter" className="mt-3 rounded-[12px] border border-[#e7e4de] bg-white p-3.5 sm:p-4">
                          <ContactFields row={renter} index={0} kind="renter" contacts={contacts} onChange={(patch) => setRenterFields(patch as Partial<PropertyRenterDraft>)} />
                          <FormError message={validation.renter_contact} testId="error-property-renter-contact" />
                          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <Field label="Monthly rent" required><div className="relative"><span className="pointer-events-none absolute left-3 top-[11px] text-[12px] text-[#88847c]">$</span><input data-testid="input-property-monthly-rent" className={`${inputClass} pl-7`} type="number" min="0.01" step="0.01" value={renter.monthly_rent} onChange={(event) => setRenterFields({ monthly_rent: event.target.value })} placeholder="2,450" /></div><FormError message={validation.monthly_rent} testId="error-property-monthly-rent" /></Field>
                            <Field label="Contract duration" required><FlowPointSelect testId="select-property-lease-duration" value={renter.lease_term_type} onChange={(value) => setRenterFields({ lease_term_type: value as PropertyRenterDraft['lease_term_type'] })} placeholder="Choose duration" options={[{ value: 'fixed', label: 'Fixed term' }, { value: 'until_termination', label: 'Until termination' }]} /></Field>
                          </div>
                          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2"><Field label="Lease start date" required><input data-testid="input-property-lease-start" className={inputClass} type="date" value={renter.lease_start_date} onChange={(event) => setRenterFields({ lease_start_date: event.target.value })} /><FormError message={validation.lease_start_date} testId="error-property-lease-start" /></Field>{renter.lease_term_type === 'fixed' && <Field label="Lease end date" required><input data-testid="input-property-lease-end" className={inputClass} type="date" min={renter.lease_start_date || undefined} value={renter.lease_end_date} onChange={(event) => setRenterFields({ lease_end_date: event.target.value })} /><FormError message={validation.lease_end_date} testId="error-property-lease-end" /></Field>}</div>
                          {renter.lease_term_type === 'until_termination' && <p data-testid="text-property-lease-open-ended" className="mt-3 rounded-[8px] bg-[#f5f4f0] px-3 py-2 text-[10px] leading-4 text-[#7e7a72]">This contract has no fixed end date.</p>}
                        </div>}
                      </section>
                    )}
                  </>
                )}
                {!property && (multifamily || apartment || mixedUse) && (
                  <section className="mt-7 border-t border-[#e9e6e0] pt-6" data-testid="section-property-inline-units">
                    <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                      <div><p className="text-[12px] font-semibold text-[#37362f]">{mixedUse ? 'Map the spaces by floor' : 'Add units now'}</p><p className="mt-1 text-[10px] leading-4 text-[#969188]">{mixedUse ? 'Add at least one unit for each selected use and assign it to a floor.' : 'Set up homes here, or create the property first and add units from its card.'}</p></div>
                      <span data-testid="text-inline-unit-count" className="rounded-full bg-[#f0f2ec] px-2.5 py-1 text-[10px] font-semibold text-[#617565]">{mixedUse ? `${inlineUnitRecords.length} spaces` : `${inlineUnitRecords.length} / ${configuredUnits || '—'} units`}</span>
                    </div>
                    {!inlineLayoutReady && <p className="mb-3 rounded-[9px] bg-[#f6f5f1] px-3 py-2 text-[10px] text-[#8d8981]">{mixedUse ? 'Choose at least one included use and set the number of floors above.' : apartment ? 'Set the total units and floor capacities above before adding apartment records.' : 'Set the total number of units above before adding homes.'}</p>}
                    {inlineUnitRecords.length > 0 ? <div className="mb-3 space-y-2">{inlineUnitRecords.map((unit, index) => <article key={`${unit.unit_number}-${index}`} data-testid={`card-inline-unit-${index}`} className="flex items-center justify-between gap-3 rounded-[10px] border border-[#e7e4de] bg-white px-3 py-2.5"><div className="min-w-0"><p className="truncate text-[11px] font-semibold text-[#45433c]">{unit.unit_number}</p><p className="mt-0.5 text-[10px] text-[#969188]">{mixedUse ? `${unitTypeLabel(unit.unit_type)} · ${unit.floor === 0 ? 'Ground floor' : `Floor ${unit.floor}`}` : apartment ? unit.floor === 0 ? 'Ground floor' : `Floor ${unit.floor}` : `${unit.floor_count} interior floor${unit.floor_count === 1 ? '' : 's'}`} {!mixedUse && `· ${unit.room_count} rooms`}</p></div><button type="button" data-testid={`button-remove-inline-unit-${index}`} onClick={() => setPendingUnits((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remove unit ${unit.unit_number}`} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#938e85] hover:bg-[#fbefed] hover:text-[#a33e34]"><Trash2 size={13} /></button></article>)}</div> : <p className="mb-3 rounded-[10px] border border-dashed border-[#d8d5ce] px-3 py-4 text-center text-[10px] text-[#9a958d]">No units added yet.</p>}
                    <FormError message={validation.inline_units || validation.inline_floor_capacity || validation.inline_floor} />
                    <button type="button" data-testid="button-add-inline-unit" disabled={!inlineLayoutReady || inlineUnitLimitReached} onClick={() => setUnitEditorOpen(true)} className="flex h-9 items-center gap-2 rounded-[9px] border border-dashed border-[#d8d5ce] px-3 text-[11px] font-semibold text-[#6f6b63] transition-colors hover:border-[#aebcaf] hover:bg-[#f3f6f1] hover:text-[#4f6d58] disabled:cursor-not-allowed disabled:opacity-45"><Plus size={13} />{inlineUnitLimitReached ? 'Unit limit reached' : mixedUse ? 'Add a space' : 'Add a unit'}</button>
                    {!inlineLayoutReady && <p className="mt-2 text-[10px] text-[#9a958d]">{mixedUse ? 'Choose at least one use and set the number of floors first.' : apartment ? 'Enter the total unit count and valid capacity for every floor first.' : 'Enter the total unit count first.'}</p>}
                  </section>
                )}
                {!residential && !commercial && <div data-testid="text-property-basic-setup" className="rounded-[10px] border border-[#e7e4de] bg-white px-4 py-3 text-[11px] leading-5 text-[#817d75]">The location and property classification are ready. Additional setup for this property type will be available in a later step.</div>}
              </motion.div>
            )}
          </AnimatePresence>

          {saveError && <div data-testid="error-property-save" role="alert" className="mt-5 flex items-start gap-2 rounded-[9px] border border-[#efd2ce] bg-[#fff7f5] px-3.5 py-3 text-[11px] leading-4 text-[#a33e34]"><AlertCircle size={14} className="mt-0.5 shrink-0" />{saveError}</div>}
        </div>

        <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-[#e9e6e0] bg-[#faf9f6] px-5 py-3.5 sm:px-7">
          <p data-testid="text-property-required-hint" className="text-[10px] text-[#98938a]"><span className="text-[#b24d40]">*</span> Required fields</p>
          <div className="flex gap-2"><button type="button" data-testid="button-cancel-property-setup" onClick={onClose} disabled={saving} className="h-9 rounded-[9px] border border-[#e2dfd8] px-4 text-[11px] font-semibold text-[#66635c] transition-colors hover:bg-[#f1efeb] disabled:opacity-50">Cancel</button><button type="button" data-testid="button-save-property-setup" onClick={save} disabled={!canSave} title={!canSave && Object.keys(validation).length ? 'Complete the required fields to continue' : undefined} className="flex h-9 min-w-[122px] items-center justify-center gap-2 rounded-[9px] bg-[#55776b] px-4 text-[11px] font-semibold text-white transition-colors hover:bg-[#456357] disabled:cursor-not-allowed disabled:bg-[#b9c4bb]">{saving ? <><Loader2 size={13} className="animate-spin" />Saving…</> : property ? 'Save changes' : 'Create property'}</button></div>
        </footer>
      </motion.section>
      {unitEditorOpen && (multifamily || apartment || mixedUse) && <UnitSetupModal property={previewProperty} units={[...existingUnits.filter((unit) => unit.property_id === previewProperty.id), ...inlineUnitRecords]} contacts={inlineOwnerData.contacts} relationships={inlineOwnerData.relationships} onSave={async (payload) => { setPendingUnits((current) => [...current, { ...payload, draft: { ...payload.draft, property_id: previewProperty.id } }]); setUnitEditorOpen(false); }} onClose={() => setUnitEditorOpen(false)} />}
    </div>
  );
}
