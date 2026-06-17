"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PROVINCES, provinceName } from "@/lib/regions";
import type { Profile } from "@/lib/types";

interface Props {
  userId: string;
  email: string;
  initial: Profile | null;
  redirectTo?: string;
}

export default function ProfileForm({ userId, email, initial, redirectTo }: Props) {
  const router = useRouter();
  const [fullName, setFullName] = useState(initial?.full_name ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [provinceCode, setProvinceCode] = useState(initial?.province_code ?? "");
  const [cityName, setCityName] = useState(initial?.city_name ?? "");
  const [addressLine, setAddressLine] = useState(initial?.address_line ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    if (!provinceCode) {
      setError("Please select your province.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.from("profiles").upsert({
      id: userId,
      full_name: fullName.trim(),
      phone: phone.trim(),
      province_code: provinceCode,
      province_name: provinceName(provinceCode),
      city_name: cityName.trim(),
      address_line: addressLine.trim(),
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSaved(true);
    router.refresh();
    if (redirectTo) router.push(redirectTo);
  }

  return (
    <form onSubmit={onSubmit} className="form-card form-wide">
      {error && <div className="alert alert-error">{error}</div>}
      {saved && <div className="alert alert-success">Profile saved.</div>}

      <div className="field">
        <label>Email</label>
        <input type="email" value={email} disabled />
        <span className="field-hint">Email is managed via your login.</span>
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="full_name">Full name</label>
          <input
            id="full_name"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="phone">Phone (WhatsApp)</label>
          <input
            id="phone"
            required
            placeholder="08xxxxxxxxxx"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="province">Province</label>
          <select
            id="province"
            required
            value={provinceCode}
            onChange={(e) => setProvinceCode(e.target.value)}
          >
            <option value="">Select province…</option>
            {PROVINCES.map((p) => (
              <option key={p.code} value={p.code}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="city">City / Regency</label>
          <input
            id="city"
            required
            placeholder="e.g. Kota Bandung"
            value={cityName}
            onChange={(e) => setCityName(e.target.value)}
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor="address">Full address</label>
        <textarea
          id="address"
          required
          placeholder="Street, house number, RT/RW, district, postal code"
          value={addressLine}
          onChange={(e) => setAddressLine(e.target.value)}
        />
      </div>

      <button className="btn btn-primary" disabled={loading}>
        {loading ? "Saving…" : "SAVE PROFILE"}
      </button>
    </form>
  );
}
