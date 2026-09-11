import { useState } from "react";
import { LogIn, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loginUser, registerUser, type AuthUser } from "@/lib/loan-applications";

export function AuthPanel({ onAuthenticated }: { onAuthenticated: (user: AuthUser) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const register = mode === "register";

  const switchMode = (next: "login" | "register") => {
    setMode(next);
    setError("");
    setPassword("");
  };

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      onAuthenticated(
        register ? await registerUser(fullName, email, password) : await loginUser(email, password),
      );
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-4 rounded-md border border-primary/20 bg-card/80 p-5 shadow-sm backdrop-blur-sm">
      <div className="grid grid-cols-2 gap-2 rounded-full bg-secondary p-1">
        {(["login", "register"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => switchMode(value)}
            aria-pressed={mode === value}
            className={`h-10 rounded-full text-sm font-semibold transition-colors ${
              mode === value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {value === "login" ? "Login" : "Register"}
          </button>
        ))}
      </div>

      {register ? (
        <UserPlus className="mx-auto mt-6 h-12 w-12 text-primary" strokeWidth={1.5} />
      ) : (
        <LogIn className="mx-auto mt-6 h-12 w-12 text-primary" strokeWidth={1.5} />
      )}
      <h2 className="mt-4 text-center text-xl font-bold">
        {register ? "Create your account" : "Welcome back"}
      </h2>
      <p className="mt-2 text-center text-sm text-muted-foreground">
        {register
          ? "Register to start your loan application and track its status."
          : "Sign in to continue your loan application."}
      </p>

      <form onSubmit={(event) => void submit(event)} className="mt-6 space-y-4">
        <fieldset disabled={busy} className="space-y-4">
          {register && (
            <div>
              <label htmlFor="auth-name" className="text-sm font-medium">
                Full Name *
              </label>
              <Input
                id="auth-name"
                required
                minLength={2}
                maxLength={100}
                autoComplete="name"
                placeholder="Your full name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className="mt-1 h-12"
              />
            </div>
          )}
          <div>
            <label htmlFor="auth-email" className="text-sm font-medium">
              Email *
            </label>
            <Input
              id="auth-email"
              type="email"
              required
              maxLength={254}
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 h-12"
            />
          </div>
          <div>
            <label htmlFor="auth-password" className="text-sm font-medium">
              Password *
            </label>
            <Input
              id="auth-password"
              type="password"
              required
              minLength={register ? 8 : 1}
              maxLength={200}
              autoComplete={register ? "new-password" : "current-password"}
              placeholder={register ? "At least 8 characters" : "Your password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 h-12"
            />
            {register && (
              <p className="mt-1 text-xs text-muted-foreground">
                Use at least 8 characters. Never reuse your net-banking password.
              </p>
            )}
          </div>
        </fieldset>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <Button type="submit" disabled={busy} className="h-12 w-full rounded-full">
          {busy
            ? register
              ? "Creating account…"
              : "Signing in…"
            : register
              ? "Create account"
              : "Login"}
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        {register ? "Already have an account?" : "New here?"}{" "}
        <button
          type="button"
          onClick={() => switchMode(register ? "login" : "register")}
          className="font-semibold text-primary hover:underline"
        >
          {register ? "Login" : "Create one"}
        </button>
      </p>
    </section>
  );
}
