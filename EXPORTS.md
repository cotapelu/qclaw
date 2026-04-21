# Public API Exports from Pi Packages

This document lists **all public exports** from the main pi packages. Only use these exports - never import from internal paths like `/src/core/...`.

## Table of Contents

- [@mariozechner/pi-ai](#mariozechnerpi-ai)
- [@mariozechner/pi-agent-core](#mariozechnerpi-agent-core)
- [@mariozechner/pi-tui](#mariozechnerpi-tui)
- [@mariozechner/pi-coding-agent](#mariozechnerpi-coding-agent)

---

## @mariozechner/pi-ai

**Entry**: `packages/ai/src/index.ts`

### Re-exports from TypeBox
- `Type`
- `Static`
- `TSchema`

### From `./api-registry.js`
- `Api`
- `ApiOptionsMap`
- `KnownProvider`
- `ProviderlessModels`
- `getApi`
- `getApiClass`
- `getOptionsClass`
- `makeApi`
- `registerApi`
- `unregisterApi`
- `ApiRegistry`
- `defaultRegistry`

### From `./env-api-keys.js`
- `detectApiKey`
- `envApiKeys`
- `getApiKeyFromEnv`
- `hasApiKey`

### From `./models.js`
- `Model`
- `ModelName`
- `ModelCapabilities`
- `ModelPricing`
- `ModelContextSize`
- `KnownModel`
- `ModelFetch`
- `generateModels`
- `getModel`
- `listModels`
- `MODELS_BY_PROVIDER`
- `MODEL_ALIASES`

### From `./providers/faux.js`
- `FauxProvider`
- `fauxProvider`
- `FauxOptions`
- `FauxStreamOptions`
- `FauxMessages`
- `FauxAssistantMessageEvent`
- `FauxMessage`

### From `./stream.js`
- `stream`
- `streamSimple`
- `StreamOptions`
- `SimpleStreamOptions`
- `Message = UserMessage | AssistantMessage | ToolResultMessage`
- `UserMessage`
- `AssistantMessage`
- `ToolResultMessage`
- `AssistantMessageEvent`
- `AssistantMessageEventStream`
- `AssistantMessageEventType`
- `ToolCall`
- `ToolResult`
- `Usage`
- `StopReason`
- `AbortError`
- `ProviderError`

### From `./types.js`
- `Role`
- `ContentPart`
- `TextPart`
- `ImagePart`
- `ToolCallPart`
- `ToolResultPart`
- `MessageType`
- `ModelInformation`
- `ModelPricing`
- `ModelContextSize`
- `ModelId`
- `ProviderId`
- `StreamingModel`
- `CompletingModel`
- `ThinkingConfig`
- `ThinkingConfigEnabled`
- `ThinkingConfigDisabled`
- `ThinkingConfigAdaptive`
- `StreamChunk`
- `ProviderCallOptions`
- `ProviderCall`
- `AbortSignal`
- `Tool`
- `Tools`
- `ToolSchema`
- `mergeToolOptions`
- `readToolOptions`
- `bashToolOptions`
- `editToolOptions`
- `writeToolOptions`
- `grepToolOptions`
- `findToolOptions`
- `lsToolOptions`
- `toolResultToContentPart`
- `messageToLlmMessage`
- `messagesToLlmMessages`
- `convertAssistantMessageEvents`
- `convertAssistantMessage`
- `convertUserMessage`
- `convertToolResult`
- `convertToolResults`
- `convertMessages`
- `convertLlmMessageToMessage`
- `convertLlmMessages`
- `convertLlmToMessage`
- `convertLlmToMessages`
- `convertToToolCalls`
- `convertToToolCall`
- `messagesToToolCalls`
- `extractToolCalls`
- `isToolCallEvent`
- `streamEventsFromChunks`
- `streamEvents`
- `convertEvent`
- `convertEvents`
- `emitContentPart`
- `emitTextPart`
- `emitToolCallPart`
- `emitToolResultPart`
- `emitImagePart`
- `emitUserMessage`
- `emitAssistantMessage`
- `emitToolResultMessage`
- `emitToolResult`
- `emitToolCalls`
- `emitUsage`
- `emitThinking`
- `emitError`
- `emitStop`
- `parseAssistantMessageEvent`
- `parseAssistantMessageEvents`
- `parseStream`
- `createToolError`
- `isUsage`
- `isThinking`
- `isError`
- `isStop`
- `isToolCall`
- `isTextDelta`
- `assistantMessageEventType`
- `filterToolCallEvents`
- `getToolCallEventToolCalls`
- `getToolCallEventToolName`
- `getToolCallEventToolCall`
- `getToolCallEventToolCallId`
- `getToolCallEventToolIndex`
- `getToolCallEventArguments`
- `getToolCallEventDelta`
- `getToolResultEventToolCallId`
- `getToolResultEventResult`
- `getToolResultEventIsError`
- `getTextDeltaEventDelta`
- `getThinkingContentEventDelta`
- `getUsageEventUsage`
- `getErrorEventError`
- `getStopEventReason`
- `getToolCallsFromMessage`
- `getToolCallFromMessage`
- `findToolCall`
- `findToolCallById`
- `findToolCallByName`
- `findToolResults`
- `findToolResultById`
- `findToolResultByName`
- `getLlmById`
- `getLlmByAlias`
- `getLlmByProvider`
- `getToolByName`
- `getToolByCall`
- `getToolById`
- `filterTools`
- `filterToolCalls`
- `filterToolCallEvents`
- `filterToolResultEvents`
- `hasTool`
- `hasToolCalls`
- `hasToolCallEvents`
- `hasToolResultEvents`
- `resolveModel`
- `resolveModelAsync`
- `isAnthropic`
- `isOpenAI`
- `isGoogle`
- `isAzure`
- `isMistral`
- `isGroq`
- `isCerebras`
- `isXai`
- `isOpenRouter`
- `isVercel`
- `isMiniMax`
- `isBedrock`
- `isOpenCode`
- `isOpenCodeGo`
- `isVertex`
- `isCopilot`
- `isGeminiCli`
- `isAntigravity`
- `isGenericOpenAICompatible`
- `isOpenAIResponses`
- `isOpenAICodexResponses`
- `isAzureOpenAIResponses`

### From `./utils/overflow.ts`
- `OverflowStrategy`
- `OverflowAction`
- `OverflowResult`
- `contextOverflow`
- `OverflowConfig`
- `ShouldCompactFn`
- `createOverflowStrategy`

### From `./utils/typebox-helpers.js`
- `fromTypeBox`
- `toTypeBox`
- `typeToJSON`
- `fromJSON`
- `getToolName`
- `getToolDescription`
- `getToolParameters`
- `getToolInput`
- `validateTool`
- `validateToolCall`
- `validateToolResult`
- `formatError`
- `mergeSchemas`

### From `./utils/validation.js`
- `ValidationError`
- `validate`
- `isValid`
- `getErrors`
- `formatValidationErrors`

### Provider-specific types

#### From `./providers/anthropic.js`
- `AnthropicEffort`
- `AnthropicOptions`
- `AnthropicThinkingDisplay`

#### From `./providers/amazon-bedrock.js`
- `BedrockOptions`
- `BedrockThinkingDisplay`

#### From `./providers/google.js`
- `GoogleOptions`

#### From `./providers/google-gemini-cli.js`
- `GoogleGeminiCliOptions`
- `GoogleThinkingLevel`

#### From `./providers/google-vertex.js`
- `GoogleVertexOptions`

#### From `./providers/mistral.js`
- `MistralOptions`

#### From `./providers/openai-codex-responses.js`
- `OpenAICodexResponsesOptions`

#### From `./providers/openai-completions.js`
- `OpenAICompletionsOptions`

#### From `./providers/openai-responses.js`
- `OpenAIResponsesOptions`

#### From `./providers/azure-openai-responses.js`
- `AzureOpenAIResponsesOptions`

### OAuth

#### From `./utils/oauth/types.js`
- `OAuthAuthInfo`
- `OAuthCredentials`
- `OAuthLoginCallbacks`
- `OAuthPrompt`
- `OAuthProvider`
- `OAuthProviderId`
- `OAuthProviderInfo`
- `OAuthProviderInterface`

---

## @mariozechner/pi-agent-core

**Entry**: `packages/agent/src/index.ts`

### From `./agent.js`
- `Agent`
- `AgentOptions`
- `AgentConfiguration`
- `AgentSchema`
- `AgentHookPoint`
- `AgentHookCallback`
- `AgentHookEvent`
- `AgentHook`

### From `./agent-loop.js`
- `runAgentLoop`
- `runAgentLoopWithTools`
- `AgentLoopResult`
- `AgentLoopOptions`

### From `./proxy.js`
- `AgentProxy`
- `createAgentProxy`

### From `./types.js`
- `AgentMessage`
- `AgentEvent`
- `AgentToolResult`
- `AgentToolUpdateCallback`
- `AgentEndEvent`
- `AgentStartEvent`
- `BeforeAgentStartEvent`
- `BeforeAgentStartEventResult`
- `MessageRenderOptions`
- `MessageRenderer`
- `ToolCallEvent`
- `ToolCallEventResult`
- `ToolResultEvent`
- `TurnStartEvent`
- `TurnEndEvent`
- `UserBashEvent`
- `UserBashEventResult`
- `AgentToolResult`
- `BashToolCallEvent`
- `CustomToolCallEvent`
- `EditToolCallEvent`
- `FindToolCallEvent`
- `GrepToolCallEvent`
- `LsToolCallEvent`
- `ReadToolCallEvent`
- `WriteToolCallEvent`
- `ToolExecutionMode`
- `ToolInfo`
- `ToolRenderResultOptions`
- `ToolDefinition`
- `ToolResult`
- `ToolCall`
- `Usage`
- `ThinkingLevel`
- `ThinkingContent`
- `ThinkingDelta`
- `StopReason`
- `AppKeybinding`
- `KeybindingsManager`
- `ExtensionHandler`
- `ExtensionUIContext`
- `ExtensionActions`
- `ExtensionContext`
- `ExtensionContextActions`
- `ExtensionCommandContext`
- `ExtensionCommandContextActions`
- `ExtensionShortcut`
- `ExtensionWidgetOptions`
- `WidgetPlacement`
- `WorkingIndicatorOptions`
- `TerminalInputHandler`
- `InputEvent`
- `InputEventResult`
- `InputSource`
- `BeforeProviderRequestEvent`
- `BeforeProviderRequestEventResult`
- `CompactOptions`
- `SessionBeforeCompactEvent`
- `SessionCompactEvent`
- `SessionBeforeForkEvent`
- `SessionBeforeSwitchEvent`
- `SessionBeforeTreeEvent`
- `SessionTreeEvent`
- `SessionShutdownEvent`
- `SessionStartEvent`
- `ContextEvent`
- `ContextUsage`
- `CustomBlockRenderFn`
- `Extension`
- `ExtensionRuntime`
- `ExtensionError`
- `ExtensionEvent`
- `SourceInfo`
- `ExtensionFlag`
- `BuildSystemPromptOptions`
- `SystemPromptContext`
- `SystemPromptOverride`
- `SystemPromptBuilder`
- `parseSkillBlock`
- `ParsedSkillBlock`
- `AgentSessionStats`
- `SessionStats`
- `AgentSessionEvent`
- `AgentSessionEventListener`
- `AgentSessionConfig`
- `AgentSession`
- `ModelCycleResult`
- `AgentSessionConfig`

---

## @mariozechner/pi-tui

**Entry**: `packages/tui/src/index.ts`

### Core
- `TUI`
- `Terminal`
- `ProcessTerminal`
- `Component`
- `Focusable`
- `FocusContext`
- `EventHandler`
- `KeyEvent`
- `MouseEvent`
- `RenderInput`
- `RenderOutput`

### Built-in Components
- `Text`
- `TruncatedText`
- `Input`
- `Editor`
- `Markdown`
- `Loader`
- `SelectList`
- `SettingsList`
- `Spacer`
- `Box`
- `Container`
- `Image`

### Layout
- `FlexLayout`
- `GridLayout`
- `Dynalayout`

### Themes
- `Theme`
- `defaultTheme`
- `getMarkdownTheme`

### Utilities
- `createEventBus`
- `type EventBus`
- `type EventBusController`
- `ansiToHTML`
- `stripAnsi`
- `truncateToWidth`
- `visibleWidth`
- `CURSOR_MARKER`
- `SELECTED_MARKER`

### Key handling
- `matchesKey`
- `Key`
- `KeyCode`
- `Modifier`
- `parseKey`
- `serializeKey`

### Events
- `type FocusEvent`
- `type BlurEvent`
- `type KeyDownEvent`
- `type KeyPressEvent`
- `type KeyUpEvent`
- `type MouseDownEvent`
- `type MouseUpEvent`
- `type MouseMoveEvent`
- `type MouseWheelEvent`
- `type PasteEvent`
- `type ResizeEvent`
- `type UnfocusEvent`

---

## @mariozechner/pi-coding-agent

**Entry**: `packages/coding-agent/src/index.ts`

### Config
- `getAgentDir`
- `VERSION`

### Session Management (AgentSession)
- `AgentSession`
- `type AgentSessionConfig`
- `type AgentSessionEvent`
- `type AgentSessionEventListener`
- `type ModelCycleResult`
- `type ParsedSkillBlock`
- `type PromptOptions`
- `parseSkillBlock`
- `type SessionStats`

### Auth & Model Registry
- `type ApiKeyCredential`
- `type AuthCredential`
- `AuthStorage`
- `type AuthStorageBackend`
- `FileAuthStorageBackend`
- `InMemoryAuthStorageBackend`
- `type OAuthCredential`
- `ModelRegistry`

### Compaction
- `type BranchPreparation`
- `type BranchSummaryResult`
- `type CollectEntriesResult`
- `type CompactionResult`
- `type CutPointResult`
- `calculateContextTokens`
- `collectEntriesForBranchSummary`
- `compact`
- `DEFAULT_COMPACTION_SETTINGS`
- `estimateTokens`
- `type FileOperations`
- `findCutPoint`
- `findTurnStartIndex`
- `type GenerateBranchSummaryOptions`
- `generateBranchSummary`
- `generateSummary`
- `getLastAssistantUsage`
- `prepareBranchEntries`
- `serializeConversation`
- `shouldCompact`

### Event Bus
- `createEventBus`
- `type EventBus`
- `type EventBusController`

### Session Manager
- `SessionManager`
- `type SessionEntry`
- `type SessionHeader`
- `type SessionTree`
- `type SessionTreeLabel`
- `type SessionPath`
- `type CreateSessionOptions`
- `type SessionSwitchOptions`
- `type SessionForkOptions`
- `type SessionBranchOptions`
- `type SessionListOptions`
- `type SessionExportOptions`
- `type SessionImportOptions`
- `type SessionMergeOptions`
- `type SessionSquashOptions`
- `type SessionTreeEntry`
- `type SessionTreeLabel`
- `type SessionTreeOptions`
- `type SessionTreeResult`
- `type SessionTreeLabelChange`
- `type SessionTreeLabelType`
- `type SessionTreeLabelOptions`
- `type SessionTreeLabelChangeType`
- `type SessionTreeLabelChangeOptions`

### Settings Manager
- `SettingsManager`
- `type Settings`
- `type SettingsOverrides`
- `type SettingsFile`
- `type SettingsError`
- `type SettingsValidationError`
- `type SettingsValidationResult`
- `type SettingsProvider`
- `type SettingsProviderFactory`
- `type SettingsProviderOptions`
- `type SettingsProviderResult`
- `type SettingsProviderError`
- `type SettingsProviderConfig`
- `type SettingsProviderContext`
- `type SettingsProviderFactory`
- `type SettingsProvider`
- `type SettingsFile`
- `type SettingsOverrides`
- `type Settings`
- `type SettingsError`
- `type SettingsValidationError`
- `type SettingsValidationResult`
- `DEFAULT_SETTINGS`

### Extension System Types
- `type AgentEndEvent`
- `type AgentStartEvent`
- `type AgentToolResult`
- `type AgentToolUpdateCallback`
- `type AppKeybinding`
- `type BashToolCallEvent`
- `type BeforeAgentStartEvent`
- `type BeforeAgentStartEventResult`
- `type BeforeProviderRequestEvent`
- `type BeforeProviderRequestEventResult`
- `type BuildSystemPromptOptions`
- `type CompactOptions`
- `type ContextEvent`
- `type ContextUsage`
- `type CustomToolCallEvent`
- `type EditToolCallEvent`
- `type ExecOptions`
- `type ExecResult`
- `type Extension`
- `type ExtensionActions`
- `type ExtensionAPI`
- `type ExtensionCommandContext`
- `type ExtensionCommandContextActions`
- `type ExtensionContext`
- `type ExtensionContextActions`
- `type ExtensionError`
- `type ExtensionEvent`
- `type ExtensionFactory`
- `type ExtensionFlag`
- `type ExtensionHandler`
- `type ExtensionRuntime`
- `type ExtensionShortcut`
- `type ExtensionUIContext`
- `type ExtensionUIDialogOptions`
- `type ExtensionWidgetOptions`
- `type FindToolCallEvent`
- `type GrepToolCallEvent`
- `type InputEvent`
- `type InputEventResult`
- `type InputSource`
- `type KeybindingsManager`
- `type LoadExtensionsResult`
- `type LsToolCallEvent`
- `type MessageRenderer`
- `type MessageRenderOptions`
- `type ProviderConfig`
- `type ProviderModelConfig`
- `type ReadToolCallEvent`
- `type RegisteredCommand`
- `type RegisteredTool`
- `type ResolvedCommand`
- `type SessionBeforeCompactEvent`
- `type SessionBeforeForkEvent`
- `type SessionBeforeSwitchEvent`
- `type SessionBeforeTreeEvent`
- `type SessionCompactEvent`
- `type SessionShutdownEvent`
- `type SessionStartEvent`
- `type SessionTreeEvent`
- `type SlashCommandInfo`
- `type SlashCommandSource`
- `type SourceInfo`
- `type TerminalInputHandler`
- `type ToolCallEvent`
- `type ToolCallEventResult`
- `type ToolDefinition`
- `type ToolExecutionMode`
- `type ToolInfo`
- `type ToolRenderResultOptions`
- `type ToolResultEvent`
- `type TurnEndEvent`
- `type TurnStartEvent`
- `type UserBashEvent`
- `type UserBashEventResult`
- `type WidgetPlacement`
- `type WorkingIndicatorOptions`
- `type WriteToolCallEvent`

### Extension Functions
- `createExtensionRuntime`
- `defineTool`
- `discoverAndLoadExtensions`
- `type ExtensionRunner`
- `isBashToolResult`
- `isEditToolResult`
- `isFindToolResult`
- `isGrepToolResult`
- `isLsToolResult`
- `isReadToolResult`
- `isToolCallEventType`
- `isWriteToolResult`
- `wrapRegisteredTool`
- `wrapRegisteredTools`

### Messages
- `convertToLlm`

### Model Registry
- `ModelRegistry`

### Resource Loader
- `DefaultResourceLoader`
- `type ResourceLoader`
- `type LoadExtensionsResult`
- `createEventBus`

### Prompt Templates
- `type PromptTemplate`

### Skills
- `type Skill`

### Tools
- `type Tool`
- `codingTools`
- `readOnlyTools`
- `readTool`
- `bashTool`
- `editTool`
- `writeTool`
- `grepTool`
- `findTool`
- `lsTool`
- `createCodingTools`
- `createReadOnlyTools`
- `createReadTool`
- `createBashTool`
- `createEditTool`
- `createWriteTool`
- `createGrepTool`
- `createFindTool`
- `createLsTool`

### Run Modes
- `InteractiveMode`
- `runPrintMode`
- `type PrintModeOptions`
- `runRpcMode`
- `type RpcModeOptions`

### SDK (createAgentSession)
- `createAgentSession`
- `type CreateAgentSessionOptions`
- `type CreateAgentSessionResult`
- `type ExtensionFactory`

### Session Management (Advanced)
- `createAgentSessionRuntime`
- `type CreateAgentSessionRuntimeFactory`
- `createAgentSessionServices`
- `createAgentSessionFromServices`

### Footer Data Provider
- `type ReadonlyFooterDataProvider`

### Config
- `getAgentDir`

---

## Usage Guidelines

1. **Always import from package root**:
   ```typescript
   import { createAgentSession } from "@mariozechner/pi-coding-agent";
   ```

2. **Never use deep imports**:
   ```typescript
   // ❌ DON'T DO THIS
   import { AgentSession } from "@mariozechner/pi-coding-agent/src/core/agent-session";
   ```

3. **Check this document** when you need to know what's available.

4. **All exports listed here are public API** and will be available when packages are published to npm.

---

## Notes

- This list was generated by reading the `src/index.ts` files of each package.
- If you need something not exported, it's likely internal and subject to change.
- For the most up-to-date list, check the actual `index.ts` files in the source.
- Some types are re-exported from dependencies (TypeBox, etc.) - those are also public.

---

*Last updated: 2026-04-21*
