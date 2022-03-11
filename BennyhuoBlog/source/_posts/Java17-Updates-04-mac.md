---
title:  Java 17 更新（4）：这波更新，居然利好 mac 用户 
keywords: Java Java17 
date: 2021/09/27 08:00:00
description: 
tags: 
    - java
    - java17
    - mac 
---

> mac 这几年的变化还是挺大的，Java 也必须做一些适应性的变化，不然都没法外接高分显示器了。 



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



关于 mac 的更新一共两条，我们来一一介绍给大家。

## JEP 382: New macOS Rendering Pipeline

不知道大家在 macOS 上用 IntelliJ IDEA 或者 Android Studio 会不会觉得卡，就是在本地打字打出了远程控制的感觉的那种卡。

![img](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates-04-mac/07EE223B.gif)

解决办法也很简单，把窗口调小一点儿就行。

![](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates/image-20210920202342410.png)

我有个 2015 款的 MacBook Pro，之前我用它连 4K 外接显示器写代码，发现很快电脑就发烫发热，IDE 也会卡得不成样子。一开始我以为是我的电脑快不行了，后来我发现很多用最新款 MacBook 的人也在抱怨 IntelliJ IDEA 的垃圾性能。

![](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates/0033dr8Dgy1gskvcr4481g603w02naa802.gif)

给 JetBrains 报 Bug，结果发现人家大哥把锅甩给了 JDK。

![](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates/image-20210920204103615.png)

JDK 也不客气，直接用 IntelliJ IDEA 做测试：

![](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates/image-20210920204435651.png)

简单来说就是 Mac 上以前 Java 2D 的 API 是基于 OpenGL 的，从 Java 17 开始则提供了基于最新的 Metal Framework 的实现。目前默认还是基于 OpenGL，这样对于线上的程序几乎没有负面影响，如果大家需要启用 Metal 的支持，则需要在虚拟机参数当中添加：

```
-Dsun.java2d.metal=true
```

Metal 在后面也应该会成为默认选择。

所以这条更新，建议使用 Mac 的小伙伴们密切关注，也建议开发 Mac 桌面程序的小伙伴尽快适配。

（跟我有什么关系，Windows 11 YYDS! ）

![](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates/7103A24A.png)

对了，我在 Mac M1 上下载了 Java 17 的 arm64 版本（下一条将会提到），然后用 AppCode（JetBrains 全家桶当中用来写 iOS 程序的 IDE） 替换了这个 JDK，并在 JVM 参数当中配置了：

```
-Dsun.java2d.metal=true

--add-opens=java.desktop/java.awt.event=ALL-UNNAMED
--add-opens=java.desktop/sun.font=ALL-UNNAMED
--add-opens=java.desktop/java.awt=ALL-UNNAMED
--add-opens=java.desktop/sun.awt=ALL-UNNAMED
--add-opens=java.base/java.lang=ALL-UNNAMED
--add-opens=java.base/java.util=ALL-UNNAMED
--add-opens=java.desktop/javax.swing=ALL-UNNAMED
--add-opens=java.desktop/sun.swing=ALL-UNNAMED
--add-opens=java.desktop/javax.swing.plaf.basic=ALL-UNNAMED
--add-opens=java.desktop/java.awt.peer=ALL-UNNAMED
--add-opens=java.desktop/javax.swing.text.html=ALL-UNNAMED
```

外接 4K 显示器以后，代码编写和代码提示的速度有了明显的提升，大家可以试试看（后面的一堆 --add-opens 是为了任意访问没有在 module 当中声明公开的 API，这个策略 Java 17 也有调整，我们后面会讲到）。

## JEP 391: macOS/AArch64 Port

噗。。。还记得我司刚给小伙伴们发了一台高贵的 Apple Silicon 的 Air 的时候，有大佬还专门写教程告诉我们去哪儿找 [arm64 的 JDK](https://www.azul.com/downloads/?version=java-11-lts&os=macos&architecture=arm-64-bit&package=jdk)：

![](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates/image-20210920204728153.png)

这回 Java 官方终于也支持了，直接到 [Oracle 的网站](https://www.oracle.com/java/technologies/javase/jdk17-archive-downloads.html)上就能下载，要知道 Java 16 的时候还只有 x86 的版本：

![](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates/image-20210920204910901.png)

哎，等等，下面的 DMG Installer 是不是丢了个 Arm 啊。。这得扣钱啊小编。

![](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates/710ABDBF.jpg) 

## 小结

这两条更新对于 mac 用户来讲还是很有用的，可能会对开发效率的提升影响比较大。


---

## 关于作者

**霍丙乾 bennyhuo**，Kotlin 布道师，Google 认证 Kotlin 开发专家（Kotlin GDE）；**《深入理解 Kotlin 协程》** 作者（机械工业出版社，2020.6）；前腾讯高级工程师，现就职于猿辅导

* GitHub：https://github.com/bennyhuo
* 博客：https://www.bennyhuo.com
* bilibili：[**bennyhuo不是算命的**](https://space.bilibili.com/28615855)
* 微信公众号：**bennyhuo**
