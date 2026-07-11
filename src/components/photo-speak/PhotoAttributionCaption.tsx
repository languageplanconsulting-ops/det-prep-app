function formatLicense(license: string, version: string | null): string {
  const key = license.toLowerCase();
  const name = key === "cc0" ? "CC0" : key === "pdm" ? "Public Domain" : `CC-${key.toUpperCase()}`;
  return version ? `${name} ${version}` : name;
}

/** CC-BY (and similar) photos legally require an on-page credit; CC0/PDM don't but showing one anyway is harmless. */
export function PhotoAttributionCaption({
  license,
  licenseVersion,
  creator,
  provider,
  landingUrl,
}: {
  license: string | null;
  licenseVersion: string | null;
  creator: string | null;
  provider: string | null;
  landingUrl: string | null;
}) {
  if (!license) return null;
  const who = creator || provider || "";
  const text = [who, formatLicense(license, licenseVersion), provider ? `via ${provider}` : null]
    .filter(Boolean)
    .join(" · ");
  if (!text) return null;

  const body = <span>📷 {text}</span>;
  return (
    <p className="mt-1 text-[11px] text-neutral-500">
      {landingUrl ? (
        <a href={landingUrl} target="_blank" rel="noreferrer" className="hover:underline">
          {body}
        </a>
      ) : (
        body
      )}
    </p>
  );
}
