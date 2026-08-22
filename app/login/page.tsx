import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign in",
  description:
    "Enter a phone number and a name to start chatting. No password, no signup step.",
};

export default function LoginPage() {
  return (
    <main className="flex flex-1 flex-col">
      <LoginForm />
    </main>
  );
}
