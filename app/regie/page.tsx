import { RegieClient } from "@/components/RegieClient";
import { getEcosystemSnapshot } from "@/lib/ecosystemService";

export const metadata = { title: "Regie live - FanBar Arena" };
export const dynamic = "force-dynamic";

export default async function RegiePage() {
  const initial = await getEcosystemSnapshot();
  return <RegieClient initial={initial} />;
}
