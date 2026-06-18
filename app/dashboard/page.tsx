import { DashboardClient } from "@/components/DashboardClient";
import { getCurrentUser, isGerant } from "@/lib/profileService";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const gerant = isGerant(user);
  return <DashboardClient gerant={gerant} />;
}
