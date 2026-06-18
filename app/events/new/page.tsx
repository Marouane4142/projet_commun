import { redirect } from "next/navigation";
import { EventCreateClient } from "@/components/EventCreateClient";
import { getCurrentUser, isGerant } from "@/lib/profileService";

export const dynamic = "force-dynamic";

export default async function NewEventPage() {
  const user = await getCurrentUser();
  if (!isGerant(user)) {
    redirect(user ? "/" : "/login");
  }
  return <EventCreateClient />;
}
