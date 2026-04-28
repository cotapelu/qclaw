import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerTodosTool } from '../extensions/tools/todos-tool.js';

// Mock ExtensionAPI
const createMockApi = () => ({
  registerTool: vi.fn(),
  appendEntry: vi.fn(),
});

// Mock Context
const createMockCtx = (entries: any[] = []) => ({
  sessionManager: {
    getEntries: vi.fn().mockReturnValue(entries),
  },
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

  it('should list todos when empty', async () => {
    registerTodosTool(mockApi);
    mockCtx.sessionManager.getEntries.mockReturnValue([]);

    const result = await capturedTool.execute('call1', {}, undefined, undefined, mockCtx);

    expect(result.content).toEqual([{ type: 'text', text: 'No todos yet.' }]);
    expect(result.details).toEqual([]);
  });

  it('should list todos with items', async () => {
    registerTodosTool(mockApi);

    const todos = [
      { text: 'Task 1', created: 1 },
      { text: 'Task 2', created: 2 },
    ];
    const entries = todos.map(t => ({ type: 'custom', customType: 'todo', data: t }));
    mockCtx.sessionManager.getEntries.mockReturnValue(entries);

    const result = await capturedTool.execute('call2', {}, undefined, undefined, mockCtx);

    expect(result.content[0].text).toContain('1. Task 1');
    expect(result.content[0].text).toContain('2. Task 2');
    expect(result.details).toEqual(todos);
  });

  it('should add todos', async () => {
    registerTodosTool(mockApi);

    const params = { items: ['New task', 'Another task'] };

    const result = await capturedTool.execute('call3', params, undefined, undefined, mockCtx);

    expect(mockApi.appendEntry).toHaveBeenCalledTimes(2);
    expect(mockApi.appendEntry).toHaveBeenNthCalledWith(1, 'todo', { text: 'New task', created: expect.any(Number) });
    expect(mockApi.appendEntry).toHaveBeenNthCalledWith(2, 'todo', { text: 'Another task', created: expect.any(Number) });
    expect(result.content).toEqual([{ type: 'text', text: 'Added 2 todo(s).' }]);
  });

  it('should add single todo', async () => {
    registerTodosTool(mockApi);

    const params = { items: ['Single task'] };

    const result = await capturedTool.execute('call4', params, undefined, undefined, mockCtx);

    expect(mockApi.appendEntry).toHaveBeenCalledTimes(1);
    expect(mockApi.appendEntry).toHaveBeenCalledWith('todo', { text: 'Single task', created: expect.any(Number) });
    expect(result.content).toEqual([{ type: 'text', text: 'Added 1 todo(s).' }]);
  });

  it('should have promptSnippet and promptGuidelines', () => {
    registerTodosTool(mockApi);
    expect(capturedTool.promptSnippet).toBe('Manage a todo list (add/list tasks)');
    expect(capturedTool.promptGuidelines).toEqual([
      'Add: todos({ items: ["Task 1", "Task 2"] })',
      'List: todos() → returns numbered list (1. Task 1, 2. Task 2)',
      'Mark tasks as done in your response; todos are simple items without a \'done\' flag.',
      'Use todos to track multi-step work and show progress.'
    ]);
  });

  it('should create a demo todo list', async () => {
    registerTodosTool(mockApi);

    // Simulate user asking tool to create todos
    const params = { items: ['Build PiClaw TUI', 'Add memory tool', 'Write tests', 'Deploy to npm'] };

    const result = await capturedTool.execute('demo', params, undefined, undefined, mockCtx);

    // Verify 4 todos added
    expect(mockApi.appendEntry).toHaveBeenCalledTimes(4);
    expect(mockApi.appendEntry).toHaveBeenNthCalledWith(1, 'todo', { text: 'Build PiClaw TUI', created: expect.any(Number) });
    expect(mockApi.appendEntry).toHaveBeenNthCalledWith(4, 'todo', { text: 'Deploy to npm', created: expect.any(Number) });
    expect(result.content[0].text).toBe('Added 4 todo(s).');
  });
});
