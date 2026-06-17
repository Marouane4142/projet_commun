import { AuthClient } from "@/components/AuthClient";

export const metadata = { title: "Connexion - FanBar Arena" };

export default function LoginPage() {
  return (
    <div className="py-8">
      <AuthClient mode="login" />
    </div>
  );
}
