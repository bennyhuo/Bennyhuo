---
title:  Java 17 更新（8）：密封类终于转正 
keywords: Java Java17 
date: 2021/10/02 19:10:57
description: 
tags: 
    - java
    - java17
    - sealed class 
---

> Java 看 Kotlin 实现了密封类，马上给自己搞了密封类和密封接口，Kotlin 一看也立马支持了密封接口。 



<!-- more -->




* [Java 17 更新（1）：更快的 LTS 节奏](https://www.bennyhuo.com/2021/09/26/Java17-Updates-01-intro/)
* [Java 17 更新（2）：没什么存在感的 strictfp 这回算是回光返照了](https://www.bennyhuo.com/2021/09/26/Java17-Updates-02-strictfp/)
* [Java 17 更新（3）：随机数生成器来了一波稳稳的增强](https://www.bennyhuo.com/2021/09/27/Java17-Updates-03-random/)
* [Java 17 更新（4）：这波更新，居然利好 mac 用户](https://www.bennyhuo.com/2021/09/27/Java17-Updates-04-mac/)
* [Java 17 更新（5）：历史包袱有点儿大，JDK 也在删代码啦](https://www.bennyhuo.com/2021/09/27/Java17-Updates-05-removed/)
* [Java 17 更新（6）：制裁！我自己私有的 API 你们怎么随便一个人都想用？](https://www.bennyhuo.com/2021/09/27/Java17-Updates-06-internals/)
* [Java 17 更新（7）：模式匹配要支持 switch 啦](https://www.bennyhuo.com/2021/10/02/Java17-Updates-07-switch/)

我们书接上回，继续聊 Java 17 的更新。这篇我们介绍一下 **JEP 409: Sealed Classes**。

密封类从 Java 15 开始预览，Java 16 又预览了一波，终于在 Java 17 转正了（实际上 Java 16 和 17 的密封类是一样的）。

Kotlin 从 1.0 开始就有密封类，并且对子类定义位置的限制从父类内部（Kotlin 1.0）到同一个文件（Kotlin 1.1）再到同一个包内（Kotlin 1.5），但实际使用上没有什么特别大的变化 —— 直到 Java 也支持密封类和密封接口，Kotlin 才也对密封接口做了支持。

![img](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates-08-sealedclass/0D23EF1D.jpg)

从定义上来讲，二者的密封类、接口都是限制直接子类的定义，使得直接子类是可数的。例如：

```java
package com.example.geometry;

public abstract sealed class Shape 
    permits com.example.polar.Circle,
            com.example.quad.Rectangle,
            com.example.quad.simple.Square { ... }
```

注意，在 Java 当中，密封类的子类的定义也有一些限制，如果父类在具名模块当中，那么子类必须也定义该模块内部；否则，子类就必须定义在父类相同的包当中。如果子类直接定义在父类当中的话，permits 就不用显式写出了：

```java
abstract sealed class Root { ... 
    static final class A extends Root { ... }
    static final class B extends Root { ... }
    static final class C extends Root { ... }
}
```

对于密封类的子类来讲，既可以声明为 final 来禁止被继承；也可以声明为 sealed 来使得该子类的直接子类可数；也可以声明为 non-sealed 来使得该子类的子类不受限制。因此我们说密封类可以确保其直接子类可数。例如：

```java
abstract sealed class Root {
    static final class A extends Root { }

    static sealed class B extends Root {
        static final class B1 extends B {}
        static final class B2 extends B {}
    }

    static non-sealed class C extends Root { }
}
```

有了密封类再配合前面提到的 switch 模式匹配，就很好用了：

```java
Root r = new Root.A();
var x = switch (r) {
    case Root.A a -> 1;
    case Root.B b -> 2;
    case Root.C c -> 3;
};
```

对密封接口的支持也是类似的。

密封类实际上也是一个很有用的特性，我之前在介绍 Kotlin 的密封类的时候也已经提到过不少它的用法，例如实现递归列表：

```java
public sealed interface List<T> {
    public static final class Cons<T> implements List<T> {
        public final T head;

        public final List<T> tail;

        public Cons(T head, List<T> tail) {
            this.head = head;
            this.tail = tail;
        }

    }

    public final class Nil implements List<Object> {
        public static final Nil INSTANCE = new Nil();

        private Nil() {}
    }
}
```

这样 List 就只能有 Cons 和 Nil 两个子类，避免它的封装被打破。接下来我们还可以给它添加一些有趣的方法，让它更像一个 List：

```java
public sealed interface List<T> {
    ...

    default void forEach(Consumer<? super T> action) {
        switch (this) {
            case Cons<T> cons -> {
                action.accept(cons.head);
                cons.tail.forEach(action);
            }
            case Nil nil -> {}
        }
    }
}
```

我们为 List 添加了一个默认的 forEach，这样我们就可以很轻松地迭代它了。为了方便创建 List 的实例，我们再给它添加一个便捷的方法：

```java
public sealed interface List<T> {
    ...

    public static <T> List<T> fromArray(T[] array) {
        if (array.length == 0) return Nil.INSTANCE;
        var result = new Cons<T>(array[array.length - 1], Nil.INSTANCE);
        for (int i = array.length - 2; i >= 0; i--) {
            result = new Cons<T>(array[i], result);
        }
        return result;
    }
}
```

接下来给出一个简单的用例：

```java
public static void main(String[] args) {
    var list = List.fromArray(new Integer[]{1, 2, 3, 4, 5});
    // 输出 1 2 3 4 5
    list.forEach(i -> System.out.println(i));
}
```

顺便提一句，用 Kotlin 实现这段逻辑可不要简单太多：

```kotlin
sealed class List<out T> {
    object Nil: List<Nothing?>()
    class Cons<T>(val value: T, val next: List<T>): List<T>()
}

tailrec fun <T> List<T>.forEach(block: (T) -> Unit) {
    when(this) {
        List.Nil -> return
        is List.Cons<T> -> {
            block(value)
            next.forEach(block)
        }
    }
}

fun <T> listOf(vararg values: T): List<T> {
    return values.reversedArray().fold(List.Nil as List<T>) { acc, t ->
        List.Cons(t, acc)
    }
}

fun main() {
    listOf(1,2,3,4).forEach {
        println(it)
    }
}
```

![](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates/746A07D3.gif)

好啦，有关密封类的更新我们就介绍这么多。


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

