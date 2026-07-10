import { load } from "@tauri-apps/plugin-store";

const STORE_NAME = "settings.json";
const TOKEN_KEY = "clickup_token";
const ACCOUNTS_KEY = "accounts";
const ACTIVE_ACCOUNT_KEY = "active_account_id";
const LAST_SEEN_KEY = "notifications_last_seen";

export interface StoredAccount {
  id: string;
  token: string;
  userName: string;
  email: string;
  color: string;
  initials: string;
}

let storeInstance: Awaited<ReturnType<typeof load>> | null = null;

async function getStore() {
  if (!storeInstance) {
    storeInstance = await load(STORE_NAME);
  }
  return storeInstance;
}

// --- Migration: old single-token to accounts array ---
async function migrateIfNeeded(store: Awaited<ReturnType<typeof load>>) {
  const accounts = await store.get<StoredAccount[]>(ACCOUNTS_KEY);
  if (accounts && accounts.length > 0) return; // already migrated

  const legacyToken = await store.get<string>(TOKEN_KEY);
  if (!legacyToken) return; // nothing to migrate

  // We can't fetch user info here (no async API call in store),
  // so we store a placeholder that will be updated on first login hydration
  const placeholder: StoredAccount = {
    id: "migrated",
    token: legacyToken,
    userName: "Account",
    email: "",
    color: "#7b68ee",
    initials: "?",
  };
  await store.set(ACCOUNTS_KEY, [placeholder]);
  await store.set(ACTIVE_ACCOUNT_KEY, placeholder.id);
  await store.delete(TOKEN_KEY);
  await store.save();
}

let migrationDone = false;

async function ensureMigrated() {
  if (migrationDone) return;
  const store = await getStore();
  await migrateIfNeeded(store);
  migrationDone = true;
}

// --- Token (reads from active account) ---

export async function getToken(): Promise<string | null> {
  await ensureMigrated();
  const store = await getStore();
  const accounts = (await store.get<StoredAccount[]>(ACCOUNTS_KEY)) ?? [];
  const activeId = await store.get<string>(ACTIVE_ACCOUNT_KEY);
  const active = accounts.find((a) => a.id === activeId);
  return active?.token ?? null;
}

export async function setToken(token: string): Promise<void> {
  await ensureMigrated();
  const store = await getStore();
  const accounts = (await store.get<StoredAccount[]>(ACCOUNTS_KEY)) ?? [];
  const activeId = await store.get<string>(ACTIVE_ACCOUNT_KEY);
  const idx = accounts.findIndex((a) => a.id === activeId);
  if (idx >= 0) {
    accounts[idx].token = token;
    await store.set(ACCOUNTS_KEY, accounts);
    await store.save();
  }
}

export async function clearToken(): Promise<void> {
  // For backward compat — removes active account
  await ensureMigrated();
  const store = await getStore();
  const accounts = (await store.get<StoredAccount[]>(ACCOUNTS_KEY)) ?? [];
  const activeId = await store.get<string>(ACTIVE_ACCOUNT_KEY);
  const filtered = accounts.filter((a) => a.id !== activeId);
  await store.set(ACCOUNTS_KEY, filtered);
  if (filtered.length > 0) {
    await store.set(ACTIVE_ACCOUNT_KEY, filtered[0].id);
  } else {
    await store.delete(ACTIVE_ACCOUNT_KEY);
  }
  await store.save();
}

// --- Accounts ---

export async function getAccounts(): Promise<StoredAccount[]> {
  await ensureMigrated();
  const store = await getStore();
  return (await store.get<StoredAccount[]>(ACCOUNTS_KEY)) ?? [];
}

export async function saveAccounts(accounts: StoredAccount[]): Promise<void> {
  const store = await getStore();
  await store.set(ACCOUNTS_KEY, accounts);
  await store.save();
}

export async function getActiveAccountId(): Promise<string | null> {
  await ensureMigrated();
  const store = await getStore();
  return (await store.get<string>(ACTIVE_ACCOUNT_KEY)) ?? null;
}

export async function setActiveAccountId(id: string): Promise<void> {
  const store = await getStore();
  await store.set(ACTIVE_ACCOUNT_KEY, id);
  await store.save();
}

export async function addAccount(account: StoredAccount): Promise<void> {
  await ensureMigrated();
  const store = await getStore();
  const accounts = (await store.get<StoredAccount[]>(ACCOUNTS_KEY)) ?? [];
  const existing = accounts.findIndex((a) => a.id === account.id);
  if (existing >= 0) {
    accounts[existing] = account;
  } else {
    accounts.push(account);
  }
  await store.set(ACCOUNTS_KEY, accounts);
  await store.set(ACTIVE_ACCOUNT_KEY, account.id);
  await store.save();
}

export async function removeAccount(id: string): Promise<void> {
  await ensureMigrated();
  const store = await getStore();
  const accounts = (await store.get<StoredAccount[]>(ACCOUNTS_KEY)) ?? [];
  const filtered = accounts.filter((a) => a.id !== id);
  await store.set(ACCOUNTS_KEY, filtered);
  const activeId = await store.get<string>(ACTIVE_ACCOUNT_KEY);
  if (activeId === id) {
    if (filtered.length > 0) {
      await store.set(ACTIVE_ACCOUNT_KEY, filtered[0].id);
    } else {
      await store.delete(ACTIVE_ACCOUNT_KEY);
    }
  }
  await store.save();
}

// --- Notifications last seen ---

export async function getLastSeenNotifications(): Promise<number> {
  const store = await getStore();
  return (await store.get<number>(LAST_SEEN_KEY)) ?? 0;
}

export async function setLastSeenNotifications(timestamp: number): Promise<void> {
  const store = await getStore();
  await store.set(LAST_SEEN_KEY, timestamp);
  await store.save();
}

// --- Filters ---

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

// --- Sort ---

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
