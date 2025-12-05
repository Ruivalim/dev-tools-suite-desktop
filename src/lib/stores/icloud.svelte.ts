import { Store } from '@tauri-apps/plugin-store';
import { invoke } from '@tauri-apps/api/core';

interface ICloudConfig {
	enabled: boolean;
	lastSync: number;
}

let config = $state<ICloudConfig>({
	enabled: false,
	lastSync: 0
});

let available = $state(false);
let syncing = $state(false);
let store: Store | null = null;
let initialized = false;

// Files to sync
const SYNC_FILES = ['notes.json', 'bookmarks.json', 'favorites.json'];

async function loadConfig() {
	if (initialized) return;
	initialized = true;

	// Check if iCloud is available
	try {
		available = await invoke<boolean>('is_icloud_available');
	} catch {
		available = false;
	}

	// Load local config
	store = await Store.load('icloud-config.json');
	const saved = await store.get<ICloudConfig>('config');
	if (saved) {
		config = saved;
	}
}

async function saveConfig() {
	if (store) {
		await store.set('config', config);
		await store.save();
	}
}

export const icloudStore = {
	get config() {
		return config;
	},

	get available() {
		return available;
	},

	get syncing() {
		return syncing;
	},

	get enabled() {
		return config.enabled && available;
	},

	async init() {
		await loadConfig();
	},

	async setEnabled(value: boolean) {
		config.enabled = value;
		await saveConfig();

		// If enabling, do initial sync
		if (value && available) {
			await this.syncAll();
		}
	},

	/**
	 * Sync a specific file to iCloud
	 * Merges local and iCloud data, keeping the most recent items
	 */
	async syncFile<T extends { id: string; updatedAt?: number; createdAt?: number }>(
		filename: string,
		localData: T[],
		key: string
	): Promise<T[]> {
		if (!config.enabled || !available) {
			return localData;
		}

		syncing = true;

		try {
			// Read from iCloud
			const icloudContent = await invoke<string | null>('icloud_read_file', { filename });
			let icloudData: T[] = [];

			if (icloudContent) {
				try {
					const parsed = JSON.parse(icloudContent);
					icloudData = parsed[key] || [];
				} catch {
					icloudData = [];
				}
			}

			// Merge data - use updatedAt or createdAt for comparison
			const merged = mergeData(localData, icloudData);

			// Write merged data back to iCloud
			const content = JSON.stringify({ [key]: merged }, null, 2);
			await invoke('icloud_write_file', { filename, content });

			// Update last sync time
			config.lastSync = Date.now();
			await saveConfig();

			return merged;
		} catch (e) {
			console.error(`Failed to sync ${filename}:`, e);
			return localData;
		} finally {
			syncing = false;
		}
	},

	/**
	 * Write data to iCloud (one-way push)
	 */
	async writeToICloud<T>(filename: string, data: T[], key: string): Promise<void> {
		if (!config.enabled || !available) return;

		try {
			const content = JSON.stringify({ [key]: data }, null, 2);
			await invoke('icloud_write_file', { filename, content });
		} catch (e) {
			console.error(`Failed to write ${filename} to iCloud:`, e);
		}
	},

	/**
	 * Read data from iCloud
	 */
	async readFromICloud<T>(filename: string, key: string): Promise<T[] | null> {
		if (!available) return null;

		try {
			const content = await invoke<string | null>('icloud_read_file', { filename });
			if (content) {
				const parsed = JSON.parse(content);
				return parsed[key] || null;
			}
		} catch (e) {
			console.error(`Failed to read ${filename} from iCloud:`, e);
		}
		return null;
	},

	/**
	 * Sync all supported files
	 */
	async syncAll() {
		if (!config.enabled || !available) return;

		syncing = true;
		try {
			// Emit event for each store to sync
			// The actual sync will be handled by each store
			config.lastSync = Date.now();
			await saveConfig();
		} finally {
			syncing = false;
		}
	}
};

/**
 * Merge two arrays of items, keeping the most recent version of each item
 */
function mergeData<T extends { id: string; updatedAt?: number; createdAt?: number }>(
	local: T[],
	remote: T[]
): T[] {
	const merged = new Map<string, T>();

	// Add all local items
	for (const item of local) {
		merged.set(item.id, item);
	}

	// Merge remote items
	for (const remoteItem of remote) {
		const localItem = merged.get(remoteItem.id);

		if (!localItem) {
			// Item only exists in remote
			merged.set(remoteItem.id, remoteItem);
		} else {
			// Item exists in both - keep the most recent
			const localTime = localItem.updatedAt || localItem.createdAt || 0;
			const remoteTime = remoteItem.updatedAt || remoteItem.createdAt || 0;

			if (remoteTime > localTime) {
				merged.set(remoteItem.id, remoteItem);
			}
		}
	}

	// Sort by updatedAt/createdAt descending
	return Array.from(merged.values()).sort((a, b) => {
		const aTime = a.updatedAt || a.createdAt || 0;
		const bTime = b.updatedAt || b.createdAt || 0;
		return bTime - aTime;
	});
}
