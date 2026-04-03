# 兰途接诉即办 Web 端

基于接诉即办业务需求实现的 Web 应用：用户端（PC + 移动布局）、管理端（PC），数据可在浏览器侧持久化，支持对接大模型能力。

## 功能模块

### 用户端（PC 与移动端布局）
- **首页**：统计概览、热门诉求、部门与通知等
- **登录注册**：账号密码等方式；支持自助注册
- **发起诉求**：正文与敏感词检测、智能匹配部门与类型
- **诉求公开**：检索与筛选、公开列表
- **我的诉求**：进度、评价与消息
- **部门风采**、**搜索与看板**、**智能助理** 等

### 管理端（PC）
- **数据概览**、**诉求办理**、**部门与类型**、**统计报表**、**系统设置** 等

### AI 能力（OpenAI 兼容 Chat Completions）
- 问答、敏感词复核、相似与判重、部门匹配、分类、帮写、转派说明、翻译等（默认经 DashScope 等兼容接口，见 `src/mock/aiGlm.ts`）。
- **配置**：复制 `.env.example` 为 `.env.local`，填写 `VITE_GLM_API_KEY`、`VITE_GLM_MODEL` 后重启开发服务。密钥勿提交仓库；生产环境建议由后端代发请求。

## 技术栈

- React 18 + TypeScript、Vite、React Router 6、Zustand
- UI：Ant Design 5

## 本地数据与多端同步

- **主存储**：业务数据（诉求、答复、流程、消息等）使用 **IndexedDB** 持久化，内存热缓存便于同步读写；写入防抖落盘，页签隐藏时会立即刷盘。
- **兼容**：环境不支持 IndexedDB 时可回退 **localStorage** 并迁移旧数据。
- **多标签**：通过 **BroadcastChannel** 与 `jsjb-mock-updated` 事件同步刷新界面。
- **会话**：门户端与管理端登录态分键保存，互不覆盖。

### 预置账号（初始密码 `123456`，首次登录后请修改）

| 用户名 | 角色 | 说明 |
|--------|------|------|
| `student001` | 学生 | 用户端 |
| `teacher001` | 教职工 | 用户端 |
| `admin001` | 超管 | 管理端全量 |
| `handler001` | 二级单位处理员 | 绑定后勤保障部，本部门诉求 |
| `leader001` | 校办 | 管理端督办与全量列表 |

## 常用路由

- `/user/home` — 门户首页  
- `/user/login`、`/user/register` — 登录与注册  
- `/user/appeal/create`、`/user/appeal/list`、`/user/appeal/detail/:id`、`/user/appeal/my` — 诉求  
- `/user/ai-assistant` — 智能助理  
- `/mobile-frame` — 桌面端下调试用的移动端窄屏视窗  
- `/admin/login` 及 `/admin/*` — 管理端  

宽屏下可加 `?viewport=mobile` 强制移动布局。

## 开发与构建

```bash
npm install
copy .env.example .env.local   # Windows，再编辑密钥
npm run dev
npm run build
```
