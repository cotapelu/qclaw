// Event types for the TUI module
// Events are used for communication between components without direct coupling

export interface TUEvent<T = any> {
  type: string;
  payload?: T;
  timestamp: number;
}

export type TUEventHandler<T = any> = (event: TUEvent<T>) => void;

// Core lifecycle events
export interface LifecycleEvent {
  state: 'init' | 'start' | 'stop' | 'destroy';
}

// UI events
export interface RenderEvent {
  width: number;
  height: number;
}

export interface FocusChangeEvent {
  componentId: string;
  focused: boolean;
}

export interface OverlayEvent {
  overlayId: string;
  action: 'show' | 'hide' | 'focus' | 'blur';
}

// Message events
export interface MessageEvent {
  messageId: string;
  role: 'user' | 'assistant' | 'system' | 'error';
  content: string;
}

export interface MessageUpdateEvent {
  messageId: string;
  delta: string;
}

export interface ToolExecutionEvent {
  toolCallId: string;
  toolName: string;
  input: Record<string, any>;
  status: 'start' | 'end' | 'error';
  output?: any;
  error?: string;
}

// Input events
export interface SubmitEvent {
  value: string;
}

export interface KeyPressEvent {
  key: string;
  modifiers: string[];
  raw: string;
}

// Theme events
export interface ThemeChangeEvent {
  themeName: string;
}

// Settings events
export interface SettingChangeEvent {
  key: string;
  value: any;
}

// Agent events (from outside)
export interface AgentStartEvent {
  sessionId?: string;
}

export interface AgentStopEvent {
  reason?: string;
}

export interface AgentErrorEvent {
  error: Error;
  context?: Record<string, any>;
}
