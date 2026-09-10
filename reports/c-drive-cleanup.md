# C 盘安全清理报告

清理日期：2026-09-10
执行方式：仅清理**可安全重新生成的缓存**与**未被占用的临时文件**；未触碰任何系统组件、用户文档、浏览器数据、密钥或项目源码。

## 空间变化

| 项目 | 清理前可用 | 清理后可用 | 释放 |
|---|---|---|---|
| C 盘 | **1.24 GB** | **4.16 GB** | **+2.92 GB** |

## 实际清理内容

| 项目 | 路径 | 释放 | 说明 |
|---|---|---|---|
| npm 缓存 | `C:\Users\23178\AppData\Local\npm-cache` | 2.63 GB | 执行官方 `npm cache clean --force`；依赖已安装在 D 盘项目内，不影响构建 |
| pip 缓存 | `C:\Users\23178\AppData\Local\pip\Cache` | 0.12 GB | Python 包下载缓存，可自动重建 |
| 用户临时文件 | `C:\Users\23178\AppData\Local\Temp` | 0.17 GB | 仅删除 **1 天前** 且未被占用的条目（删除 350 项，占用中的 1 项自动跳过） |
| Windows 临时文件 | `C:\Windows\Temp` | — | 仅清理未占用项（占用中的文件自动跳过） |
| 项目迁移 | `C:\Users\23178\新建文件夹\acca-master` → `D:\ACCA-Master` | 1.00 GB | 先完整复制并逐一校验（36,994 文件 / 965.1 MB 完全一致），再删除 C 盘副本 |

## 未删除（有意保留）

| 项目 | 大小 | 原因 |
|---|---|---|
| `C:\Users\23178\AppData\Local\ms-playwright` | 0.68 GB | 属于浏览器缓存，但可能被其它项目（旧版 Playwright）使用；本次 QA 已改用 `D:\ACCA-Master\.playwright`，如需释放可手动执行：`Remove-Item "$env:LOCALAPPDATA\ms-playwright" -Recurse -Force` |
| `C:\Users\23178\AppData\Local\JetBrains\PyCharm2024.3\coverage` | 小 | IDE 自身目录，非本项目产物 |
| Downloads / Desktop / Documents / 微信 / QQ / 浏览器数据 | — | 可能含个人文件，**只统计未删除** |

## 安全边界（全程遵守）

- 未执行任何形式的磁盘格式化、系统盘清空或不可控递归删除。
- 未删除 `C:\Windows`、`C:\Program Files`、用户个人目录（Desktop/Documents/Pictures/Videos/Music）、SSH 密钥、Git 凭据、浏览器个人数据。
- 未删除 `WinSxS` / `Installer` / `DriverStore` / `System32` 等系统组件。
- 所有删除均为：官方缓存清理命令、或 `>1 天` 且未被占用的临时文件（`Access Denied` / 文件占用一律跳过）。
- 迁移前做了文件级一致性校验；C 盘副本删除后，D 盘项目通过了 typecheck / lint / test / build 与全页面 HTTP 200 验证。

## 清理后验证

```
D:\ACCA-Master
  npx tsc --noEmit            → PASS
  npx next lint               → PASS（0 error）
  npx vitest run              → 32/32 PASS
  npm run build               → PASS
  本地页面 / /dashboard /practice /papers /mock /mistakes /analytics /plan /profile → 全部 200
```

## 后续可手动释放（如需更多空间）

```powershell
# 1) 旧版 Playwright 浏览器缓存（0.68 GB）
Remove-Item "$env:LOCALAPPDATA\ms-playwright" -Recurse -Force

# 2) 清空回收站（Windows 官方方式，请先确认无需要恢复的文件）
Clear-RecycleBin -Force

# 3) 查看 C 盘当前占用最大的目录（只查看，不删除）
Get-ChildItem C:\Users\23178 -Directory -Force | ForEach-Object {
  $size = (Get-ChildItem $_.FullName -Recurse -File -Force -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum
  [PSCustomObject]@{ Path = $_.FullName; SizeGB = [math]::Round($size/1GB, 2) }
} | Sort-Object SizeGB -Descending | Select-Object -First 15
```
