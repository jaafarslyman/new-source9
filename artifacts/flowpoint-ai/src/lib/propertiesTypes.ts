export interface Property {
  id: string;
  company_id: string | null;
  created_at: string;
  updated_at: string;
  name: string;
  property_category: string | null;
  property_type: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  description: string | null;
  units_count: number | null;
  floor_count: number | null;
  floor_unit_counts: number[] | null;
  room_count: number | null;
  facilities: string[] | null;
  custom_facilities: string[] | null;
  is_rented: boolean | null;
  monthly_rent: number | null;
  lease_term_type: 'fixed' | 'until_termination' | null;
  lease_start_date: string | null;
  lease_end_date: string | null;
  amenities: string | null;
  office_in_building: boolean | null;
  office_floor: number | null;
  commercial_space_type: string | null;
  mixed_use_components: string[] | null;
  property_rules: string | null;
  parking_information: string | null;
  access_information: string | null;
  utilities_information: string | null;
  emergency_information: string | null;
  notes: string | null;
  status: string | null;
}

export type PropertyDraft = Omit<Property, 'id' | 'company_id' | 'created_at' | 'updated_at'>;

export const PROPERTY_CATEGORIES = [
  { value: 'residential', label: 'Residential' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'industrial', label: 'Industrial' },
] as const;

export const PROPERTY_TYPES_BY_CATEGORY = {
  residential: [
    { value: 'single_family_home', label: 'Single-family home' },
    { value: 'multifamily_units', label: 'Multifamily units' },
    { value: 'apartment_building', label: 'Apartment building' },
  ],
  commercial: [
    { value: 'office_building', label: 'Office buildings' },
    { value: 'retail_center', label: 'Retail centers' },
    { value: 'restaurant_hospitality', label: 'Restaurants & hospitality spaces' },
    { value: 'mixed_use_development', label: 'Mixed-use development' },
  ],
  industrial: [
    { value: 'warehouse', label: 'Warehouse' },
    { value: 'distribution_center', label: 'Distribution center' },
    { value: 'manufacturing_plant', label: 'Manufacturing plants' },
    { value: 'research_development_facility', label: 'Research & development facilities' },
  ],
} as const;

export const PROPERTY_TYPES = [
  ...PROPERTY_TYPES_BY_CATEGORY.residential,
  ...PROPERTY_TYPES_BY_CATEGORY.commercial,
  ...PROPERTY_TYPES_BY_CATEGORY.industrial,
] as const;

export const HOME_FACILITIES = [
  { value: 'garden', label: 'Garden' },
  { value: 'backyard', label: 'Backyard' },
  { value: 'garage', label: 'Garage' },
  { value: 'solar_panels', label: 'Solar panels' },
  { value: 'fence', label: 'Fence' },
] as const;

export const APARTMENT_BUILDING_FACILITIES = [
  { value: 'elevator', label: 'Elevator' },
  { value: 'parking_lot', label: 'Parking lot' },
  { value: 'gym', label: 'Gym' },
  { value: 'sauna', label: 'Sauna' },
  { value: 'rooftop', label: 'Rooftop' },
] as const;

export const COMMERCIAL_FACILITIES = [
  { value: 'parking_lot', label: 'Parking lot' },
  { value: 'elevator', label: 'Elevator' },
  { value: 'security_system', label: 'Security system' },
  { value: 'reception', label: 'Reception' },
  { value: 'conference_room', label: 'Conference room' },
  { value: 'shared_restrooms', label: 'Shared restrooms' },
  { value: 'loading_dock', label: 'Loading dock' },
  { value: 'hvac', label: 'HVAC' },
] as const;

export const RETAIL_CENTER_TYPES = [
  { value: 'shopping_mall', label: 'Shopping mall' },
  { value: 'strip_mall', label: 'Strip mall' },
  { value: 'shopping_center', label: 'Shopping center' },
  { value: 'outlet_center', label: 'Outlet center' },
  { value: 'market_hall', label: 'Market hall' },
  { value: 'other', label: 'Other' },
] as const;

export const RETAIL_UNIT_TYPES = [
  { value: 'boutique', label: 'Boutique' },
  { value: 'convenience_store', label: 'Convenience store' },
  { value: 'supermarket', label: 'Supermarket' },
  { value: 'department_store', label: 'Department store' },
  { value: 'pharmacy', label: 'Pharmacy' },
  { value: 'showroom', label: 'Showroom' },
  { value: 'other', label: 'Other' },
] as const;

export const HOSPITALITY_SPACE_TYPES = [
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'cafe', label: 'Cafe' },
  { value: 'bar', label: 'Bar' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'event_venue', label: 'Event venue' },
  { value: 'food_hall', label: 'Food hall' },
  { value: 'other', label: 'Other' },
] as const;

export const MIXED_USE_COMPONENTS = [
  { value: 'apartment', label: 'Residential apartments' },
  { value: 'office', label: 'Office spaces' },
  { value: 'retail_store', label: 'Retail stores' },
  { value: 'restaurant_hospitality', label: 'Restaurants & hospitality' },
  { value: 'warehouse', label: 'Warehouses' },
] as const;

export const PROPERTY_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
] as const;

export function propertyTypeLabel(value: string | null | undefined) {
  const legacyLabels: Record<string, string> = {
    single_family: 'Single-family home',
    mixed_use: 'Mixed-use development',
    condo: 'Condo',
    townhouse: 'Townhouse',
    other: 'Other',
  };
  return PROPERTY_TYPES.find((type) => type.value === value)?.label ?? legacyLabels[value ?? ''] ?? value ?? 'Type unavailable';
}

export function propertyCategoryLabel(value: string | null | undefined) {
  return PROPERTY_CATEGORIES.find((category) => category.value === value)?.label ?? value ?? 'Category unavailable';
}

export function propertyStatusLabel(value: string | null | undefined) {
  return PROPERTY_STATUSES.find((status) => status.value === value)?.label ?? value ?? 'Unavailable';
}

export const blankProperty: PropertyDraft = {
  name: '',
  property_category: '',
  property_type: '',
  address_line1: '',
  address_line2: '',
  city: '',
  state: '',
  postal_code: '',
  country: '',
  description: '',
  units_count: null,
  floor_count: null,
  floor_unit_counts: [],
  room_count: null,
  facilities: [],
  custom_facilities: [],
  is_rented: false,
  monthly_rent: null,
  lease_term_type: null,
  lease_start_date: null,
  lease_end_date: null,
  amenities: '',
  office_in_building: null,
  office_floor: null,
  commercial_space_type: null,
  mixed_use_components: [],
  property_rules: '',
  parking_information: '',
  access_information: '',
  utilities_information: '',
  emergency_information: '',
  notes: '',
  status: 'active',
};

export function propertyAddress(property: Property) {
  return [property.address_line1, property.city, property.state, property.postal_code]
    .filter(Boolean)
    .join(', ');
}