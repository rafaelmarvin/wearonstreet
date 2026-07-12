"use client";

/** Submit button that asks before running a destructive server action. */
export default function ConfirmButton({
  message,
  className = "btn btn-danger btn-sm",
  children,
}: {
  message: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      className={className}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
