import { AuthClient } from "@/components/AuthClient";

export const metadata = { title: "Inscription - FanBar Arena" };

export default function RegisterPage() {
  return (
    <div className="py-8">
      <AuthClient mode="register" />
    </div>
  );
}
