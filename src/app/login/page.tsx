import { LoginForm } from "./LoginForm";

export const metadata = { title: "Sign In — Toolroom" };

export default function LoginPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: "#0d0f10" }}
    >
      <div
        className="w-full max-w-sm rounded-xl p-8"
        style={{ backgroundColor: "#141618", border: "1px solid #2a2d30" }}
      >
        {/* Logo / title */}
        <div className="mb-8 text-center">
          <p
            className="text-xl font-bold tracking-tight mb-1"
            style={{ color: "#e8a020", fontFamily: "var(--font-jetbrains-mono)" }}
          >
            TOOLROOM
          </p>
          <p className="text-xs" style={{ color: "#4e5560" }}>
            Enviropax Toolroom MES
          </p>
        </div>

        <LoginForm />
      </div>
    </div>
  );
}
