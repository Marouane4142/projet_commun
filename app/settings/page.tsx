import { redirect } from "next/navigation";
import { SettingsClient } from "@/components/SettingsClient";
import { getCurrentUser, isGerant } from "@/lib/profileService";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!isGerant(user)) {
    redirect(user ? "/" : "/login");
  }
  return <SettingsClient />;
}
