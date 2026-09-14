/**
 * FilmRoom Professional Role & Capability Registry
 * 
 * Defines industry roles across three main pillars:
 * 1. TALENT (On-screen & key creative crafts)
 * 2. PRODUCTION / HIRING (Directing, producing, casting, and department heads)
 * 3. REPRESENTATION (Agents, managers, talent representatives)
 */

export const ROLE_CATEGORIES = {
  TALENT: 'TALENT',
  PRODUCTION: 'PRODUCTION',
  REPRESENTATION: 'REPRESENTATION',
};

export const AVAILABILITY_STATUS = {
  AVAILABLE: 'AVAILABLE',
  BUSY: 'BUSY',
  AVAILABLE_FROM: 'AVAILABLE_FROM',
  UNAVAILABLE: 'UNAVAILABLE',
};

export const AVAILABILITY_CONFIG = {
  [AVAILABILITY_STATUS.AVAILABLE]: {
    key: AVAILABILITY_STATUS.AVAILABLE,
    label: 'Available for Hire',
    shortLabel: 'Available',
    color: '#4ade80',
    bgColor: '#1e3d29',
    icon: '🟢',
  },
  [AVAILABILITY_STATUS.BUSY]: {
    key: AVAILABILITY_STATUS.BUSY,
    label: 'Currently on Production (Busy)',
    shortLabel: 'Busy',
    color: '#9ca3af',
    bgColor: '#1f242d',
    icon: '⚪',
  },
  [AVAILABILITY_STATUS.AVAILABLE_FROM]: {
    key: AVAILABILITY_STATUS.AVAILABLE_FROM,
    label: 'Available From Date',
    shortLabel: 'Avail. Soon',
    color: '#f5a623',
    bgColor: '#2a2215',
    icon: '🟡',
  },
  [AVAILABILITY_STATUS.UNAVAILABLE]: {
    key: AVAILABILITY_STATUS.UNAVAILABLE,
    label: 'Not Accepting Inquiries',
    shortLabel: 'Unavailable',
    color: '#f87171',
    bgColor: '#3d1c1c',
    icon: '🔴',
  },
};

export const UNION_STATUSES = [
  'Non-Union',
  'SAG-AFTRA',
  'DGA',
  'WGA',
  'IATSE',
  'Equity',
  'PGA',
  'Other Guild',
];

/**
 * The standard high-level professional roles for role-aware onboarding
 * and ordered role assignment.
 */
export const CORE_PROFESSIONAL_ROLES = [
  { id: 'Director', label: 'Director', icon: '🎬', department: 'Directing', category: ROLE_CATEGORIES.PRODUCTION },
  { id: 'Actor', label: 'Actor', icon: '🎭', department: 'Cast', isActor: true, category: ROLE_CATEGORIES.TALENT },
  { id: 'Producer', label: 'Producer', icon: '💼', department: 'Production', category: ROLE_CATEGORIES.PRODUCTION },
  { id: 'Cinematographer', label: 'Cinematographer', icon: '🎥', department: 'Camera', category: ROLE_CATEGORIES.TALENT },
  { id: 'Writer', label: 'Writer', icon: '✍️', department: 'Writing', category: ROLE_CATEGORIES.TALENT },
  { id: 'Editor', label: 'Editor', icon: '✂️', department: 'Post-Production', category: ROLE_CATEGORIES.TALENT },
  { id: 'Sound', label: 'Sound', icon: '🎙️', department: 'Sound', category: ROLE_CATEGORIES.TALENT },
  { id: 'Casting Director', label: 'Casting Director', icon: '📋', department: 'Casting', category: ROLE_CATEGORIES.PRODUCTION },
  { id: 'Production', label: 'Production (AD / Line Producer / UPM)', icon: '⏱️', department: 'Production', category: ROLE_CATEGORIES.PRODUCTION },
  { id: 'Art Department', label: 'Art Department (Designer / Props)', icon: '🎨', department: 'Art', category: ROLE_CATEGORIES.TALENT },
  { id: 'Costume', label: 'Costume & Wardrobe', icon: '👗', department: 'Costume', category: ROLE_CATEGORIES.TALENT },
  { id: 'Makeup & Hair', label: 'Makeup & Hair (Beauty / SFX)', icon: '💄', department: 'Hair & Makeup', category: ROLE_CATEGORIES.TALENT },
  { id: 'VFX', label: 'VFX (Visual Effects)', icon: '✨', department: 'VFX', category: ROLE_CATEGORIES.TALENT },
  { id: 'Animation', label: 'Animation', icon: '🎞️', department: 'Animation', category: ROLE_CATEGORIES.TALENT },
  { id: 'Photographer', label: 'Set Photographer / Stills', icon: '📸', department: 'Camera', category: ROLE_CATEGORIES.TALENT },
  { id: 'Other Crew', label: 'Other Crew', icon: '🔧', department: 'Other', category: ROLE_CATEGORIES.TALENT },
];

export const INDUSTRY_ROLES = [
  // --- TALENT ---
  {
    name: 'Actor',
    category: ROLE_CATEGORIES.TALENT,
    department: 'Cast',
    isActor: true,
    capabilities: ['canReceiveCastingRequests', 'canSubmitInquiry', 'canManageRepresentation'],
  },
  {
    name: 'Director',
    category: ROLE_CATEGORIES.PRODUCTION,
    department: 'Directing',
    isActor: false,
    capabilities: ['canSearchTalent', 'canShortlistTalent', 'canRequestContact', 'canManageProduction'],
  },
  {
    name: 'Producer',
    category: ROLE_CATEGORIES.PRODUCTION,
    department: 'Production',
    isActor: false,
    capabilities: ['canSearchTalent', 'canShortlistTalent', 'canRequestContact', 'canManageProduction'],
  },
  {
    name: 'Cinematographer',
    category: ROLE_CATEGORIES.TALENT,
    department: 'Camera',
    isActor: false,
    capabilities: ['canReceiveCastingRequests', 'canSubmitInquiry', 'canManageRepresentation'],
  },
  {
    name: 'Writer',
    category: ROLE_CATEGORIES.TALENT,
    department: 'Writing',
    isActor: false,
    capabilities: ['canReceiveCastingRequests', 'canSubmitInquiry', 'canManageRepresentation'],
  },
  {
    name: 'Editor',
    category: ROLE_CATEGORIES.TALENT,
    department: 'Post-Production',
    isActor: false,
    capabilities: ['canReceiveCastingRequests', 'canSubmitInquiry', 'canManageRepresentation'],
  },
  {
    name: 'Sound',
    category: ROLE_CATEGORIES.TALENT,
    department: 'Sound',
    isActor: false,
    capabilities: ['canReceiveCastingRequests', 'canSubmitInquiry'],
  },
  {
    name: 'Casting Director',
    category: ROLE_CATEGORIES.PRODUCTION,
    department: 'Casting',
    isActor: false,
    capabilities: ['canSearchTalent', 'canShortlistTalent', 'canRequestContact'],
  },
  {
    name: 'Production',
    category: ROLE_CATEGORIES.PRODUCTION,
    department: 'Production',
    isActor: false,
    capabilities: ['canManageProduction'],
  },
  {
    name: 'Art Department',
    category: ROLE_CATEGORIES.TALENT,
    department: 'Art',
    isActor: false,
    capabilities: ['canReceiveCastingRequests', 'canSubmitInquiry'],
  },
  {
    name: 'Costume',
    category: ROLE_CATEGORIES.TALENT,
    department: 'Costume',
    isActor: false,
    capabilities: ['canReceiveCastingRequests', 'canSubmitInquiry'],
  },
  {
    name: 'Makeup & Hair',
    category: ROLE_CATEGORIES.TALENT,
    department: 'Hair & Makeup',
    isActor: false,
    capabilities: ['canReceiveCastingRequests', 'canSubmitInquiry'],
  },
  {
    name: 'VFX',
    category: ROLE_CATEGORIES.TALENT,
    department: 'VFX',
    isActor: false,
    capabilities: ['canReceiveCastingRequests', 'canSubmitInquiry'],
  },
  {
    name: 'Animation',
    category: ROLE_CATEGORIES.TALENT,
    department: 'Animation',
    isActor: false,
    capabilities: ['canReceiveCastingRequests', 'canSubmitInquiry'],
  },
  {
    name: 'Photographer',
    category: ROLE_CATEGORIES.TALENT,
    department: 'Camera',
    isActor: false,
    capabilities: ['canReceiveCastingRequests', 'canSubmitInquiry'],
  },
  {
    name: 'Other Crew',
    category: ROLE_CATEGORIES.TALENT,
    department: 'Other',
    isActor: false,
    capabilities: ['canReceiveCastingRequests', 'canSubmitInquiry'],
  },
  // Representation
  {
    name: 'Talent Agent',
    category: ROLE_CATEGORIES.REPRESENTATION,
    department: 'Representation',
    isActor: false,
    capabilities: ['canRepresentTalent', 'canReceiveInquiriesForClients', 'canManageRoster'],
  },
  {
    name: 'Talent Manager',
    category: ROLE_CATEGORIES.REPRESENTATION,
    department: 'Representation',
    isActor: false,
    capabilities: ['canRepresentTalent', 'canReceiveInquiriesForClients', 'canManageRoster'],
  },
];

export const getRolesByCategory = (category) => {
  return INDUSTRY_ROLES.filter((r) => r.category === category);
};

export const hasCapability = (roleName, capability) => {
  const roleObj = INDUSTRY_ROLES.find((r) => r.name === roleName);
  return !!roleObj?.capabilities?.includes(capability);
};

/**
 * Reordering helper for ordered professional roles
 */
export const reorderRoles = {
  moveUp: (list, index) => {
    if (index <= 0) return list;
    const copy = [...list];
    const temp = copy[index - 1];
    copy[index - 1] = copy[index];
    copy[index] = temp;
    return copy;
  },
  moveDown: (list, index) => {
    if (index >= list.length - 1) return list;
    const copy = [...list];
    const temp = copy[index + 1];
    copy[index + 1] = copy[index];
    copy[index] = temp;
    return copy;
  },
  setAsPrimary: (list, index) => {
    if (index <= 0) return list;
    const item = list[index];
    const remaining = list.filter((_, i) => i !== index);
    return [item, ...remaining];
  },
  removeRole: (list, index) => {
    return list.filter((_, i) => i !== index);
  },
};
