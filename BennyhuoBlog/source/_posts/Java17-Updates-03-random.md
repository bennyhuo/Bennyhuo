---
title:  Java 17 更新（3）：随机数生成器来了一波稳稳的增强 
keywords: Java Java17 
date: 2021/09/27
description: 
tags: 
    - java
    - java17
    - random 
---

> JDK 当中的随机数生成器其实对于普通开发者来讲基本够用，不过对于一些比较复杂的场景来讲，原有的类结构对扩展并不是很友好。 



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



这一条更新来自：**JEP 356: Enhanced Pseudo-Random Number Generators**，相比之下，这一条实用多了。

我们都用过随机数，不过一般情况下我们很少去认真的对待随机数的具体结果，就好像它是真的随机一样。

```java
var random = new Random(System.currentTimeMillis());
for (int i = 0; i < 10; i++) {
    System.out.println(random.nextInt());
}
```

除了 Random 类，JDK 当中还提供了另外几个随机数的成员：

* ThreadLocalRandom：顾名思义，提供线程间独立的随机序列。它只有一个实例，多个线程用到这个实例，也会在线程内部各自更新状态。它同时也是 Random 的子类，不过它几乎把所有 Random 的方法又实现了一遍。
* SplittableRandom：非线程安全，但可以 fork 的随机序列实现，适用于拆分子任务的场景。

ThreadLocalRandom 继承自 Random，而 SplittableRandom 与它俩则没什么实际的关系，因此如果我们在代码当中想要动态切换 Random 和 SplittableRandom 就只能定义两个成员，并且在用到的地方做判断：

**Java 16**

```java
SplittableRandom splittableRandom = ...;
Random random = ...;

boolean useSplittableRandom = false;

...
    
if (useSplittableRandom) {
   nextInt = splittableRandom.nextInt();
} else {
    nextInt = random.nextInt();
}
```

而且如果想要自己扩展随机数的算法，也只能自己去实现，原有的定义方式缺乏一个统一的接口。

![](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates/70DF0D1E.gif)

Java 17 为了解决这个问题，定义了几个接口：

![](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates/image-20210920200204792.png)

这样我们就可以面向接口编程啦~

![](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates/70DF7260.jpg)

另外，尽管各个实现的细节不太一样，但思路基本上一致，因此老版本当中的几个随机数的类当中存在大量重复或者相似的代码。连 JDK 都存在 CV 代码的情况，那我们为了快速实现需求 CV 代码也不丢人，对不。

![](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates/70E0D77D.jpg)

Java 17 把这些高度相似的逻辑抽了出来，搞了一个新的类：RandomSupport，又一个 3000 行的 Java 文件。

![](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates/image-20210920200711381.png)

所以以前：

**Java 16  **

```java
// Random.java
public DoubleStream doubles() {
    return StreamSupport.doubleStream
        (new RandomDoublesSpliterator
         (this, 0L, Long.MAX_VALUE, Double.MAX_VALUE, 0.0),
         false);
}

// SplittableRandom.java
public DoubleStream doubles(long streamSize, double randomNumberOrigin,
                            double randomNumberBound) {
    if (streamSize < 0L)
        throw new IllegalArgumentException(BAD_SIZE);
    if (!(randomNumberOrigin < randomNumberBound))
        throw new IllegalArgumentException(BAD_RANGE);
    return StreamSupport.doubleStream
        (new RandomDoublesSpliterator
         (this, 0L, streamSize, randomNumberOrigin, randomNumberBound),
         false);
}
```

有相似的地方吧。我们再来看看 Java 17 的实现：

**Java  17**

```java
// Random.java
public DoubleStream doubles() {
    return AbstractSpliteratorGenerator.doubles(this);
}

//SplittableRandom.java
private AbstractSplittableGeneratorProxy proxy;
...
public DoubleStream doubles() {
    return proxy.doubles();
}
...
private class AbstractSplittableGeneratorProxy extends AbstractSplittableGenerator {
    @Override
    public int nextInt() {
        return SplittableRandom.this.nextInt();
    }

    @Override
    public long nextLong() {
        return SplittableRandom.this.nextLong();
    }

    @Override
    public java.util.SplittableRandom split(SplittableGenerator source) {
        return new SplittableRandom(source.nextLong(), mixGamma(source.nextLong()));
    }
}
```

而这个 AbstractSplittableGenerator 就定义在 RandomSupport.java 当中，是 RandomSupport 一个内部类。

![](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates/70E83674.jpg)

你以为这就没了？不是的。提案的说明当中提到，提案的目标不是实现很多的随机数产生算法，不过这次还是添加了一些常见的实现，所以你会在 JDK 17 当中看到多了一个模块：

![](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates/image-20210920201524206.png)

这些实现都有自己的名字，用注解标注出来，例如：

```java
@RandomGeneratorProperties(
        name = "L32X64MixRandom",
        group = "LXM",
        i = 64, j = 1, k = 32,
        equidistribution = 1
)
public final class L32X64MixRandom extends AbstractSplittableWithBrineGenerator { ... }
```

我们可以通过名字来获取它们的实例：

```java
var random = RandomGenerator.of("L32X64MixRandom");
for (int i = 0; i < 10; i++) {
    System.out.println(random.nextInt());
}
```

![](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates/70EF16B5.jpg)

好啦，关于随机数的更新又讲完啦。你不会又觉得这玩意没啥用吧。

![img](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates-03-random/07E713C6.jpg)


---

## 关于作者

**霍丙乾 bennyhuo**，Kotlin 布道师，Google 认证 Kotlin 开发专家（Kotlin GDE）；**《深入理解 Kotlin 协程》** 作者（机械工业出版社，2020.6）；前腾讯高级工程师，现就职于猿辅导

* GitHub：https://github.com/bennyhuo
* 博客：https://www.bennyhuo.com
* bilibili：[**bennyhuo不是算命的**](https://space.bilibili.com/28615855)
* 微信公众号：**bennyhuo**
