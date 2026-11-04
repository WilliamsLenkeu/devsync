import { afterEach, describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { DevSyncClient } from '../src/client.js';
import { createServer } from '../src/server.js';
import { startFakeApi, type FakeApi, type RecordedRequest } from './fake-api.js';

const TOKEN = 'dsk_test_0123456789abcdefghijklmnopqrstuvwxyz';
const PROJECT = '6f1c2a3e-4b5d-4e6f-8a7b-9c0d1e2f3a4b';
const TASK = '7a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d';
const USER = '8b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e';
const TASK_DATA = { key: 'DEVS-1', title: 'Fix', status: 'TODO', priority: 'LOW', assignee: null };

const TOOL_NAMES = [
  'add_task_comment',
  'assign_task',
  'create_task',
  'get_project_activity',
  'get_task',
  'list_projects',
  'list_tasks',
  'list_workspaces',
  'update_task',
];

const text = (result: CallToolResult) =>
  result.content.map((c) => (c.type === 'text' ? c.text : '')).join('\n');

let fake: FakeApi;
let mcp: Client;
let closers: (() => Promise<void>)[] = [];

async function connect(apiUrl: string): Promise<void> {
  const server = createServer({ client: new DevSyncClient(apiUrl, TOKEN) });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  mcp = new Client({ name: 'test', version: '0.0.0' });
  await mcp.connect(clientTransport);
  closers.push(async () => {
    await mcp.close();
    await server.close();
  });
}

async function setup(): Promise<void> {
  fake = await startFakeApi();
  closers.push(fake.close);
  await connect(fake.url);
}

afterEach(async () => {
  for (const close of closers.reverse()) await close();
  closers = [];
});

describe('tools/list', () => {
  it('exposes exactly the 9 DevSync tools', async () => {
    await setup();
    const { tools } = await mcp.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(TOOL_NAMES);
  });
});

describe('tool routing', () => {
  const cases: {
    tool: string;
    args: Record<string, unknown>;
    data: unknown;
    method: string;
    path: string;
    query?: Record<string, string>;
    body?: unknown;
  }[] = [
    { tool: 'list_workspaces', args: {}, data: [{ name: 'Acme', slug: 'acme', role: 'OWNER' }], method: 'GET', path: '/api/agent/workspaces' },
    { tool: 'list_projects', args: {}, data: [], method: 'GET', path: '/api/agent/projects' },
    {
      tool: 'list_tasks',
      data: [],
      args: { projectId: PROJECT, status: 'TODO', priority: 'HIGH', assigneeId: USER, q: 'login' },
      method: 'GET',
      path: `/api/agent/projects/${PROJECT}/tasks`,
      query: { status: 'TODO', priority: 'HIGH', assigneeId: USER, q: 'login' },
    },
    { tool: 'get_task', args: { taskId: TASK }, data: TASK_DATA, method: 'GET', path: `/api/agent/tasks/${TASK}` },
    {
      tool: 'create_task',
      data: TASK_DATA,
      args: { projectId: PROJECT, title: '  Fix login  ', priority: 'URGENT', labels: [{ name: 'bug' }] },
      method: 'POST',
      path: `/api/agent/projects/${PROJECT}/tasks`,
      body: { title: 'Fix login', priority: 'URGENT', labels: [{ name: 'bug' }] },
    },
    {
      tool: 'update_task',
      data: TASK_DATA,
      args: { taskId: TASK, status: 'IN_PROGRESS', assigneeId: null, dueDate: null },
      method: 'PATCH',
      path: `/api/agent/tasks/${TASK}`,
      body: { status: 'IN_PROGRESS', assigneeId: null, dueDate: null },
    },
    {
      tool: 'assign_task',
      data: TASK_DATA,
      args: { taskId: TASK, assigneeId: USER },
      method: 'POST',
      path: `/api/agent/tasks/${TASK}/assign`,
      body: { assigneeId: USER },
    },
    {
      tool: 'add_task_comment',
      data: { id: 'c1' },
      args: { taskId: TASK, body: 'Started' },
      method: 'POST',
      path: `/api/agent/tasks/${TASK}/comments`,
      body: { body: 'Started' },
    },
    {
      tool: 'get_project_activity',
      data: [],
      args: { projectId: PROJECT, limit: 10, cursor: 'c1' },
      method: 'GET',
      path: `/api/agent/projects/${PROJECT}/activity`,
      query: { limit: '10', cursor: 'c1' },
    },
  ];

  for (const c of cases) {
    it(`${c.tool} calls ${c.method} ${c.path} with the Bearer token`, async () => {
      await setup();
      fake.reply = () => ({ status: 200, body: { data: c.data } });
      const result = await mcp.callTool({ name: c.tool, arguments: c.args });

      expect(result.isError).toBeFalsy();
      expect(fake.requests).toHaveLength(1);
      const req = fake.requests[0] as RecordedRequest;
      expect(req.method).toBe(c.method);
      expect(req.path).toBe(c.path);
      expect(req.authorization).toBe(`Bearer ${TOKEN}`);
      expect(Object.fromEntries(req.query)).toEqual(c.query ?? {});
      expect(req.body).toEqual(c.body);
    });
  }

  it('returns API data as structuredContent and nextCursor for paginated lists', async () => {
    await setup();
    fake.reply = () => ({ status: 200, body: { data: [{ id: 'a' }], nextCursor: 'c2' } });
    const result = await mcp.callTool({
      name: 'get_project_activity',
      arguments: { projectId: PROJECT },
    });
    expect(result.structuredContent).toEqual({ data: [{ id: 'a' }], nextCursor: 'c2' });
    expect(text(result as CallToolResult)).toContain('1 activity event');
  });
});

describe('input validation', () => {
  it('rejects bad input without calling the API', async () => {
    await setup();
    const invalid = [
      { name: 'get_task', arguments: { taskId: 'not-a-uuid' } },
      { name: 'list_tasks', arguments: { projectId: PROJECT, status: 'DONE_NOW' } },
      { name: 'create_task', arguments: { projectId: PROJECT } },
      { name: 'update_task', arguments: { taskId: TASK, priority: 'CRITICAL' } },
      { name: 'add_task_comment', arguments: { taskId: TASK, body: '   ' } },
      { name: 'get_project_activity', arguments: { projectId: PROJECT, limit: 500 } },
      { name: 'assign_task', arguments: { taskId: TASK } },
    ];
    for (const call of invalid) {
      const result = (await mcp.callTool(call)) as CallToolResult;
      expect(result.isError).toBe(true);
      expect(text(result)).toMatch(/Input validation error/);
    }
    expect(fake.requests).toHaveLength(0);
  });
});

describe('API errors', () => {
  it('maps 401/403/404 to isError results with code and message', async () => {
    await setup();
    fake.reply = () => ({
      status: 401,
      body: { error: { code: 'UNAUTHENTICATED', message: 'Invalid API token' } },
    });
    const r401 = (await mcp.callTool({ name: 'list_projects', arguments: {} })) as CallToolResult;
    expect(r401.isError).toBe(true);
    expect(text(r401)).toBe('UNAUTHENTICATED: Invalid API token');

    fake.reply = () => ({
      status: 403,
      body: { error: { code: 'FORBIDDEN', message: 'Token lacks scope for task:write' } },
    });
    const r403 = (await mcp.callTool({
      name: 'create_task',
      arguments: { projectId: PROJECT, title: 'x' },
    })) as CallToolResult;
    expect(r403.isError).toBe(true);
    expect(text(r403)).toBe('FORBIDDEN: Token lacks scope for task:write');

    fake.reply = () => ({ status: 404, body: { error: { code: 'NOT_FOUND', message: 'Task not found' } } });
    const r404 = (await mcp.callTool({ name: 'get_task', arguments: { taskId: TASK } })) as CallToolResult;
    expect(r404.isError).toBe(true);
    expect(text(r404)).toBe('NOT_FOUND: Task not found');
  });

  it('never leaks the token into tool results', async () => {
    await setup();
    fake.reply = () => ({
      status: 500,
      body: { error: { code: 'INTERNAL', message: `echo ${TOKEN}` } },
    });
    const result = (await mcp.callTool({ name: 'list_workspaces', arguments: {} })) as CallToolResult;
    expect(result.isError).toBe(true);
    expect(JSON.stringify(result)).not.toContain(TOKEN);
  });

  it('reports network failures as isError results', async () => {
    await connect('http://127.0.0.1:1');
    const result = (await mcp.callTool({ name: 'list_projects', arguments: {} })) as CallToolResult;
    expect(result.isError).toBe(true);
    expect(text(result)).toMatch(/^NETWORK_ERROR: Cannot reach the DevSync API/);
  });
});
