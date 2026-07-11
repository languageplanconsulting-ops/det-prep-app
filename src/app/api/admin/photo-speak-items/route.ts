import { NextResponse } from "next/server";
import { getAdminAccess } from "@/lib/admin-auth";
import { createServiceRoleSupabase } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

interface PhotoSpeakItemInput {
  id: string;
  titleEn: string;
  titleTh?: string;
  imageUrl: string;
  promptEn: string;
  promptTh?: string;
  keywords?: string[];
  contextEn?: string;
  license?: string;
  licenseVersion?: string;
  licenseUrl?: string;
  creator?: string;
  attribution?: string;
  landingUrl?: string;
  provider?: string;
  sortOrder?: number;
}

function normalizeItem(input: unknown, index: number): PhotoSpeakItemInput {
  if (!input || typeof input !== "object") {
    throw new Error(`Invalid entry at index ${index}.`);
  }
  const o = input as Record<string, unknown>;
  if (!o.id || !o.imageUrl) {
    throw new Error(`Item at index ${index} needs id and imageUrl.`);
  }
  // context (scene hint) can stand in for titleEn/promptEn, matching the old admin paste UX
  // where authors often only wrote a context line and let the rest default.
  const context = o.contextEn != null ? String(o.contextEn).trim() : o.context != null ? String(o.context).trim() : "";
  const promptEnRaw = o.promptEn != null ? String(o.promptEn).trim() : "";
  const promptEn =
    promptEnRaw || context || "Describe what you see in the photo. Say what might be happening and how the place feels.";
  const titleEnRaw = o.titleEn != null ? String(o.titleEn).trim() : "";
  const titleEn = titleEnRaw || (context ? (context.length > 60 ? `${context.slice(0, 57)}…` : context) : `Photo ${index + 1}`);
  const keywords = Array.isArray(o.keywords)
    ? o.keywords.map((k) => String(k).trim()).filter(Boolean)
    : [];
  return {
    id: String(o.id),
    titleEn,
    titleTh: o.titleTh != null ? String(o.titleTh) : undefined,
    imageUrl: String(o.imageUrl),
    promptEn,
    promptTh: o.promptTh != null ? String(o.promptTh) : undefined,
    keywords,
    contextEn: context || undefined,
    license: o.license != null ? String(o.license) : undefined,
    licenseVersion: o.licenseVersion != null ? String(o.licenseVersion) : undefined,
    licenseUrl: o.licenseUrl != null ? String(o.licenseUrl) : undefined,
    creator: o.creator != null ? String(o.creator) : undefined,
    attribution: o.attribution != null ? String(o.attribution) : undefined,
    landingUrl: o.landingUrl != null ? String(o.landingUrl) : undefined,
    provider: o.provider != null ? String(o.provider) : undefined,
    sortOrder: typeof o.sortOrder === "number" ? o.sortOrder : undefined,
  };
}

export async function GET(req: Request) {
  const access = await getAdminAccess(req);
  if (!access.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const svc = createServiceRoleSupabase();
  const { data, error } = await svc.from("photo_speak_items").select("id").eq("is_active", true);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ count: data?.length ?? 0 });
}

export async function POST(req: Request) {
  const access = await getAdminAccess(req);
  if (!access.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const items = (body as { items?: unknown } | null)?.items;
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "items must be a non-empty array" }, { status: 400 });
  }

  let normalized: PhotoSpeakItemInput[];
  try {
    normalized = items.map((it, i) => normalizeItem(it, i));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Invalid item" }, { status: 400 });
  }

  const svc = createServiceRoleSupabase();

  // Items without an explicit sortOrder append after whatever already exists, rather than
  // colliding at 0..N and reshuffling existing rounds on every paste.
  let nextSortOrder = 0;
  if (normalized.some((it) => it.sortOrder === undefined)) {
    const { data: maxRow } = await svc
      .from("photo_speak_items")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    nextSortOrder = (maxRow?.sort_order ?? -1) + 1;
  }

  const rows = normalized.map((it) => ({
    id: it.id,
    title_en: it.titleEn,
    title_th: it.titleTh ?? "",
    image_url: it.imageUrl,
    prompt_en: it.promptEn,
    prompt_th: it.promptTh ?? "",
    keywords: it.keywords ?? [],
    context_en: it.contextEn ?? null,
    license: it.license ?? null,
    license_version: it.licenseVersion ?? null,
    license_url: it.licenseUrl ?? null,
    creator: it.creator ?? null,
    attribution: it.attribution ?? null,
    landing_url: it.landingUrl ?? null,
    provider: it.provider ?? null,
    is_active: true,
    sort_order: it.sortOrder ?? nextSortOrder++,
    created_by: access.adminUserId,
    updated_at: new Date().toISOString(),
  }));

  const { error, count } = await svc
    .from("photo_speak_items")
    .upsert(rows, { onConflict: "id", count: "exact" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, count: count ?? rows.length });
}

export async function DELETE(req: Request) {
  const access = await getAdminAccess(req);
  if (!access.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const ids = (body as { ids?: unknown } | null)?.ids;
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "ids must be a non-empty array" }, { status: 400 });
  }

  const svc = createServiceRoleSupabase();
  const { error } = await svc
    .from("photo_speak_items")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .in("id", ids.map(String));

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
