import { Store } from '@tauri-apps/plugin-store';
import { icloudStore } from './icloud.svelte';

let favorites = $state<string[]>([]);
let store: Store | null = null;
let initialized = false;

async function loadFavorites() {
	if (initialized) return;
	initialized = true;

	// Don't load if encryption is enabled but no password
	if (icloudStore.needsPassword) {
		return;
	}

	store = await Store.load('favorites.json');
	const saved = await store.get<string[]>('favorites');
	if (saved) {
		favorites = saved;
	}

	// Sync with iCloud if enabled
	if (icloudStore.enabled) {
		const icloudFavorites = await icloudStore.readFromICloud<string>('favorites.json', 'favorites');
		if (icloudFavorites) {
			// Merge: union of both arrays (deduplicated)
			const merged = [...favorites, ...icloudFavorites].filter((id, index, arr) => arr.indexOf(id) === index);
			favorites = merged;
			await saveFavoritesLocal();
			await icloudStore.writeToICloud('favorites.json', favorites, 'favorites');
		}
	}

	// Listen for force sync events
	icloudStore.onForceSync(async () => {
		if (icloudStore.enabled) {
			const icloudFavorites = await icloudStore.readFromICloud<string>('favorites.json', 'favorites');
			if (icloudFavorites) {
				const merged = [...favorites, ...icloudFavorites].filter((id, index, arr) => arr.indexOf(id) === index);
				favorites = merged;
				await saveFavoritesLocal();
				await icloudStore.writeToICloud('favorites.json', favorites, 'favorites');
			}
		}
	});
}

async function saveFavoritesLocal() {
	if (store) {
		await store.set('favorites', favorites);
		await store.save();
	}
}

async function saveFavorites() {
	await saveFavoritesLocal();

	// Sync to iCloud if enabled
	if (icloudStore.enabled) {
		await icloudStore.writeToICloud('favorites.json', favorites, 'favorites');
	}
}

export const favoritesStore = {
	get favorites() {
		return favorites;
	},

	async init() {
		await loadFavorites();
	},

	isFavorite(toolId: string): boolean {
		return favorites.includes(toolId);
	},

	async toggle(toolId: string) {
		if (favorites.includes(toolId)) {
			favorites = favorites.filter((id) => id !== toolId);
		} else {
			favorites = [...favorites, toolId];
		}
		await saveFavorites();
	},

	async add(toolId: string) {
		if (!favorites.includes(toolId)) {
			favorites = [...favorites, toolId];
			await saveFavorites();
		}
	},

	async remove(toolId: string) {
		favorites = favorites.filter((id) => id !== toolId);
		await saveFavorites();
	},

	async sync() {
		if (!icloudStore.enabled) return;
		const icloudFavorites = await icloudStore.readFromICloud<string>('favorites.json', 'favorites');
		if (icloudFavorites) {
			// Merge: union of both arrays (deduplicated)
			const merged = [...favorites, ...icloudFavorites].filter((id, index, arr) => arr.indexOf(id) === index);
			favorites = merged;
			await saveFavoritesLocal();
			await icloudStore.writeToICloud('favorites.json', favorites, 'favorites');
		}
	}
};
