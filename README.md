# dsh-cyberpunk-intro

每次启动 DSH，铺满窗口播放一次 **DeepSeek 赛博朋克片头**。

只有这一件事：没有片库、没有设置、没有图钉。装上、重启 DSH，片头就会出现。

## 画质

片子来自 [dsh-boot-animation](https://github.com/NativeDog1/dsh-boot-animation) 里的「DeepSeek 赛博朋克片头」，
原片只有 1280×720、约 2 Mbps，在高分屏上铺满会被拉伸近 3 倍，所以发糊。

这里用 Real-ESRGAN（`realesrgan-x4plus-anime` 模型）把每一帧 AI 超分到 **3840×2160（4K）**，
再以高码率 H.264 重新编码（faststart，可边下边播）。片头是无声的：音轨已去掉。

## 安装

```sh
dsh plugin --profile desktop add github:morning-cml/dsh-cyberpunk-intro
```

（用浏览器版 `dsh web` 的话，把 `desktop` 换成你的 profile 名，例如 `web`。）

装完**重启一次 DSH**。

卸载：

```sh
dsh plugin --profile desktop remove dsh-cyberpunk-intro
```

## 行为

- 每次启动 DSH 播一次；同一次运行里刷新页面不会重播
- 整帧完整显示（`object-fit: contain`），窗口比例和 16:9 不同时上下或左右留黑边，
  这样左右两侧的 HUD 文字不会被裁掉
- **Esc** 或右下角「跳过」随时结束；播完自动淡出
- 静音播放
- 视频加载失败或 20 秒内没播完，浮层会自己关掉，不会把窗口卡成黑屏

## 文件

| 文件 | 作用 |
|---|---|
| `index.js` | 宿主端：在 `/dsh-cyberpunk-intro/intro.mp4` 提供视频（支持 Range） |
| `client.js` | 页面端：在 `shell.overlay` 里放一个全窗口 `<video>` |
| `media/intro.mp4` | 4K 片头 |

## 许可

BSD-3-Clause，见 [LICENSE](LICENSE)。原片版权归 dsh-boot-animation 的贡献者，按同一许可再分发。
