export interface Tool {
	id: string;
	name: string;
	description: string;
	icon: string; // Lucide icon name
	category: ToolCategory;
	route: string;
}

export type ToolCategory = 'encoding' | 'database' | 'network' | 'text' | 'generators' | 'productivity' | 'other';

export const categoryLabels: Record<ToolCategory, string> = {
	encoding: 'Encoding',
	database: 'Database',
	network: 'Network',
	text: 'Text',
	generators: 'Generators',
	productivity: 'Productivity',
	other: 'Other'
};

export const categoryIcons: Record<ToolCategory, string> = {
	encoding: 'Binary',
	database: 'Database',
	network: 'Globe',
	text: 'Type',
	generators: 'Sparkles',
	productivity: 'Clock',
	other: 'Wrench'
};

export const tools: Tool[] = [
	{
		id: 'base64',
		name: 'Base64',
		description: 'Encode and decode Base64 strings',
		icon: 'FileCode',
		category: 'encoding',
		route: '/tools/base64'
	},
	{
		id: 'url',
		name: 'URL Encoder',
		description: 'Encode and decode URL strings',
		icon: 'Link',
		category: 'encoding',
		route: '/tools/url'
	},
	{
		id: 'json',
		name: 'JSON Formatter',
		description: 'Format, minify, and validate JSON',
		icon: 'Braces',
		category: 'text',
		route: '/tools/json'
	},
	{
		id: 'jwt',
		name: 'JWT Decoder',
		description: 'Decode and inspect JWT tokens',
		icon: 'Key',
		category: 'encoding',
		route: '/tools/jwt'
	},
	{
		id: 'hash',
		name: 'Hash Generator',
		description: 'Generate MD5, SHA-1, SHA-256 hashes',
		icon: 'Hash',
		category: 'generators',
		route: '/tools/hash'
	},
	{
		id: 'uuid',
		name: 'ID Generator',
		description: 'Generate UUID, ULID, and NanoID',
		icon: 'Fingerprint',
		category: 'generators',
		route: '/tools/uuid'
	},
	{
		id: 'faker',
		name: 'Faker',
		description: 'Generate fake data for testing (pt-BR supported)',
		icon: 'Sparkles',
		category: 'generators',
		route: '/tools/faker'
	},
	{
		id: 'diff',
		name: 'Diff Tool',
		description: 'Compare two texts and see differences',
		icon: 'GitCompare',
		category: 'text',
		route: '/tools/diff'
	},
	{
		id: 'postgres',
		name: 'PostgreSQL',
		description: 'Connect and query PostgreSQL databases',
		icon: 'Database',
		category: 'database',
		route: '/tools/postgres'
	},
	{
		id: 'http',
		name: 'HTTP Client',
		description: 'Send HTTP requests and inspect responses',
		icon: 'Globe',
		category: 'network',
		route: '/tools/http'
	},
	{
		id: 'notes',
		name: 'Notes',
		description: 'Save and organize quick notes',
		icon: 'StickyNote',
		category: 'text',
		route: '/tools/notes'
	},
	{
		id: 'stopwatch',
		name: 'Stopwatch',
		description: 'Track time with alerts and laps',
		icon: 'Timer',
		category: 'productivity',
		route: '/tools/stopwatch'
	},
	{
		id: 'cron',
		name: 'Cron Parser',
		description: 'Parse/generate cron expressions with next run times',
		icon: 'Clock',
		category: 'productivity',
		route: '/tools/cron'
	},
	{
		id: 'timestamp',
		name: 'Unix Timestamp',
		description: 'Convert between Unix timestamps and human dates',
		icon: 'Timer',
		category: 'productivity',
		route: '/tools/timestamp'
	},
	{
		id: 'color-converter',
		name: 'Color Converter',
		description: 'HEX ↔ RGB ↔ HSL ↔ Tailwind with palette generator',
		icon: 'Palette',
		category: 'generators',
		route: '/tools/color-converter'
	},
	{
		id: 'color-picker',
		name: 'Color Picker',
		description: 'Visual color picker with eyedropper',
		icon: 'Pipette',
		category: 'generators',
		route: '/tools/color-picker'
	},
	{
		id: 'lorem',
		name: 'Lorem Ipsum',
		description: 'Generate placeholder text',
		icon: 'FileText',
		category: 'generators',
		route: '/tools/lorem'
	},
	{
		id: 'json-converter',
		name: 'JSON Converter',
		description: 'Convert between JSON, YAML, CSV, XML, TOML',
		icon: 'ArrowRightLeft',
		category: 'encoding',
		route: '/tools/json-converter'
	},
	{
		id: 'text-sorter',
		name: 'Text Sorter',
		description: 'Sort lines alphabetically, numerically, by length',
		icon: 'ArrowUpDown',
		category: 'text',
		route: '/tools/text-sorter'
	},
	{
		id: 'dedupe',
		name: 'Duplicate Remover',
		description: 'Remove or find duplicate lines',
		icon: 'Filter',
		category: 'text',
		route: '/tools/dedupe'
	},
	{
		id: 'sql-formatter',
		name: 'SQL Formatter',
		description: 'Format and beautify SQL queries',
		icon: 'Database',
		category: 'text',
		route: '/tools/sql-formatter'
	},
	{
		id: 'html-formatter',
		name: 'HTML Formatter',
		description: 'Beautify and minify HTML',
		icon: 'Code',
		category: 'text',
		route: '/tools/html-formatter'
	},
	{
		id: 'css-formatter',
		name: 'CSS Formatter',
		description: 'Beautify and minify CSS',
		icon: 'Paintbrush',
		category: 'text',
		route: '/tools/css-formatter'
	},
	{
		id: 'js-minifier',
		name: 'JS Formatter',
		description: 'Beautify and minify JavaScript',
		icon: 'FileCode',
		category: 'text',
		route: '/tools/js-minifier'
	},
	{
		id: 'password-generator',
		name: 'Password Generator',
		description: 'Generate secure passwords with options',
		icon: 'KeyRound',
		category: 'generators',
		route: '/tools/password-generator'
	},
	{
		id: 'ascii-art',
		name: 'ASCII Art',
		description: 'Convert text to ASCII art banners',
		icon: 'Type',
		category: 'generators',
		route: '/tools/ascii-art'
	},
	{
		id: 'json-to-types',
		name: 'JSON to Types',
		description: 'Convert JSON to TypeScript, Go, Rust types',
		icon: 'Braces',
		category: 'encoding',
		route: '/tools/json-to-types'
	},
	{
		id: 'bookmarks',
		name: 'Bookmarks',
		description: 'Save and organize dev bookmarks',
		icon: 'Bookmark',
		category: 'productivity',
		route: '/tools/bookmarks'
	},
	{
		id: 'unit-converter',
		name: 'Unit Converter',
		description: 'Convert bytes, length, weight, temperature',
		icon: 'Scale',
		category: 'other',
		route: '/tools/unit-converter'
	},
	{
		id: 'settings',
		name: 'Settings',
		description: 'App preferences and configuration',
		icon: 'Settings',
		category: 'other',
		route: '/tools/settings'
	}
];

export function getToolsByCategory(): Map<ToolCategory, Tool[]> {
	const map = new Map<ToolCategory, Tool[]>();

	for (const tool of tools) {
		const existing = map.get(tool.category) || [];
		existing.push(tool);
		map.set(tool.category, existing);
	}

	return map;
}
