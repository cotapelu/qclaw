import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerTodosTool } from '../extensions/tools/todos-tool.js';
import type { TodoDetails } from '../extensions/tools/todos-tool.js';
import { Text } from '@mariozechner/pi-tui';
import { unlinkSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { cwd } from 'node:process';

function deletePersistedFile(): void {
  const filePath = join(cwd(), '.pi', 'agent', 'todos.json');
  if (existsSync(filePath)) {
    try { unlinkSync(filePath); } catch {}
  }
}

// Mock ExtensionAPI with events support
const createMockApi = () => ({
  registerTool: vi.fn(),
  appendEntry: vi.fn(),
  on: vi.fn(),
  registerCommand: vi.fn(),
  registerMessageRenderer: vi.fn(),
});

// Mock Context
const createMockCtx = (entries: any[] = []) => ({
  sessionManager: {
    getEntries: vi.fn().mockReturnValue(entries),
    getBranch: vi.fn().mockReturnValue(entries),
  },
  hasUI: true,
});

describe('todos tool', () => {
  let mockApi: any;
  let mockCtx: any;
  let capturedTool: any;

  beforeEach(async () => {
    deletePersistedFile();
    vi.clearAllMocks();
    mockApi = createMockApi();

    // Capture the tool that gets registered
    mockApi.registerTool.mockImplementation((tool: any) => {
      capturedTool = tool;
    });

    mockCtx = createMockCtx();
    registerTodosTool(mockApi);
    // Clear any previous state
    try {
      await capturedTool.execute('reset', { action: 'clear' }, undefined, undefined, mockCtx);
    } catch {}
  });

  it('should register the tool', () => {
    // registerTodosTool already called in beforeEach
    expect(mockApi.registerTool).toHaveBeenCalledTimes(1);
    expect(capturedTool).toBeDefined();
    expect(capturedTool.name).toBe('todos');
  });

  it('should have promptSnippet and promptGuidelines', () => {
    // Already registered in beforeEach
    expect(capturedTool.promptSnippet).toContain('todos({ action:');
    expect(capturedTool.promptSnippet).toContain('add');
    expect(capturedTool.promptSnippet).toContain('add_phase');
    expect(capturedTool.promptGuidelines.some((g: string) => g.includes("PHASE") || g.includes("ADD"))).toBe(true);
  });

  it('should list todos from tool result state (empty)', async () => {
    registerTodosTool(mockApi);
    const params = { action: 'list' };
    const result = await capturedTool.execute('list-empty', params, undefined, undefined, mockCtx);
    expect(result.content[0].text).toContain('No todos');
    expect(result.details.action).toBe('list');
    expect((result.details as TodoDetails).todos).toEqual([]);
  });

  it('should add todos with optional priority and due', async () => {
    registerTodosTool(mockApi);
    const params = { action: 'add', items: ['Task 1', 'Task 2'], priority: 'high', due: '2025-12-31' };
    const result = await capturedTool.execute('add', params, undefined, undefined, mockCtx);
    expect(mockApi.appendEntry).toHaveBeenCalledTimes(2);
    // Check first entry contains correct fields (id can vary)
    expect(mockApi.appendEntry).toHaveBeenNthCalledWith(1, 'todos', expect.objectContaining({ text: 'Task 1', done: false, priority: 'high', due: '2025-12-31' }));
    const details = result.details as TodoDetails;
    expect(details.affectedIds).toHaveLength(2);
    expect(result.content[0].text).toContain('Added 2 todo(s)');
    expect(details.action).toBe('add');
    expect(details.todos.length).toBe(2);
  });

  it('should add single todo without optional fields', async () => {
    registerTodosTool(mockApi);
    const params = { action: 'add', items: ['Single task'] };
    const result = await capturedTool.execute('add-single', params, undefined, undefined, mockCtx);
    expect(mockApi.appendEntry).toHaveBeenCalledTimes(1);
    const details = result.details as TodoDetails;
    expect(details.affectedIds).toHaveLength(1);
    expect(result.content[0].text).toContain('Added 1 todo(s)');
  });

  it('should toggle todo done status', async () => {
    registerTodosTool(mockApi);
    await capturedTool.execute('add1', { action: 'add', items: ['Task'] }, undefined, undefined, mockCtx);
    const result = await capturedTool.execute('toggle', { action: 'edit', id: 1, updates: { done: true } }, undefined, undefined, mockCtx);
    // Check appendEntry called with a todo that has done: true (id may vary)
    expect(mockApi.appendEntry).toHaveBeenCalledWith('todos', expect.objectContaining({ done: true }));
    expect(result.content[0].text).toContain('Edited todo');
    expect(result.details.action).toBe('edit');
    expect((result.details as TodoDetails).todos[0].done).toBe(true);
  });

  it('should handle toggle with non-existent id', async () => {
    registerTodosTool(mockApi);
    const params = { action: 'edit', id: 999, updates: { done: true } };
    const result = await capturedTool.execute('toggle-fail', params, undefined, undefined, mockCtx);
    expect(result.isError).toBe(false); // Not an exception, but error in details
    expect(result.details.error).toBe('#999 not found');
  });

  it('should delete a todo', async () => {
    registerTodosTool(mockApi);
    await capturedTool.execute('add1', { action: 'add', items: ['Task 1', 'Task 2'] }, undefined, undefined, mockCtx);
    const result = await capturedTool.execute('delete', { action: 'delete', ids: 1 }, undefined, undefined, mockCtx);
    // Check deleted flag (id may vary)
    expect(mockApi.appendEntry).toHaveBeenCalledWith('todos', expect.objectContaining({ _deleted: true }));
    expect(result.content[0].text).toContain('Deleted 1 todo(s)');
    const details = result.details as TodoDetails;
    expect(details.todos.length).toBe(1);
    expect(details.todos[0].text).toBe('Task 2');
  });

  it('should clear all todos', async () => {
    registerTodosTool(mockApi);
    await capturedTool.execute('add1', { action: 'add', items: ['Task 1', 'Task 2'] }, undefined, undefined, mockCtx);
    expect(mockApi.appendEntry).toHaveBeenCalledTimes(2);
    const result = await capturedTool.execute('clear', { action: 'clear' }, undefined, undefined, mockCtx);
    // 2 additional appendEntry calls for cleared todos
    expect(mockApi.appendEntry).toHaveBeenCalledTimes(4);
    expect(result.content[0].text).toContain('Cleared 2 todos');
    const details = result.details as TodoDetails;
    expect(details.todos).toEqual([]);
  });

  it('should compute stats correctly', async () => {
    registerTodosTool(mockApi);
    const r1 = await capturedTool.execute('add1', { action: 'add', items: ['T1'], priority: 'high' }, undefined, undefined, mockCtx);
    const r2 = await capturedTool.execute('add2', { action: 'add', items: ['T2'], priority: 'high' }, undefined, undefined, mockCtx);
    const r3 = await capturedTool.execute('add3', { action: 'add', items: ['T3'], priority: 'low' }, undefined, undefined, mockCtx);
    const details1 = r1.details as TodoDetails;
    const id1 = details1.affectedIds?.[0];
    expect(id1).toBeDefined();
    await capturedTool.execute('toggle1', { action: 'edit', id: id1, updates: { done: true } }, undefined, undefined, mockCtx);
    const result = await capturedTool.execute('list', { action: 'list' }, undefined, undefined, mockCtx);
    const details = result.details as TodoDetails;
    expect(details.stats?.total).toBe(3);
    expect(details.stats?.done).toBe(1);
    expect(details.stats?.pending).toBe(2);
    expect(details.stats?.byPriority.high).toBe(2);
    expect(details.stats?.byPriority.low).toBe(1);
  });

  // ============================================================================
  // Rendering Tests
  // ============================================================================
  describe('rendering', () => {
    let theme: any;

    beforeEach(() => {
      theme = {
        fg: vi.fn().mockImplementation((color: string, text?: string) => text || color),
        bold: vi.fn().mockReturnValue('bold'),
        dim: 'dim',
        accent: 'accent',
        success: 'success',
        error: 'error',
        warning: 'warning',
        text: 'text',
        muted: 'muted',
        borderMuted: 'borderMuted'
      } as any;
    });

    it('should render call with action and optional fields', () => {
      registerTodosTool(mockApi);
      const call = capturedTool.renderCall({ action: 'add', items: ['test'], priority: 'high', id: 5 }, theme, {});
      expect(call).toBeInstanceOf(Text);
    });

    it('should render result for list action (not expanded)', () => {
      registerTodosTool(mockApi);
      const todos = [
        { id: 1, text: 'A', done: false },
        { id: 2, text: 'B', done: true },
      ];
      const result = {
        content: [{ type: 'text', text: 'list' }],
        details: {
          action: 'list',
          todos,
          nextId: 3,
          stats: { total: 2, done: 1, pending: 1, byPriority: { low: 0, medium: 0, high: 0, critical: 0 } }
        }
      } as any;
      const comp = capturedTool.renderResult(result, { expanded: false, isPartial: false }, theme, {});
      expect(comp).toBeInstanceOf(Text);
    });

    it('should render result for list expanded', () => {
      registerTodosTool(mockApi);
      const todos = [
        { id: 1, text: 'A', done: false, priority: 'high' },
        { id: 2, text: 'B', done: true, priority: 'low' },
      ];
      const result = {
        content: [{ type: 'text', text: 'list' }],
        details: {
          action: 'list',
          todos,
          nextId: 3,
          stats: { total: 2, done: 1, pending: 1, byPriority: { low: 1, medium: 0, high: 1, critical: 0 } }
        }
      } as any;
      const comp = capturedTool.renderResult(result, { expanded: true, isPartial: false }, theme, {});
      expect(comp).toBeInstanceOf(Text);
    });

    it('should render result for add action', () => {
      registerTodosTool(mockApi);
      const todos = [{ id: 1, text: 'New', done: false, priority: 'high' }];
      const result = {
        content: [{ type: 'text', text: 'Added' }],
        details: {
          action: 'add',
          todos,
          nextId: 2,
          stats: { total: 1, done: 0, pending: 1, byPriority: { low: 0, medium: 0, high: 1, critical: 0 } }
        }
      } as any;
      const comp = capturedTool.renderResult(result, { expanded: false, isPartial: false }, theme, {});
      expect(comp).toBeInstanceOf(Text);
    });

    it('should show processing when partial', () => {
      registerTodosTool(mockApi);
      const comp = capturedTool.renderResult({}, { expanded: false, isPartial: true }, theme, {});
      expect(comp).toBeInstanceOf(Text);
    });

    it('should show error when details has error', () => {
      registerTodosTool(mockApi);
      const result = {
        content: [{ type: 'text', text: '' }],
        details: { action: 'list', todos: [], nextId: 1, error: 'something broke' }
      } as any;
      const comp = capturedTool.renderResult(result, { expanded: false, isPartial: false }, theme, {});
      expect(comp).toBeInstanceOf(Text);
    });
  });

  it('should register session event listeners for state reconstruction', () => {
    registerTodosTool(mockApi);
    expect(mockApi.on).toHaveBeenCalledWith('session_start', expect.any(Function));
    expect(mockApi.on).toHaveBeenCalledWith('session_tree', expect.any(Function));
  });

  it('tool should have custom renderShell set to self', () => {
    registerTodosTool(mockApi);
    expect(capturedTool.renderShell).toBe('self');
  });
});