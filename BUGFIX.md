# ClipFlow Bug 记录与修复

## 格式说明

每次遇到问题按以下格式记录：

```
### BUG-XXX: 简述
- **日期**: YYYY-MM-DD
- **现象**: 具体表现
- **原因**: 根因分析
- **修复**: 改动内容（文件+行号）
- **状态**: ✅ 已修复 / ⏳ 待修复
```

---

### BUG-001: 窗口圆角处露出黑边
- **日期**: 2026-04-14
- **现象**: 面板设置了 borderRadius:12，但圆角外侧露出窗口底色（纯黑），形成明显黑边
- **原因**: `main.go` 中 `BackgroundColour` 设为纯黑 `(0,0,0,255)`，面板背景是半透明深灰，圆角处窗口底色与面板色不匹配。即使改成匹配色，浅色模式下仍会露底
- **修复**: `main.go` 启用窗口透明：`WebviewIsTransparent: true` + `WindowIsTranslucent: true`，`BackgroundColour` 设为 `(0,0,0,0)` 全透明，html/body/#root 已是 `background: transparent`，面板自身带背景色，圆角外自然透明无黑边
- **状态**: ✅ 已修复

### BUG-002: 收藏功能不完善
- **日期**: 2026-04-14
- **现象**: 收藏（Pin）功能只能取消收藏，无法对未收藏的条目添加收藏；收藏分类筛选可能不生效
- **原因**: 前端只在 `item.pinned` 为 true 时显示 Pin 按钮，未收藏的条目没有入口触发 `TogglePin`；需要添加右键菜单或悬停操作按钮来 pin/unpin
- **修复**: WinUI.tsx 和 Fluid.tsx 中，将 pin 按钮改为悬停时也显示（`item.pinned || isHovered`），未收藏时显示空心 pin 图标（`fill="none" strokeWidth={1.8}`），已收藏时显示实心图标
- **状态**: ✅ 已修复

### BUG-003: wails build 偶发失败
- **日期**: 2026-04-14
- **现象**: `wails build` 有时失败，但 `npm run build` 成功后再 `wails build` 就能通过
- **原因**: Wails 构建流程中前端编译步骤偶发超时或缓存问题
- **修复**: 构建失败时先在 `frontend/` 目录执行 `npm run build`，再重试 `wails build`
- **状态**: ✅ 已修复（workaround）

### BUG-004: framer-motion 导入路径错误
- **日期**: 2026-04-14
- **现象**: 主题文件使用 `import { motion } from 'framer-motion'` 导致构建失败
- **原因**: 项目安装的是 `motion` 包（v12+），正确导入路径为 `motion/react`
- **修复**: 所有主题文件中 `from 'framer-motion'` 改为 `from 'motion/react'`
- **状态**: ✅ 已修复

### BUG-005: 旧 exe 进程占用导致构建失败
- **日期**: 2026-04-14
- **现象**: `wails build` 报错 "The process cannot access the file because it is being used by another process"
- **原因**: 旧的 clipflow.exe 仍在运行，新构建无法覆盖
- **修复**: 构建前执行 `Get-Process clipflow -ErrorAction SilentlyContinue | Stop-Process -Force`
- **状态**: ✅ 已修复

### BUG-006: 缺少删除功能
- **日期**: 2026-04-15
- **现象**: 剪贴板条目无法单独删除，只能清空未收藏的
- **原因**: 后端没有 `DeleteItem` 方法，前端没有删除按钮
- **修复**: `app.go` 添加 `DeleteItem(id)` 方法；`useClipflow.ts` 导入并导出 `DeleteItem`；WinUI/Fluid 主题列表项悬停时显示 X 删除按钮
- **状态**: ✅ 已修复
