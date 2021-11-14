---
title: 深入理解 Kotlin 协程
---

## 本书内容

这是一部从工作机制、实现原理、应用场景、使用方法、实践技巧、标准库、框架、应用案例等多个维度全面讲解Kotlin协程的专著，它同时提供了多语言视角，亦可通过本书了解其他语言的协程。

全书共9章：

第1章从协程的核心应用场景——异步程序设计的思路和关键问题切入，引出Kotlin协程的概念；

第2章首先介绍了协程的概念、分类，然后讲解了Python、Lua、Go等不同语言的协程实现和对比；

第3~4章以 Kotlin 标准库的协程 API 为核心，讲解了简单协程的使用方法和运行机制，以及通过简单协程设计和实现复合协程的思路和方法；

第5~6章以Kotlin的官方协程框架为模板，通过逐步实现其中的核心功能，分析了其中的实现细节和复合协程的运行机制，并对框架的使用做了深入探讨；

第7~8章讲解了协程在Android应用开发和Web服务开发中的应用场景、面临的挑战，以及解决各种常见问题的方法和思路；

第9章探讨了JavaScript 和 Native等非JVM平台对协程的支持情况，以及协程在这些平台上的应用。

## 反馈方式

感谢大家的关注和支持，如果在阅读过程中遇到问题，欢迎大家选择以下方式与我联系并提供尽可能详细的信息，以便于你的问题能够得到快速的解答：

* 在本页面下方直接发布评论
* 发送邮件至 [bennyhuo@kotliner.cn](mailto:bennyhuo@kotliner.cn)
* 在 [Kotlin 中文论坛](https://discuss.kotliner.cn/) 发布问题

另外，为了方便大家交流，创建读者 QQ 群：612797230，欢迎大家加入~

## 随书源码

本书**源码地址**：[《深入理解 Kotlin 协程》源码](https://github.com/enbandari/DiveIntoKotlinCoroutines-Sources)

## 购买途径

* 京东自营：[深入理解Kotlin协程](https://item.jd.com/12898592.html)
* 当当自营：[深入理解Kotlin协程](http://product.dangdang.com/28973005.html)

## 本书批注

为便于读者理解，针对大家提出疑问的部分附加说明如下：

页码 | 原文 | 说明 
---------|----------|--------- 
153 | 还可以通过 onEach 来做到这一点 ... collect 函数可以放到其他任意位置调用 | collect 函数有一个重载版本可以同时消费 flow，如果用 onEach 消费 flow，则可以在任意位置调用 collect 的无参版本直接激活 flow 而无需考虑消费的问题。 

## 本书勘误

以下为本书勘误，感谢各位读者的支持！

页码 | 发现版本 | 原内容 | 修改为 | 致谢 
---------| ---------|----------|--------- | ------
 38 | 2020.6 | 在代码清单 3-<font color="red">8</font> 的①处 | 在代码清单 3-**7** 的①处 | 论坛 ID： [jkwar](https://discuss.kotliner.cn/u/jkwar/summary)
 45 | 2020.10 | 都会异步挂起（见代码清单 3-<font color="red">8</font> ） | 都会异步挂起（见代码清单 3-**7** ） | [silladus](mailto:silladus@163.com)
 77 | 2021.7 |  图 5.1 <img src="/assets/coroutines/5.1.delay_origin.png" width="300"/> | 图 5.1 <img src="/assets/coroutines/5.1.delay_fixed.png" width="300"/> | [luozejiaqun](https://github.com/luozejiaqun)
 112 | 2021.7 |  图 5.10 <img src="/assets/coroutines/5.10.exception_handling_origin.png" width="300"/> | 图 5.10 <img src="/assets/coroutines/5.10.exception_handling_fixed.png" width="300"/> | [luozejiaqun](https://github.com/luozejiaqun)
 85 | 2020.6 | block.startCoroutine(completion<font color="red">, completion</font>) | block.startCoroutine(completion) | 论坛 ID： [llt](https://discuss.kotliner.cn/u/llt/summary)
 91 | 2020.6 | block.startCoroutine(completion<font color="red">, completion</font>) | block.startCoroutine(completion) | 论坛 ID： [llt](https://discuss.kotliner.cn/u/llt/summary)
105 | 2020.6 | <font color="red">resumeWith Exception</font> | resumeWithException | 论坛 ID： [llt](https://discuss.kotliner.cn/u/llt/summary)
106 | 2020.6 | 在引入取消响应的概念之前，所有的挂起函数都不支持<font color="red">挂起</font> | 在引入取消响应的概念之前，所有的挂起函数都不支持**取消** | 论坛 ID： [zaze8736](https://discuss.kotliner.cn/u/zaze8736/summary)
114 | 2021.7 | 主从作用域：与协<font color="red">程</font>作用域... | 主从作用域：与协**同**作用域... | [SMAXLYB](https://github.com/SMAXLYB)
124 | 2020.6 | Kotlin 协程的官方框架 <font color="red">kotlin.coroutines</font> 是一套独立于标准库之外的... | Kotlin 协程的官方框架 kotlin**x**.coroutines 是一套独立于标准库之外的... | 论坛 ID： [llt](https://discuss.kotliner.cn/u/llt/summary)
142 | 2020.6 | val broadcastChannel = <font color="red">b</font>roadCastChannel<Int>(5) | val broadcastChannel = **B**roadCastChannel<Int>(5) | 论坛 ID： [llt](https://discuss.kotliner.cn/u/llt/summary)
148 | 2020.10 | 当然这个过程稍<font color="red">些</font>复杂 | 当然这个过程稍显复杂 | huml
161 | 2020.10 | 那么 onJoin 就是 SelectClause<font color="red">N</font>类型 | 那么 onJoin 就是 SelectClause**0** 类型 | huml
176 | 2021.7 | 已经绑定了<font color="red">UV</font>生命周期 | 已经绑定了**UI**生命周期 | [luozejiaqun](https://github.com/luozejiaqun)
205 | 2020.6 | 包括浏览器上的 window<font color="red">s</font> 和 document | 包括浏览器上的 **window** 和 document | 论坛 ID： [llt](https://discuss.kotliner.cn/u/llt/summary)
209 | 2020.6 | window<font color="red">s</font>.asCoroutineDispatcher | **window**.asCoroutineDispatcher | 论坛 ID： [llt](https://discuss.kotliner.cn/u/llt/summary)

> **说明：**
>  1. 2020.6 版本的问题已经在 2020.10 版修正。
>  2. 2020.10 版本的问题计划在 2021.7 版修正。