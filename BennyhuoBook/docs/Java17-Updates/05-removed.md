# 5. 历史包袱有点儿大，JDK 也在删代码啦

> 这次更新有好几条关于移除老代码的，我们来集中介绍一下。


这一次我们主要给大家介绍一下 Java 17 当中移除的这些老古董们。

## JEP 398: Deprecate the Applet API for Removal

这一条对大家的影响几乎没有。

大多数 Java 程序员应该接触过 Servlet，其实在浏览器端对应的还有个 applet，但那已经是很早的时候的东西了。十几年前我开始学 Java 的时候，applet 就已经几乎没有应用场景了，谁又想在打开个网页的时候还要启动一个 Java 虚拟机呢？

![img](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates-05-removed/07F84061.jpg)

随着浏览器对 JavaScript 的支持越来越完善，在浏览器端开发程序的需求都可以轻松地被 JavaScript 满足。终于在 Java 9 发布的时候，applet 被标记为废弃，在 Java 17 它被进一步标记为移除了：

```java
@Deprecated(since = "9", forRemoval = true)
@SuppressWarnings("removal")
public class Applet extends Panel { ... }
```

这意味着在 JDK 17 当中，我们还是可以看到 Applet 的，不过它即将在未来的版本当中彻底消失。

## JEP 407: Remove RMI Activation

这个是远程调用相关的一套 API，由于这个东西的维护成本越来越高，用得人越来越少，Java 官方决定把它干掉。实际上这套 API 在 Java 8 被标记为可选，Java 15 被标记为废弃，也算是留足了时间了。

需要注意的是，移除的只是 java.rmi.activation 包，其他远程调用的能力都不受影响。

![img](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates-05-removed/07FA787F.jpg)

## JEP 410: Remove the Experimental AOT and JIT Compiler

这里提到的 AOT（即 Ahead of time）编译器和 JIT（即 Just in time）编译器是基于 Graal 编译器（使用 Java 实现）开发而来的，它们分别在 Java 9 和 Java 10 被引入 JDK 并开始试验，不过很少有人用它们。

我们知道 Java 代码编译之后生成虚拟机字节码，由虚拟机负责解释执行。由于字节码并不是机器码，因此笼统的说 Java 代码的执行效率并不如 C/C++ 这样的 Native 语言（当然实际情况要看具体场景，也跟虚拟机的优化有很大的关系）。既然 Native 的机器码执行效率更高，那么我们是不是可以直接把字节码编译成机器码，然后再去执行呢？听上去确实是一个好主意。

![](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates/747224F9.gif)

这也就是 AOT 的由来了。移动端对于性能更加敏感，因而我们更多的时候听到 AOT 这个词是在对 Android ART 和 Flutter 的文档当中。

JIT 则是在运行的时候对热点代码的实时编译，这个其实 Java 虚拟机一直都有对应的实现（只不过是 C++ 写的）。

这里要移除的就只是基于 Graal 编译器实现的这俩个实验当中的编译器，理由呢，也很直接：没人用，还难以维护，投入产出比太低了。

![](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates/74783920.gif)

当然，这也不是说 Java 就不能编译成 Native 二进制可执行程序直接运行，因为我们还有 [GraalVM](https://www.graalvm.org/)，这家伙居然还支持 Node.js 和 Ruby：

![](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates/image-20210921125108617.png)

额，还有 Python、R 和 LLVM：

![](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates/image-20210921125151101.png)

还叫板 LLVM，有点儿东西哦~

## JEP 411: Deprecate the Security Manager for Removal

与 applet 类似，SecurityManager 也被标记为废弃且即将移除：

```java
@Deprecated(since="17", forRemoval=true)
public class SecurityManager { ... }
```

一般业务开发不太会用到这个东西，我们就不过多介绍了。

![](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates/7580BB3C.jpg)

## 小结

Java 官方在决定废弃这几个东西的时候，其实也做了广泛的调查，可能主要还是发现没什么人用吧（当然还有的是他们不希望我们用）。

---

## 关于作者

**霍丙乾 bennyhuo**，Kotlin 布道师，Google 认证 Kotlin 开发专家（Kotlin GDE）；**《深入理解 Kotlin 协程》** 作者（机械工业出版社，2020.6）；前腾讯高级工程师，现就职于猿辅导

* GitHub：https://github.com/bennyhuo
* 博客：https://www.bennyhuo.com
* bilibili：[**bennyhuo不是算命的**](https://space.bilibili.com/28615855)
* 微信公众号：**bennyhuo**