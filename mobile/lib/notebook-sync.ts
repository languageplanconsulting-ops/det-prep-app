import { API_BASE_URL } from "./config";
import { getSupabase } from "./supabase";
import { getAdminToken } from "./admin-unlock";

async function authHeaders(): Promise<HeadersInit> {
  const { data } = await getSupabase().auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Not signed in");
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  const adminToken = await getAdminToken();
  if (adminToken) {
    headers["x-ep-admin-token"] = adminToken;
  }
  return headers;
}

export type MobileNotebookEntry = {
  id: string;
  source: "mini-study-lesson";
  categoryIds: string[];
  titleEn: string;
  titleTh: string;
  bodyEn: string;
  bodyTh: string;
  userNote: string;
  createdAt: string;
};

export async function syncNotebookEntry(entry: MobileNotebookEntry): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/notebook/sync`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ entry }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "Notebook sync failed");
  }
}
