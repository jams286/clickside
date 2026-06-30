import { load } from "@tauri-apps/plugin-store";

const STORE_NAME = "settings.json";
const TOKEN_KEY = "clickup_token";

let storeInstance: Awaited<ReturnType<typeof load>> | null = null;

async function getStore() {
  if (!storeInstance) {
    storeInstance = await load(STORE_NAME);
  }
  return storeInstance;
}

export async function getToken(): Promise<string | null> {
  const store = await getStore();
  return (await store.get<string>(TOKEN_KEY)) ?? null;
}

export async function setToken(token: string): Promise<void> {
  const store = await getStore();
  await store.set(TOKEN_KEY, token);
  await store.save();
}

export async function clearToken(): Promise<void> {
  const store = await getStore();
  await store.delete(TOKEN_KEY);
  await store.save();
}

const FILTERS_KEY = "status_filters";

export async function getFilters(): Promise<string[]> {
  const store = await getStore();
  return (await store.get<string[]>(FILTERS_KEY)) ?? [];
}

export async function setFilters(filters: string[]): Promise<void> {
  const store = await getStore();
  await store.set(FILTERS_KEY, filters);
  await store.save();
}

const SORT_KEY = "task_sort_order";

export async function getSortOrder(): Promise<string> {
  const store = await getStore();
  return (await store.get<string>(SORT_KEY)) ?? "updated";
}

export async function setSortOrder(order: string): Promise<void> {
  const store = await getStore();
  await store.set(SORT_KEY, order);
  await store.save();
}
