---
title:  Java 17 更新（12）：支持上下文的序列化过滤器，又一次给序列化打补丁 
keywords: Java Java17 
date: 2021/10/02 20:10:10
description: 
tags: 
    - java
    - java17 
---

> Java 的序列化机制虽然有些问题，不过毕竟亲儿子，更新怎么能落下呢。 



<!-- more -->




* [Java 17 更新（1）：更快的 LTS 节奏](https://www.bennyhuo.com/2021/09/26/Java17-Updates-01-intro/)
* [Java 17 更新（2）：没什么存在感的 strictfp 这回算是回光返照了](https://www.bennyhuo.com/2021/09/26/Java17-Updates-02-strictfp/)
* [Java 17 更新（3）：随机数生成器来了一波稳稳的增强](https://www.bennyhuo.com/2021/09/27/Java17-Updates-03-random/)
* [Java 17 更新（4）：这波更新，居然利好 mac 用户](https://www.bennyhuo.com/2021/09/27/Java17-Updates-04-mac/)
* [Java 17 更新（5）：历史包袱有点儿大，JDK 也在删代码啦](https://www.bennyhuo.com/2021/09/27/Java17-Updates-05-removed/)
* [Java 17 更新（6）：制裁！我自己私有的 API 你们怎么随便一个人都想用？](https://www.bennyhuo.com/2021/09/27/Java17-Updates-06-internals/)
* [Java 17 更新（7）：模式匹配要支持 switch 啦](https://www.bennyhuo.com/2021/10/02/Java17-Updates-07-switch/)
* [Java 17 更新（8）：密封类终于转正](https://www.bennyhuo.com/2021/10/02/Java17-Updates-08-sealedclass/)
* [Java 17 更新（9）：Unsafe 不 safe，我们来一套 safe 的 API 访问堆外内存](https://www.bennyhuo.com/2021/10/02/Java17-Updates-09-foreignapi-memory/)
* [Java 17 更新（10）：访问外部函数的新 API，JNI 要凉了？](https://www.bennyhuo.com/2021/10/02/Java17-Updates-10-foreignapi-callfunction/)
* [Java 17 更新（11）：支持矢量运算，利好科学计算？](https://www.bennyhuo.com/2021/10/02/Java17-Updates-11-vector/)

接下来我们介绍 Java 17 合入的最后一个还没介绍的提案：**JEP 415: Context-Specific Deserialization Filters**，这是一条对于反序列化的更新。

Java 的序列化机制一向为人诟病，以至于 Effective Java 里面专门有几条讲 Java 序列化机制的，并且结论是“不要用它”。

![](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates/8941D48B.jpg)

这玩意你说咋还不废弃了呢。居然还在不断为了反序列化的安全性修修补补。

算了，我猜你们大概率用不到，不介绍了。

![](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates/8942EB6A.jpg)

好吧，其实不是，这玩意儿还是很常用的，所以还是介绍一下吧。

![](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates-12-contextserialfilter/249FFAAB.png)

故事还要追溯到 Java 9，当时为了解决反序列化的数据的安全性问题，Java 提供了反序列化的过滤器，允许在反序列化的时候对数据做检查，这个过滤器就是 ObjectInputFilter。

```java
public interface ObjectInputFilter {

    /**
     * @return  {@link Status#ALLOWED Status.ALLOWED} if accepted,
     *          {@link Status#REJECTED Status.REJECTED} if rejected,
     *          {@link Status#UNDECIDED Status.UNDECIDED} if undecided.
     */
    Status checkInput(FilterInfo filterInfo);
}
```

它最关键的方法就是这个 checkInput，返回值则是一个枚举。

在每一个 ObjectInputStream 实例被创建的时候都会创建一个过滤器与之对应：

**Java 16**：

```java
public ObjectInputStream(InputStream in) throws IOException {
    ...
    serialFilter = ObjectInputFilter.Config.getSerialFilter();
    ...
}
```

这个过滤器实际上是 JVM 全局的过滤器，可以通过系统属性 jdk.serialFilter 来配置，也可以通 ObjectInputFilter.Config#setSerialFilter 来设置。

在 ObjectInputStream 创建出来之后，我们也可以通过它的 setObjectInputFilter 来对这个实例单独设置自定义的过滤器。

以上的特性都是 Java 9 引入的，下面我们看看 Java 17 的更新：

**Java 17**

```java
public ObjectInputStream(InputStream in) throws IOException {
    ...
    serialFilter = Config.getSerialFilterFactorySingleton().apply(null, Config.getSerialFilter());
    ...
}
```

其实这段代码已经很明确的展示了改动之处，那就是 getSerialFilterFactorySingleton 返回的这个对象对原有的全局过滤器做了个变换。这个对象实际上是个 `BinaryOperator<ObjectInputFilter>`，实现这个 FilterFactory 就可以通过实现 apply 方法来完成对原有过滤器的修改：

```java
@Override
public ObjectInputFilter apply(ObjectInputFilter objectInputFilter, ObjectInputFilter objectInputFilter2) {
    return ...;
}
```

所以如果你乐意，你可以随机返回 objectInputFilter 或者返回 objectInputFilter2（草率。。。），也可以把它俩串联或者并联起来。换句话讲，我们除了可以通过设置全局过滤器，以及单独为每一个 ObjectInputStream 实例设置过滤器以外，还可以设置一个操纵过滤器的对象，这个对象可以根据上下文来判断具体返回什么样的过滤器。

![](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates-12-contextserialfilter/24A164DA.png)

接下来我们再看一下提案当中给出的例子（实际的 JDK API 与提案的例子有些调整，以下代码时调整之后的）：

```java
public class FilterInThread implements BinaryOperator<ObjectInputFilter> {

    private final ThreadLocal<ObjectInputFilter> filterThreadLocal = new ThreadLocal<>();

    public ObjectInputFilter apply(ObjectInputFilter curr, ObjectInputFilter next) {
        if (curr == null) {
            var filter = filterThreadLocal.get();
            if (filter != null) {
                filter = ObjectInputFilter.rejectUndecidedClass(filter);
            }
            if (next != null) {
                filter = ObjectInputFilter.merge(next, filter);
                filter = ObjectInputFilter.rejectUndecidedClass(filter);
            }
            return filter;
        } else {
            if (next != null) {
                next = ObjectInputFilter.merge(next, curr);
                next = ObjectInputFilter.rejectUndecidedClass(next);
                return next;
            }
            return curr;
        }
    }

    ...
}
```

这个例子其实不复杂，我最初看的时候反而被一堆注释给搞得晕头转向，所以我决定把注释都删了给你们看。。。

它的逻辑简单来说就是 apply 的时候如果 curr 为 null，就从的 ThreadLocal 当中取出当前线程对应的过滤器与 next 进行合并，否则就用 curr 与 next 合并。

但通过前面阅读代码，我们已经知道 curr 在 ObjectInputStream 创建的时候传入的一定是 null（只有在后面调用 ObjectInputStream#setObjectInputFilter 的时候 curr 才会是之前已经创建的过滤器），因此这个 FilterInThread 就可以在 ObjectInputStream 创建的时候为它添加一个线程特有的过滤器，也就是上下文相关的过滤器了。

实际上例子里面还提供了一个临时切换过滤器的方法：

```java
public class FilterInThread implements BinaryOperator<ObjectInputFilter> {
    ...
    
    public void doWithSerialFilter(ObjectInputFilter filter, Runnable runnable) {
        var prevFilter = filterThreadLocal.get();
        try {
            filterThreadLocal.set(filter);
            runnable.run();
        } finally {
            filterThreadLocal.set(prevFilter);
        }
    }
}
```

我们可以通过调用 doWithSerialFilter 来实现将 runnable 的 run 当中所有直接创建的 ObjectInputStream 都将应用传入的这个 filter 作为自己的上下文过滤器。

有意思吧。不过一点儿也不直接。挺简单的一个东西竟然能搞得这么别扭。。。

![](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates/00DC34EC.gif)

讲到这儿，我们总算是把 Java 17 的主要更新介绍了一遍。除了这些大的更新以外，还有一些小的 Bugfix 和优化，我就不一一列举了。


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

