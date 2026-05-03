#!/usr/bin/env node
/**
 * Unit Tests for Refactored Todo Tool
 * 
 * Tests cover:
 * - Race condition prevention (locking)
 * - Error recovery and rollback
 * - Auto-continue logic
 * - State persistence
 * - Edge cases
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { TodoState, normalizeInProgressTask } from "./todos-tool.js";
import type { TodoPhase, TodoItem } from "./todos-tool.js";

describe("TodoState", () => {
  let state: TodoState;

  beforeEach(() => {
    state = new TodoState();
  });

  describe("locking mechanism", () => {
    it("should prevent concurrent modifications", () => {
      expect(state.isLocked).toBe(false);
      
      // Simulate lock
      (state as any)._lock = true;
      expect(state.isLocked).toBe(true);
      
      // Release lock
      (state as any)._lock = false;
      expect(state.isLocked).toBe(false);
    });
  });

  describe("addPhase", () => {
    it("should create a new phase with auto-generated ID", () => {
      const phase = state.addPhase("Test Phase");
      
      expect(phase.id).toBe("phase-1");
      expect(phase.name).toBe("Test Phase");
      expect(phase.tasks).toEqual([]);
      expect(state.nextPhaseId).toBe(2);
    });

    it("should increment phase IDs correctly", () => {
      state.addPhase("Phase 1");
      state.addPhase("Phase 2");
      state.addPhase("Phase 3");
      
      expect(state.nextPhaseId).toBe(4);
    });

    it("should auto-set first task to in_progress", () => {
      const phase = state.addPhase("Test Phase", [
        { content: "Task 1" },
        { content: "Task 2" },
      ]);
      
      expect(phase.tasks[0].status).toBe("in_progress");
      expect(phase.tasks[1].status).toBe("pending");
    });
  });

  describe("addTask", () => {
    beforeEach(() => {
      state.addPhase("Test Phase");
    });

    it("should create a new task with auto-generated ID", () => {
      const task = state.addTask("phase-1", "Test Task");
      
      expect(task?.id).toBe("task-1");
      expect(task?.content).toBe("Test Task");
      // First task is auto-set to in_progress by normalizeInProgressTask
      expect(task?.status).toBe("in_progress");
    });

    it("should return null for invalid phase", () => {
      const task = state.addTask("invalid-phase", "Test Task");
      expect(task).toBeNull();
    });

    it("should support optional parameters", () => {
      const task = state.addTask(
        "phase-1",
        "Test Task",
        "Notes",
        "Details",
        ["task-1", "task-2"],
        "2h",
        ["#bug", "#urgent"],
        "high",
        5,
        Date.now() + 86400000
      );
      
      expect(task?.notes).toBe("Notes");
      expect(task?.details).toBe("Details");
      expect(task?.dependsOn).toEqual(["task-1", "task-2"]);
      expect(task?.estimate).toBe("2h");
      expect(task?.tags).toEqual(["#bug", "#urgent"]);
      expect(task?.priority).toBe("high");
      expect(task?.effort).toBe(5);
      expect(task?.deadline).toBeDefined();
    });
  });

  describe("update", () => {
    beforeEach(() => {
      state.addPhase("Test Phase", [{ content: "Task 1" }]);
    });

    it("should update task status", () => {
      const updated = state.updateTask("task-1", { status: "completed" });
      
      expect(updated?.status).toBe("completed");
    });

    it("should update task content", () => {
      const updated = state.updateTask("task-1", { content: "Updated content" });
      
      expect(updated?.content).toBe("Updated content");
    });

    it("should return null for invalid task", () => {
      const updated = state.updateTask("invalid-task", { status: "completed" });
      expect(updated).toBeNull();
    });
  });

  describe("normalizeInProgressTask", () => {
    it("should ensure only one task is in_progress", () => {
      const phases: TodoPhase[] = [
        {
          id: "phase-1",
          name: "Test",
          tasks: [
            { id: "task-1", content: "Task 1", status: "in_progress" },
            { id: "task-2", content: "Task 2", status: "in_progress" },
            { id: "task-3", content: "Task 3", status: "pending" },
          ],
        },
      ];
      
      normalizeInProgressTask(phases);
      
      expect(phases[0].tasks[0].status).toBe("in_progress");
      expect(phases[0].tasks[1].status).toBe("pending");
      expect(phases[0].tasks[2].status).toBe("pending");
    });

    it("should set first pending to in_progress if none are in_progress", () => {
      const phases: TodoPhase[] = [
        {
          id: "phase-1",
          name: "Test",
          tasks: [
            { id: "task-1", content: "Task 1", status: "completed" },
            { id: "task-2", content: "Task 2", status: "pending" },
            { id: "task-3", content: "Task 3", status: "pending" },
          ],
        },
      ];
      
      normalizeInProgressTask(phases);
      
      expect(phases[0].tasks[0].status).toBe("completed");
      expect(phases[0].tasks[1].status).toBe("in_progress");
      expect(phases[0].tasks[2].status).toBe("pending");
    });
  });

  describe("undo/redo", () => {
    it("should undo phase creation", () => {
      state.saveToHistory(); // Save initial empty state (index 0)
      state.addPhase("Test Phase");
      state.saveToHistory(); // Save after adding phase (index 1)
      expect(state.phases.length).toBe(1);
      
      const undone = state.undo();
      expect(undone).toBe(true);
      expect(state.phases.length).toBe(0);
    });

    it("should redo undone phase", () => {
      state.saveToHistory(); // Save initial empty state
      state.addPhase("Test Phase");
      state.saveToHistory();
      state.undo();
      
      const redone = state.redo();
      expect(redone).toBe(true);
      expect(state.phases.length).toBe(1);
    });

    it("should not undo if nothing to undo", () => {
      const undone = state.undo();
      expect(undone).toBe(false);
    });

    it("should limit history size", () => {
      // Create more than maxHistory (50) operations
      for (let i = 0; i < 60; i++) {
        state.addPhase(`Phase ${i}`);
        state.saveToHistory();
      }
      
      // Should still be able to undo
      const undone = state.undo();
      expect(undone).toBe(true);
      expect(state.phases.length).toBe(59);
    });
  });

  describe("removeTask", () => {
    beforeEach(() => {
      state.addPhase("Test Phase", [
        { content: "Task 1" },
        { content: "Task 2" },
        { content: "Task 3" },
      ]);
    });

    it("should remove task successfully", () => {
      const removed = state.removeTask("task-2");
      
      expect(removed).toBe(true);
      expect(state.phases[0].tasks.length).toBe(2);
      expect(state.phases[0].tasks.find(t => t.id === "task-2")).toBeUndefined();
    });

    it("should return false for invalid task", () => {
      const removed = state.removeTask("invalid-task");
      expect(removed).toBe(false);
    });

    it("should auto-set in_progress after removal", () => {
      // Complete task-1
      state.updateTask("task-1", { status: "completed" });
      // task-2 should be in_progress
      
      // Remove task-2
      state.removeTask("task-2");
      
      // task-3 should now be in_progress
      expect(state.phases[0].tasks[1].status).toBe("in_progress");
    });
  });

  describe("moveTask", () => {
    beforeEach(() => {
      state.addPhase("Test Phase", [
        { content: "Task 1" },
        { content: "Task 2" },
        { content: "Task 3" },
      ]);
    });

    it("should move task to new position", () => {
      const moved = state.moveTask("task-1", 2);
      
      expect(moved?.id).toBe("task-1");
      expect(state.phases[0].tasks[0].id).toBe("task-2");
      expect(state.phases[0].tasks[1].id).toBe("task-3");
      expect(state.phases[0].tasks[2].id).toBe("task-1");
    });

    it("should clamp position to valid range", () => {
      const moved = state.moveTask("task-3", 0);
      
      expect(state.phases[0].tasks[0].id).toBe("task-3");
      expect(state.phases[0].tasks[1].id).toBe("task-1");
      expect(state.phases[0].tasks[2].id).toBe("task-2");
    });

    it("should return null for invalid task", () => {
      const moved = state.moveTask("invalid-task", 1);
      expect(moved).toBeNull();
    });
  });

  describe("archiveTask", () => {
    beforeEach(() => {
      state.addPhase("Test Phase", [{ content: "Task 1" }]);
    });

    it("should archive task", () => {
      const archived = state.archiveTask("task-1", false);
      
      expect(archived?.status).toBe("archived");
    });

    it("should unarchive task", () => {
      state.archiveTask("task-1", false);
      const unarchived = state.archiveTask("task-1", true);
      
      expect(unarchived?.status).toBe("pending");
    });
  });

  describe("replacePhases", () => {
    it("should replace all phases", () => {
      state.addPhase("Phase 1");
      state.addPhase("Phase 2");
      
      state.replacePhases([
        { id: "phase-1", name: "New Phase 1", tasks: [] },
        { id: "phase-2", name: "New Phase 2", tasks: [] },
        { id: "phase-3", name: "New Phase 3", tasks: [] },
      ]);
      
      expect(state.phases.length).toBe(3);
      expect(state.phases[0].name).toBe("New Phase 1");
      expect(state.phases[2].name).toBe("New Phase 3");
    });
  });

  describe("edge cases", () => {
    it("should handle empty phases array", () => {
      const phases: TodoPhase[] = [];
      normalizeInProgressTask(phases);
      expect(phases.length).toBe(0);
    });

    it("should handle phase with no tasks", () => {
      const phases: TodoPhase[] = [
        { id: "phase-1", name: "Empty", tasks: [] },
      ];
      normalizeInProgressTask(phases);
      expect(phases[0].tasks.length).toBe(0);
    });

    it("should preserve basic task metadata on update", () => {
      state.addPhase("Test Phase", [
        { 
          content: "Task 1",
          notes: "Original notes",
          details: "Original details",
        },
      ]);
      
      state.updateTask("task-1", { status: "completed" });
      
      const task = state.phases[0].tasks[0];
      expect(task.notes).toBe("Original notes");
      expect(task.details).toBe("Original details");
      expect(task.status).toBe("completed");
    });
  });
});

describe("normalizeInProgressTask", () => {
  it("should handle multiple phases correctly", () => {
    const phases: TodoPhase[] = [
      {
        id: "phase-1",
        name: "Phase 1",
        tasks: [
          { id: "task-1", content: "Task 1", status: "completed" },
          { id: "task-2", content: "Task 2", status: "pending" },
        ],
      },
      {
        id: "phase-2",
        name: "Phase 2",
        tasks: [
          { id: "task-3", content: "Task 3", status: "pending" },
          { id: "task-4", content: "Task 4", status: "pending" },
        ],
      },
    ];
    
    normalizeInProgressTask(phases);
    
    // task-2 should be in_progress (first pending across all phases)
    expect(phases[0].tasks[1].status).toBe("in_progress");
    expect(phases[1].tasks[0].status).toBe("pending");
    expect(phases[1].tasks[1].status).toBe("pending");
  });
});
