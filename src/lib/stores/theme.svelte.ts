import { browser } from '$app/environment';

type Theme = 'dark' | 'light';

function createThemeStore() {
	let theme = $state<Theme>('dark');

	if (browser) {
		const stored = localStorage.getItem('theme') as Theme | null;
		theme = stored || 'dark';
		updateDocument(theme);
	}

	function updateDocument(t: Theme) {
		if (browser) {
			document.documentElement.classList.remove('dark', 'light');
			document.documentElement.classList.add(t);
		}
	}

	return {
		get value() {
			return theme;
		},
		toggle() {
			theme = theme === 'dark' ? 'light' : 'dark';
			if (browser) {
				localStorage.setItem('theme', theme);
				updateDocument(theme);
			}
		},
		set(t: Theme) {
			theme = t;
			if (browser) {
				localStorage.setItem('theme', theme);
				updateDocument(theme);
			}
		}
	};
}

export const themeStore = createThemeStore();
