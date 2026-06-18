import { redirect } from "next/navigation";
import { RegieClient } from "@/components/RegieClient";
import { getEcosystemSnapshot } from "@/lib/ecosystemService";
import { getCurrentUser, isGerant } from "@/lib/profileService";

export const metadata = { title: "Regie live - FanBar Arena" };
export const dynamic = "force-dynamic";

export default async function RegiePage() {
  const user = await getCurrentUser();
  if (!user || !isGerant(user)) redirect("/");

  const initial = await getEcosystemSnapshot();
  return <RegieClient initial={initial} />;
}
