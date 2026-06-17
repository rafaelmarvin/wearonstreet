import Link from "next/link";
import ProfileForm from "@/components/ProfileForm";
import { requireUser } from "@/lib/auth";

export default async function ProfilePage() {
  const { userId, email, profile } = await requireUser("/account/profile");

  return (
    <div className="page page-narrow">
      <div className="crumb">
        <Link href="/account">ACCOUNT</Link> / PROFILE
      </div>
      <h1 className="page-title">Your profile</h1>
      <p className="page-subtitle">
        We use this for delivery and order updates. Required before checkout.
      </p>
      <ProfileForm
        userId={userId!}
        email={email ?? ""}
        initial={profile}
        redirectTo="/account"
      />
    </div>
  );
}
