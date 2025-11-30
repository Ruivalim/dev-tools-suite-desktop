import { Store } from '@tauri-apps/plugin-store';
import { SvelteSet } from 'svelte/reactivity';

export interface Bookmark {
	id: string;
	title: string;
	url: string;
	description?: string;
	tags: string[];
	favicon?: string;
	createdAt: number;
}

let bookmarks = $state<Bookmark[]>([]);
let store: Store | null = null;
let initialized = false;

async function loadBookmarks() {
	if (initialized) return;
	initialized = true;

	store = await Store.load('bookmarks.json');
	const saved = await store.get<Bookmark[]>('bookmarks');
	if (saved) {
		bookmarks = saved;
	}
}

async function saveBookmarks() {
	if (store) {
		await store.set('bookmarks', bookmarks);
		await store.save();
	}
}

export const bookmarksStore = {
	get bookmarks() {
		return bookmarks;
	},

	async init() {
		await loadBookmarks();
	},

	async add(bookmark: Omit<Bookmark, 'id' | 'createdAt'>) {
		const newBookmark: Bookmark = {
			...bookmark,
			id: crypto.randomUUID(),
			createdAt: Date.now()
		};
		bookmarks = [newBookmark, ...bookmarks];
		await saveBookmarks();
		return newBookmark;
	},

	async update(id: string, updates: Partial<Omit<Bookmark, 'id' | 'createdAt'>>) {
		const index = bookmarks.findIndex((b) => b.id === id);
		if (index !== -1) {
			bookmarks[index] = { ...bookmarks[index], ...updates };
			bookmarks = [...bookmarks];
			await saveBookmarks();
		}
	},

	async remove(id: string) {
		bookmarks = bookmarks.filter((b) => b.id !== id);
		await saveBookmarks();
	},

	getByTag(tag: string): Bookmark[] {
		return bookmarks.filter((b) => b.tags.includes(tag));
	},

	getAllTags(): string[] {
		const tags = new SvelteSet<string>();
		for (const bookmark of bookmarks) {
			for (const tag of bookmark.tags) {
				tags.add(tag);
			}
		}
		return Array.from(tags).sort();
	},

	search(query: string): Bookmark[] {
		const q = query.toLowerCase();
		return bookmarks.filter((b) => b.title.toLowerCase().includes(q) || b.url.toLowerCase().includes(q) || b.description?.toLowerCase().includes(q) || b.tags.some((t) => t.toLowerCase().includes(q)));
	}
};
