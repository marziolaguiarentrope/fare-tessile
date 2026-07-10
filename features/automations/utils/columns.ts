import type { CrmMapping, GoogleAdsMapping, MappingType } from './types';

const EMPTY_CRM_MAPPING: CrmMapping = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  createdDate: '',
};

const EMPTY_GOOGLE_ADS_MAPPING: GoogleAdsMapping = {
  callerPhone: '',
  callDateTime: '',
  campaign: '',
  adGroup: '',
  callStatus: '',
  callDuration: '',
};

const aliases = {
  crm: {
    firstName: ['first name', 'firstname', 'client first name', 'customer first name', 'given name'],
    lastName: ['last name', 'lastname', 'client last name', 'customer last name', 'surname', 'family name'],
    email: ['email', 'email address', 'client email', 'customer email'],
    phone: ['phone', 'phone number', 'mobile', 'contact phone', 'client phone', 'customer phone'],
    createdDate: ['customer created date', 'record date', 'created date', 'date created', 'created at'],
  },
  googleAds: {
    callerPhone: ['caller phone number', 'caller number', 'phone number', "caller's phone number", 'calling number', 'caller phone'],
    callDateTime: ['call date/time', 'call date', 'date/time', 'start time', 'call start time', 'call time'],
    campaign: ['campaign', 'campaign name'],
    adGroup: ['ad group', 'adgroup', 'ad group name'],
    callStatus: ['call status', 'status'],
    callDuration: ['call duration', 'duration', 'call length'],
  },
} as const;

function normalizeHeader(header: string) {
  return header.toLowerCase().replace(/[_-]/g, ' ').replace(/\s+/g, ' ').trim();
}

function scoreHeader(header: string, options: readonly string[]) {
  const normalized = normalizeHeader(header);
  let score = 0;

  for (const option of options) {
    const normalizedOption = normalizeHeader(option);
    if (normalized === normalizedOption) score = Math.max(score, 100);
    else if (normalized.includes(normalizedOption)) score = Math.max(score, 70);
    else if (normalizedOption.includes(normalized)) score = Math.max(score, 50);
  }

  return score;
}

export function emptyMapping(type: 'crm'): CrmMapping;
export function emptyMapping(type: 'googleAds'): GoogleAdsMapping;
export function emptyMapping(type: MappingType) {
  return type === 'crm' ? { ...EMPTY_CRM_MAPPING } : { ...EMPTY_GOOGLE_ADS_MAPPING };
}

export function autoDetectColumns(headers: string[], mappingType: 'crm'): CrmMapping;
export function autoDetectColumns(headers: string[], mappingType: 'googleAds'): GoogleAdsMapping;
export function autoDetectColumns(headers: string[], mappingType: MappingType) {
  const mapping = (mappingType === 'crm' ? emptyMapping('crm') : emptyMapping('googleAds')) as Record<string, string>;
  const typeAliases = aliases[mappingType];

  Object.entries(typeAliases).forEach(([field, options]) => {
    let bestHeader = '';
    let bestScore = 0;

    for (const header of headers) {
      const score = scoreHeader(header, options);
      if (score > bestScore) {
        bestScore = score;
        bestHeader = header;
      }
    }

    if (bestScore >= 50) mapping[field] = bestHeader;
  });

  return mapping;
}

export function selectedColumns(mapping: CrmMapping | GoogleAdsMapping) {
  return new Set(Object.values(mapping).filter(Boolean));
}
