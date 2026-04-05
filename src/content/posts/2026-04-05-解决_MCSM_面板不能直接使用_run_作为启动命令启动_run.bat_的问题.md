---
title: "解决 MCSM 面板不能直接使用 run 启动 run.bat 作为启动命令的问题"
published: 2026-04-05T19:25:00
description: ''
tags: [ Minecraft ]
category: Blog
draft: false
---

在 Windows Server 中使用 MCSM 面板时，某次版本更新后遇到不能直接使用 run 启动 run.bat 作为启动命令的问题。

![](.\images\11d51ad88ed23fc4de04feb547c0ff8c.png)

↑错误截图示例

仔细分析后发现，是由于7491d7e7提交（或者说v10.11.0）开始，实例默认不开启仿真终端导致的。只要在终端设置里开启仿真终端即可正常启动。