import type { CrmMapping, CrmRecord, CsvRow, GoogleAdsMapping, MatchResult } from './types';
import { getPhoneParts } from './phone';

function addToIndex(index: Map<string, CrmRecord[]>, key: string, record: CrmRecord) {
  if (!key) return;
  const existing = index.get(key) ?? [];
  existing.push(record);
  index.set(key, existing);
}

function relevantValue(row: CsvRow, key: string) {
  return key ? row[key] ?? '' : '';
}

export function buildCrmRecords(crmRows: CsvRow[], crmMapping: CrmMapping): CrmRecord[] {
  return crmRows.map((row, rowIndex) => ({
    row,
    rowIndex,
    phoneParts: getPhoneParts(relevantValue(row, crmMapping.phone)),
  }));
}

export function matchGoogleAdsCallsToCrmCustomers(
  googleAdsRows: CsvRow[],
  crmRows: CsvRow[],
  mappings: { crm: CrmMapping; googleAds: GoogleAdsMapping },
): MatchResult[] {
  if (!mappings.crm.phone || !mappings.googleAds.callerPhone) {
    throw new Error('Select both phone number columns before running the comparison.');
  }

  const crmRecords = buildCrmRecords(crmRows, mappings.crm);
  const byLast10 = new Map<string, CrmRecord[]>();
  const byLast7 = new Map<string, CrmRecord[]>();
  const byLast4 = new Map<string, CrmRecord[]>();

  for (const record of crmRecords) {
    if (record.phoneParts.last10.length === 10) addToIndex(byLast10, record.phoneParts.last10, record);
    if (record.phoneParts.last7.length === 7) addToIndex(byLast7, record.phoneParts.last7, record);
    if (record.phoneParts.last4.length === 4) addToIndex(byLast4, record.phoneParts.last4, record);
  }

  return googleAdsRows.map((googleAdsRow, googleAdsRowIndex) => {
    const googleAdsPhoneParts = getPhoneParts(relevantValue(googleAdsRow, mappings.googleAds.callerPhone));

    const exactCandidates = googleAdsPhoneParts.last10.length === 10
      ? byLast10.get(googleAdsPhoneParts.last10) ?? []
      : [];
    if (exactCandidates.length > 0) {
      return {
        googleAdsRow,
        googleAdsRowIndex,
        googleAdsPhoneParts,
        status: 'matched',
        confidence: 'exact',
        matchedCrmRecord: exactCandidates[0],
        candidates: exactCandidates,
      };
    }

    const strongCandidates = googleAdsPhoneParts.last7.length === 7
      ? byLast7.get(googleAdsPhoneParts.last7) ?? []
      : [];
    if (strongCandidates.length > 0) {
      return {
        googleAdsRow,
        googleAdsRowIndex,
        googleAdsPhoneParts,
        status: 'matched',
        confidence: 'strong',
        matchedCrmRecord: strongCandidates[0],
        candidates: strongCandidates,
      };
    }

    const last4Candidates = googleAdsPhoneParts.last4.length === 4
      ? byLast4.get(googleAdsPhoneParts.last4) ?? []
      : [];
    if (last4Candidates.length === 1) {
      return {
        googleAdsRow,
        googleAdsRowIndex,
        googleAdsPhoneParts,
        status: 'matched',
        confidence: 'last4_unique',
        matchedCrmRecord: last4Candidates[0],
        candidates: last4Candidates,
      };
    }

    if (last4Candidates.length > 1) {
      return {
        googleAdsRow,
        googleAdsRowIndex,
        googleAdsPhoneParts,
        status: 'ambiguous',
        confidence: null,
        matchedCrmRecord: null,
        candidates: last4Candidates,
      };
    }

    return {
      googleAdsRow,
      googleAdsRowIndex,
      googleAdsPhoneParts,
      status: 'no_match',
      confidence: null,
      matchedCrmRecord: null,
      candidates: [],
    };
  });
}

