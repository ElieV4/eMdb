/**
 * Input réutilisable pour les formulaires d'authentification.
 * Affiche un label, un champ input, et un message d'erreur.
 * Accessibilité : aria-describedby, aria-invalid, aria-required.
 */

import { cn } from "@/lib/utils";

export type AuthInputProps = {
  label: string;
  name: string;
  type?: "text" | "email" | "password";
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
};

export function AuthInput({
  label,
  name,
  type = "text",
  value,
  onChange,
  error,
  placeholder,
  autoComplete,
  required = false,
}: AuthInputProps) {
  const inputId = `auth-input-${name}`;
  const errorId = `${inputId}-error`;

  return (
    <div className="space-y-2">
      <label htmlFor={inputId} className="block text-sm font-medium">
        {label}
      </label>
      <input
        id={inputId}
        name={name}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        aria-required={required}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          "w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none transition-colors",
          error
            ? "border-destructive focus:border-destructive"
            : "border-input focus:border-primary",
        )}
      />
      {error && (
        <p id={errorId} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
