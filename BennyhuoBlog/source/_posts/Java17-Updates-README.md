---
title:  Java 17 更新（0）：前言 
keywords: Java Java17 
date: 2021/09/25 21:03:17
description: 
tags: 
    - java
    - java17 
---

>  



<!-- more -->

- [Java 17 更新（0）：前言](https://www.bennyhuo.com/2021/09/25/Java17-Updates-README/)
- [Java 17 更新（1）：更快的 LTS 节奏](https://www.bennyhuo.com/2021/09/26/Java17-Updates-01-intro/)
- [Java 17 更新（2）：没什么存在感的 strictfp 这回算是回光返照了](https://www.bennyhuo.com/2021/09/26/Java17-Updates-02-strictfp/)
- [Java 17 更新（3）：随机数生成器来了一波稳稳的增强](https://www.bennyhuo.com/2021/09/27/Java17-Updates-03-random/)
- [Java 17 更新（4）：这波更新，居然利好 mac 用户](https://www.bennyhuo.com/2021/09/27/Java17-Updates-04-mac/)
- [Java 17 更新（5）：历史包袱有点儿大，JDK 也在删代码啦](https://www.bennyhuo.com/2021/09/28/Java17-Updates-05-removed/)
- [Java 17 更新（6）：制裁！我自己私有的 API 你们怎么随便一个人都想用？](https://www.bennyhuo.com/2021/10/02/Java17-Updates-06-internals/)
- [Java 17 更新（7）：模式匹配要支持 switch 啦](https://www.bennyhuo.com/2021/10/02/Java17-Updates-07-switch/)
- [Java 17 更新（8）：密封类终于转正](https://www.bennyhuo.com/2021/10/02/Java17-Updates-08-sealedclass/)
- [Java 17 更新（9）：Unsafe 不 safe，我们来一套 safe 的 API 访问堆外内存](https://www.bennyhuo.com/2021/10/02/Java17-Updates-09-foreignapi-memory/)
- [Java 17 更新（10）：访问外部函数的新 API，JNI 要凉了？](https://www.bennyhuo.com/2021/10/02/Java17-Updates-10-foreignapi-callfunction/)
- [Java 17 更新（11）：支持矢量运算，利好科学计算？](https://www.bennyhuo.com/2021/10/02/Java17-Updates-11-vector/)
- [Java 17 更新（12）：支持上下文的序列化过滤器，又一次给序列化打补丁](https://www.bennyhuo.com/2021/10/02/Java17-Updates-12-contextserialfilter/)



2021 年 9月 23 日，Java 17 发布了。

作为一门历史悠久的语言，随着更新频率的提升，Java 在最近几年又逐渐焕发出活力 —— 这当然并不是 Java 做得足够好，而是大环境如此。隔壁 C++ 在经历了十几年才发布 C++ 11 之后，标准更新的频率也明显得到了提升，例如 C++ 14、C++ 17，还有 C++ 20。有意思的是，C++ 比 Java 更早地将协程纳入语言标准，尽管用起来比较费事儿，但总比不断跳票的 Loom 要更实在一些。

对于 Java 新特性的期待，除了前面提到的 Loom 项目当中所带来的对协程的支持以外，还有 Valhalla 项目当中对于值类型的支持。遗憾的是，这二者都没有出现在 Java 17 的更新当中。不过，Java 17 也带来不少有用的内容，例如更安全的外部函数访问 API，转正的密封类等等。

当然，Java 的更新有时候也是看着热闹，真正能够用起来还是需要一些时间的。毕竟想要体验这些新特性，我们还需要升级 JDK 版本。不过，这并不影响我们尽早了解 Java 版本更新的内容。接下来，我们会用一系列文章来详细介绍 Java 17 的更新内容，希望能够为大家做个参考。

---

### 关于作者

**霍丙乾 bennyhuo**，Kotlin 布道师，Google 认证 Kotlin 开发专家（Kotlin GDE）；**《深入理解 Kotlin 协程》** 作者（机械工业出版社，2020.6）；前腾讯高级工程师，现就职于猿辅导

* GitHub：https://github.com/bennyhuo
* 博客：https://www.bennyhuo.com
* bilibili：[**bennyhuo不是算命的**](https://space.bilibili.com/28615855)
* 微信公众号：**bennyhuo**