import AsyncStorage from '@react-native-async-storage/async-storage';

import { getBackendURL } from '@/constants/api';

export type GroupSummary = { id: string; name: string };

export interface GroupDetails {
  name: string;
  description: string;
  members: string[];
  expenses: Array<{
    id: string;
    amount: number;
    description: string;
    paidFor: string[];
    paidBy: string;
  }>;
}

const STORAGE_KEY = 'splitSmart.groups';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 300;

// Simple in-memory pub/sub so UI can refresh when stored IDs change
const groupListeners = new Set<() => void>();

function emitGroupsChanged() {
  for (const cb of Array.from(groupListeners)) {
    try {
      cb();
    } catch (err) {
      console.warn('groupService listener error', err);
    }
  }
}

export function onGroupsChanged(cb: () => void) {
  groupListeners.add(cb);
  return () => groupListeners.delete(cb);
}

export function triggerGroupsRefresh() {
  emitGroupsChanged();
}

function getEndpoint(path: string) {
  return `${getBackendURL()}${path}`;
}

export async function fetchGroupDetails(id: string): Promise<GroupDetails> {
  const res = await fetch(getEndpoint(`groups/${id}/info`));
  if (!res.ok) {
    const error = new Error(
      res.status === 404 ? 'GROUP_NOT_FOUND' : 'GROUP_FETCH_FAILED',
    );
    // @ts-ignore annotate status for callers that need it
    error.status = res.status;
    throw error;
  }
  return (await res.json()) as GroupDetails;
}

export async function fetchGroupSummary(
  id: string,
): Promise<GroupSummary | null> {
  try {
    const res = await fetch(getEndpoint(`groups/${id}/info`));
    if (res.ok) {
      const json = await res.json();
      return { id, name: json.name } as GroupSummary;
    }
    if (res.status === 404) return null;
    console.warn(`Unexpected status ${res.status} fetching group ${id}`);
    return null;
  } catch (err) {
    console.warn(`Failed to fetch group ${id}`, err);
    return null;
  }
}

export async function fetchGroupSummaryWithRetry(
  id: string,
  retries = MAX_RETRIES,
): Promise<GroupSummary | null | undefined> {
  let notFoundCount = 0;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(getEndpoint(`groups/${id}/info`));
      if (res.ok) {
        const json = await res.json();
        return { id, name: json.name } as GroupSummary;
      }

      if (res.status === 404) {
        notFoundCount++;
        if (notFoundCount >= retries) {
          return null;
        }
      } else {
        console.warn(
          `Error ${res.status} fetching group ${id}, attempt ${attempt + 1}`,
        );
      }
    } catch (err) {
      console.warn(
        `Network error fetching group ${id}, attempt ${attempt + 1}`,
      );
    }

    if (attempt < retries - 1) {
      await new Promise((resolve) =>
        setTimeout(resolve, RETRY_DELAY_MS * (attempt + 1)),
      );
    }
  }

  return undefined;
}

export async function loadStoredGroupIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch (err) {
    console.warn('Failed to load stored groups', err);
    return [];
  }
}

export async function saveStoredGroupIds(ids: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch (err) {
    console.warn('Failed to save stored groups', err);
  }
}

export async function appendGroupId(id: string): Promise<void> {
  const ids = await loadStoredGroupIds();
  if (ids.includes(id)) return;
  ids.unshift(id);
  await saveStoredGroupIds(ids);
  emitGroupsChanged();
}

export async function removeGroupId(id: string): Promise<void> {
  const ids = await loadStoredGroupIds();
  const filtered = ids.filter((existing) => existing !== id);
  if (filtered.length !== ids.length) {
    await saveStoredGroupIds(filtered);
    emitGroupsChanged();
  }
}

export async function loadValidatedGroups() {
  const ids = await loadStoredGroupIds();
  if (ids.length === 0) {
    return { groups: [] as GroupSummary[], retainedIds: [] as string[] };
  }

  const results = await Promise.all(
    ids.map((id) => fetchGroupSummaryWithRetry(id)),
  );

  const groups: GroupSummary[] = [];
  const retainedIds: string[] = [];

  results.forEach((result, index) => {
    const id = ids[index];
    if (result === null) {
      return; // drop confirmed 404s
    }

    retainedIds.push(id);
    if (result && typeof result === 'object') {
      groups.push(result);
    }
  });

  if (retainedIds.length !== ids.length) {
    await saveStoredGroupIds(retainedIds);
  }

  return { groups, retainedIds };
}

export async function createGroup(id: string): Promise<GroupSummary | null> {
  const res = await fetch(getEndpoint(`groups/${id}/create`), {
    method: 'POST',
  });

  if (!res.ok) {
    console.warn('Failed to create group', await res.text());
    return null;
  }

  const info = await fetchGroupSummary(id);
  return info ?? { id, name: `Group ${id.slice(0, 6)}` };
}

export async function deleteGroup(id: string): Promise<boolean> {
  try {
    const res = await fetch(getEndpoint(`groups/${id}/delete`), {
      method: 'DELETE',
    });
    if (!res.ok) {
      console.warn('Failed to delete group', await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Error deleting group', err);
    return false;
  }
}

export async function addGroupMember(
  groupId: string,
  name: string,
): Promise<boolean> {
  try {
    const res = await fetch(getEndpoint(`groups/${groupId}/add-member`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      console.warn('Failed to add member', await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Error adding member', err);
    return false;
  }
}

export async function removeGroupMember(
  groupId: string,
  name: string,
): Promise<boolean> {
  try {
    const res = await fetch(getEndpoint(`groups/${groupId}/remove-member`), {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      console.warn('Failed to remove member', await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Error removing member', err);
    return false;
  }
}

export type ApiResult = { ok: boolean; status: number; body: string };

export async function renameGroupMember(
  groupId: string,
  oldName: string,
  newName: string,
): Promise<ApiResult> {
  try {
    const url = getEndpoint(`groups/${groupId}/rename-member`);
    console.log('[API] renameGroupMember URL:', url);
    console.log('[API] renameGroupMember payload:', { oldName, newName });
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldName, newName }),
    });
    const text = await res.text();
    console.log('[API] Response:', {
      status: res.status,
      ok: res.ok,
      body: text,
    });

    return { ok: res.ok, status: res.status, body: text };
  } catch (err) {
    console.warn('[API] Exception:', err);
    return { ok: false, status: 0, body: String(err ?? 'Exception') };
  }
}
