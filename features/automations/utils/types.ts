export type CsvRow = Record<string, string>;

export type ParsedCsv = {
  headers: string[];
  rows: CsvRow[];
  fileName: string;
};

export type CrmMapping = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  createdDate: string;
};

export type GoogleAdsMapping = {
  callerPhone: string;
  callDateTime: string;
  campaign: string;
  adGroup: string;
  callStatus: string;
  callDuration: string;
};

export type MappingType = 'crm' | 'googleAds';

export type PhoneParts = {
  raw: string;
  normalized: string;
  last10: string;
  last7: string;
  last4: string;
};

export type MatchStatus = 'matched' | 'ambiguous' | 'no_match';

export type MatchConfidence = 'exact' | 'strong' | 'last4_unique' | null;

export type CrmRecord = {
  row: CsvRow;
  rowIndex: number;
  phoneParts: PhoneParts;
};

export type MatchResult = {
  googleAdsRow: CsvRow;
  googleAdsRowIndex: number;
  googleAdsPhoneParts: PhoneParts;
  status: MatchStatus;
  confidence: MatchConfidence;
  matchedCrmRecord: CrmRecord | null;
  candidates: CrmRecord[];
};

