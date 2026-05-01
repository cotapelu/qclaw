import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerTodosTool } from '../extensions/tools/todos-tool.js';
import type { TodoToolDetails, TodoPhase } from '../extensions/tools/todos-tool.js';
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

// Mock ExtensionAPI
const createMockApi = () => ({
  registerTool: vi.fn(),
  on: vi.fn(),
  sendMessage: vi.fn().mockResolvedValue(undefined),
});

// Mock Context
const createMockCtx = (entries: any[] = []) => ({
  sessionManager: {
    getEntries: vi.fn().mockReturnValue(entries),
    getBranch: vi.fn().mockReturnValue(entries),
  },
  hasUI: true,
});

describe('todos tool (phase-only)', () => {
  let mockApi: any;
  let mockCtx: any;
  let capturedTool: any;

  beforeEach(async () => {
    deletePersistedFile();
    vi.clearAllMocks();
    mockApi = createMockApi();
    mockApi.registerTool.mockImplementation((tool: any) => { capturedTool = tool; });
    mockCtx = createMockCtx();
    registerTodosTool(mockApi);
    // Clear initial state if any
    try {
      await capturedTool.execute('clear-init', { list: {} }, undefined, undefined, mockCtx);
    } catch {}
  });

  it('should register the tool', () => {
    expect(mockApi.registerTool).toHaveBeenCalledTimes(1);
    expect(capturedTool).toBeDefined();
    expect(capturedTool.name).toBe('todos');
  });

  it('should have promptSnippet and promptGuidelines', () => {
    expect(capturedTool.promptSnippet).toContain('todos(');
    expect(capturedTool.promptSnippet).toContain('add_phase');
    expect(capturedTool.promptGuidelines.some((g: string) => g.includes('NESTED'))).toBe(true);
  });

  it('should list empty todos', async () => {
    const result = await capturedTool.execute('list', { list: {} }, undefined, undefined, mockCtx);
    const details = result.details as TodoToolDetails;
    expect(details.phases).toEqual([]);
    expect(result.content[0].text).toContain('Todo list cleared');
  });

  it('should add a phase with tasks', async () => {
    const params = {
      add_phase: {
        name: 'Phase 1',
        tasks: [{ content: 'Task 1', status: 'pending' }, { content: 'Task 2', status: 'in_progress' }]
      }
    };
    const result = await capturedTool.execute('add-phase', params, undefined, undefined, mockCtx);
    const details = result.details as TodoToolDetails;
    expect(details.phases.length).toBe(1);
    expect(details.phases[0].name).toBe('Phase 1');
    expect(details.phases[0].tasks.length).toBe(2);
    expect(details.phases[0].tasks[1].status).toBe('in_progress');
  });

  it('should add a task to existing phase', async () => {
    // First add phase
    await capturedTool.execute('p1', { add_phase: { name: 'P1' } }, undefined, undefined, mockCtx);
    const listResult = await capturedTool.execute('list', { list: {} }, undefined, undefined, mockCtx);
    const phases = (listResult.details as any).phases as TodoPhase[];
    const phaseId = phases[0].id;

    // Add task
    const result = await capturedTool.execute('add-task', { add_task: { phase: phaseId, content: 'New task' } }, undefined, undefined, mockCtx);
    const details = result.details as TodoToolDetails;
    expect(details.phases[0].tasks.length).toBe(1);
    expect(details.phases[0].tasks[0].content).toBe('New task');
  });

  it('should update task status', async () => {
    // Create phase with task
    await capturedTool.execute('add', { add_phase: { name: 'Work', tasks: [{ content: 'Do thing' }] } }, undefined, undefined, mockCtx);
    const phases = (await capturedTool.execute('list', { list: {} }, undefined, undefined, mockCtx)).details.phases as TodoPhase[];
    const taskId = phases[0].tasks[0].id;

    const result = await capturedTool.execute('update', { update: { id: taskId, status: 'completed' } }, undefined, undefined, mockCtx);
    const details = result.details as TodoToolDetails;
    expect(details.phases[0].tasks[0].status).toBe('completed');
  });

  it('should remove a task', async () => {
    await capturedTool.execute('add', { add_phase: { name: 'X', tasks: [{ content: 'A' }, { content: 'B' }] } }, undefined, undefined, mockCtx);
    const phases = (await capturedTool.execute('list', { list: {} }, undefined, undefined, mockCtx)).details.phases as TodoPhase[];
    const taskIdToRemove = phases[0].tasks[0].id;

    const result = await capturedTool.execute('remove', { remove_task: { id: taskIdToRemove } }, undefined, undefined, mockCtx);
    const details = result.details as TodoToolDetails;
    expect(details.phases[0].tasks.length).toBe(1);
    expect(details.phases[0].tasks[0].content).toBe('B');
  });

  it('should replace all phases', async () => {
    // Initial
    await capturedTool.execute('add1', { add_phase: { name: 'Old1' } }, undefined, undefined, mockCtx);
    await capturedTool.execute('add2', { add_phase: { name: 'Old2' } }, undefined, undefined, mockCtx);

    const newPhases = [
      { name: 'New1', tasks: [{ content: 'T1' }] },
      { name: 'New2', tasks: [{ content: 'T2' }, { content: 'T3' }] }
    ];
    const result = await capturedTool.execute('replace', { replace: { phases: newPhases } }, undefined, undefined, mockCtx);
    const details = result.details as TodoToolDetails;
    expect(details.phases.length).toBe(2);
    expect(details.phases[0].name).toBe('New1');
    expect(details.phases[1].tasks.length).toBe(2);
  });

  // Rendering tests
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
      } as any;
    });

    it('should render call', () => {
      const comp = capturedTool.renderCall({ add_phase: { name: 'P' } }, theme, {});
      expect(comp).toBeInstanceOf(Text);
    });

    it('should render result with phases', () => {
      const phases: TodoPhase[] = [
        { id: 'phase-1', name: 'Dev', tasks: [
          { id: 'task-1', content: 'Code', status: 'in_progress' },
          { id: 'task-2', content: 'Test', status: 'pending' }
        ]}
      ];
      const result = {
        content: [{ type: 'text', text: 'summary' }],
        details: { phases, storage: 'file' } as TodoToolDetails
      } as any;
      const comp = capturedTool.renderResult(result, { expanded: false, isPartial: false }, theme, {});
      expect(comp).toBeInstanceOf(Text);
    });

    it('should show processing when partial', () => {
      const comp = capturedTool.renderResult({}, { expanded: false, isPartial: true }, theme, {});
      expect(comp).toBeInstanceOf(Text);
    });
  });

  it('should have renderShell self', () => {
    expect(capturedTool.renderShell).toBe('self');
  });
});
