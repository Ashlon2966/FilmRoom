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
  'SAG-AFTRA',
  'DGA',
  'WGA',
  'Equity',
  'IATSE',
  'PGA',
  'Non-Union',
];

export const INDUSTRY_ROLES = [
  // --- TALENT ---
  {
    name: 'Actor / Lead Talent',
    category: ROLE_CATEGORIES.TALENT,
    department: 'Cast',
    isActor: true,
    capabilities: ['canReceiveCastingRequests', 'canSubmitInquiry', 'canManageRepresentation'],
  },
  {
    name: 'Supporting Actor',
    category: ROLE_CATEGORIES.TALENT,
    department: 'Cast',
    isActor: true,
    capabilities: ['canReceiveCastingRequests', 'canSubmitInquiry', 'canManageRepresentation'],
  },
  {
    name: 'Background Artist / Extra',
    category: ROLE_CATEGORIES.TALENT,
    department: 'Cast',
    isActor: true,
    capabilities: ['canReceiveCastingRequests', 'canSubmitInquiry'],
  },
  {
    name: 'Voice Actor / Narrator',
    category: ROLE_CATEGORIES.TALENT,
    department: 'Cast',
    isActor: true,
    capabilities: ['canReceiveCastingRequests', 'canSubmitInquiry', 'canManageRepresentation'],
  },
  {
    name: 'Screenwriter',
    category: ROLE_CATEGORIES.TALENT,
    department: 'Writing',
    isActor: false,
    capabilities: ['canReceiveCastingRequests', 'canSubmitInquiry', 'canManageRepresentation'],
  },
  {
    name: 'Cinematographer (DP / DOP)',
    category: ROLE_CATEGORIES.TALENT,
    department: 'Camera',
    isActor: false,
    capabilities: ['canReceiveCastingRequests', 'canSubmitInquiry', 'canManageRepresentation'],
  },
  {
    name: 'Camera Operator',
    category: ROLE_CATEGORIES.TALENT,
    department: 'Camera',
    isActor: false,
    capabilities: ['canReceiveCastingRequests', 'canSubmitInquiry'],
  },
  {
    name: 'Film Editor',
    category: ROLE_CATEGORIES.TALENT,
    department: 'Post-Production',
    isActor: false,
    capabilities: ['canReceiveCastingRequests', 'canSubmitInquiry', 'canManageRepresentation'],
  },
  {
    name: 'Sound Designer / Mixer',
    category: ROLE_CATEGORIES.TALENT,
    department: 'Sound',
    isActor: false,
    capabilities: ['canReceiveCastingRequests', 'canSubmitInquiry'],
  },
  {
    name: 'Composer / Music Supervisor',
    category: ROLE_CATEGORIES.TALENT,
    department: 'Music',
    isActor: false,
    capabilities: ['canReceiveCastingRequests', 'canSubmitInquiry', 'canManageRepresentation'],
  },
  {
    name: 'Production Designer',
    category: ROLE_CATEGORIES.TALENT,
    department: 'Art',
    isActor: false,
    capabilities: ['canReceiveCastingRequests', 'canSubmitInquiry', 'canManageRepresentation'],
  },
  {
    name: 'Costume Designer',
    category: ROLE_CATEGORIES.TALENT,
    department: 'Costume',
    isActor: false,
    capabilities: ['canReceiveCastingRequests', 'canSubmitInquiry'],
  },
  {
    name: 'Key Makeup Artist & Hair',
    category: ROLE_CATEGORIES.TALENT,
    department: 'Hair & Makeup',
    isActor: false,
    capabilities: ['canReceiveCastingRequests', 'canSubmitInquiry'],
  },
  {
    name: 'Stunt Coordinator / Performer',
    category: ROLE_CATEGORIES.TALENT,
    department: 'Stunts',
    isActor: false,
    capabilities: ['canReceiveCastingRequests', 'canSubmitInquiry'],
  },
  {
    name: 'Gaffer / Lighting Lead',
    category: ROLE_CATEGORIES.TALENT,
    department: 'Lighting',
    isActor: false,
    capabilities: ['canReceiveCastingRequests', 'canSubmitInquiry'],
  },
  {
    name: 'Key Grip / Rigging Lead',
    category: ROLE_CATEGORIES.TALENT,
    department: 'Grip',
    isActor: false,
    capabilities: ['canReceiveCastingRequests', 'canSubmitInquiry'],
  },
  {
    name: 'Production Assistant (PA)',
    category: ROLE_CATEGORIES.TALENT,
    department: 'Production',
    isActor: false,
    capabilities: ['canReceiveCastingRequests', 'canSubmitInquiry'],
  },

  // --- PRODUCTION & HIRING ---
  {
    name: 'Film Director',
    category: ROLE_CATEGORIES.PRODUCTION,
    department: 'Directing',
    isActor: false,
    capabilities: ['canSearchTalent', 'canShortlistTalent', 'canRequestContact', 'canManageProduction'],
  },
  {
    name: 'Film Producer / Exec Producer',
    category: ROLE_CATEGORIES.PRODUCTION,
    department: 'Production',
    isActor: false,
    capabilities: ['canSearchTalent', 'canShortlistTalent', 'canRequestContact', 'canManageProduction'],
  },
  {
    name: 'Casting Director',
    category: ROLE_CATEGORIES.PRODUCTION,
    department: 'Casting',
    isActor: false,
    capabilities: ['canSearchTalent', 'canShortlistTalent', 'canRequestContact', 'canManageCastingCalls'],
  },
  {
    name: 'Casting Associate / Scout',
    category: ROLE_CATEGORIES.PRODUCTION,
    department: 'Casting',
    isActor: false,
    capabilities: ['canSearchTalent', 'canShortlistTalent', 'canRequestContact'],
  },
  {
    name: 'Line Producer / UPM',
    category: ROLE_CATEGORIES.PRODUCTION,
    department: 'Production Management',
    isActor: false,
    capabilities: ['canSearchTalent', 'canShortlistTalent', 'canRequestContact', 'canManageProduction'],
  },
  {
    name: '1st Assistant Director (1st AD)',
    category: ROLE_CATEGORIES.PRODUCTION,
    department: 'Directing',
    isActor: false,
    capabilities: ['canSearchTalent', 'canShortlistTalent', 'canRequestContact', 'canManageProduction'],
  },
  {
    name: 'Production House / Studio',
    category: ROLE_CATEGORIES.PRODUCTION,
    department: 'Studio Management',
    isActor: false,
    capabilities: ['canSearchTalent', 'canShortlistTalent', 'canRequestContact', 'canManageProduction'],
  },

  // --- REPRESENTATION ---
  {
    name: 'Talent Manager',
    category: ROLE_CATEGORIES.REPRESENTATION,
    department: 'Talent Management',
    isActor: false,
    capabilities: ['canManageRepresentedTalent', 'canReceiveCastingRequests', 'canNegotiateInquiries'],
  },
  {
    name: 'Talent Agent / Agency',
    category: ROLE_CATEGORIES.REPRESENTATION,
    department: 'Agency Representation',
    isActor: false,
    capabilities: ['canManageRepresentedTalent', 'canReceiveCastingRequests', 'canNegotiateInquiries'],
  },
  {
    name: 'Artist Representative / Publicist',
    category: ROLE_CATEGORIES.REPRESENTATION,
    department: 'Publicity & Representation',
    isActor: false,
    capabilities: ['canManageRepresentedTalent', 'canReceiveCastingRequests'],
  },
];

export const getRolesByCategory = (category) => {
  return INDUSTRY_ROLES.filter((r) => r.category === category);
};

export const getRoleDetails = (roleName) => {
  return INDUSTRY_ROLES.find((r) => r.name === roleName) || {
    name: roleName || 'Filmmaker',
    category: ROLE_CATEGORIES.TALENT,
    department: 'Crew',
    isActor: false,
    capabilities: ['canSubmitInquiry'],
  };
};

export const hasCapability = (roleName, capability) => {
  const role = getRoleDetails(roleName);
  return role.capabilities.includes(capability);
};
