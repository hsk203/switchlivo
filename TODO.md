# Switchlivo 首页改版进度

## 页面结构与视觉
- [x] 从 “A Complete Smart Ecosystem, Built In-House” 开始重做首页后半段，保留上方 Banner、SolutionPlatform 与 Ecosystem。
- [x] 首页专属双路径询盘区取代共享 Footer 顶部 CTA；Footer 的联系方式与链接不变，其他页面 CTA 保持显示。
- [x] 延续纯白主背景、Poppins 正文/Merriweather 标题和品牌橙；小字号橙色文本与白字按钮使用高对比度深橙。
- [x] `prefers-reduced-motion` 下禁用卡片、场景图与询盘按钮的 hover 位移/缩放，并在浏览器中实测变换为 `none`。
- [x] 完成桌面与 390px 手机生产预览；筛选交互分别显示正确的产品数量。

## 产品与应用场景
- [x] 只展示用户指定的十款产品；标题、主图和详情链接来自产品正式内容条目。
- [x] 按 Switches & Panels（5）、Power & Sockets（3）、Climate Control（2）分组，提供 All/分类筛选和完整产品目录入口。
- [x] 默认展示全部产品；图片延迟加载并保持比例；筛选按钮具备键盘状态和实时结果提示。
- [x] 使用现有住宅、酒店与办公室素材展示 Smart Home、Smart Hotel、Smart Lighting，并链接对应产品。
- [x] 修复无尾斜杠路由兼容：10 个首页商品详情页、产品目录、方案、联系页及商品详情询盘入口均经本地预览验证可访问；共用 ProductCard 和产品 canonical 同步修正。

## OEM/ODM 与询盘
- [x] 介绍产品选型、可讨论的品牌/外观/接口/包装选项及合作步骤；不承诺未经核实的交期、MOQ、认证或产能。
- [x] 移除首页未经核实的匿名评价，以真实产品和清楚的目录/项目咨询入口替代。

## 发布
- [x] Astro 生产构建成功；本次改动涉及的 Astro 文件无新增诊断。现有项目检查仍报告 27 项与本次文件无关的错误。
- [x] 本地生产预览与 URL/静态资源复核完成，所有十个商品详情路由均返回 HTTP 200。
- [x] 已提交并推送到 GitHub `main`，并检查线上更新状态。
