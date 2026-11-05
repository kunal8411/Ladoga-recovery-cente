import type { Collections } from "./mongodb";
import type { AlertThresholds, PatientDoc } from "./types";

export const DEFAULT_THRESHOLDS: AlertThresholds = {
  hrHigh: 120,
  hrLow: 45,
  spo2Low: 92,
  noDataMinutes: 180,
};

export const ALERT_RULES_ID = "alert_rules";

export async function getAlertRules(cols: Collections): Promise<AlertThresholds> {
  const doc = await cols.settings.findOne({ _id: ALERT_RULES_ID });
  return {
    hrHigh: doc?.hrHigh ?? DEFAULT_THRESHOLDS.hrHigh,
    hrLow: doc?.hrLow ?? DEFAULT_THRESHOLDS.hrLow,
    spo2Low: doc?.spo2Low ?? DEFAULT_THRESHOLDS.spo2Low,
    noDataMinutes: doc?.noDataMinutes ?? DEFAULT_THRESHOLDS.noDataMinutes,
  };
}

export function effectiveThresholds(patient: Pick<PatientDoc, "thresholdOverrides">, rules: AlertThresholds) {
  return { ...rules, ...stripUndefined(patient.thresholdOverrides ?? {}) };
}

function stripUndefined<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== null)) as Partial<T>;
}
