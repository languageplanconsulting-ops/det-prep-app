function normalizeBase(url: string): string {
  return url.replace(/\/$/, "");
}

function looksLocalhost(value: string): boolean {
  return /localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(value);
}

export function resolveSiteUrl(req: Request): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured && !looksLocalhost(configured)) {
    return normalizeBase(configured);
  }

  const forwardedProto = req.headers.get("x-forwarded-proto");
  const forwardedHost = req.headers.get("x-forwarded-host");
  if (forwardedProto && forwardedHost) {
    return normalizeBase(`${forwardedProto}://${forwardedHost}`);
  }

  const host = req.headers.get("host");
  if (host) {
    const protocol = looksLocalhost(host) ? "http" : "https";
    return normalizeBase(`${protocol}://${host}`);
  }

  return normalizeBase(configured || "http://localhost:3000");
}
