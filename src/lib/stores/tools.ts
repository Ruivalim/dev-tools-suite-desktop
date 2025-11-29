export interface Tool {
  id: string;
  name: string;
  description: string;
  icon: string; // Lucide icon name
  category: ToolCategory;
  route: string;
}

export type ToolCategory = 'encoding' | 'database' | 'network' | 'text' | 'other';

export const categoryLabels: Record<ToolCategory, string> = {
  encoding: 'Encoding',
  database: 'Database',
  network: 'Network',
  text: 'Text',
  other: 'Other'
};

export const categoryIcons: Record<ToolCategory, string> = {
  encoding: 'Binary',
  database: 'Database',
  network: 'Globe',
  text: 'Type',
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
    id: 'postgres',
    name: 'PostgreSQL',
    description: 'Connect and query PostgreSQL databases',
    icon: 'Database',
    category: 'database',
    route: '/tools/postgres'
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
