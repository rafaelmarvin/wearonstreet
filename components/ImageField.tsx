"use client";

import { useRef, useState } from "react";
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_MB } from "@/lib/image-constraints";
import { compressImage, formatBytes, isTooBig } from "@/lib/compress-image";

type Status =
  | { kind: "empty" }
  | { kind: "working" }
  | {
      kind: "ready";
      preview: string;
      name: string;
      bytes: number;
      savedFrom: number | null;
      tooBig: boolean;
    };

/** File picker that shrinks the chosen image in the browser before it is uploaded,
 *  and shows a thumbnail so the admin can see what they picked. The compressed
 *  file is written back into the input, so the server action receives that one. */
export default function ImageField({
  name,
  label,
  hint,
  required = false,
}: {
  name: string;
  label: string;
  hint?: string;
  required?: boolean;
}) {
  const previewRef = useRef<string | null>(null);
  const [status, setStatus] = useState<Status>({ kind: "empty" });

  function setPreview(blob: Blob): string {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = URL.createObjectURL(blob);
    return previewRef.current;
  }

  async function onPick(input: HTMLInputElement) {
    const picked = input.files?.[0];
    if (!picked) {
      setStatus({ kind: "empty" });
      input.setCustomValidity("");
      return;
    }

    // Stop the form from submitting the original while we're still compressing.
    input.setCustomValidity("Still optimising this image — one moment.");
    setStatus({ kind: "working" });

    const result = await compressImage(picked);
    let { file, compressed } = result;
    const { originalBytes } = result;

    // Hand the compressed file back to the input so it's what actually gets posted.
    // If the browser won't let us swap it, fall back to uploading the original.
    if (compressed) {
      try {
        const transfer = new DataTransfer();
        transfer.items.add(file);
        input.files = transfer.files;
      } catch {
        file = picked;
        compressed = false;
      }
    }

    const tooBig = isTooBig(file);
    input.setCustomValidity(
      tooBig ? `This image is over ${MAX_IMAGE_MB} MB. Please pick a smaller one.` : "",
    );

    setStatus({
      kind: "ready",
      preview: setPreview(file),
      name: file.name,
      bytes: file.size,
      savedFrom: compressed ? originalBytes : null,
      tooBig,
    });
  }

  return (
    <div className="field">
      <label htmlFor={name}>
        {label}
        {!required && <span className="muted"> (optional)</span>}
      </label>

      <input
        id={name}
        name={name}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(",")}
        required={required}
        onChange={(e) => void onPick(e.currentTarget)}
      />

      {hint && <span className="field-hint">{hint}</span>}

      {status.kind === "working" && (
        <span className="field-hint">Optimising image…</span>
      )}

      {status.kind === "ready" && (
        <>
          <div className="image-preview">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={status.preview} alt="Selected image preview" />
            <span className="muted">{status.name}</span>
          </div>

          {status.tooBig ? (
            <span className="field-hint" style={{ color: "var(--danger)" }}>
              Still {formatBytes(status.bytes)} after optimising — the limit is{" "}
              {MAX_IMAGE_MB} MB. Please pick a smaller image.
            </span>
          ) : (
            <span className="field-hint">
              {status.savedFrom
                ? `Optimised: ${formatBytes(status.savedFrom)} → ${formatBytes(status.bytes)}`
                : formatBytes(status.bytes)}
            </span>
          )}
        </>
      )}
    </div>
  );
}
