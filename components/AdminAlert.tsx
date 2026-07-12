/** Feedback banner for admin server actions, which redirect back with ?ok= / ?error=. */
export default function AdminAlert({
  ok,
  error,
}: {
  ok?: string;
  error?: string;
}) {
  if (error) return <div className="alert alert-error">{error}</div>;
  if (ok) return <div className="alert alert-success">{ok}</div>;
  return null;
}
