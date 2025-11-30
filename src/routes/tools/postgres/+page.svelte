<script lang="ts">
	import { onMount } from 'svelte';
	import { invoke } from '@tauri-apps/api/core';
	import { load } from '@tauri-apps/plugin-store';
	import {
		Database,
		Plus,
		Trash2,
		Play,
		RefreshCw,
		Table,
		Loader2,
		Check,
		X,
		Edit2,
		Save,
		FolderPlus,
		PanelLeftClose,
		PanelLeft,
		Filter,
		FilterX,
		PlusCircle,
		Folder,
		FolderOpen
	} from 'lucide-svelte';
	import { cn } from '$lib/utils/cn';
	import Select from '$lib/components/ui/Select.svelte';
	import { SvelteMap, SvelteSet } from 'svelte/reactivity';

	interface PgConnection {
		id: string;
		name: string;
		host: string;
		port: number;
		database: string;
		user: string;
		password: string;
		folder?: string; // supports nested paths like "folder/subfolder"
	}

	interface ColumnInfo {
		name: string;
		type: string;
		nullable: boolean;
		isPrimary: boolean;
	}

	interface ColumnFilter {
		column: string;
		value: string;
	}

	interface TableInfo {
		schema: string;
		name: string;
		table_type: string;
	}

	interface QueryResult {
		columns: string[];
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		rows: any[][];
		row_count: number;
	}

	// State
	let connections = $state<PgConnection[]>([]);
	let folders = $state<string[]>([]);
	let selectedConnection = $state<PgConnection | null>(null);
	let tables = $state<TableInfo[]>([]);
	let query = $state('SELECT * FROM ');
	let queryResult = $state<QueryResult | null>(null);
	let queryError = $state('');
	let isLoading = $state(false);
	let isConnecting = $state(false);
	let showAddModal = $state(false);
	let showAddFolder = $state(false);
	let editingConnection = $state<PgConnection | null>(null);
	let expandedFolders = $state<Set<string>>(new Set(['']));
	let newFolderName = $state('');
	let parentFolderForNew = $state(''); // for nested folder creation

	// UI State
	let connectionsPanelCollapsed = $state(false);

	// Column filters
	let columnFilters = $state<ColumnFilter[]>([]);
	let showFilterDropdown = $state<string | null>(null);
	let filterInputValue = $state('');

	// Row selection and context menu
	let selectedRows = $state<Set<number>>(new Set());
	let contextMenu = $state<{ x: number; y: number; rowIndex: number } | null>(null);

	// Edit/Delete preview
	let pendingOperations = $state<{ type: 'delete' | 'update' | 'insert'; sql: string; rows?: number[] }[]>([]);
	let showPreviewModal = $state(false);

	// Insert form
	let showInsertForm = $state(false);
	let insertFormData = $state<Record<string, string>>({});
	let tableColumns = $state<ColumnInfo[]>([]);
	let currentTableForInsert = $state<TableInfo | null>(null);

	// Edit mode
	let editingCell = $state<{ rowIndex: number; colIndex: number } | null>(null);
	let editingCellValue = $state('');

	// Form state
	let formName = $state('');
	let formHost = $state('localhost');
	let formPort = $state(5432);
	let formDatabase = $state('');
	let formUser = $state('postgres');
	let formPassword = $state('');
	let formFolder = $state('');

	let store: Awaited<ReturnType<typeof load>> | null = null;

	onMount(async () => {
		try {
			store = await load('postgres-connections.json', { autoSave: true });
			console.log('Store loaded:', store);
			const saved = await store.get<PgConnection[]>('connections');
			const savedFolders = await store.get<string[]>('folders');
			console.log('Loaded connections:', saved);
			console.log('Loaded folders:', savedFolders);
			if (saved) connections = saved;
			if (savedFolders) folders = savedFolders;
		} catch (e) {
			console.error('Failed to load store:', e);
		}
	});

	async function saveConnections() {
		console.log('saveConnections called, store:', store);
		console.log('Saving connections:', connections);
		console.log('Saving folders:', folders);
		if (store) {
			try {
				await store.set('connections', connections);
				await store.set('folders', folders);
				await store.save();
				console.log('Store saved successfully');
			} catch (e) {
				console.error('Failed to save store:', e);
			}
		} else {
			console.warn('Store not initialized!');
		}
	}

	function resetForm() {
		formName = '';
		formHost = 'localhost';
		formPort = 5432;
		formDatabase = '';
		formUser = 'postgres';
		formPassword = '';
		formFolder = '';
		editingConnection = null;
	}

	function openAddModal(folder = '') {
		resetForm();
		formFolder = folder;
		showAddModal = true;
	}

	function openEditModal(conn: PgConnection) {
		editingConnection = conn;
		formName = conn.name;
		formHost = conn.host;
		formPort = conn.port;
		formDatabase = conn.database;
		formUser = conn.user;
		formPassword = conn.password;
		formFolder = conn.folder || '';
		showAddModal = true;
	}

	async function saveConnection() {
		const conn: PgConnection = {
			id: editingConnection?.id || crypto.randomUUID(),
			name: formName,
			host: formHost,
			port: formPort,
			database: formDatabase,
			user: formUser,
			password: formPassword,
			folder: formFolder || undefined
		};

		if (editingConnection) {
			connections = connections.map((c) => (c.id === conn.id ? conn : c));
		} else {
			connections = [...connections, conn];
		}

		await saveConnections();
		showAddModal = false;
		resetForm();
	}

	async function deleteConnection(id: string) {
		connections = connections.filter((c) => c.id !== id);
		if (selectedConnection?.id === id) {
			selectedConnection = null;
			tables = [];
			queryResult = null;
		}
		await saveConnections();
	}

	async function deleteFolder(folder: string) {
		// Move connections out of this folder and all subfolders
		connections = connections.map((c) => {
			if (c.folder === folder || c.folder?.startsWith(folder + '/')) {
				return { ...c, folder: undefined };
			}
			return c;
		});
		// Remove this folder and all subfolders
		folders = folders.filter((f) => f !== folder && !f.startsWith(folder + '/'));
		await saveConnections();
	}

	async function connectToDb(conn: PgConnection) {
		isConnecting = true;
		queryError = '';
		try {
			await invoke('pg_test_connection', { connection: conn });
			selectedConnection = conn;
			await loadTables();
		} catch (e) {
			queryError = String(e);
			selectedConnection = null;
		}
		isConnecting = false;
	}

	async function loadTables() {
		if (!selectedConnection) return;
		isLoading = true;
		try {
			tables = await invoke('pg_get_tables', { connection: selectedConnection });
		} catch (e) {
			queryError = String(e);
		}
		isLoading = false;
	}

	async function executeQuery() {
		if (!selectedConnection || !query.trim()) return;
		isLoading = true;
		queryError = '';
		queryResult = null;
		try {
			queryResult = await invoke('pg_execute_query', {
				connection: selectedConnection,
				query: query
			});
		} catch (e) {
			queryError = String(e);
		}
		isLoading = false;
	}

	function selectTable(table: TableInfo) {
		query = `SELECT * FROM "${table.schema}"."${table.name}" LIMIT 100`;
	}

	function toggleFolder(folder: string) {
		if (expandedFolders.has(folder)) {
			expandedFolders.delete(folder);
		} else {
			expandedFolders.add(folder);
		}
		expandedFolders = new SvelteSet(expandedFolders);
	}

	function getConnectionsByFolder(folder: string | undefined): PgConnection[] {
		return connections.filter((c) => (c.folder || '') === (folder || ''));
	}

	// Build folder tree structure for nested folders
	interface FolderNode {
		name: string;
		path: string;
		children: FolderNode[];
	}

	let folderTree = $derived.by(() => {
		const root: FolderNode[] = [];
		const pathMap = new SvelteMap<string, FolderNode>();

		// Sort folders to process parents first (by depth)
		const sortedFolders = [...folders].sort((a, b) => a.split('/').length - b.split('/').length);

		for (const folderPath of sortedFolders) {
			const parts = folderPath.split('/');
			const name = parts[parts.length - 1];
			const parentPath = parts.slice(0, -1).join('/');

			const node: FolderNode = { name, path: folderPath, children: [] };
			pathMap.set(folderPath, node);

			if (!parentPath) {
				// Top-level folder
				root.push(node);
			} else if (pathMap.has(parentPath)) {
				// Parent exists, add as child
				pathMap.get(parentPath)!.children.push(node);
			} else {
				// Orphaned folder (parent doesn't exist) - add to root
				root.push(node);
			}
		}

		return root;
	});

	function getAllFolderPaths(): string[] {
		// Get all unique folder paths including parent paths
		const paths = new SvelteSet<string>();
		for (const folder of folders) {
			const parts = folder.split('/');
			let current = '';
			for (const part of parts) {
				current = current ? `${current}/${part}` : part;
				paths.add(current);
			}
		}
		return Array.from(paths).sort();
	}

	async function addFolder() {
		if (!newFolderName.trim()) return;

		const fullPath = parentFolderForNew ? `${parentFolderForNew}/${newFolderName.trim()}` : newFolderName.trim();

		// Ensure all parent paths exist in the folders array
		const parts = fullPath.split('/');
		let currentPath = '';
		const newFolders = [...folders];

		for (const part of parts) {
			currentPath = currentPath ? `${currentPath}/${part}` : part;
			if (!newFolders.includes(currentPath)) {
				newFolders.push(currentPath);
				expandedFolders.add(currentPath);
			}
		}

		folders = newFolders;
		expandedFolders = new SvelteSet(expandedFolders); // trigger reactivity
		await saveConnections();

		newFolderName = '';
		parentFolderForNew = '';
		showAddFolder = false;
	}

	function openAddFolderModal(parentPath = '') {
		parentFolderForNew = parentPath;
		newFolderName = '';
		showAddFolder = true;
	}

	// Filter functions
	let filteredRows = $derived.by(() => {
		if (!queryResult || columnFilters.length === 0) {
			return queryResult?.rows || [];
		}

		return queryResult.rows.filter((row) => {
			return columnFilters.every((filter) => {
				const colIndex = queryResult!.columns.indexOf(filter.column);
				if (colIndex === -1) return true;
				const cellValue = String(row[colIndex] ?? '').toLowerCase();
				return cellValue.includes(filter.value.toLowerCase());
			});
		});
	});

	function addColumnFilter(column: string, value: string) {
		if (!value.trim()) return;
		const existing = columnFilters.find((f) => f.column === column);
		if (existing) {
			columnFilters = columnFilters.map((f) => (f.column === column ? { ...f, value } : f));
		} else {
			columnFilters = [...columnFilters, { column, value }];
		}
		showFilterDropdown = null;
		filterInputValue = '';
	}

	function removeColumnFilter(column: string) {
		columnFilters = columnFilters.filter((f) => f.column !== column);
	}

	function clearAllFilters() {
		columnFilters = [];
	}

	// Row selection
	function toggleRowSelection(rowIndex: number, event: MouseEvent) {
		if (event.shiftKey && selectedRows.size > 0) {
			// Shift-click: select range
			const lastSelected = Math.max(...selectedRows);
			const start = Math.min(lastSelected, rowIndex);
			const end = Math.max(lastSelected, rowIndex);
			for (let i = start; i <= end; i++) {
				selectedRows.add(i);
			}
		} else if (event.metaKey || event.ctrlKey) {
			// Cmd/Ctrl-click: toggle single
			if (selectedRows.has(rowIndex)) {
				selectedRows.delete(rowIndex);
			} else {
				selectedRows.add(rowIndex);
			}
		} else {
			// Regular click: select only this
			selectedRows = new SvelteSet([rowIndex]);
		}
		selectedRows = new SvelteSet(selectedRows);
	}

	function handleContextMenu(event: MouseEvent, rowIndex: number) {
		event.preventDefault();
		if (!selectedRows.has(rowIndex)) {
			selectedRows = new SvelteSet([rowIndex]);
		}
		contextMenu = { x: event.clientX, y: event.clientY, rowIndex };
	}

	function closeContextMenu() {
		contextMenu = null;
	}

	// Get table info for current query (extracts from SELECT query)
	function getCurrentTableFromQuery(): TableInfo | null {
		const match = query.match(/FROM\s+["']?(\w+)["']?\.["']?(\w+)["']?/i);
		if (match) {
			return { schema: match[1], name: match[2], table_type: 'BASE TABLE' };
		}
		const simpleMatch = query.match(/FROM\s+["']?(\w+)["']?/i);
		if (simpleMatch) {
			return { schema: 'public', name: simpleMatch[1], table_type: 'BASE TABLE' };
		}
		return null;
	}

	// Get column info for a table
	async function loadTableColumns(table: TableInfo) {
		if (!selectedConnection) return;
		try {
			const result: QueryResult = await invoke('pg_execute_query', {
				connection: selectedConnection,
				query: `
          SELECT
            c.column_name as name,
            c.data_type as type,
            c.is_nullable = 'YES' as nullable,
            CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary
          FROM information_schema.columns c
          LEFT JOIN (
            SELECT ku.column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage ku ON tc.constraint_name = ku.constraint_name
            WHERE tc.table_schema = '${table.schema}'
              AND tc.table_name = '${table.name}'
              AND tc.constraint_type = 'PRIMARY KEY'
          ) pk ON c.column_name = pk.column_name
          WHERE c.table_schema = '${table.schema}' AND c.table_name = '${table.name}'
          ORDER BY c.ordinal_position
        `
			});
			tableColumns = result.rows.map((row) => ({
				name: String(row[0]),
				type: String(row[1]),
				nullable: Boolean(row[2]),
				isPrimary: Boolean(row[3])
			}));
		} catch (e) {
			console.error('Failed to load columns:', e);
			tableColumns = [];
		}
	}

	// Generate DELETE SQL for selected rows
	function generateDeleteSQL(): string {
		const table = getCurrentTableFromQuery();
		if (!table || !queryResult || selectedRows.size === 0) return '';

		// Find primary key column or use first column
		const pkIndex = tableColumns.findIndex((c) => c.isPrimary);
		const keyColumn = pkIndex >= 0 ? tableColumns[pkIndex].name : queryResult.columns[0];
		const keyColIndex = queryResult.columns.indexOf(keyColumn);

		const values = Array.from(selectedRows).map((idx) => {
			const row = filteredRows[idx];
			const val = row[keyColIndex];
			return typeof val === 'string' ? `'${val.replace(/'/g, "''")}'` : val;
		});

		return `DELETE FROM "${table.schema}"."${table.name}" WHERE "${keyColumn}" IN (${values.join(', ')});`;
	}

	// Add delete operation to pending
	function prepareDelete() {
		const sql = generateDeleteSQL();
		if (sql) {
			pendingOperations = [
				...pendingOperations,
				{
					type: 'delete',
					sql,
					rows: Array.from(selectedRows)
				}
			];
			showPreviewModal = true;
		}
		closeContextMenu();
	}

	// Edit cell
	function startEditCell(rowIndex: number, colIndex: number) {
		const row = filteredRows[rowIndex];
		editingCell = { rowIndex, colIndex };
		editingCellValue = row[colIndex] === null ? '' : String(row[colIndex]);
		closeContextMenu();
	}

	function saveEditCell() {
		if (!editingCell || !queryResult) return;

		const table = getCurrentTableFromQuery();
		if (!table) return;

		const pkIndex = tableColumns.findIndex((c) => c.isPrimary);
		const keyColumn = pkIndex >= 0 ? tableColumns[pkIndex].name : queryResult.columns[0];
		const keyColIndex = queryResult.columns.indexOf(keyColumn);

		const row = filteredRows[editingCell.rowIndex];
		const keyVal = row[keyColIndex];
		const keyValStr = typeof keyVal === 'string' ? `'${keyVal.replace(/'/g, "''")}'` : keyVal;

		const colName = queryResult.columns[editingCell.colIndex];
		const newVal = editingCellValue === '' ? 'NULL' : `'${editingCellValue.replace(/'/g, "''")}'`;

		const sql = `UPDATE "${table.schema}"."${table.name}" SET "${colName}" = ${newVal} WHERE "${keyColumn}" = ${keyValStr};`;

		pendingOperations = [...pendingOperations, { type: 'update', sql }];
		showPreviewModal = true;
		editingCell = null;
		editingCellValue = '';
	}

	function cancelEditCell() {
		editingCell = null;
		editingCellValue = '';
	}

	// Insert form
	async function openInsertForm() {
		const table = getCurrentTableFromQuery();
		if (!table) {
			queryError = 'Could not determine table from query. Run a SELECT query first.';
			return;
		}
		currentTableForInsert = table;
		await loadTableColumns(table);
		insertFormData = {};
		tableColumns.forEach((col) => {
			insertFormData[col.name] = '';
		});
		showInsertForm = true;
		closeContextMenu();
	}

	function generateInsertSQL(): string {
		if (!currentTableForInsert || tableColumns.length === 0) return '';

		const columns: string[] = [];
		const values: string[] = [];

		for (const col of tableColumns) {
			const val = insertFormData[col.name];
			if (val !== '' && val !== undefined) {
				columns.push(`"${col.name}"`);
				values.push(`'${val.replace(/'/g, "''")}'`);
			} else if (!col.nullable && !col.isPrimary) {
				// Required field is empty
				columns.push(`"${col.name}"`);
				values.push('NULL');
			}
		}

		if (columns.length === 0) return '';

		return `INSERT INTO "${currentTableForInsert.schema}"."${currentTableForInsert.name}" (${columns.join(', ')}) VALUES (${values.join(', ')});`;
	}

	function prepareInsert() {
		const sql = generateInsertSQL();
		if (sql) {
			pendingOperations = [...pendingOperations, { type: 'insert', sql }];
			showPreviewModal = true;
			showInsertForm = false;
		}
	}

	// Execute pending operations
	async function executePendingOperations() {
		if (!selectedConnection || pendingOperations.length === 0) return;

		isLoading = true;
		queryError = '';

		try {
			for (const op of pendingOperations) {
				await invoke('pg_execute_query', {
					connection: selectedConnection,
					query: op.sql
				});
			}
			// Refresh data
			await executeQuery();
			selectedRows = new SvelteSet();
		} catch (e) {
			queryError = String(e);
		}

		pendingOperations = [];
		showPreviewModal = false;
		isLoading = false;
	}

	function cancelPendingOperations() {
		pendingOperations = [];
		showPreviewModal = false;
	}

	function removeOperation(index: number) {
		pendingOperations = pendingOperations.filter((_, i) => i !== index);
		if (pendingOperations.length === 0) {
			showPreviewModal = false;
		}
	}

	// SQL Syntax highlighting
	const SQL_KEYWORDS = [
		'SELECT',
		'FROM',
		'WHERE',
		'AND',
		'OR',
		'NOT',
		'IN',
		'LIKE',
		'BETWEEN',
		'JOIN',
		'INNER',
		'LEFT',
		'RIGHT',
		'OUTER',
		'ON',
		'AS',
		'DISTINCT',
		'ORDER',
		'BY',
		'ASC',
		'DESC',
		'LIMIT',
		'OFFSET',
		'GROUP',
		'HAVING',
		'INSERT',
		'INTO',
		'VALUES',
		'UPDATE',
		'SET',
		'DELETE',
		'CREATE',
		'TABLE',
		'ALTER',
		'DROP',
		'INDEX',
		'VIEW',
		'TRIGGER',
		'FUNCTION',
		'PROCEDURE',
		'PRIMARY',
		'KEY',
		'FOREIGN',
		'REFERENCES',
		'UNIQUE',
		'CHECK',
		'DEFAULT',
		'NULL',
		'TRUE',
		'FALSE',
		'CASE',
		'WHEN',
		'THEN',
		'ELSE',
		'END',
		'COUNT',
		'SUM',
		'AVG',
		'MIN',
		'MAX',
		'COALESCE',
		'NULLIF',
		'CAST',
		'UNION',
		'ALL',
		'EXCEPT',
		'INTERSECT',
		'EXISTS',
		'ANY',
		'SOME'
	];

	function highlightSQL(sql: string): string {
		let result = sql.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

		// Highlight strings
		result = result.replace(/'([^']*)'/g, '<span class="text-green-500">\'$1\'</span>');

		// Highlight numbers
		result = result.replace(/\b(\d+\.?\d*)\b/g, '<span class="text-orange-500">$1</span>');

		// Highlight keywords
		const keywordRegex = new RegExp(`\\b(${SQL_KEYWORDS.join('|')})\\b`, 'gi');
		result = result.replace(keywordRegex, '<span class="text-blue-500 font-semibold">$1</span>');

		// Highlight comments
		result = result.replace(/(--.*$)/gm, '<span class="text-slate-400 italic">$1</span>');

		return result;
	}

	// Click outside handler for dropdowns
	function handleClickOutside(_event: MouseEvent) {
		if (showFilterDropdown) {
			showFilterDropdown = null;
		}
		if (contextMenu) {
			closeContextMenu();
		}
	}
</script>

<svelte:window onclick={handleClickOutside} />

<div class="flex h-full flex-col">
	<!-- Header -->
	<div class="mb-4 flex items-center justify-between">
		<div class="flex items-center gap-3">
			<div class="rounded-lg bg-accent-500/10 p-2">
				<Database class="h-6 w-6 text-accent-500" />
			</div>
			<div>
				<h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">PostgreSQL</h1>
				<p class="text-sm text-slate-600 dark:text-slate-400">Connect and query your databases</p>
			</div>
		</div>
	</div>

	<div class="flex min-h-0 flex-1 gap-4">
		<!-- Sidebar: Connections (collapsible) -->
		<div
			class={cn(
				'flex flex-shrink-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition-all duration-200 dark:border-slate-800 dark:bg-slate-900',
				connectionsPanelCollapsed ? 'w-12' : 'w-64'
			)}
		>
			<div class="flex items-center justify-between border-b border-slate-200 p-3 dark:border-slate-800">
				{#if !connectionsPanelCollapsed}
					<span class="text-sm font-medium text-slate-700 dark:text-slate-300">Connections</span>
					<div class="flex items-center gap-1">
						<button onclick={() => openAddFolderModal()} class="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800" title="Add folder">
							<FolderPlus class="h-4 w-4" />
						</button>
						<button onclick={() => openAddModal()} class="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800" title="Add connection">
							<Plus class="h-4 w-4" />
						</button>
						<button onclick={() => (connectionsPanelCollapsed = true)} class="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800" title="Collapse">
							<PanelLeftClose class="h-4 w-4" />
						</button>
					</div>
				{:else}
					<button onclick={() => (connectionsPanelCollapsed = false)} class="mx-auto rounded-md p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800" title="Expand">
						<PanelLeft class="h-4 w-4" />
					</button>
				{/if}
			</div>

			{#if !connectionsPanelCollapsed}
				<div class="flex-1 space-y-1 overflow-y-auto p-2">
					<!-- Root connections -->
					{#each getConnectionsByFolder('') as conn, i (i)}
						<div
							class={cn(
								'group flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5',
								selectedConnection?.id === conn.id ? 'bg-accent-500/10 text-accent-600 dark:text-accent-400' : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
							)}
						>
							<button onclick={() => connectToDb(conn)} class="flex flex-1 items-center gap-2 truncate text-left text-sm">
								<Database class="h-4 w-4 flex-shrink-0" />
								<span class="truncate">{conn.name}</span>
							</button>
							<button onclick={() => openEditModal(conn)} class="rounded p-1 opacity-0 group-hover:opacity-100 hover:bg-slate-200 dark:hover:bg-slate-700">
								<Edit2 class="h-3 w-3" />
							</button>
							<button onclick={() => deleteConnection(conn.id)} class="rounded p-1 text-red-500 opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/30">
								<Trash2 class="h-3 w-3" />
							</button>
						</div>
					{/each}

					<!-- Nested Folders -->
					{#snippet renderFolder(node: FolderNode, depth: number = 0)}
						<div style="margin-left: {depth * 12}px">
							<div class="group flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800" onclick={() => toggleFolder(node.path)}>
								<span class="p-0.5">
									{#if expandedFolders.has(node.path)}
										<FolderOpen class="h-4 w-4 text-amber-500" />
									{:else}
										<Folder class="h-4 w-4 text-amber-500" />
									{/if}
								</span>
								<span class="flex-1 truncate text-sm font-medium text-slate-600 dark:text-slate-400">{node.name}</span>
								<button
									onclick={(e) => {
										e.stopPropagation();
										openAddFolderModal(node.path);
									}}
									class="rounded p-1 opacity-0 group-hover:opacity-100 hover:bg-slate-200 dark:hover:bg-slate-700"
									title="Add subfolder"
								>
									<FolderPlus class="h-3 w-3" />
								</button>
								<button
									onclick={(e) => {
										e.stopPropagation();
										openAddModal(node.path);
									}}
									class="rounded p-1 opacity-0 group-hover:opacity-100 hover:bg-slate-200 dark:hover:bg-slate-700"
									title="Add connection"
								>
									<Plus class="h-3 w-3" />
								</button>
								<button
									onclick={(e) => {
										e.stopPropagation();
										deleteFolder(node.path);
									}}
									class="rounded p-1 text-red-500 opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/30"
								>
									<Trash2 class="h-3 w-3" />
								</button>
							</div>
							{#if expandedFolders.has(node.path)}
								<div class="ml-2 space-y-1">
									<!-- Connections in this folder -->
									{#each getConnectionsByFolder(node.path) as conn, i (i)}
										<div
											class={cn(
												'group flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5',
												selectedConnection?.id === conn.id ? 'bg-accent-500/10 text-accent-600 dark:text-accent-400' : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
											)}
										>
											<button onclick={() => connectToDb(conn)} class="flex flex-1 items-center gap-2 truncate text-left text-sm">
												<Database class="h-4 w-4 flex-shrink-0" />
												<span class="truncate">{conn.name}</span>
											</button>
											<button onclick={() => openEditModal(conn)} class="rounded p-1 opacity-0 group-hover:opacity-100 hover:bg-slate-200 dark:hover:bg-slate-700">
												<Edit2 class="h-3 w-3" />
											</button>
											<button onclick={() => deleteConnection(conn.id)} class="rounded p-1 text-red-500 opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/30">
												<Trash2 class="h-3 w-3" />
											</button>
										</div>
									{/each}
									<!-- Subfolders -->
									{#each node.children as child, i (i)}
										{@render renderFolder(child, depth + 1)}
									{/each}
								</div>
							{/if}
						</div>
					{/snippet}

					{#each folderTree as folder, i (i)}
						{@render renderFolder(folder)}
					{/each}

					{#if connections.length === 0 && folders.length === 0}
						<div class="py-8 text-center text-sm text-slate-400 dark:text-slate-500">No connections yet</div>
					{/if}
				</div>
			{:else}
				<!-- Collapsed view: show icons only -->
				<div class="flex-1 space-y-1 overflow-y-auto p-1">
					{#each connections as conn, i (i)}
						<button
							onclick={() => connectToDb(conn)}
							class={cn(
								'flex w-full items-center justify-center rounded-lg p-2',
								selectedConnection?.id === conn.id ? 'bg-accent-500/10 text-accent-600 dark:text-accent-400' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
							)}
							title={conn.name}
						>
							<Database class="h-4 w-4" />
						</button>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Main Area -->
		<div class="flex min-w-0 flex-1 flex-col gap-4">
			{#if selectedConnection}
				<!-- Tables List -->
				<div class="flex-shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
					<div class="flex items-center justify-between border-b border-slate-200 p-3 dark:border-slate-800">
						<span class="text-sm font-medium text-slate-700 dark:text-slate-300">
							Tables - {selectedConnection.name}
						</span>
						<button onclick={loadTables} disabled={isLoading} class="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-800">
							<RefreshCw class={cn('h-4 w-4', isLoading && 'animate-spin')} />
						</button>
					</div>
					<div class="flex max-h-32 flex-wrap gap-2 overflow-y-auto p-2">
						{#each tables as table, i (i)}
							<button
								onclick={() => selectTable(table)}
								class="flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
							>
								<Table class="h-3 w-3" />
								{table.schema}.{table.name}
							</button>
						{/each}
					</div>
				</div>

				<!-- Query Editor with Syntax Highlighting -->
				<div class="flex-shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
					<div class="flex items-center justify-between border-b border-slate-200 p-3 dark:border-slate-800">
						<span class="text-sm font-medium text-slate-700 dark:text-slate-300">Query</span>
						<div class="flex items-center gap-2">
							<button
								onclick={openInsertForm}
								disabled={!selectedConnection || !getCurrentTableFromQuery()}
								class="flex items-center gap-1.5 rounded-md bg-green-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-600 disabled:opacity-50"
								title="Insert new row"
							>
								<PlusCircle class="h-4 w-4" />
								Insert
							</button>
							<button
								onclick={executeQuery}
								disabled={isLoading || !query.trim()}
								class="flex items-center gap-1.5 rounded-md bg-accent-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-600 disabled:opacity-50"
							>
								{#if isLoading}
									<Loader2 class="h-4 w-4 animate-spin" />
								{:else}
									<Play class="h-4 w-4" />
								{/if}
								Run
							</button>
						</div>
					</div>
					<div class="relative">
						<!-- Highlighted overlay -->
						<!-- eslint-disable-next-line svelte/no-at-html-tags -->
						<pre class="pointer-events-none absolute inset-0 overflow-hidden p-3 font-mono text-sm break-words whitespace-pre-wrap" aria-hidden="true">{@html highlightSQL(query)}</pre>
						<!-- Textarea -->
						<textarea
							bind:value={query}
							placeholder="SELECT * FROM table_name"
							class="relative z-10 h-32 w-full resize-none bg-transparent p-3 font-mono text-sm text-transparent placeholder-slate-400 caret-slate-900 focus:outline-none dark:caret-slate-100"
							spellcheck="false"
							onkeydown={(e) => {
								if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
									executeQuery();
								}
							}}
						></textarea>
					</div>
					<div class="border-t border-slate-100 px-3 py-1.5 text-xs text-slate-400 dark:border-slate-800">
						Press <kbd class="rounded bg-slate-100 px-1 py-0.5 dark:bg-slate-800">⌘</kbd> + <kbd class="rounded bg-slate-100 px-1 py-0.5 dark:bg-slate-800">Enter</kbd> to run
					</div>
				</div>

				<!-- Results -->
				<div class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
					<div class="flex flex-shrink-0 items-center justify-between border-b border-slate-200 p-3 dark:border-slate-800">
						<div class="flex items-center gap-3">
							<span class="text-sm font-medium text-slate-700 dark:text-slate-300">
								Results {queryResult ? `(${filteredRows.length}${columnFilters.length > 0 ? ` of ${queryResult.row_count}` : ''} rows)` : ''}
							</span>
							{#if selectedRows.size > 0}
								<span class="rounded-full bg-accent-500/10 px-2 py-0.5 text-xs text-accent-600 dark:text-accent-400">
									{selectedRows.size} selected
								</span>
							{/if}
						</div>
						<div class="flex items-center gap-2">
							{#if columnFilters.length > 0}
								<button onclick={clearAllFilters} class="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
									<FilterX class="h-3 w-3" />
									Clear filters
								</button>
							{/if}
						</div>
					</div>

					<!-- Active filters -->
					{#if columnFilters.length > 0}
						<div class="flex flex-wrap gap-2 border-b border-slate-100 px-3 py-2 dark:border-slate-800">
							{#each columnFilters as filter, i (i)}
								<span class="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
									<Filter class="h-3 w-3" />
									{filter.column}: "{filter.value}"
									<button onclick={() => removeColumnFilter(filter.column)} class="ml-1 hover:text-blue-900 dark:hover:text-blue-100">
										<X class="h-3 w-3" />
									</button>
								</span>
							{/each}
						</div>
					{/if}

					{#if queryError}
						<div class="p-4 text-sm text-red-500 dark:text-red-400">
							{queryError}
						</div>
					{:else if queryResult}
						<div class="flex-1 overflow-auto">
							<table class="w-full text-sm">
								<thead class="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800">
									<tr>
										{#each queryResult.columns as col, i (i)}
											<th class="relative border-b border-slate-200 px-3 py-2 text-left font-medium text-slate-700 dark:border-slate-700 dark:text-slate-300">
												<button
													onclick={(e) => {
														e.stopPropagation();
														showFilterDropdown = showFilterDropdown === col ? null : col;
														filterInputValue = '';
													}}
													class={cn('flex items-center gap-1 hover:text-accent-500', columnFilters.some((f) => f.column === col) && 'text-blue-500')}
												>
													{col}
													<Filter class="h-3 w-3 opacity-50" />
												</button>

												<!-- Filter dropdown -->
												{#if showFilterDropdown === col}
													<div
														class="absolute top-full left-0 z-20 mt-1 w-48 rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900"
														onclick={(e) => e.stopPropagation()}
													>
														<div class="p-2">
															<input
																type="text"
																bind:value={filterInputValue}
																placeholder="Filter value..."
																class="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
																onkeydown={(e) => {
																	if (e.key === 'Enter') {
																		addColumnFilter(col, filterInputValue);
																	}
																}}
															/>
														</div>
														<div class="border-t border-slate-100 p-1 dark:border-slate-800">
															<button
																onclick={() => addColumnFilter(col, filterInputValue)}
																disabled={!filterInputValue.trim()}
																class="w-full rounded px-2 py-1.5 text-left text-xs hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-800"
															>
																Apply filter
															</button>
															{#if columnFilters.some((f) => f.column === col)}
																<button onclick={() => removeColumnFilter(col)} class="w-full rounded px-2 py-1.5 text-left text-xs text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800">
																	Remove filter
																</button>
															{/if}
														</div>
													</div>
												{/if}
											</th>
										{/each}
									</tr>
								</thead>
								<tbody>
									{#each filteredRows as row, rowIdx (rowIdx)}
										<tr
											class={cn('cursor-pointer', selectedRows.has(rowIdx) ? 'bg-accent-500/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50')}
											onclick={(e) => toggleRowSelection(rowIdx, e)}
											oncontextmenu={(e) => handleContextMenu(e, rowIdx)}
										>
											{#each row as cell, colIdx (`${rowIdx}-${colIdx}`)}
												<td class="border-b border-slate-100 px-3 py-2 font-mono text-slate-600 dark:border-slate-800 dark:text-slate-400" ondblclick={() => startEditCell(rowIdx, colIdx)}>
													{#if editingCell?.rowIndex === rowIdx && editingCell?.colIndex === colIdx}
														<input
															type="text"
															bind:value={editingCellValue}
															class="w-full rounded border border-accent-500 bg-white px-1 py-0.5 text-sm dark:bg-slate-800"
															onkeydown={(e) => {
																if (e.key === 'Enter') saveEditCell();
																if (e.key === 'Escape') cancelEditCell();
															}}
															onblur={cancelEditCell}
														/>
													{:else}
														<span class={cell === null ? 'text-slate-400 italic' : ''}>
															{cell === null ? 'NULL' : String(cell)}
														</span>
													{/if}
												</td>
											{/each}
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{:else}
						<div class="flex flex-1 items-center justify-center text-sm text-slate-400 dark:text-slate-500">Run a query to see results</div>
					{/if}
				</div>
			{:else}
				<!-- No connection selected -->
				<div class="flex flex-1 items-center justify-center">
					<div class="text-center">
						{#if isConnecting}
							<Loader2 class="mx-auto mb-3 h-8 w-8 animate-spin text-accent-500" />
							<p class="text-slate-600 dark:text-slate-400">Connecting...</p>
						{:else if queryError}
							<X class="mx-auto mb-3 h-8 w-8 text-red-500" />
							<p class="mb-2 text-red-500">Connection failed</p>
							<p class="max-w-md text-sm text-slate-500 dark:text-slate-400">{queryError}</p>
						{:else}
							<Database class="mx-auto mb-3 h-8 w-8 text-slate-400" />
							<p class="text-slate-600 dark:text-slate-400">Select a connection to start</p>
						{/if}
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>

<!-- Add/Edit Connection Modal -->
{#if showAddModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onclick={() => (showAddModal = false)}>
		<div class="m-4 w-full max-w-md rounded-xl bg-white shadow-xl dark:bg-slate-900" onclick={(e) => e.stopPropagation()}>
			<div class="border-b border-slate-200 p-4 dark:border-slate-800">
				<h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">
					{editingConnection ? 'Edit Connection' : 'New Connection'}
				</h2>
			</div>
			<div class="space-y-4 p-4">
				<div>
					<label class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Name</label>
					<input
						type="text"
						bind:value={formName}
						placeholder="My Database"
						class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
					/>
				</div>
				<div class="grid grid-cols-3 gap-3">
					<div class="col-span-2">
						<label class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Host</label>
						<input
							type="text"
							bind:value={formHost}
							placeholder="localhost"
							class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
						/>
					</div>
					<div>
						<label class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Port</label>
						<input
							type="number"
							bind:value={formPort}
							placeholder="5432"
							class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
						/>
					</div>
				</div>
				<div>
					<label class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Database</label>
					<input
						type="text"
						bind:value={formDatabase}
						placeholder="postgres"
						class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
					/>
				</div>
				<div>
					<label class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">User</label>
					<input
						type="text"
						bind:value={formUser}
						placeholder="postgres"
						class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
					/>
				</div>
				<div>
					<label class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
					<input
						type="password"
						bind:value={formPassword}
						placeholder="••••••••"
						class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
					/>
				</div>
				{#if folders.length > 0}
					<div>
						<label class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Folder</label>
						<Select
							value={formFolder}
							options={[{ value: '', label: 'No folder' }, ...getAllFolderPaths().map((f) => ({ value: f, label: f }))]}
							onchange={(v) => (formFolder = v)}
							searchable={getAllFolderPaths().length > 5}
							class="w-full"
						/>
					</div>
				{/if}
			</div>
			<div class="flex justify-end gap-2 border-t border-slate-200 p-4 dark:border-slate-800">
				<button onclick={() => (showAddModal = false)} class="rounded-lg px-4 py-2 text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"> Cancel </button>
				<button
					onclick={saveConnection}
					disabled={!formName || !formHost || !formDatabase || !formUser}
					class="rounded-lg bg-accent-500 px-4 py-2 font-medium text-white hover:bg-accent-600 disabled:opacity-50"
				>
					<Save class="mr-1 inline h-4 w-4" />
					Save
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Add Folder Modal -->
{#if showAddFolder}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onclick={() => (showAddFolder = false)}>
		<div class="m-4 w-full max-w-sm rounded-xl bg-white shadow-xl dark:bg-slate-900" onclick={(e) => e.stopPropagation()}>
			<div class="border-b border-slate-200 p-4 dark:border-slate-800">
				<h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">
					{parentFolderForNew ? `New Subfolder in "${parentFolderForNew}"` : 'New Folder'}
				</h2>
			</div>
			<div class="p-4">
				<input
					type="text"
					bind:value={newFolderName}
					placeholder="Folder name"
					class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
					onkeydown={(e) => e.key === 'Enter' && addFolder()}
				/>
			</div>
			<div class="flex justify-end gap-2 border-t border-slate-200 p-4 dark:border-slate-800">
				<button
					onclick={() => {
						showAddFolder = false;
						parentFolderForNew = '';
					}}
					class="rounded-lg px-4 py-2 text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
				>
					Cancel
				</button>
				<button onclick={addFolder} disabled={!newFolderName} class="rounded-lg bg-accent-500 px-4 py-2 font-medium text-white hover:bg-accent-600 disabled:opacity-50"> Create </button>
			</div>
		</div>
	</div>
{/if}

<!-- Context Menu -->
{#if contextMenu}
	<div
		class="fixed z-50 min-w-40 rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900"
		style="left: {contextMenu.x}px; top: {contextMenu.y}px;"
		onclick={(e) => e.stopPropagation()}
	>
		<button
			onclick={() => {
				startEditCell(contextMenu!.rowIndex, 0);
			}}
			class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
		>
			<Edit2 class="h-4 w-4" />
			Edit Row
		</button>
		<button
			onclick={async () => {
				const table = getCurrentTableFromQuery();
				if (table) await loadTableColumns(table);
				prepareDelete();
			}}
			class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
		>
			<Trash2 class="h-4 w-4" />
			Delete {selectedRows.size > 1 ? `${selectedRows.size} Rows` : 'Row'}
		</button>
		<div class="my-1 border-t border-slate-100 dark:border-slate-800"></div>
		<button onclick={openInsertForm} class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800">
			<PlusCircle class="h-4 w-4" />
			Insert New Row
		</button>
	</div>
{/if}

<!-- Preview Operations Modal -->
{#if showPreviewModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onclick={cancelPendingOperations}>
		<div class="m-4 flex max-h-[80vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-xl dark:bg-slate-900" onclick={(e) => e.stopPropagation()}>
			<div class="border-b border-slate-200 p-4 dark:border-slate-800">
				<h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">Preview Changes</h2>
				<p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Review the SQL that will be executed</p>
			</div>
			<div class="flex-1 space-y-3 overflow-y-auto p-4">
				{#each pendingOperations as op, idx (idx)}
					<div class="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
						<div class="flex items-center justify-between bg-slate-50 px-3 py-2 dark:bg-slate-800">
							<span
								class={cn(
									'rounded px-2 py-0.5 text-xs font-medium',
									op.type === 'delete' && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
									op.type === 'update' && 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
									op.type === 'insert' && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
								)}
							>
								{op.type.toUpperCase()}
							</span>
							<button onclick={() => removeOperation(idx)} class="text-slate-400 hover:text-red-500">
								<X class="h-4 w-4" />
							</button>
						</div>
						<pre class="overflow-x-auto p-3 font-mono text-sm text-slate-700 dark:text-slate-300">{op.sql}</pre>
					</div>
				{/each}
			</div>
			<div class="flex justify-end gap-2 border-t border-slate-200 p-4 dark:border-slate-800">
				<button onclick={cancelPendingOperations} class="rounded-lg px-4 py-2 text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"> Cancel </button>
				<button
					onclick={executePendingOperations}
					disabled={isLoading || pendingOperations.length === 0}
					class="flex items-center gap-2 rounded-lg bg-accent-500 px-4 py-2 font-medium text-white hover:bg-accent-600 disabled:opacity-50"
				>
					{#if isLoading}
						<Loader2 class="h-4 w-4 animate-spin" />
					{:else}
						<Check class="h-4 w-4" />
					{/if}
					Execute {pendingOperations.length}
					{pendingOperations.length === 1 ? 'Operation' : 'Operations'}
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Insert Form Modal -->
{#if showInsertForm}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onclick={() => (showInsertForm = false)}>
		<div class="m-4 flex max-h-[80vh] w-full max-w-lg flex-col rounded-xl bg-white shadow-xl dark:bg-slate-900" onclick={(e) => e.stopPropagation()}>
			<div class="border-b border-slate-200 p-4 dark:border-slate-800">
				<h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">Insert New Row</h2>
				{#if currentTableForInsert}
					<p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
						Into {currentTableForInsert.schema}.{currentTableForInsert.name}
					</p>
				{/if}
			</div>
			<div class="flex-1 space-y-3 overflow-y-auto p-4">
				{#each tableColumns as col (col.name)}
					<div>
						<label class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
							{col.name}
							<span class="ml-2 text-xs text-slate-400">
								{col.type}
								{#if col.isPrimary}
									<span class="text-amber-500">(PK)</span>
								{/if}
								{#if !col.nullable && !col.isPrimary}
									<span class="text-red-500">*</span>
								{/if}
							</span>
						</label>
						<input
							type="text"
							bind:value={insertFormData[col.name]}
							placeholder={col.isPrimary ? 'Auto-generated' : col.nullable ? 'NULL' : 'Required'}
							class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
						/>
					</div>
				{/each}
				{#if tableColumns.length === 0}
					<div class="py-8 text-center text-slate-400">
						<Loader2 class="mx-auto mb-2 h-6 w-6 animate-spin" />
						Loading columns...
					</div>
				{/if}
			</div>
			<div class="flex justify-end gap-2 border-t border-slate-200 p-4 dark:border-slate-800">
				<button onclick={() => (showInsertForm = false)} class="rounded-lg px-4 py-2 text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"> Cancel </button>
				<button
					onclick={prepareInsert}
					disabled={tableColumns.length === 0}
					class="flex items-center gap-2 rounded-lg bg-green-500 px-4 py-2 font-medium text-white hover:bg-green-600 disabled:opacity-50"
				>
					<PlusCircle class="h-4 w-4" />
					Preview Insert
				</button>
			</div>
		</div>
	</div>
{/if}
