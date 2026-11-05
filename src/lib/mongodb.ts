import { MongoClient, type Db } from "mongodb";
import type {
  AlertDoc,
  AuditDoc,
  GeofenceDoc,
  LocationDoc,
  PatientDoc,
  ReadingDoc,
  SettingsDoc,
} from "./types";

declare global {
  var _rsMongoClient: Promise<MongoClient> | undefined;
  var _rsIndexesReady: Promise<void> | undefined;
}

export class DatabaseNotConfiguredError extends Error {
  constructor() {
    super("MONGODB_URI is not set. Add it to .env.local (or Netlify environment variables).");
    this.name = "DatabaseNotConfiguredError";
  }
}

export function isDatabaseConfigured() {
  return Boolean(process.env.MONGODB_URI);
}

function getClient(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new DatabaseNotConfiguredError();
  if (!global._rsMongoClient) {
    global._rsMongoClient = new MongoClient(uri, { appName: "recovery-shield" })
      .connect()
      .catch((err) => {
        global._rsMongoClient = undefined;
        throw err;
      });
  }
  return global._rsMongoClient;
}

async function ensureIndexes(db: Db) {
  await Promise.all([
    db.collection("patients").createIndex({ mrn: 1 }, { unique: true }),
    db.collection("patients").createIndex({ "wearable.keyHash": 1 }, { sparse: true }),
    db.collection("readings").createIndex({ patientId: 1, type: 1, recordedAt: -1 }),
    db.collection("locations").createIndex({ patientId: 1, recordedAt: -1 }),
    db.collection("geofences").createIndex({ patientId: 1 }),
    db.collection("alerts").createIndex({ status: 1, createdAt: -1 }),
    db.collection("alerts").createIndex({ patientId: 1, type: 1, status: 1 }),
    db.collection("audit_logs").createIndex({ at: -1 }),
  ]);
}

export async function getDb(): Promise<Db> {
  const client = await getClient();
  const db = client.db(process.env.MONGODB_DB || "recovery_shield");
  if (!global._rsIndexesReady) {
    global._rsIndexesReady = ensureIndexes(db).catch((err) => {
      global._rsIndexesReady = undefined;
      throw err;
    });
  }
  await global._rsIndexesReady;
  return db;
}

export async function getCollections() {
  const db = await getDb();
  return {
    patients: db.collection<PatientDoc>("patients"),
    readings: db.collection<ReadingDoc>("readings"),
    locations: db.collection<LocationDoc>("locations"),
    geofences: db.collection<GeofenceDoc>("geofences"),
    alerts: db.collection<AlertDoc>("alerts"),
    settings: db.collection<SettingsDoc>("settings"),
    auditLogs: db.collection<AuditDoc>("audit_logs"),
  };
}

export type Collections = Awaited<ReturnType<typeof getCollections>>;
