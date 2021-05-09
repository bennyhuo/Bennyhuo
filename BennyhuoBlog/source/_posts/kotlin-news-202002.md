---
title:  Kotlin 官网大变样？这是要干啥？ 
keywords: Kotlin 更新 移动端跨平台 数据科学 
date: 2020/02/13
description: 
tags: 
    - kotlin
    - news 
---

> Kotlin 官网这次更新可以算是历史上最大的一次了，跨平台、数据科学等内容也搬到了最前面。 



<!-- more -->




![](https://kotlinblog-1251218094.costj.myqcloud.com/9e300468-a645-433d-ae41-60b3eaa97f5a/media/2020-02-13-15-34-00.png)

这是要干啥？我听说过的没听说过的您这是都要承包吗？

最有意思的是居然把 Android 放到了最后，hmmm，Kotlin 开发者里面搞 Android 的应该是最多的吧？这么不受待见？

所以我有个大胆的想法，Kotlin 团队肯定觉得 Android 大军切换 Kotlin 指日可待，基本上稳稳的，所以过河拆桥：Android 已经不再是 Kotlin 唯一的大腿啦，你们看看，最前面的是移动端跨平台，原来谷爸爸的大腿刚捂热乎，就又抱上了果爸爸，真是不得了哇：

![](https://kotlinblog-1251218094.costj.myqcloud.com/9e300468-a645-433d-ae41-60b3eaa97f5a/media/2020-02-13-15-38-52.png)

其实很早之前我们就一直在聊到 Kotlin 2019 年的重心一定在 Native 上，当时觉得可能是盯上了 5G 时代的物联网的机会？不过一年过去了，5G 手机我还没用上，这不小米 10 刚发布，正琢磨要不要换个呢，嵌入式领域 C 称霸天下哪里会那么快换代，再说还有 Go 和 Rust 虎视眈眈，哪儿有 Kotlin 什么事儿。

不过从 Android 起家的 Kotlin 横向切入 iOS 这个路子真的是很合适，用户群体都不用怎么变，还让过去不会 iOS 的 Android 开发者有了更多更容易的机会扩展自己的技术栈，即可以扩大自己的影响力，又给开发者带来福利，真是双赢 666。

![](https://kotlinblog-1251218094.costj.myqcloud.com/9e300468-a645-433d-ae41-60b3eaa97f5a/media/2020-02-13-17-54-20.png)

当然，这个移动端跨平台并不是什么特别新鲜的事儿，毕竟开源项目嘛，没事儿刷刷 Kotlin 的 [Slack](https://kotl.in/slack)，啥都能提前知道。而且本身 Kotlin 跨平台共享代码从 1.2 刚开始公测就理论上包含了 Kotlin-Jvm@Android 和 Kotlin-Native@iOS 的代码共享能力，所以我们似乎不应该意外，我只是想说 JetBrains 居然把移动端跨平台专门上升到了这么高的优先级，还专门做了 Kotlin Native 与 Objective-C & Swift 的互调用的支持，真是任性~~

如果过一段时间 Dukat 这个项目逐渐成熟，Kotlin-Js 的编译工具也进一步完善，特别是对 npm 依赖的管理能更加灵活（目前 Kotlin-js 的 Gradle 依赖当中不会自动携带 npm 依赖这个让人非常难受），JavaScript 常见的框架都有了自己的 Kotlin 接口声明，那时候我估计写到最前面的也许还会发生一些变化，那时候也许叫 “Kotlin for 大前端”？

说到这里有人担心 Kotlin 这是不是在跟 Flutter 叫板。显然不是嘛，Kotlin 跨平台一直都声称自己只是为了逻辑代码的共享，UI 大家还是用原生的就好啦。于是乎 Android 原来该用 ConstraintLayout 你就用你的 XML 布局，iOS 呢就还是用你的 storyboard。

![](https://kotlinblog-1251218094.costj.myqcloud.com/9e300468-a645-433d-ae41-60b3eaa97f5a/media/2020-02-13-18-02-29.png)

Flutter 抢的是 UI 的饭碗，UI 层跨平台的问题解决了，有人就说我们底层的逻辑也选一套跨平台的方案好不好？这要是放到几年前，怕是没有别的选择了，C++ 是最好的语言；而现在，你可以选择 Kotlin，最为神奇的是 Kotlin 的跨平台和 C++ 的机制非常不同，它在 Android 上使用 Kotlin-Jvm，iOS 上则使用 Kotlin-Native。你要是非想在 Android 上使用 JNI 的话，Kotlin-Native 也已经支持了绝大多数 Android 的 CPU 架构。所以很早就有人发文章报告 Flutter + Kotlin-Native 实现移动端跨平台开发的优秀体验，所以 Flutter 该学就学，不矛盾。

而且它俩的这基友关系嘛。。。依我看，这 Logo 就已经说明一切了。。。

![](https://kotlinblog-1251218094.costj.myqcloud.com/9e300468-a645-433d-ae41-60b3eaa97f5a/media/2020-02-13-18-06-19.png)

还有一个比较引人注目的就是 **Data science** 了吧。毕竟 Python 因为这个都火的不得了了，过去的一年里我已经鼓动我们组好几个小伙伴上手 Python，要恰饭的嘛，艺多不压身，免得错过一些项目的机会。现在好了，Kotlin 也能搞科学计算了，目测大概的切入思路暂时还是依托于强大的 Jvm，Java 能用的框架 Kotlin 自然能用，Java 不能直接用的，例如 Python numpy，可以 JNI 直接搞一个封装 [kotlin-numpy](https://github.com/Kotlin/kotlin-numpy)；等 Kotlin Native 翅膀硬了之后就更省事儿了，直接跟 C 玩去，连 Jvm 都用不着了。这么发展着，最后也许是我的当然是我的，你的也是我的。。。

忘了说了，现在已经有了 Jupyter 的 Kotlin 内核，所以以前在 Jupyter Notebook 里用 Python 写的代码也可以用 Kotlin 写了，贴一张官网的效果图：

![](https://kotlinblog-1251218094.costj.myqcloud.com/9e300468-a645-433d-ae41-60b3eaa97f5a/media/2020-02-13-16-54-47.png)

很美是吧，之前 KotlinConf 2019 期间官博就发了一篇文章介绍这个能力，也可以参考一下：Making Kotlin Ready for Data Science [[原文](https://blog.jetbrains.com/kotlin/2019/12/making-kotlin-ready-for-data-science/)] [[中文翻译](https://www.kotliner.cn/2020/01/making-kotlin-ready-for-data-science/)]。

顺便提一句，调用 GPU 其实也是 IO 操作，我看了几个 cuda 的程序都很有意思，要么是阻塞调用，要么就是异步调用之后在主流程里死循环等待结果返回。这似乎与我们的 Socket 读写类似，异步的 API 可能在大规模调用时性能更好，但代码编写起来更加复杂。前几天读到一篇论文讲的就是如何使用 C++ 的协程来降低 GPU 编程的复杂度([Integrating GPGPU computations with CPU coroutines in C++](https://iopscience.iop.org/article/10.1088/1742-6596/681/1/012048/pdf))，随着 Kotlin Native 的逐渐成熟稳定，我们可以直接通过 C 接口编写 GPU 相关程序，Kotlin 协程也许可以为 GPU 编程带来一定的便利。

这么看来，预计在 2020年春天发布的 Kotlin 1.4 的形势也比较明朗了，正如 Kotlin 之父 Andrey 说的，这个版本没有什么太多的新特性。因为作为一门语言本身，Kotlin 已经比较成熟，现在最应当关注的是开发体验，开发效率，稳定性，易用性以及应用场景等等语言生态的内容。

我之前还比较担心 Kotlin Multiplatform 和 Kotlin Native 会不会借此机会正式发布，从官网的这次改动来看，这样的担心应该是多余的了。我们来回顾一下过去 Kotlin 的重要版本的发布时间：

* Kotlin 1.0：2016.2
* Kotlin 1.1：2017.3（13个月之后）
* Kotlin 1.2：2017.11（8个月之后）
* Kotlin 1.3：2018.10（11个月之后）

多数情况下 Kotlin 的大版本都是保持一年左右一个的（1.2 这个版本估计是趁着热度努力冲了一波 KPI，毕竟 2017 年 Kotlin 出名了），小版本大概两个月一个，所以一般小版本到 1.x.7 的时候也就是下一个大版本发布的时间。现在 1.3.70 已经 EAP 了一个多月了，你们懂我意思吧。

---


C 语言是所有程序员应当认真掌握的基础语言，不管你是 Java 还是 Python 开发者，欢迎大家关注我的新课 《C 语言系统精讲》：

**扫描二维码或者点击链接[《C 语言系统精讲》](https://coding.imooc.com/class/463.html)即可进入课程**

![](https://kotlinblog-1251218094.costj.myqcloud.com/9e300468-a645-433d-ae41-60b3eaa97f5a/media/program_in_c.png)


--- 

Kotlin 协程对大多数初学者来讲都是一个噩梦，即便是有经验的开发者，对于协程的理解也仍然是懵懵懂懂。如果大家有同样的问题，不妨阅读一下我的新书《深入理解 Kotlin 协程》，彻底搞懂 Kotlin 协程最难的知识点：

**扫描二维码或者点击链接[《深入理解 Kotlin 协程》](https://item.jd.com/12898592.html)购买本书**

![](https://kotlinblog-1251218094.costj.myqcloud.com/9e300468-a645-433d-ae41-60b3eaa97f5a/media/understanding_kotlin_coroutines.png)

---

如果大家想要快速上手 Kotlin 或者想要全面深入地学习 Kotlin 的相关知识，可以关注我基于 Kotlin 1.3.50 全新制作的入门课程：

**扫描二维码或者点击链接[《Kotlin 入门到精通》](https://coding.imooc.com/class/398.html)即可进入课程**

![](https://kotlinblog-1251218094.costj.myqcloud.com/40b0da7d-0147-44b3-9d08-5755dbf33b0b/media/exported_qrcode_image_256.png)

---

Android 工程师也可以关注下《破解Android高级面试》，这门课涉及内容均非浅尝辄止，除知识点讲解外更注重培养高级工程师意识：

**扫描二维码或者点击链接[《破解Android高级面试》](https://s.imooc.com/SBS30PR)即可进入课程**

![](https://kotlinblog-1251218094.costj.myqcloud.com/9ab6e571-684b-4108-9600-a9e3981e7aca/media/15520936284634.jpg)

