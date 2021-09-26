# Java 17 更新（2）：没什么存在感的 strictfp 这回算是回光返照了

**Java Java17**

> strictfp 可能是最没有存在感的关键字了，很多人写了多年 Java 甚至都不知道它的存在。接下来，它也没有必要继续存在了。

==  Java|Java17|strictfp ==

* [Java 17 更新（1）：更快的 LTS 节奏](https://www.bennyhuo.com/2021/09/26/Java17-Updates-01-intro/)

我们今天聊的内容来自于 **JEP 306: Restore Always-Strict Floating-Point Semantics**。看到这个提案的标题的时候，我就知道很多人懵了。这玩意历史感太强了，说实话我也没怎么接触过。

Java 17 刚发布的那天 Kotlin 的群里短暂地提到了这一条，结果大家都以为是这玩意儿：

![](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates/image-20210920115213009.png)

看到 0.3 后面那高贵的 4 了吗，正是因为它的存在，0.1 + 0.2 跟 0.3 不一样！

![](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates/image-20210920115849919.png)

这恐怕没什么令人惊喜的，稍微有点儿踩坑经历的小伙伴都不会这么被坑，对吧，对吧，对吧。

![](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates-02-strictfp/062286BF.jpg)

说起这事儿，我以前做地图业务的时候经常需要用到经纬度，为了防止精度丢失，在计算之前都要先把经纬度乘以 10^6 转成整型。我当年刚入职腾讯地图的第一天，隔壁的大哥就因为给某常年被教做产品的聊天 APP 接入地图 SDK 时遇到了 Marker 反复横跳的事情，后来分析就是跟精度有关。

![](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates/6F289456.gif)

那么，strict fp 跟这个高贵的 4 有关系吗？如果有关系，那这次更新是特意加入了这个高贵的 4 吗？显然不应该这么搞笑。因为这个高贵的 4 其实是源自于 IEEE 754 对浮点型的定义，编程语言只要是按照标准实现了浮点型，结果都是一样的：

![](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates/image-20210920120237334.png)

![](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates/image-20210920120509082.png)

所以这个 strict fp 是什么呢？

Java 从 1.2 开始引入了一个关键字：strictfp，字面意思就是严格的浮点型。这玩意儿居然还有个关键字，可见其地位还是很高的。

那么问题来了，为什么要引入这么个奇怪的东西呢？我翻了翻文档发现（不然还能怎样，那个时候我才刚开始学五笔。。。），在上世纪 90 年代，Java 虚拟机为了保持原有的浮点型语义，在兼容 x86 架构的处理器上执行 x87 指令集（是 x86 指令集的一个关于浮点型的子集）的情况时开销很大，性能上令人很不满意，于是加入 strictfp 来表示原有的浮点型语义（即 IEEE 754 规定的那样），而默认的浮点型则采用了更加宽松的语义，这样算是一个折中的方案。必要时使用 strictfp 很多时候就是为了确保 Java 代码的可移植性，这其实也不难理解。

![img](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates-02-strictfp/0628CDCD.jpg)

不过，这个问题很快得到了解决。在 SSE2 (Streaming SIMD Extensions 2) 扩展指令集随着奔腾 4 发布以后，Java 虚拟机有了更直接的方式来实现严格的浮点型语义，于是这个问题就不再存在了。

![普通而又自信的 Intel](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates-02-strictfp/9dbd94d5aa4448d2b5587089792ab426.jpeg)

显然，对于我们绝大多数程序员来讲，特别是后来的所有 Android 开发者来讲，这个问题根本不存在，这更新简直跟没更一样。说着我还看了一眼旁边的 Apple Silicon，你说是不是呢 M1？

![](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates/6F3D274E.jpg)

当然，如果你对这个更新点感兴趣，我建议你翻一下老版本当中的 StrictMath 类。在这里，你还可以看到一些 strictfp 的使用场景 —— 而在 Java 17 当中，StrictMath 已经完全沦为 Math 的马甲了。 

**Java 16（源码来自于 Liberica JDK）**

```java
// StrictMath.java
public static strictfp double toRadians(double angdeg) {
    // Do not delegate to Math.toRadians(angdeg) because
    // this method has the strictfp modifier.
    return angdeg * DEGREES_TO_RADIANS;
}
```

**Java 17（源码来自于 Oracle JDK）**

```java
// StrictMath.java
public static double toRadians(double angdeg) {
    return Math.toRadians(angdeg);
}
```

我们也不妨看一下 Android 的实现：

**Android 30**

```java
public static strictfp double toRadians(double angdeg) {
    // Do not delegate to Math.toRadians(angdeg) because
    // this method has the strictfp modifier.
    return angdeg / 180.0 * PI;
}
```

Android 的 JDK 代码来自于 OpenJDK，连注释都没改过。

![](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates/6F46F0FB.gif)

好啦，关于 Java 浮点型的语义调整的更新我们就简单介绍这么多。反正说多了也没啥用，知道怎么出去吹牛就行了。

