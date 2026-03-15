# Memory Management TDD (基于 `pi-coding-agent`)

## 1. 架构评估与可行性分析
`docs/Mem.md` 中提出的三层级记忆架构（全局长期记忆、会话状态树、局部工作记忆）设计非常合理，完美契合了高校长周期、多并发的复杂业务场景。

特别地，该方案极度契合现有的 **`packages/coding-agent`** 模块：
- **JSONL 与会话分支 (Fork & Tree)**：`pi-coding-agent` 原生自带基于 `parentId` 的 JSONL Session 树结构，以及 `/tree` 和 `/fork` 命令，完美实现了“会话状态树”的需求。
- **记忆紧凑 (Compaction)**：`pi-coding-agent` 已经内置了基于 Token 长度的上下文紧凑机制。
- **局部工作记忆**：与 `pi-agent-core` 的 Tool Calling 结合，能轻松实现阅后即焚的隔离运行环境。

因此，**基于 `packages/coding-agent`（结合 `packages/agent` 核心底层）来实现独立的 Memory Management Server / Extension 是最合理的选择。**

## 2. 系统目标
打造一个名为 `@mariozechner/pi-mem` (或作为 `coding-agent` 的高级 Extension) 的独立包，提供标准化的记忆存取、分支管理、语义浓缩与知识库外挂服务。

## 3. 模块划分与核心接口设计

### 3.1 核心数据结构适配
复用并拓展 `coding-agent` 中的 `AgentMessage` 和 `Session` 模型：

```typescript
// 拓展标准 Message 增加隐私与向量元数据
interface MemoryMessage extends AgentMessage {
  parentId: string;
  isCompacted?: boolean;     // 是否是经过浓缩的摘要节点
  vectorized?: boolean;      // 此节点是否已存入 RAG
  privacyLevel: 'public' | 'protected' | 'private'; // 脱敏级别
}
```

### 3.2 长期记忆管理器 (Long-Term Memory Manager)
**目标**：提供全局画像和持久化事实的查询与注入。
**接口**：
```typescript
class LongTermMemory {
  // 从 Postgres / VectorDB 获取用户画像
  async getProfile(userId: string): Promise<UserProfile>;
  // 注入到 System Prompt
  async injectIntoSystemPrompt(prompt: string, profile: UserProfile): string;
  // 后台静默更新偏好
  async updatePreference(userId: string, habits: string[]): Promise<void>;
}
```

### 3.3 中期树状会话存储 (Session Tree Storage)
**目标**：直接增强 `coding-agent` 现有的 JSONL 存储器，增加可视化 API。
**接口**：
```typescript
class SessionTreeManager {
  // 获取当前上下文分支（回溯到 Root）
  async getLinearContext(leafNodeId: string): Promise<MemoryMessage[]>;
  // 创建新的一轮并发分支
  async forkNode(nodeId: string, newThought: string): Promise<string>;
}
```

### 3.4 动态紧凑与 RAG 归档 (Compaction & RAG Engine)
**目标**：实现后台的异步压缩和小模型驱动的归档。
**接口**：
```typescript
class CompactionEngine {
  // 基于滑动窗口压缩历史节点
  async compactHistory(messages: MemoryMessage[], windowSize: number): Promise<MemoryMessage>;
  // 将长文本切块并存入向量库
  async archiveToRAG(sessionId: string, largeText: string): Promise<void>;
  // 从 RAG 动态召回
  async retrieveFromRAG(sessionId: string, query: string): Promise<string[]>;
}
```

### 3.5 脱敏与隐私防火墙 (Privacy Firewall)
**目标**：Sub-Agent 调度时的数据掩码。
**接口**：
```typescript
class PrivacyFirewall {
  // 剥离敏感信息
  async sanitizeContext(messages: MemoryMessage[], requiredLevel: string): Promise<MemoryMessage[]>;
  // 写入审计日志 (audit.jsonl)
  async writeAuditLog(request: any): Promise<void>;
}
```

## 4. 实施步骤

1. **Phase 1: 基础设施复用**
   - 提取 `coding-agent` 内的 `SessionManager`，重构为独立的 `SessionTreeManager`。
   - 实现基础的中期 JSONL 树状读写机制。
2. **Phase 2: 记忆紧凑引擎引入**
   - 引入小模型 API (如通过 `pi-ai` 调取 Qwen-7B)。
   - 实现 `CompactionEngine.compactHistory` 语义压缩。
3. **Phase 3: 长期记忆与 RAG 挂载**
   - 接入轻量级 VectorDB (如 Chroma 或 pgvector)。
   - 实现 `LongTermMemory` 获取用户维度画像和上下文检索。
4. **Phase 4: 隐私拦截器与 API 封装**
   - 实现 `PrivacyFirewall` 工具进行中间劫持。
   - 暴露 RESTful 接口供 Web-UI, Mom, Command-line 调用。

## 5. 测试与验证策略

- **树遍历测试**: `SessionTreeManager` 必须具备单元测试，确保任意 `leafNodeId` 能准确无误溯源一条干净的 `AgentMessage` 数组，期间不能混入同层非关联兄弟节点的记录。
- **Compaction Token 计算测试**: 预设一段 50K Token 的对话，触发 `compactHistory`，断言新返回的替换节点 Token 量显著小于原结构，并且通过提取模型二次询问核心语义是否丢失。
- **并发写入测试**: 在极短时间内（< 10ms）向同一个 `parentId` 写入不同的 `AgentMessage`，校验 JSONL 能够正确锁和防脏写形成双分支。
