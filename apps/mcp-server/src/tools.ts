import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { DevSyncApiError, type DevSyncClient } from './client.js';
import { TASK_PRIORITIES, TASK_STATUSES } from './constants.js';

interface Workspace {
  name: string;
  slug: string;
  role: string;
}

interface Task {
  key: string;
  title: string;
  status: string;
  priority: string;
  assignee: { name: string } | null;
}

interface Project {
  name: string;
  identifier: string;
  taskCounts: { total: number; done: number };
}

const projectId = z.uuid().describe('Project UUID (from list_projects).');
const taskId = z.uuid().describe('Task UUID (from list_tasks or create_task).');
const assigneeId = z.uuid().describe('UUID of a project member.');
const status = z
  .enum(TASK_STATUSES)
  .describe('Kanban column: BACKLOG, TODO, IN_PROGRESS, IN_REVIEW or DONE.');
const priority = z.enum(TASK_PRIORITIES).describe('LOW, MEDIUM, HIGH or URGENT.');
const title = z.string().trim().min(1).max(200).describe('Task title, 1-200 characters.');
const description = z.string().max(10_000).describe('Markdown description, up to 10000 characters.');
const dueDate = z.iso.datetime({ offset: true }).describe('ISO-8601 date-time, e.g. 2026-12-31T17:00:00Z.');
const labels = z
  .array(
    z.object({
      name: z.string().trim().min(1).max(50),
      color: z.string().max(32).optional(),
    }),
  )
  .max(20)
  .describe('Labels to set. Replaces the whole label set of the task.');

const taskLine = (t: Task) =>
  `${t.key} "${t.title}" [${t.status}, ${t.priority}] ${t.assignee ? `-> ${t.assignee.name}` : '(unassigned)'}`;

function ok(summary: string, structuredContent: Record<string, unknown>): CallToolResult {
  return { content: [{ type: 'text', text: summary }], structuredContent };
}

function fail(error: unknown): CallToolResult {
  if (error instanceof DevSyncApiError) {
    return { isError: true, content: [{ type: 'text', text: `${error.code}: ${error.message}` }] };
  }
  console.error('[devsync-mcp] unexpected error:', error instanceof Error ? error.message : error);
  return {
    isError: true,
    content: [{ type: 'text', text: 'INTERNAL: unexpected error in the DevSync MCP server.' }],
  };
}

async function run(fn: () => Promise<CallToolResult>): Promise<CallToolResult> {
  try {
    return await fn();
  } catch (error) {
    return fail(error);
  }
}

export function registerTools(server: McpServer, client: DevSyncClient): void {
  server.registerTool(
    'list_workspaces',
    {
      description:
        'List the workspace this API token is bound to (a token works in exactly one workspace). Call it first to confirm your context. Requires scope workspaces:read.',
      annotations: { readOnlyHint: true },
    },
    () =>
      run(async () => {
        const res = await client.request<Workspace[]>('GET', '/workspaces');
        const names = res.data.map((w) => `${w.name} (${w.slug}, role ${w.role})`).join(', ');
        return ok(`${res.data.length} workspace(s): ${names}`, { data: res.data });
      }),
  );

  server.registerTool(
    'list_projects',
    {
      description:
        'List the projects of the token workspace, with task counts (total and done). Use the project id with list_tasks, create_task and get_project_activity. Requires scope projects:read.',
      annotations: { readOnlyHint: true },
    },
    () =>
      run(async () => {
        const res = await client.request<Project[]>('GET', '/projects');
        const lines = res.data.map(
          (p) => `${p.identifier} ${p.name} (${p.taskCounts.done}/${p.taskCounts.total} done)`,
        );
        return ok(`${res.data.length} project(s):\n${lines.join('\n')}`, { data: res.data });
      }),
  );

  server.registerTool(
    'list_tasks',
    {
      description:
        'List the tasks of a project (full board, max 500), optionally filtered by status, priority, assignee or a text query q (matches title, description and key). Requires scope tasks:read.',
      inputSchema: {
        projectId,
        status: status.optional(),
        priority: priority.optional(),
        assigneeId: assigneeId.optional(),
        q: z.string().trim().min(1).max(200).optional().describe('Case-insensitive text search.'),
      },
      annotations: { readOnlyHint: true },
    },
    ({ projectId, ...query }) =>
      run(async () => {
        const res = await client.request<Task[]>('GET', `/projects/${projectId}/tasks`, { query });
        const lines = res.data.map(taskLine);
        return ok(`${res.data.length} task(s):\n${lines.join('\n')}`, { data: res.data });
      }),
  );

  server.registerTool(
    'get_task',
    {
      description: 'Get one task by id, with its description, labels and comment count. Requires scope tasks:read.',
      inputSchema: { taskId },
      annotations: { readOnlyHint: true },
    },
    ({ taskId }) =>
      run(async () => {
        const res = await client.request<Task>('GET', `/tasks/${taskId}`);
        return ok(taskLine(res.data), { data: res.data });
      }),
  );

  server.registerTool(
    'create_task',
    {
      description:
        'Create a task in a project. Only title is required; status defaults to the first column. Requires scope tasks:write.',
      inputSchema: {
        projectId,
        title,
        description: description.optional(),
        status: status.optional(),
        priority: priority.optional(),
        assigneeId: assigneeId.optional(),
        dueDate: dueDate.optional(),
        labels: labels.optional(),
      },
    },
    ({ projectId, ...body }) =>
      run(async () => {
        const res = await client.request<Task>('POST', `/projects/${projectId}/tasks`, { body });
        return ok(`Created ${taskLine(res.data)}`, { data: res.data });
      }),
  );

  server.registerTool(
    'update_task',
    {
      description:
        'Update a task. Only the provided fields change. Setting status moves the task to that Kanban column (end of column). Use assigneeId null to unassign, dueDate null to clear it. Requires scope tasks:write.',
      inputSchema: {
        taskId,
        title: title.optional(),
        description: description.optional(),
        status: status.optional(),
        priority: priority.optional(),
        assigneeId: assigneeId.nullable().optional(),
        dueDate: dueDate.nullable().optional(),
        labels: labels.optional(),
      },
    },
    ({ taskId, ...body }) =>
      run(async () => {
        const res = await client.request<Task>('PATCH', `/tasks/${taskId}`, { body });
        return ok(`Updated ${taskLine(res.data)}`, { data: res.data });
      }),
  );

  server.registerTool(
    'assign_task',
    {
      description:
        'Assign a task to a project member, or unassign it with assigneeId null. The assignee receives a notification. Requires scope tasks:write.',
      inputSchema: { taskId, assigneeId: assigneeId.nullable() },
    },
    ({ taskId, assigneeId }) =>
      run(async () => {
        const res = await client.request<Task>('POST', `/tasks/${taskId}/assign`, {
          body: { assigneeId },
        });
        return ok(`Assigned ${taskLine(res.data)}`, { data: res.data });
      }),
  );

  server.registerTool(
    'add_task_comment',
    {
      description:
        'Add a comment to a task (visible in the task thread, marked as made via an agent). Mentions use @[Name](user:<uuid>). Requires scope comments:write.',
      inputSchema: {
        taskId,
        body: z.string().trim().min(1).max(5000).describe('Comment text, 1-5000 characters.'),
      },
    },
    ({ taskId, body }) =>
      run(async () => {
        const res = await client.request<{ id: string }>('POST', `/tasks/${taskId}/comments`, {
          body: { body },
        });
        return ok(`Comment ${res.data.id} added.`, { data: res.data });
      }),
  );

  server.registerTool(
    'get_project_activity',
    {
      description:
        'Get the activity feed of a project, most recent first, paginated. Pass nextCursor back as cursor to get the next page. Requires scope activity:read.',
      inputSchema: {
        projectId,
        limit: z.number().int().min(1).max(100).optional().describe('Page size, 1-100 (default 30).'),
        cursor: z.string().min(1).optional().describe('nextCursor from the previous page.'),
      },
      annotations: { readOnlyHint: true },
    },
    ({ projectId, limit, cursor }) =>
      run(async () => {
        const res = await client.request<unknown[]>('GET', `/projects/${projectId}/activity`, {
          query: { limit, cursor },
        });
        return ok(`${res.data.length} activity event(s).`, {
          data: res.data,
          nextCursor: res.nextCursor ?? null,
        });
      }),
  );
}
