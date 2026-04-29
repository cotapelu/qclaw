import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerTodosTool } from '../extensions/tools/todos-tool.js';
import type { Todo, TodoDetails } from '../extensions/tools/todos-tool.js';
import { Text } from '@mariozechner/pi-tui';

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

  beforeEach(() => {
    vi.clearAllMocks();
    mockApi = createMockApi();
    // Capture the tool that gets registered
    mockApi.registerTool.mockImplementation((tool: any) => {
      capturedTool = tool;
    });
    mockCtx = createMockCtx();
  });

  it('should register the tool', () => {
    registerTodosTool(mockApi);
    expect(mockApi.registerTool).toHaveBeenCalledTimes(1);
    expect(capturedTool).toBeDefined();
    expect(capturedTool.name).toBe('todos');
  });

  it('should have promptSnippet and promptGuidelines', () => {
    registerTodosTool(mockApi);
    expect(capturedTool.promptSnippet).toBe('Manage todos: list, add, toggle, clear, delete');
    expect(capturedTool.promptGuidelines).toContain('List todos: todos() or todos({ action: \'list\' })');
    expect(capturedTool.promptGuidelines).toContain('Add: todos({ action: \'add\', items: [\'Task 1\', \'Task 2\'], priority?: \'high\', due?: \'2025-12-31\' })');
  });

  it('should list todos from tool result state (empty)', async () => {
    registerTodosTool(mockApi);
    const params = { action: 'list' };
    const result = await capturedTool.execute('list-empty', params, undefined, undefined, mockCtx);
    expect(result.content[0].text).toContain('No todos yet');
    expect(result.details.action).toBe('list');
    expect((result.details as TodoDetails).todos).toEqual([]);
  });

  it('should add todos with optional priority and due', async () => {
    registerTodosTool(mockApi);
    const params = { action: 'add', items: ['Task 1', 'Task 2'], priority: 'high', due: '2025-12-31' };
    const result = await capturedTool.execute('add', params, undefined, undefined, mockCtx);
    
    expect(mockApi.appendEntry).toHaveBeenCalledTimes(2);
    expect(mockApi.appendEntry).toHaveBeenNthCalledWith(1, 'todo', {
      text: 'Task 1',
      id: 1,
      done: false,
      priority: 'high',
      due: '2025-12-31',
      created: expect.any(Number)
    });
    expect(result.content[0].text).toContain('Added 2 todos');
    expect(result.details.action).toBe('add');
    expect((result.details as TodoDetails).todos.length).toBe(2);
  });

  it('should add single todo without optional fields', async () => {
    registerTodosTool(mockApi);
    const params = { action: 'add', items: ['Single task'] };
    const result = await capturedTool.execute('add-single', params, undefined, undefined, mockCtx);
    expect(mockApi.appendEntry).toHaveBeenCalledTimes(1);
    expect(result.content[0].text).toBe('Added 1 todo: #1');
  });

  it('should toggle todo done status', async () => {
    registerTodosTool(mockApi);
    // Add a todo first
    await capturedTool.execute('add1', { action: 'add', items: ['Task'] }, undefined, undefined, mockCtx);
    // Toggle it
    const result = await capturedTool.execute('toggle', { action: 'toggle', id: 1 }, undefined, undefined, mockCtx);

    expect(mockApi.appendEntry).toHaveBeenCalledWith('todo', expect.objectContaining({ id: 1, done: true }));
    expect(result.content[0].text).toContain('completed');
    expect(result.details.action).toBe('toggle');
    expect((result.details as TodoDetails).todos[0].done).toBe(true);
  });

  it('should handle toggle with non-existent id', async () => {
    registerTodosTool(mockApi);
    const params = { action: 'toggle', id: 999 };
    const result = await capturedTool.execute('toggle-fail', params, undefined, undefined, mockCtx);
    expect(result.isError).toBe(false); // Not an exception, but error in details
    expect(result.details.error).toBe('#999 not found');
  });

  it('should delete a todo', async () => {
    registerTodosTool(mockApi);
    // Add two todos
    await capturedTool.execute('add1', { action: 'add', items: ['Task 1', 'Task 2'] }, undefined, undefined, mockCtx);
    // Delete first
    const result = await capturedTool.execute('delete', { action: 'delete', id: 1 }, undefined, undefined, mockCtx);

    expect(mockApi.appendEntry).toHaveBeenCalledWith('todo', expect.objectContaining({ id: 1, _deleted: true }));
    expect(result.content[0].text).toContain('Deleted todo #1');
    expect((result.details as TodoDetails).todos.length).toBe(1);
    expect((result.details as TodoDetails).todos[0].id).toBe(2);
  });

  it('should clear all todos', async () => {
    registerTodosTool(mockApi);
    // Add 2 todos
    await capturedTool.execute('add1', { action: 'add', items: ['Task 1', 'Task 2'] }, undefined, undefined, mockCtx);
    expect(mockApi.appendEntry).toHaveBeenCalledTimes(2);

    const result = await capturedTool.execute('clear', { action: 'clear' }, undefined, undefined, mockCtx);

    expect(mockApi.appendEntry).toHaveBeenCalledTimes(4); // 2 from add + 2 from clear
    expect(result.content[0].text).toBe('Cleared 2 todos');
    expect((result.details as TodoDetails).todos).toEqual([]);
    expect((result.details as TodoDetails).nextId).toBe(1);
  });

  it('should compute stats correctly', async () => {
    registerTodosTool(mockApi);
    // Add 3 todos with different priorities and completion
    await capturedTool.execute('add1', { action: 'add', items: ['T1'], priority: 'high' }, undefined, undefined, mockCtx);
    await capturedTool.execute('add2', { action: 'add', items: ['T2'], priority: 'high' }, undefined, undefined, mockCtx);
    await capturedTool.execute('add3', { action: 'add', items: ['T3'], priority: 'low' }, undefined, undefined, mockCtx);
    // Mark first as done
    await capturedTool.execute('toggle1', { action: 'toggle', id: 1 }, undefined, undefined, mockCtx);

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
        details: { action: 'list', todos, nextId: 3, stats: { total: 2, done: 1, pending: 1, byPriority: { low: 0, medium: 0, high: 0, critical: 0 } } }
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
        details: { action: 'list', todos, nextId: 3, stats: { total: 2, done: 1, pending: 1, byPriority: { low: 1, medium: 0, high: 1, critical: 0 } } }
      } as any;
      const comp = capturedTool.renderResult(result, { expanded: true, isPartial: false }, theme, {});
      expect(comp).toBeInstanceOf(Text);
    });

    it('should render result for add action', () => {
      registerTodosTool(mockApi);
      const todos = [{ id: 1, text: 'New', done: false, priority: 'high' }];
      const result = {
        content: [{ type: 'text', text: 'Added' }],
        details: { action: 'add', todos, nextId: 2, stats: { total: 1, done: 0, pending: 1, byPriority: { low: 0, medium: 0, high: 1, critical: 0 } } }
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
