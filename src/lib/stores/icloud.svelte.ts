import { Store } from '@tauri-apps/plugin-store';
import { invoke } from '@tauri-apps/api/core';

interface ICloudConfig {
	enabled: boolean;
	encryptionEnabled: boolean;
	lastSync: number;
}

interface ICloudMetadata {
	encryptionEnabled: boolean;
	version: number;
}

let config = $state<ICloudConfig>({
	enabled: false,
	encryptionEnabled: false,
	lastSync: 0
});

let available = $state(false);
let syncing = $state(false);
let hasEncryptionKey = $state(false);
let store: Store | null = null;
let initialized = false;

async function loadConfig() {
	if (initialized) return;
	initialized = true;

	// Check if iCloud is available
	try {
		available = await invoke<boolean>('is_icloud_available');
	} catch {
		available = false;
	}

	// Check if encryption key exists in memory
	try {
		hasEncryptionKey = await invoke<boolean>('icloud_has_encryption_key');
	} catch {
		hasEncryptionKey = false;
	}

	// Load local config
	store = await Store.load('icloud-config.json');
	const saved = await store.get<ICloudConfig>('config');
	if (saved) {
		config = { ...config, ...saved };
	}

	// Check iCloud metadata to see if encryption is enabled on another device
	if (available) {
		try {
			const metadataContent = await invoke<string | null>('icloud_read_file', { filename: '.metadata.json' });
			if (metadataContent) {
				const metadata: ICloudMetadata = JSON.parse(metadataContent);
				// If iCloud says encryption is enabled but local config doesn't know, update local
				if (metadata.encryptionEnabled && !config.encryptionEnabled) {
					config.encryptionEnabled = true;
					await saveConfig();
				}
			}
		} catch {
			// Metadata file doesn't exist yet, that's fine
		}
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

	get hasEncryptionKey() {
		return hasEncryptionKey;
	},

	get encryptionEnabled() {
		return config.encryptionEnabled && hasEncryptionKey;
	},

	/**
	 * Returns true if encryption is enabled but password hasn't been entered yet
	 */
	get needsPassword() {
		return config.encryptionEnabled && !hasEncryptionKey;
	},

	/**
	 * Returns true if sync can actually happen (enabled, available, and if encryption is on, key is available)
	 */
	get canSync() {
		if (!config.enabled || !available) return false;
		if (config.encryptionEnabled && !hasEncryptionKey) return false;
		return true;
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

	async setEncryptionEnabled(value: boolean) {
		config.encryptionEnabled = value;
		await saveConfig();

		// Save metadata to iCloud (unencrypted) so other devices know encryption is enabled
		if (available) {
			try {
				const metadata: ICloudMetadata = {
					encryptionEnabled: value,
					version: 1
				};
				await invoke('icloud_write_file', {
					filename: '.metadata.json',
					content: JSON.stringify(metadata, null, 2)
				});
			} catch (e) {
				console.error('Failed to save iCloud metadata:', e);
			}
		}

		// Re-encrypt/decrypt all existing iCloud files
		if (config.enabled && available && hasEncryptionKey) {
			await this.reEncryptAllFiles();
		}
	},

	/**
	 * Set the encryption password (derives key and stores in memory)
	 */
	async setEncryptionPassword(password: string): Promise<boolean> {
		try {
			await invoke('icloud_set_encryption_password', { password });
			hasEncryptionKey = true;
			return true;
		} catch (e) {
			console.error('Failed to set encryption password:', e);
			return false;
		}
	},

	/**
	 * Re-encrypt or decrypt all iCloud files based on current encryption setting
	 */
	async reEncryptAllFiles() {
		const files = ['notes.json', 'bookmarks.json', 'favorites.json'];

		for (const file of files) {
			try {
				let content: string | null = null;

				// Try encrypted read first, fallback to plain
				try {
					content = await invoke<string | null>('icloud_read_file_encrypted', { filename: file });
				} catch {
					content = await invoke<string | null>('icloud_read_file', { filename: file });
				}

				if (!content) {
					content = await invoke<string | null>('icloud_read_file', { filename: file });
				}

				if (content) {
					if (config.encryptionEnabled && hasEncryptionKey) {
						await invoke('icloud_write_file_encrypted', { filename: file, content });
					} else {
						await invoke('icloud_write_file', { filename: file, content });
					}
				}
			} catch (e) {
				console.error(`Failed to re-encrypt ${file}:`, e);
			}
		}
	},

	async clearEncryptionKey() {
		try {
			await invoke('icloud_clear_encryption_key');
			hasEncryptionKey = false;
		} catch (e) {
			console.error('Failed to clear encryption key:', e);
		}
	},

	/**
	 * Sync a specific file to iCloud
	 * Merges local and iCloud data, keeping the most recent items
	 */
	async syncFile<T extends { id: string; updatedAt?: number; createdAt?: number }>(filename: string, localData: T[], key: string): Promise<T[]> {
		if (!config.enabled || !available) {
			return localData;
		}

		// Don't sync if encryption is enabled but no key is available
		// This prevents overwriting encrypted data with plain text
		if (config.encryptionEnabled && !hasEncryptionKey) {
			console.warn('iCloud sync skipped: encryption enabled but no key available');
			return localData;
		}

		syncing = true;

		try {
			// Read from iCloud (encrypted or plain)
			let icloudContent: string | null = null;
			if (config.encryptionEnabled && hasEncryptionKey) {
				icloudContent = await invoke<string | null>('icloud_read_file_encrypted', { filename });
			} else {
				icloudContent = await invoke<string | null>('icloud_read_file', { filename });
			}

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

			// Write merged data back to iCloud (encrypted or plain)
			const content = JSON.stringify({ [key]: merged }, null, 2);
			if (config.encryptionEnabled && hasEncryptionKey) {
				await invoke('icloud_write_file_encrypted', { filename, content });
			} else {
				await invoke('icloud_write_file', { filename, content });
			}

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

		// Don't write if encryption is enabled but no key is available
		if (config.encryptionEnabled && !hasEncryptionKey) {
			console.warn('iCloud write skipped: encryption enabled but no key available');
			return;
		}

		try {
			const content = JSON.stringify({ [key]: data }, null, 2);
			if (config.encryptionEnabled && hasEncryptionKey) {
				await invoke('icloud_write_file_encrypted', { filename, content });
			} else {
				await invoke('icloud_write_file', { filename, content });
			}
		} catch (e) {
			console.error(`Failed to write ${filename} to iCloud:`, e);
		}
	},

	/**
	 * Read data from iCloud
	 */
	async readFromICloud<T>(filename: string, key: string): Promise<T[] | null> {
		if (!available) return null;

		// Don't read if encryption is enabled but no key is available
		if (config.encryptionEnabled && !hasEncryptionKey) {
			console.warn('iCloud read skipped: encryption enabled but no key available');
			return null;
		}

		try {
			let content: string | null = null;
			if (config.encryptionEnabled && hasEncryptionKey) {
				content = await invoke<string | null>('icloud_read_file_encrypted', { filename });
			} else {
				content = await invoke<string | null>('icloud_read_file', { filename });
			}
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
	 * Dispatches a custom event that other stores can listen to
	 */
	async syncAll() {
		if (!config.enabled || !available) return;

		// Don't sync if encryption is enabled but no key is available
		if (config.encryptionEnabled && !hasEncryptionKey) {
			console.warn('iCloud sync all skipped: encryption enabled but no key available');
			return;
		}

		syncing = true;
		try {
			// Dispatch event for stores to sync
			if (typeof window !== 'undefined') {
				window.dispatchEvent(new CustomEvent('icloud-force-sync'));
			}

			// Wait a bit for stores to respond
			await new Promise((resolve) => setTimeout(resolve, 500));

			config.lastSync = Date.now();
			await saveConfig();
		} finally {
			syncing = false;
		}
	},

	/**
	 * Subscribe to force sync events
	 * Returns an unsubscribe function
	 */
	onForceSync(callback: () => Promise<void>): () => void {
		if (typeof window === 'undefined') return () => {};

		const handler = () => callback();
		window.addEventListener('icloud-force-sync', handler);
		return () => window.removeEventListener('icloud-force-sync', handler);
	}
};

/**
 * Merge two arrays of items, keeping the most recent version of each item
 */
function mergeData<T extends { id: string; updatedAt?: number; createdAt?: number }>(local: T[], remote: T[]): T[] {
	const mergedRecord: Record<string, T> = {};

	// Add all local items
	for (const item of local) {
		mergedRecord[item.id] = item;
	}

	// Merge remote items
	for (const remoteItem of remote) {
		const localItem = mergedRecord[remoteItem.id];

		if (!localItem) {
			// Item only exists in remote
			mergedRecord[remoteItem.id] = remoteItem;
		} else {
			// Item exists in both - keep the most recent
			const localTime = localItem.updatedAt || localItem.createdAt || 0;
			const remoteTime = remoteItem.updatedAt || remoteItem.createdAt || 0;

			if (remoteTime > localTime) {
				mergedRecord[remoteItem.id] = remoteItem;
			}
		}
	}

	// Sort by updatedAt/createdAt descending
	return Object.values(mergedRecord).sort((a, b) => {
		const aTime = a.updatedAt || a.createdAt || 0;
		const bTime = b.updatedAt || b.createdAt || 0;
		return bTime - aTime;
	});
}
