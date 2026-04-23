📦 Báo cáo hệ thống: Package @mariozechner/agent (pi-agent-core)                                                                                                                       
                                                                                                                                                                                        
 ────────────────────────────────────────────────────────────────────────────────                                                                                                       
                                                                                                                                                                                        
 🏗️ Kiến trúc tổng quan                                                                                                                                                                 
                                                                                                                                                                                        
 Gói này cung cấp Agent Framework - một hệ thống chạy AI agent với khả năng streaming, tool execution, và event-driven lifecycle. Thiết kế theo mô hình dual-layer message abstraction: 
                                                                                                                                                                                        
 - AgentMessage: Message tổng quát, có thể mở rộng với custom types                                                                                                                     
 - LLM Message: Message cuối cùng gửi tới provider (chuẩn hóa qua convertToLlm)                                                                                                         
                                                                                                                                                                                        
 ────────────────────────────────────────────────────────────────────────────────                                                                                                       
                                                                                                                                                                                        
 🧩 Các thành phần chính                                                                                                                                                                
                                                                                                                                                                                        
 ### 1. Agent (agent.ts)                                                                                                                                                                
                                                                                                                                                                                        
 Lớp stateful high-level wrapper:                                                                                                                                                       
 - Quản lý transcript, tools, system prompt                                                                                                                                             
 - Hỗ trợ queueing: steering (inject giữa chừng) và follow-up (chạy sau khi agent dừng)                                                                                                 
 - Mỗi queue có 2 mode: all (drain tất cả) hoặc one-at-a-time (xử lý lần lượt)                                                                                                          
 - Emit lifecycle events: agent_start, turn_start/end, message_start/update/end, tool_execution_*                                                                                       
 - Hooks: beforeToolCall (block execution), afterToolCall (override result)                                                                                                             
 - Streaming state: isStreaming, streamingMessage, pendingToolCalls                                                                                                                     
 - Error handling: tự động tạo failure message với stopReason="error"|"aborted"                                                                                                         
                                                                                                                                                                                        
 ### 2. Agent Loop (agent-loop.ts)                                                                                                                                                      
                                                                                                                                                                                        
 Low-level coroutine chạy agent:                                                                                                                                                        
 - agentLoop(): start với messages mới                                                                                                                                                  
 - agentLoopContinue(): tiếp tục từ context (không thêm message)                                                                                                                        
 - Shared runLoop():                                                                                                                                                                    
     - Outer loop: đợi follow-up messages sau agent dừng                                                                                                                                
     - Inner loop: xử lý assistant response → tool calls → steering messages                                                                                                            
     - Stream assistant response qua streamFn                                                                                                                                           
     - Convert AgentMessage[] → Message[] trước khi gọi LLM                                                                                                                             
     - Tool execution: sequential hoặc parallel (parallel: prepare tuần tự, execute song song)                                                                                          
     - Context transform: transformContext cho pruning, injection (chạy trước convertToLlm)                                                                                             
 - Event streams: sử dụng EventStream từ pi-ai, terminus là agent_end                                                                                                                   
                                                                                                                                                                                        
 ### 3. Types (types.ts)                                                                                                                                                                
                                                                                                                                                                                        
 Định nghĩa kiểu mở rộng:                                                                                                                                                               
 - AgentMessage: union của Message (từ pi-ai) + custom messages (declaration merging)                                                                                                   
 - AgentTool: kế thừa Tool<TParameters> với label, prepareArguments, execute, executionMode                                                                                             
 - AgentToolResult<T>: content + details                                                                                                                                                
 - AgentContext: snapshot gồm systemPrompt, messages, tools                                                                                                                             
 - AgentLoopConfig: config chi tiết cho loop (model, convertToLlm, transformContext, getApiKey, hooks, toolExecution...)                                                                
 - AgentEvent: union event lifecycle (agent, turn, message, tool execution)                                                                                                             
 - ThinkingLevel: mức reasoning (off đến xhigh)                                                                                                                                         
 - ToolExecutionMode: "sequential" | "parallel"                                                                                                                                         
 - StreamFn: signature stream function                                                                                                                                                  
                                                                                                                                                                                        
 ### 4. Proxy (proxy.ts)                                                                                                                                                                
                                                                                                                                                                                        
 Stream function đi qua proxy server:                                                                                                                                                   
 - streamProxy(): POST JSON tới /api/stream, nhận SSE                                                                                                                                   
 - Server strip partial để giảm bandwidth                                                                                                                                               
 - Client-side reconstruct partial message từ events                                                                                                                                    
 - Xử lý proxy event types: start, text_*/thinking_*/toolcall_* (không có partial), done/error                                                                                          
                                                                                                                                                                                        
 ────────────────────────────────────────────────────────────────────────────────                                                                                                       
                                                                                                                                                                                        
 🔄 Luồng dữ liệu                                                                                                                                                                       
                                                                                                                                                                                        
 1. Agent.prompt() → validate, normalize → runPromptMessages()                                                                                                                          
 2. runPromptMessages() → runWithLifecycle() → runAgentLoop()                                                                                                                           
 3. runAgentLoop():                                                                                                                                                                     
     - Tạo context snapshot: systemPrompt + messages + tools                                                                                                                            
     - Vòng lặp chính:                                                                                                                                                                  
           - a) Inject pending steering messages (nếu có)                                                                                                                               
           - b) streamAssistantResponse():                                                                                                                                              
                   - Optionally transformContext()                                                                                                                                      
                   - convertToLlm() → Message[]                                                                                                                                         
                   - Gọi streamFn với resolved API key                                                                                                                                  
                   - Nhận stream events, rebuild AssistantMessage                                                                                                                       
           - c) Nếu assistant có tool calls:                                                                                                                                            
                   - executeToolCalls(): prepare (validate, beforeToolCall) → execute (parallel/sequential) → finalize (afterToolCall)                                                  
                   - Tạo ToolResultMessage, thêm vào context                                                                                                                            
           - d) Emit turn_end                                                                                                                                                           
           - e) Lặp lại nếu còn tool calls hoặc steering messages                                                                                                                       
     - Sau vòng lặp: getFollowUpMessages() → nếu có, lặp outer loop                                                                                                                     
 4. Event handling: mỗi sự kiện → processEvents() → cập nhật state → gọi tất cả listeners (await)                                                                                       
 5. Completion: emit agent_end → finishRun() (clear streaming flags) → resolve run promise                                                                                              
                                                                                                                                                                                        
 ────────────────────────────────────────────────────────────────────────────────                                                                                                       
                                                                                                                                                                                        
 📤 Danh sách exports đầy đủ                                                                                                                                                            
                                                                                                                                                                                        
 ### Classes                                                                                                                                                                            
                                                                                                                                                                                        
 - Agent - lớp agent stateful chính                                                                                                                                                     
                                                                                                                                                                                        
 ### Functions                                                                                                                                                                          
                                                                                                                                                                                        
 - agentLoop() - start agent loop với new prompt messages                                                                                                                               
 - agentLoopContinue() - continue agent loop từ context hiện tại                                                                                                                        
 - runAgentLoop() - internal runner với event emit                                                                                                                                      
 - runAgentLoopContinue() - internal runner continue                                                                                                                                    
 - streamProxy() - stream function di chuyển qua proxy server                                                                                                                           
                                                                                                                                                                                        
 ### Types & Interfaces                                                                                                                                                                 
                                                                                                                                                                                        
 Core:                                                                                                                                                                                  
 - AgentMessage - union type cho messages (LLM + custom)                                                                                                                                
 - AgentTool<TParameters, TDetails> - định nghĩa tool                                                                                                                                   
 - AgentToolResult<T> - kết quả tool                                                                                                                                                    
 - AgentToolUpdateCallback<T> - callback streaming updates                                                                                                                              
 - AgentContext - context snapshot                                                                                                                                                      
 - AgentLoopConfig - config cho agent loop                                                                                                                                              
 - AgentEvent - union event lifecycle                                                                                                                                                   
 - AgentState - state công khai của agent                                                                                                                                               
 - AgentToolCall - tool call content block                                                                                                                                              
 - StreamFn - type của stream function                                                                                                                                                  
                                                                                                                                                                                        
 Hooks & Configs:                                                                                                                                                                       
 - BeforeToolCallContext - context truyền vào beforeToolCall                                                                                                                            
 - AfterToolCallContext - context truyền vào afterToolCall                                                                                                                              
 - BeforeToolCallResult - kết quả trả về từ beforeToolCall (block support)                                                                                                              
 - AfterToolCallResult - override result từ afterToolCall                                                                                                                               
                                                                                                                                                                                        
 Enums & Modes:                                                                                                                                                                         
 - ToolExecutionMode - "sequential" | "parallel"                                                                                                                                        
 - ThinkingLevel - "off" | "minimal" | "low" | "medium" | "high" | "xhigh"                                                                                                              
                                                                                                                                                                                        
 Proxy:                                                                                                                                                                                 
 - ProxyAssistantMessageEvent - event types từ proxy server (stripped)                                                                                                                  
 - ProxyStreamOptions - options cho streamProxy                                                                                                                                         
                                                                                                                                                                                        
 Extension:                                                                                                                                                                             
 - CustomAgentMessages - interface rỗng để declaration merging thêm custom message types                                                                                                
                                                                                                                                                                                        
 ────────────────────────────────────────────────────────────────────────────────                                                                                                       
                                                                                                                                                                                        
 🎯 Cách sử dụng (diễn giải)                                                                                                                                                            
                                                                                                                                                                                        
 ### Khởi tạo Agent                                                                                                                                                                     
                                                                                                                                                                                        
 Tạo Agent với options:                                                                                                                                                                 
 - initialState: systemPrompt, model, thinkingLevel, tools, messages                                                                                                                    
 - convertToLlm: function chuyển AgentMessage[] → Message[] (bắt buộc)                                                                                                                  
 - transformContext: optional, transform context trước conversion                                                                                                                       
 - streamFn: custom stream function (default: streamSimple từ pi-ai)                                                                                                                    
 - getApiKey: dynamic API key resolution                                                                                                                                                
 - beforeToolCall / afterToolCall: hooks lifecycle tool                                                                                                                                 
 - steeringMode / followUpMode: queue mode (all hoặc one-at-a-time)                                                                                                                     
 - toolExecution: sequential hoặc parallel                                                                                                                                              
 - transport, thinkingBudgets, maxRetryDelayMs: options truyền xuống provider                                                                                                           
                                                                                                                                                                                        
 ### Chạy Agent                                                                                                                                                                         
                                                                                                                                                                                        
 - agent.prompt(message|messages): start new turn                                                                                                                                       
 - agent.continue(): tiếp tục từ context (last message phải là user hoặc toolResult)                                                                                                    
 - Lưu ý: chỉ một run active tại một thời điểm                                                                                                                                          
                                                                                                                                                                                        
 ### Queue management                                                                                                                                                                   
                                                                                                                                                                                        
 - agent.steer(message): queue steering message (xử lý ngay sau assistant turn hiện tại)                                                                                                
 - agent.followUp(message): queue follow-up (chờ agent dừng, rồi tiếp tục)                                                                                                              
 - agent.clearSteeringQueue() / clearFollowUpQueue() / clearAllQueues()                                                                                                                 
 - agent.hasQueuedMessages(): kiểm tra queue                                                                                                                                            
                                                                                                                                                                                        
 ### Event subscription                                                                                                                                                                 
                                                                                                                                                                                        
 - agent.subscribe(listener): nhận events (agent_start/end, turn_start/end, message_start/update/end, tool_execution_*)                                                                 
 - Listener nhận (event, signal), có thể async                                                                                                                                          
 - Listener chạy tuần tự theo subscription order, được await khi agent_end                                                                                                              
                                                                                                                                                                                        
 ### State & Control                                                                                                                                                                    
                                                                                                                                                                                        
 - agent.state: read-only state (systemPrompt, model, thinkingLevel, tools, messages, isStreaming, streamingMessage, pendingToolCalls, errorMessage)                                    
 - agent.signal: AbortSignal của run hiện tại                                                                                                                                           
 - agent.abort(): hủy run                                                                                                                                                               
 - agent.waitForIdle(): await cho đến khi run + listeners xong                                                                                                                          
 - agent.reset(): clear toàn bộ state và queues                                                                                                                                         
                                                                                                                                                                                        
 ### Custom Tools                                                                                                                                                                       
                                                                                                                                                                                        
 Tool phải implement:                                                                                                                                                                   
 - label: string hiển thị UI                                                                                                                                                            
 - execute(toolCallId, params, signal, onUpdate): Promise<AgentToolResult<details>>                                                                                                     
 - prepareArguments?: pre-validation shim                                                                                                                                               
 - executionMode?: override tool execution mode                                                                                                                                         
                                                                                                                                                                                        
 ### Using Proxy                                                                                                                                                                        
                                                                                                                                                                                        
 - streamProxy(model, context, { authToken, proxyUrl, ...rest })                                                                                                                        
 - Server endpoint: POST /api/stream với JSON body { model, context, options }                                                                                                          
 - Server phải emit SSE với format ProxyAssistantMessageEvent (không có partial)                                                                                                        
 - Client tự rebuild partial message                                                                                                                                                    
                                                                                                                                                                                        
 ────────────────────────────────────────────────────────────────────────────────                                                                                                       
                                                                                                                                                                                        
 🔧 Integration Notes                                                                                                                                                                   
                                                                                                                                                                                        
 - Dependencies: @mariozechner/pi-ai (EventStream, Message types, streamSimple), @sinclair/typebox (tool schemas)                                                                       
 - No built-in LLM calls: streamFn là pluggable (default dùng streamSimple từ pi-ai)                                                                                                    
 - Thread-safe queues: PendingMessageQueue an toàn cho concurrent enqueue từ bên ngoài                                                                                                  
 - Error boundaries: stream function không throw; errors encoded trong stream events → agent loop luôn emit final message hợp lệ                                                        
 - Abort propagation: signal truyền khắp nơi (transformContext, convertToLlm?, getApiKey, beforeToolCall, tool.execute, afterToolCall)                                                  
 - Token budgets: thinkingBudgets truyền xuống provider qua stream options                                                                                                              
 - Session ID: sessionId forwarded để cache-aware backends                                                                                                                              
                                                                                                                                                                                        
 ────────────────────────────────────────────────────────────────────────────────                                                                                                       
                                                                                                                                                                                        
 📊 Summary                                                                                                                                                                             
                                                                                                                                                                                        
 Package này cung cấp agent runtime cao cấp với:                                                                                                                                        
 - Event-driven architecture rõ ràng                                                                                                                                                    
 - Hooks để customize behavior                                                                                                                                                          
 - Queue system linh hoạt                                                                                                                                                               
 - Tool execution modes (sequential/parallel) với streaming updates                                                                                                                     
 - Proxy support cho enterprise auth                                                                                                                                                    
 - Full TypeScript với types mạnh                                                                                                                                                       
 - Error handling an toàn, không unhandled throws                                                                                                                                       
 - Dễ mở rộng qua CustomAgentMessages declaration merging                                                                                                                               
                                                                                                                                                                                        
 Agnezient là lớp trừu tượng cao, đóng gói hết chi tiết low-level loop, chỉ cần inject các hook cần thiết và custom convertToLlm/transformContext là xong.   

