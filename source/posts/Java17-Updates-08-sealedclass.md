# Java 17 更新（2）：密封类终于转正，访问外部函数的 API 越搞越复杂？

**Java Java17**

> Java 17 更新了，我们将按照 JEP 提案的顺序依次为大家介绍这些更新的内容。

==  Java|Java17 ==

我们书接上回，继续聊 Java 17 的更新。

## JEP 409: Sealed Classes

密封类从 Java 15 开始预览，Java 16 又预览了一波，终于在 Java 17 转正了（实际上 Java 16 和 17 的密封类是一样的）。

Kotlin 从 1.0 开始就有密封类，并且对子类定义位置的限制从父类内部（Kotlin 1.0）到同一个文件（Kotlin 1.1）再到同一个包内（Kotlin 1.5），但实际使用上没有什么特别大的变化 —— 直到 Java 也支持密封类和密封接口，Kotlin 才也对密封接口做了支持。

从定义上来讲，二者的密封类、接口都是限制直接子类的定义，使得直接子类是可数的。例如：

```java
package com.example.geometry;

public abstract sealed class Shape 
    permits com.example.polar.Circle,
            com.example.quad.Rectangle,
            com.example.quad.simple.Square { ... }
```

注意，在 Java 当中，密封类的子类的定义也有一些限制，如果父类在具名模块当中，那么子类必须也定义该模块内部；否则，子类就必须定义在父类相同的包当中。如果子类比较小，可以直接定义在父类当中，此时 permits 就不用显式写出了：

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

密封接口的支持也是类似的。

密封类实际上也是一个很有用的特性，我之前在介绍 Kotlin 的密封类的时候也已经提到过不少它的用法，这里就不展开了。

![](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates/746A07D3.gif)


