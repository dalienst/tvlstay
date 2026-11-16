"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  className = "btn-primary",
  confirm: confirmText,
  name,
  value,
}: {
  children: React.ReactNode;
  className?: string;
  /** Ask before submitting, e.g. for deletes. */
  confirm?: string;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending}
      className={className}
      onClick={(e) => {
        if (confirmText && !window.confirm(confirmText)) e.preventDefault();
      }}
    >
      {pending ? "Saving…" : children}
    </button>
  );
}
