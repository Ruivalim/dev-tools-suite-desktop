import { Store } from '@tauri-apps/plugin-store';
import { invoke } from '@tauri-apps/api/core';

export interface SyncConfig {
	enabled: boolean;
	connectionString: string;
	lastSync: number;
}

// Global state
let config = $state<SyncConfig>({
	enabled: false,
	connectionString: '',
	lastSync: 0
});
let syncing = $state(false);
let lastError = $state<string | null>(null);
let store: Store | null = null;
let initialized = false;

async function loadConfig() {
	if (!store) return;

	const savedConfig = await store.get<SyncConfig>('syncConfig');
	if (savedConfig) {
		config = savedConfig;
	}
}

async function saveConfig() {
	if (!store) return;
	await store.set('syncConfig', config);
	await store.save();
}

export const syncStore = {
	get config() {
		return config;
	},
	get syncing() {
		return syncing;
	},
	get lastError() {
		return lastError;
	},
	get isConfigured() {
		return config.enabled && config.connectionString.length > 0;
	},

	async init() {
		if (initialized) return;
		initialized = true;

		store = await Store.load('sync.json');
		await loadConfig();

		// If sync is enabled, initialize schema
		if (this.isConfigured) {
			try {
				await invoke('sync_init_schema', { connectionString: config.connectionString });
			} catch (e) {
				console.error('Failed to init sync schema:', e);
			}
		}
	},

	async testConnection(connectionString: string): Promise<{ success: boolean; message: string }> {
		try {
			const result = await invoke<string>('sync_test_connection', { connectionString });
			return { success: true, message: result };
		} catch (e) {
			return { success: false, message: String(e) };
		}
	},

	async enable(connectionString: string): Promise<{ success: boolean; message: string }> {
		try {
			// Test connection first
			await invoke('sync_test_connection', { connectionString });

			// Initialize schema
			await invoke('sync_init_schema', { connectionString });

			// Save config
			config = {
				enabled: true,
				connectionString,
				lastSync: 0
			};
			await saveConfig();

			return { success: true, message: 'Sync enabled successfully!' };
		} catch (e) {
			return { success: false, message: String(e) };
		}
	},

	async disable() {
		config = {
			enabled: false,
			connectionString: '',
			lastSync: 0
		};
		await saveConfig();
	},

	async updateLastSync(timestamp: number) {
		config = { ...config, lastSync: timestamp };
		await saveConfig();
	},

	setError(error: string | null) {
		lastError = error;
	},

	setSyncing(value: boolean) {
		syncing = value;
	}
};
