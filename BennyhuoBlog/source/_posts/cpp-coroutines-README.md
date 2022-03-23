---
title:  渡劫 C++ 协程（0）：前言 
keywords: C++ Coroutines 
date: 2022/03/06 21:03:17
description: 
tags: 
    - c++
    - coroutines 
---

>  



<!-- more -->

- [渡劫 C++ 协程（0）：前言](https://www.bennyhuo.com/2022/03/06/cpp-coroutines-README/)
- [渡劫 C++ 协程（1）：C++ 协程概览](https://www.bennyhuo.com/2022/03/09/cpp-coroutines-01-intro/)
- [渡劫 C++ 协程（2）：实现一个序列生成器](https://www.bennyhuo.com/2022/03/11/cpp-coroutines-02-generator/)
- [渡劫 C++ 协程（3）：序列生成器的泛化和函数式变换](https://www.bennyhuo.com/2022/03/14/cpp-coroutines-03-functional/)
- [渡劫 C++ 协程（4）：通用异步任务 Task](https://www.bennyhuo.com/2022/03/19/cpp-coroutines-04-task/)
- [渡劫 C++ 协程（5）：协程的调度器](https://www.bennyhuo.com/2022/03/20/cpp-coroutines-05-dispatcher/)
- [渡劫 C++ 协程（6）：基于协程的挂起实现无阻塞的 sleep](https://www.bennyhuo.com/2022/03/20/cpp-coroutines-06-sleep/)
- [渡劫 C++ 协程（7）：用于协程之间消息传递的 Channel](https://www.bennyhuo.com/2022/03/22/cpp-coroutines-07-channel/)



C++ 20 标准发布之后，协程终于正式成为 C++ 特性当中的一员。

作为一门本身极其复杂的语言，C++ 秉承着不劝退不开心的原则，将协程的 API 设计得非常复杂。以至于有开发者甚至发出了“这玩意根本就不是给人用的”这样的感叹。

等等，我们是不是搞错了，C++ 协程的 API 确实不是设计给业务开发者直接使用的。实际上，标准当中给出的 API 足够的灵活，也足够的基础，框架的开发者可以基于这些 API 将过去异步的函数改造成协程风格的版本。

没错，这就是 C++。

一门不造轮子就让人不舒服的语言，它总是在用它自己的方式逼着开发者进步。为了帮助大家认识和了解 C++ 协程的设计思路以及基本用法，我计划写几篇文章来介绍一下 C++ 协程的相关特性。

相信大家读完这一系列文章之后，也还是不一定会 C++ 协程 ：）

> **说明**：C++ 23 有望基于协程提供不少有用的支持，例如与异步任务密不可分的 executor、network 等等，不过这些内容我暂时不会在后面的文章当中涉及，等 C++ 23 正式发布之后再做补充。

---

## 关于作者

**霍丙乾 bennyhuo**，Kotlin 布道师，Google 认证 Kotlin 开发专家（Kotlin GDE）；**《深入理解 Kotlin 协程》** 作者（机械工业出版社，2020.6）；前腾讯高级工程师，现就职于猿辅导

* GitHub：https://github.com/bennyhuo
* 博客：https://www.bennyhuo.com
* bilibili：[**bennyhuo不是算命的**](https://space.bilibili.com/28615855)
* 微信公众号：**bennyhuo**
