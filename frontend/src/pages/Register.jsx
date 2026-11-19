
import { useState } from "react";
import {
  Link,
  Navigate,
  useNavigate,
} from "react-router";

import {
  ArrowRight,
  Mail,
  LockKeyhole,
  UserRound,
} from "lucide-react";

import { useAuth } from "../contexts/AuthContext";
import { authService } from "../services/authService";

import AuthShell from "../components/auth/AuthShell";
import AuthField from "../components/auth/AuthField";

export default function Register() {
  const navigate = useNavigate();
  const { status } = useAuth();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  if (status === "loading") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-surface text-muted">
        Restoring your session...
      </div>
    );
  }

  if (status === "authenticated") {
    return <Navigate to="/" replace />;
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

    setError("");
    setFieldErrors({});

    if (form.password !== form.confirmPassword) {
      setFieldErrors({
        confirmPassword: ["Passwords do not match."],
      });
      return;
    }

    setLoading(true);

    try {
      await authService.register({
        name: form.name,
        email: form.email,
        password: form.password,
      });

      navigate("/login", {
        replace: true,
        state: {
          registered: true,
          email: form.email,
        },
      });
    } catch (err) {
      setError(err.message ?? "Registration failed.");
      setFieldErrors(err.details?.fieldErrors ?? {});
    } finally {
      setLoading(false);
    }
  }

  const fields = [
    {
      name: "name",
      label: "Full name",
      icon: UserRound,
      type: "text",
      autoComplete: "name",
      placeholder: "Your name",
      maxLength: 100,
    },
    {
      name: "email",
      label: "Email address",
      icon: Mail,
      type: "email",
      autoComplete: "email",
      placeholder: "you@example.com",
      maxLength: 255,
    },
    {
      name: "password",
      label: "Password",
      icon: LockKeyhole,
      type: "password",
      autoComplete: "new-password",
      placeholder: "At least 8 characters",
      maxLength: 128,
    },
    {
      name: "confirmPassword",
      label: "Confirm password",
      icon: LockKeyhole,
      type: "password",
      autoComplete: "new-password",
      placeholder: "Re-enter your password",
      maxLength: 128,
    },
  ];

  return (
    <AuthShell
      title="Create your account"
      subtitle="Start monitoring your APIs"
    >
      <form
        noValidate
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        {error && (
          <div
            role="alert"
            className="rounded-lg border border-down/30 bg-down/10 px-4 py-3 text-sm text-down"
          >
            {error}
          </div>
        )}

        {fields.map((field) => (
          <AuthField
            key={field.name}
            id={`register-${field.name}`}
            {...field}
            name={field.name}
            required
            value={form[field.name]}
            onChange={updateField}
            error={fieldErrors[field.name]?.[0]}
          />
        ))}

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:opacity-60"
        >
          {loading ? "Creating account..." : "Create account"}
          {!loading && (
            <ArrowRight aria-hidden="true" size={17} />
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link
          to="/login"
          className="font-medium text-brand hover:underline"
        >
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
