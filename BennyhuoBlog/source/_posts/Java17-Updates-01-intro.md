---
title:  Java 17 更新（1）：更快的 LTS 节奏 
keywords: Java Java17 
date: 2021/09/26
description: 
tags: 
    - java
    - java17 
---

> 2021 年 9月 23 日，Java 17 发布了，更新的内容还真不少，足足肝了我一星期才把这些内容整理完。 



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



朋友们大家好，我是 bennyhuo，今天我们来聊聊 Java 17 的更新。

Java 17 更新了，作为一个 10 年的 Java 程序员，还是有亿点点兴奋的，Kotlin 的群里面也是各种讨论 Java 的新特性。

我记得五六年前，谈论起当时刚刚进入人们视野不久的 Java 8，大家还是一副“我们公司还在用 Java 6” 的表情，现在想想 [RetroLambda](https://github.com/luontola/retrolambda) 都已经是很久远的事儿了：

![](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates/image-20210920110824409.png)

现在的 Java 8 可能大概相当于那时候的 Java 6，在使用上已经非常普遍了，甚至已经有一点儿过时：就连 Android 最近也开始从最新的 Android Studio 版本开始把 Java 11 作为默认版本了。

![image-20210926071213288](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates-01/image-20210926071213288.png)

现在 Java 17 的发布，让 Java 11 成了 LTS 系列的次新版本，Java 8 离老破小的距离也越来越近了 —— 不仅如此，Java 官方还想要加快这个节奏，因为他们打算把 LTS 发布的节奏从三年缩短到两年。这么看来，下一个 LTS 将会是在 2023 年 9 月发布的 Java 21。

想当年，Java 的版本发布以前是何其佛系，版本号也是 1.x 这样一路走来，从 1.0 （1996 年） 发布到 1.5（2004年） 就花了近 10 年，然后又花了差不多 10 年到了 1.8（2014 年）。这其中从 1.5 开始启用了新的版本号命名方式，即  Java SE 5，Java SE 8 这样的叫法。直到现在，2021 年，不管 Java 有没有变化，Java 的版本号已经发生了质的飞跃。

![](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates/6F19CE1C.jpg)

从 2017 年 9 月发布 Java 9 开始，Java 进入每 6 个月一个版本的节奏。这对于开发者来讲是好事，喜欢尝鲜的开发者可以很快地在非 LTS 版本当中体验到 Java 的新特性。

做出这个改变的时间点是非常微妙的，因为 Kotlin 1.0 是 2016 年 2 月发布的，Google 在 2017 年 5 月官宣 Kotlin 为 Android 的一级开发语言（首选语言的宣布是在 2019 年的 IO 大会上）。

![img](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates-01-intro/02EFAF65.jpg)

后来我们就看到，Java 越来越像 Kotlin 了，Java 10 有了 var：

```java
var list = new ArrayList<String>(); // infers ArrayList<String>
var stream = list.stream();         // infers Stream<String>
```

Java 13 有了多行字符串字面量：

```java
String html = """
              <HTML lang="en">
                  <body>
                      <p>Hello, world</p>
                  </body>
              </html>
              """;
```

Java 14 有了 switch 表达式（12 开始预览）：

```java
int ndays = switch(month) {
    case JAN, MAR, MAY, JUL, AUG, OCT, DEC -> 31;
    case APR, JUN, SEP, NOV -> 30;
    case FEB -> {
        if (year % 400 == 0) yield 29;
        else if (year % 100 == 0) yield 28;
        else if (year % 4 == 0) yield 29;
        else yield 28; }
};
```

Java 16 加入了类型判断的模式匹配（Java 14 开始预览），以下示例在效果上类似于 Kotlin 的智能类型转换：

```java
if (obj instanceof String s) {
    System.out.println( s.length() );
}
```

还有数据类（Java 14 开始预览）：

```java
record Point(int x, int y) { }
Point p = new Point(3,4);
System.out.println( p.x() );
```

可以说，Java 重新焕发了生机，喜欢 Java 的开发者们再也不必等待漫长的版本更新了。

![](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates/6F181E49.png)

然后更有趣的事情发生了。Java 就这么疯狂的发版发了三年之后，Kotlin 慌了，它终于在花了将近两年时间憋完 1.4 这个编译器重写的大版本之后宣布，后续每半年发一个版本。

![img](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates-01-intro/02F416C6.jpg)

哈哈，看来我再也不用发愁选题了。​做为一个最近专注于发 C++ 视频的 Kotlin 补刀师，连续研究了一周 Java 17 的更新，真是给我乐坏了：你们快卷起来啊。

![](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates/6F17BC34.jpg)

好了，这一篇算是这一系列的开篇，为了降低大家的阅读成本，我会把主要的更新内容，其实就是合入的 JEP 拆成了十几篇文章，后面尽快发出来。另外，有些比较有意思的内容，我也许大概率也会提供配套视频介绍，欢迎大家关注我的 Bilibili 频道：**bennyhuo 不是算命的**。



---

### 关于作者

**霍丙乾 bennyhuo**，Kotlin 布道师，Google 认证 Kotlin 开发专家（Kotlin GDE）；**《深入理解 Kotlin 协程》** 作者（机械工业出版社，2020.6）；前腾讯高级工程师，现就职于猿辅导

* GitHub：https://github.com/bennyhuo
* 博客：https://www.bennyhuo.com
* bilibili：[**bennyhuo不是算命的**](https://space.bilibili.com/28615855)
* 微信公众号：**bennyhuo**
