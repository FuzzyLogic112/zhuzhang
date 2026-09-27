# 筑账 · 多端免服务器版

给小包工头使用的工程资料、发票、质保金和尾款管理工具。适合道路、地坪、碎石、划线项目，以及少量熟人各自使用。

本仓库包含完整前端源码、单文件网页，以及安卓、Windows、macOS、Linux 应用构建配置。不需要购买服务器、配置数据库、注册企业账号或填写 API 密钥。

- **多端下载：** https://fuzzylogic112.github.io/zhuzhang/downloads/
- **安装与迁移：** [INSTALL.md](INSTALL.md)
- **项目仓库：** https://github.com/FuzzyLogic112/zhuzhang
- **网页地址：** https://fuzzylogic112.github.io/zhuzhang/
- **免安装文件：** [`docs/index.html`](docs/index.html)，下载后用电脑 Edge 或 Chrome 普通窗口打开。浏览器对本地文件的存储支持可能不同，请先试建项目并关闭后重开确认。

## 能做什么

| 功能 | 当前版本 |
| --- | --- |
| 工程项目 | 项目台账、合同金额、开票目标、状态和负责人 |
| 发票台账 | 手动录入、项目分类、发票号查重、原件保存、缺票提示 |
| 质保金和尾款 | 到期日期、待收总额、部分收款、催收记录 |
| 到期提醒 | 页面内预警；导出 `.ics` 文件后导入手机或电脑日历 |
| 资料归档 | 按项目保存合同、发票和竣工资料，导出 ZIP |
| 给会计或老板查看 | 导出单个项目 ZIP，包含可打开的 HTML 报表、CSV 台账和原件 |
| 工程估算 | 面积、厚度、损耗和单价，计算混凝土、碎石、沥青、划线材料及预估价 |
| 备份迁移 | 完整备份 ZIP；校验后恢复台账和原件 |

**这个版本没有发票 OCR、微信自动推送或多人实时同步。** 提醒依赖网页打开时检查，或使用者导入日历并允许提醒。日历不会自动同步后续修改，收款计划改变后需更新日历。估算结果用于初步报价，参数和实际用量应由使用者核对。

## 第一次使用

1. 用固定的浏览器打开网页，进入“工程项目”，新建项目。
2. 填写合同金额、开票目标，保存发票和工程资料。
3. 为每笔质保金、尾款填写金额和到期日；到账时记录收款。
4. 在“备份与共享”导出日历提醒，并导入常用日历。
5. 定期点击“完整备份”。给会计或老板看资料时，选择“导出项目资料包”。

可以打开演示数据查看界面；演示数据不写入自己的账本。

## 数据放在哪里

账本和原件保存在当前浏览器的 IndexedDB 中，**不会上传到 GitHub 或项目作者处**。页面没有外部字体、CDN 依赖或云端接口；生产网页限制网络连接。

- 换手机、换浏览器、切换网页域名或从网页改用本地文件，都不会自动带入原来的账本。请先完整备份，再导入。
- 清理网站数据、使用隐私窗口或浏览器回收存储可能造成丢失。备份 ZIP 应另存到可靠位置。
- 单个原件上限 10 MB，全部原件上限 200 MB；浏览器可用配额可能更低。
- 恢复完整备份会替换当前账本，页面会要求确认。恢复前请先备份现有数据。
- 给他人的项目 ZIP 是静态副本，不会自动更新，也不能远程撤回。对方只能看到导出时的内容。
- 网页地址可以共用，但每个人看到的是自己浏览器的账本。此版本没有账号登录或本地账本加密；请使用自己的设备。

## 在 GitHub Pages 上打开

仓库已包含可直接发布的 `docs/index.html` 和 `docs/.nojekyll`，无需安装依赖来发布。

1. 打开仓库的 **Settings → Pages**。
2. **Source** 选择 **GitHub Actions**。
3. 仓库已包含 `.github/workflows/pages.yml`，推送到 `main` 时会自动发布 `docs`；也可以在 Actions 中选择 Publish Zhuzhang，点击 Run workflow。
4. 等待工作流成功，在 Pages 设置页面点击 **Visit site**。

官方配置说明：https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

首次打开需要网络。需要脱网打开时，请下载完整 `docs/index.html` 文件。仓库只应存程序源码，不要提交账本备份、发票或合同原件。

## 修改源码

开发环境：Node.js 22.13 或更高版本（建议 Node.js 24）和 npm。

```bash
npm ci
npm run dev
```

按终端显示的本地地址访问。验证并生成可交付文件：

```bash
npm run typecheck
npm test
npm run build
npm run preview
```

`npm run build` 生成 `docs/index.html`，所有脚本和样式均内嵌。修改代码后，请把源码与重新生成的 `docs/index.html` 一起提交；Pages 直接发布 `docs`，不会自动构建 TypeScript。

## 代码位置

| 目录 | 用途 |
| --- | --- |
| `app/` | 项目、发票、收款、估算界面 |
| `components/`、`hooks/` | 界面组件 |
| `lib/` | 金额、估算公式、数据类型与校验 |
| `offline/storage.ts` | 浏览器存储与原件读写 |
| `offline/mutations.ts` | 台账修改、重复发票和收款校验 |
| `offline/exports.ts` | 备份、恢复、项目资料包和日历 |
| `offline/test.mjs` | 15 项本地存储和业务集成检查 |
| `server/zip.ts` | ZIP 格式工具；不需要运行服务器 |
| `docs/` | 可直接发布或下载的网页 |

测试覆盖收款重试、并发超额收款拦截、备份校验、原件恢复、项目分享范围和日历提醒格式。Node.js 测试使用模拟 IndexedDB，不能替代每一种真实浏览器的兼容性检查。

## 安装版构建

桌面应用源码位于 `desktop/`，安卓源码位于 `android/`。`npm run build:apps` 生成本地页面并复制到各端。GitHub Actions 编译安装包；网页仍直接发布 `docs`。iPhone/iPad 目前提供主屏幕网页应用，没有 IPA。

安卓签名私钥不在仓库中，未来覆盖升级需使用项目所有者保存的签名备份。没有这份私钥时，不要生成新证书后声称可无损覆盖升级。升级前请先导出账本备份。
