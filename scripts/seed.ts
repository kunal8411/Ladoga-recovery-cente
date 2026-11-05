import { config } from "dotenv";
config({ path: ".env.local" });
config();

async function main() {
  const { getCollections } = await import("../src/lib/mongodb");
  const { seedIntakePatients, seedSimulatedPatient, removeSyntheticData } = await import("../src/lib/seed");
  const args = process.argv.slice(2);
  const cols = await getCollections();

  if (args.includes("--reset")) {
    console.log(`Removed ${await removeSyntheticData(cols)} synthetic patients.`);
  }
  console.log(`Created ${await seedIntakePatients(cols)} synthetic intake patients.`);
  if (args.includes("--simulated")) {
    console.log(`Created ${await seedSimulatedPatient(cols)} simulated wearable patient.`);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
