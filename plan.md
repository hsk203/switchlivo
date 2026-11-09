# Switchlivo 首页后半段改版方案

## 目标与范围

从首页 **“A Complete Smart Ecosystem, Built In-House”** 开始重做至首页主要内容末尾；保留其上方 Banner、SolutionPlatform 与 Ecosystem。首页新增的双路径询盘区取代共享 Footer 顶部 CTA，因此共享 Footer 仅在首页隐藏这段 intro；Footer 的品牌、导航、邮箱、电话和 WhatsApp 联系信息不变，其他页面继续显示完整 Footer CTA。

沿用现有 Astro + Tailwind 架构，不增加运行时依赖。首页通过独立 Astro 组件组合区块。

## 内容与数据

首页只精选用户指定的 10 款产品，产品标题、主图、详情路径直接来自 `src/content/products` 的正式条目，并继续使用 `cdnImage()`；分类、展示顺序和短用途摘要由首页精选清单维护。产品图保留比例、使用 `object-fit: contain` 与延迟加载。场景图沿用现有住宅、酒店和办公室素材。

页面模块依次为：

1. `HomeEcosystemIntro.astro`：承接生态图，以 Devices、Connectivity、Partnership 三个短句说明业务范围。
2. `HomeProductShowcase.astro`：10 款真实产品、All/分类筛选、产品详情链接和完整目录入口。
3. `HomeApplications.astro`：Smart Home、Smart Hotel、Smart Lighting 三类场景，连接到对应产品。
4. `HomeOemPartnership.astro`：说明从项目简报、选型到讨论可用定制选项的合作路径，不承诺未核实的交期、MOQ、认证或产能。
5. `HomeProofCta.astro`：移除首页未经核实的匿名评价，以“Request the product catalogue”和“Discuss OEM / ODM”作为两个清楚的联系路径。

## 设计方向

- **Design Movement：** 克制的高端 B2B 产品编辑式设计，结合产品目录清晰度与空间应用叙事。
- **Core Principles：** 真实产品优先；先产品后场景与合作；表达简明可信；桌面与手机均易浏览。
- **Color Philosophy：** 页面主背景纯白 `#FFFFFF`；保留品牌橙 `#FE6019` 用于大标题和装饰，并用高对比度深橙 `#B84311` 用于小字号橙色文本和白字按钮底色；浅暖色仅用于图片托盘及局部信息面板。
- **Layout Paradigm：** 标题与说明采用编辑式留白；产品区使用响应式网格；应用场景与 OEM/ODM 内容采用不同的叙事结构，避免所有区块都重复同一套卡片。
- **Signature Elements：** 大写章节眉题、细线和编号、真实商品图的浅暖色独立托盘。
- **Interaction Philosophy：** 产品分类筛选默认展示全部 10 款，提供清楚的选中状态、键盘焦点和实时结果提示；产品与 CTA 指向详情页、联系页或 WhatsApp。
- **Animation：** 仅使用轻微 hover 位移/缩放；尊重 `prefers-reduced-motion`，减少动态偏好下不执行变换。
- **Typography System：** 复用主题字体：Poppins 正文与 UI、Merriweather 标题；保持清晰层级和舒适行距。
- **Brand Essence / Voice：** 面向智能家居品牌、酒店项目和分销合作方的智能控制产品及 OEM/ODM 供应商；语气专业、务实、可靠，不作过度承诺。
- **Wordmark & Logo：** 沿用现有 Switchlivo 标识，不重绘。

## 项目结构

- `src/pages/index.astro` 负责首页区块组合，并在首页关闭共享 Footer intro CTA。
- `src/layouts/components/home/` 存放首页专属的生态介绍、产品目录、场景、OEM/ODM 与询盘区块。
- `src/layouts/Base.astro` 向共享 Footer 传递可选 CTA 开关；默认其他页面行为不变。
- `src/layouts/partials/Footer.astro` 保留全站联系信息与导航；可选隐藏的仅是顶部 CTA intro。
- `src/content/products/` 与现有 `cdnImage()` 继续提供真实商品名称、主图和详情页信息。
- `public/images/solutions/` 复用既有住宅、酒店和办公室图。
- `dist/` 是构建产物，不手工修改或提交。
