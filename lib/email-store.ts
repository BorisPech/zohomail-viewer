"use client";

import useSWR, { mutate } from "swr";
import type { Email, Folder, EmailsResponse, CountsResponse, MessageResponse } from "./types";

const API_BASE = "/api/emails";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
};

export function useEmails(folder?: string) {
  const url = folder
    ? `${API_BASE}?folder=${encodeURIComponent(folder)}&limit=200`
    : `${API_BASE}?limit=200`;

  return useSWR<EmailsResponse>(url, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 5000,
  });
}

export function useCounts(activeFolderId: string) {
  const url = activeFolderId
    ? `${API_BASE}?counts=1&activeId=${encodeURIComponent(activeFolderId)}`
    : `${API_BASE}?counts=1`;

  return useSWR<CountsResponse>(url, fetcher, {
    refreshInterval: 15000,
    revalidateOnFocus: true,
    dedupingInterval: 10000,
  });
}

export function useMessage(msgId: string | null) {
  const url = msgId ? `${API_BASE}?msgId=${encodeURIComponent(msgId)}` : null;

  return useSWR<MessageResponse>(url, fetcher, {
    revalidateOnFocus: false,
  });
}

export async function markAsRead(msgId: string, folderId: string): Promise<void> {
  await fetch(`/api/markread?msgId=${encodeURIComponent(msgId)}&folderId=${encodeURIComponent(folderId)}`, {
    method: "POST",
  });
}

export function refreshEmails(folder?: string) {
  const url = folder
    ? `${API_BASE}?folder=${encodeURIComponent(folder)}&limit=200`
    : `${API_BASE}?limit=200`;
  return mutate(url);
}
