import type { ObjectId } from "mongodb";

export type WearableStatus = "not_paired" | "pending" | "active" | "revoked";

export type ReadingType =
  | "heart_rate"
  | "resting_heart_rate"
  | "hrv"
  | "spo2"
  | "steps"
  | "active_energy"
  | "sleep_hours"
  | "respiratory_rate";

export type AlertType = "hr_high" | "hr_low" | "spo2_low" | "geofence_exit" | "geofence_enter" | "no_data";
export type AlertStatus = "active" | "acknowledged" | "resolved";
export type AlertSeverity = "critical" | "warning" | "info";
export type GeofenceKind = "safe" | "restricted";
export type DataSource = "apple_shortcuts" | "simulated" | "api";

export interface AlertThresholds {
  hrHigh: number;
  hrLow: number;
  spo2Low: number;
  noDataMinutes: number;
}

export interface LatestValue {
  value: number;
  at: Date;
}

export interface PatientDoc {
  _id: ObjectId;
  mrn: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  gender?: string;
  admissionDate: Date;
  programLengthDays: number;
  program: string;
  primaryConcern?: string;
  assignedClinician?: string;
  phone?: string;
  emergencyContact?: { name: string; phone: string; relation?: string };
  consentGiven: boolean;
  consentDate?: Date;
  notes?: string;
  isSynthetic: boolean;
  wearable: {
    status: WearableStatus;
    deviceLabel?: string;
    keyHash?: string;
    keyHint?: string;
    activatedAt?: Date;
    lastSyncAt?: Date;
    source?: DataSource;
  };
  latest?: Partial<Record<ReadingType, LatestValue>>;
  lastLocation?: { lat: number; lng: number; accuracy?: number; at: Date };
  geofenceState?: Record<string, boolean>;
  thresholdOverrides?: Partial<AlertThresholds>;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

export interface ReadingDoc {
  _id?: ObjectId;
  patientId: ObjectId;
  type: ReadingType;
  value: number;
  unit: string;
  recordedAt: Date;
  receivedAt: Date;
  source: DataSource;
}

export interface LocationDoc {
  _id?: ObjectId;
  patientId: ObjectId;
  lat: number;
  lng: number;
  accuracy?: number;
  recordedAt: Date;
  receivedAt: Date;
  source: DataSource;
}

export interface GeofenceDoc {
  _id: ObjectId;
  patientId: ObjectId;
  name: string;
  kind: GeofenceKind;
  lat: number;
  lng: number;
  radiusMeters: number;
  active: boolean;
  createdAt: Date;
  createdBy?: string;
}

export interface AlertDoc {
  _id: ObjectId;
  patientId: ObjectId;
  patientName: string;
  mrn: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  value?: number;
  unit?: string;
  location?: { lat: number; lng: number };
  geofenceId?: ObjectId;
  status: AlertStatus;
  createdAt: Date;
  lastTriggeredAt: Date;
  triggerCount: number;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  resolvedAt?: Date;
  resolvedBy?: string;
  note?: string;
}

export interface SettingsDoc extends AlertThresholds {
  _id: string;
  updatedAt?: Date;
  updatedBy?: string;
}

export interface AuditDoc {
  _id?: ObjectId;
  actorId: string;
  actorName: string;
  action: string;
  targetType: string;
  targetId?: string;
  details?: string;
  at: Date;
}
