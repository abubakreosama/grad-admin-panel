/**
 * Permission data now comes from `GET /permissions` (see lib/auth.ts).
 * This file only carries the display helper that maps a `resource:action`
 * to a friendly label/description.
 */

export const RESOURCE_LABELS: Record<string, string> = {
  agents: 'Agents',
  knowledgebases: 'Knowledge Bases',
  tools: 'Tools',
  conversations: 'Conversations',
};

export const ACTION_LABELS: Record<string, string> = {
  create: 'Create',
  read: 'Read',
  update: 'Update',
  delete: 'Delete',
};
