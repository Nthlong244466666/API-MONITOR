
import { useState } from "react";
import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router";

import {
  ArrowRight,
  Mail,
  LockKeyhole,
} from "lucide-react";

import { useAuth } from "../contexts/AuthContext";
import AuthShell from "../components/auth/AuthShell";
import AuthField from "../components/auth/AuthField";

export default function Login() {
  const { status, login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: location.state?.email ?? "",
    password: "",
  });

  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const destination = location.state?.from || "/";

  if (status === "loading") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-surface text-muted">
        Restoring your session...
      </div>
    );
  }

  if (status === "authenticated") {
    return <Navigate to={destination} replace />;
  }

  function updateField(event) {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    setError("");
    setFieldErrors((prev) => ({
      ...prev,
      [name]: undefined,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (loading) return;

    setLoading(true);
    setError("");
    setFieldErrors({});

    try {
      await login(form);
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err.message ?? "Login failed.");
      setFieldErrors(err.details?.fieldErrors ?? {});
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to your API Monitor workspace"
    >
      {location.state?.registered && (
        <div
          role="status"
          className="mb-5 rounded-lg border border-up/30 bg-up/10 px-4 py-3 text-sm text-up"
        >
          Account created successfully. Please sign in.
        </div>
      )}

      <form
        noValidate
        onSubmit={handleSubmit}
        className="space-y-5"
      >
        {error && (
          <div
            role="alert"
            className="rounded-lg border border-down/30 bg-down/10 px-4 py-3 text-sm text-down"
          >
            {error}
          </div>
        )}

        <AuthField
          id="login-email"
          label="Email address"
          icon={Mail}
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={255}
          value={form.email}
          onChange={updateField}
          placeholder="you@example.com"
          error={fieldErrors.email?.[0]}
        />

        <AuthField
          id="login-password"
          label="Password"
          icon={LockKeyhole}
          name="password"
          type="password"
          autoComplete="current-password"
          required
          maxLength={128}
          value={form.password}
          onChange={updateField}
          placeholder="Enter your password"
          error={fieldErrors.password?.[0]}
        />

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:opacity-60"
        >
          {loading ? "Signing in..." : "Sign in"}
          {!loading && (
            <ArrowRight aria-hidden="true" size={17} />
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Don't have an account?{" "}
        <Link
          to="/register"
          className="font-medium text-brand hover:underline"
        >
          Create account
        </Link>
      </p>
    </AuthShell>
  );
}
