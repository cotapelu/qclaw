# SubTool Loader

SubTool Loader là một **custom built-in tool** duy nhất, cung cấp nhiều toán tử sub-tools (bash, ls, find, grep, read, git, docker, ...) thông qua một unified interface.

## 🌟 **Tại sao cần SubTool Loader?**

- **Một tool, vạn hành động**: LLM chỉ cần gọi `subtool_loader` thay vì nhớ hàng chục tên tool
- **System prompt gọn**: Chỉ hiển thị 1 tool thay vì 20+ tools
- **Dễ mở rộng**: Thêm sub-tool mới chỉ cần thêm case trong switch
- **Unified logging & error handling**: Tất cả sub-tools share same execution flow

## 🏗️ **Kiến trúc**

```
AgentSession.config.customTools = [createSubLoaderToolDefinition(cwd)]

→ Tool xuất hiện trong system prompt như built-in tool
→ LLM gọi với params: { subtool: "bash", args: { command: "ls -la" } }
→ execute() switch(subtool) → chạy logic tương ứng
```

## 📋 **Schema**

```typescript
{
  subtool: "bash" | "ls" | "find" | "grep" | "read" | "git" | "docker" | ...,
  args: { /* tùy theo subtool */ }
}
```

Mỗi `subtool` có schema riêng, được định nghĩa trong `src/tools/sub-tools/`.

## 🛠️ **Cách thêm SubTool mới**

1. Tạo file `src/tools/sub-tools/<name>.ts`:
   - Export `const <name>Schema` (TypeBox)
   - Export `async function execute<Name>(args, cwd, signal, ctx)`
2. Thêm `<name>` vào `subToolNames` trong `subtool-loader.ts`
3. Thêm mapping `schemaMap` và `execMap` trong `subtool-loader.ts`
4. Build lại

## 📖 **Ví dụ**

### LLM gọi sub_bash:

```json
{
  "subtool": "bash",
  "args": { "command": "ls -la src", "timeout": 30 }
}
```

### LLM gọi sub_ls:

```json
{
  "subtool": "ls",
  "args": { "path": "src", "limit": 100 }
}
```

### LLM gọi sub_git:

```json
{
  "subtool": "git",
  "args": { "command": "status" }
}
```

## 🔧 **Triển khai**

Trong `src/main.ts` (hoặc nơi tạo `AgentSession`):

```typescript
import { createSubLoaderToolDefinition } from "./tools/subtool-loader";

const session = new AgentSession({
  ...otherConfig,
  customTools: [
    createSubLoaderToolDefinition(cwd),
    // ... other custom tools if any
  ],
});
```

## 📦 **Danh sách SubTools**

Xem file `src/tools/sub-tools/index.ts` để xem tất cả sub-tools đã implement.
