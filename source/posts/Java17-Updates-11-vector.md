# Java 17 更新（11）：支持矢量运算，利好科学计算？

**Java Java17**

> Java 17 将继续孵化对矢量计算的支持。

==  Java|Java17 ==

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



我们这一篇来简单聊聊 **JEP 414: Vector API (Second Incubator)**，之前 Java 16 就已经开始孵化这个项目了。

刚开始看到这个 Vector API，我都懵了，Vector 不是不推荐用吗？后来看到提案的详细内容才明白过来，人家说的是矢量运算，不是我们熟知的那个线程安全的 vector 容器。

![](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates/8902C73F.jpg)

在过去，Java 确实没有提供很好的矢量运算的途径，这使得我们只能基于标量计算来构造矢量计算的算法。例如：

```java
static void scalarComputation(float[] a, float[] b, float[] c) {
    for (int i = 0; i < a.length; i++) {
        c[i] = (a[i] * a[i] + b[i] * b[i]) * -1.0f;
    }
}
```

这是提案当中给出的例子，a、b、c 是三个相同长度的数组，c 实际上是运算结果。

使用新的 Vector API实现如下：

```java
static final VectorSpecies<Float> SPECIES = FloatVector.SPECIES_PREFERRED;

static void vectorComputation(float[] a, float[] b, float[] c) {
    int i = 0;
    int upperBound = SPECIES.loopBound(a.length);
    for (; i < upperBound; i += SPECIES.length()) {
        // FloatVector va, vb, vc;
        var va = FloatVector.fromArray(SPECIES, a, i);
        var vb = FloatVector.fromArray(SPECIES, b, i);
        var vc = va.mul(va)
            .add(vb.mul(vb))
            .neg();
        vc.intoArray(c, i);
    }
    for (; i < a.length; i++) {
        c[i] = (a[i] * a[i] + b[i] * b[i]) * -1.0f;
    }
}
```

Vector API 的基本思想就是批量计算，例子当中的 SPECIES 其实是根据机器来选择合适的分批大小的一个变量。我们可以注意到，在计算时 i 每次增加 SPECIES.length()，这就是分批的大小了。当然，你也可以根据实际情况自己选择，例如调用下面的方法来根据矢量的 shape 来确定大小：

```java
static FloatSpecies species(VectorShape s) {
    Objects.requireNonNull(s);
    switch (s) {
        case S_64_BIT: return (FloatSpecies) SPECIES_64;
        case S_128_BIT: return (FloatSpecies) SPECIES_128;
        case S_256_BIT: return (FloatSpecies) SPECIES_256;
        case S_512_BIT: return (FloatSpecies) SPECIES_512;
        case S_Max_BIT: return (FloatSpecies) SPECIES_MAX;
        default: throw new IllegalArgumentException("Bad shape: " + s);
    }
}
```

对于 FloatVector 类型，这套 API 提供了诸如 add、mul 这样的方法来方便实现矢量计算，用起来比较方便。

理论上来讲，这套 API 也是可以带来性能上的提升的，但我使用相同的数据调用上述矢量和标量的方法，在提前完成类加载的条件下，粗略得出以下耗时：

```
scalar: 746000ns
vector: 2210400ns
```

可以看到新的 Vector API 居然更慢。不过这个也不能说明什么，毕竟实际的使用场景是复杂的，而且也跟 CPU 架构密切相关，我的机器是 AMD R9 5900HX，也许在 Intel 上有更好的表现呢（噗。。）。

![img](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates-11-vector/24990443.png)

对了，因为 Java 自身语法的限制，现在的 Vector API 大量用到了装箱和拆箱（这可能是性能消耗的大头），因此预期在 Valhalla 合入之后，基于值类型再做优化可能会得到大幅的性能提升。这么看来应当不是我的 AMD CPU 的问题。

![img](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates-11-vector/249A05A5.png)

不管怎么样，这套东西还在很早期的孵化阶段，API 好用就行，性能的事儿后面会解决的（反正我又不会用到)。



![](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates/893AABA9.jpg)

