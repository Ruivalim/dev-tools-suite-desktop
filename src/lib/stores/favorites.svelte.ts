import { Store } from '@tauri-apps/plugin-store';

let favorites = $state<string[]>([]);
let store: Store | null = null;
let initialized = false;

async function loadFavorites() {
	if (initialized) return;
	initialized = true;

	store = await Store.load('favorites.json');
	const saved = await store.get<string[]>('favorites');
	if (saved) {
		favorites = saved;
	}
}

async function saveFavorites() {
	if (store) {
		await store.set('favorites', favorites);
		await store.save();
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
	}
};
