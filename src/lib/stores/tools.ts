export interface Tool {
  id: string;
  name: string;
  description: string;
  icon: string; // Lucide icon name
  category: ToolCategory;
  route: string;
}

export type ToolCategory = 'encoding' | 'database' | 'network' | 'text' | 'generators' | 'other';

export const categoryLabels: Record<ToolCategory, string> = {
  encoding: 'Encoding',
  database: 'Database',
  network: 'Network',
  text: 'Text',
  generators: 'Generators',
  other: 'Other'
};

export const categoryIcons: Record<ToolCategory, string> = {
  encoding: 'Binary',
  database: 'Database',
  network: 'Globe',
  text: 'Type',
  generators: 'Sparkles',
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
    name: 'UUID Generator',
    description: 'Generate random UUIDs (v4)',
    icon: 'Fingerprint',
    category: 'generators',
    route: '/tools/uuid'
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
    id: 'snippets',
    name: 'Snippets',
    description: 'Save and organize code and text snippets',
    icon: 'StickyNote',
    category: 'text',
    route: '/tools/snippets'
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
