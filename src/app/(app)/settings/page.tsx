import { AlertRulesForm, DemoDataForm } from "@/components/settings-forms";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { requireStaff } from "@/lib/auth";
import { getCollections } from "@/lib/mongodb";
import { getAlertRules } from "@/lib/settings";

export default async function SettingsPage() {
  const staff = await requireStaff();
  const rules = await getAlertRules(await getCollections());
  const isAdmin = staff.role === "admin";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Alert rules" subtitle="Clinic-wide defaults. Individual patients can override these from their profile." />
      <Card>
        <CardHeader title="Biometric & connectivity thresholds" subtitle="Geofence alerts are configured per patient on the patient's Location map." />
        <AlertRulesForm rules={rules} canEdit={isAdmin} />
      </Card>
      {isAdmin && (
        <Card>
          <CardHeader title="Demo data" subtitle="For prototype demonstrations only" />
          <DemoDataForm />
        </Card>
      )}
    </div>
  );
}
