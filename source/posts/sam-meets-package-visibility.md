# 重构代码的时候千万小心，SAM 转换可能会引发一个奇怪的运行时类不能访问的异常

**Java Kotlin SAM**

> SAM 转换是很香，不过兼容 Java 

==  Java|Kotlin|SAM ==

/bilibili_id//

## SAM 是什么

SAM 转换是一个非常有用的特性，这个特性不只在 Kotlin 当中有，Java 当中也有。

从 Java 8 开始，Java 当中引入了对 Lambda 的支持，例如：

```java
View view = new View();
view.setOnSizeChangedListener((width, height) -> {
    System.out.println("w: " + width + ", h: " + height);
});
```

这里 View 的定义如下：

```java
public class View {
    interface OnSizeChangedListener {
        void onSizeChanged(int width, int height);
    }

    public void setOnSizeChangedListener(OnSizeChangedListener onSizeChangedListener) {
        ...
    }
    ...
}
```

对于形如 `OnSizeChangedListener` 这样具有单一方法的接口（注意，必须是接口），我们就可以用 Lambda 来简化调用处的写法，所以下面两种写法基本可以认为是等价的：

```java
// SAM 转换的写法
view.setOnSizeChangedListener((width, height) -> {
    System.out.println("w: " + width + ", h: " + height);
});

// 匿名内部类的写法
view.setOnSizeChangedListener(new View.OnSizeChangedListener() {
    @Override
    public void onSizeChanged(int width, int height) {
        System.out.println("w: " + width + ", h: " + height);
    }
});
```

当然它们不是完全等价的，区别主要是 `this` 的问题，这个我们就不展开了。

既然 Java 可以，Kotlin 肯定不能落后的。所以就有了下面的写法：

```kotlin
View().setOnSizeChangedListener { width, height ->
    println("w: $width, h: $height")
}
```

好的，了解了这些之后，我们就来看下今天我们想要讲的问题。

## 包内可见的类？

对于我这样一个写了 Kotlin 5 年以上的人来讲，这个问题实在是太令人困惑了。我们先来给大家看下代码的目录结构：

```bash
samissue
    ├── Java8Sam.java
    ├── KotlinSam.kt
    ├── View.java
    └── sub
         └── SubSam.kt
```

SubSam.kt 的内容如下：

```kotlin
package com.bennyhuo.kotlin.samissue.sub

import com.bennyhuo.kotlin.samissue.View

fun main() {
    View().setOnSizeChangedListener { width, height ->
        println("w: $width, h: $height")
    }
}
```

我们再看下 View.java 的定义：

```java
package com.bennyhuo.kotlin.samissue;

public class View {
    interface OnSizeChangedListener {
        void onSizeChanged(int width, int height);
    }

    public void setOnSizeChangedListener(OnSizeChangedListener onSizeChangedListener) {
        ...
    }
    ...
}
```

这代码有什么问题吗？这时候就需要各位发动自己脑子当中的编译器来反复找茬儿了。反正我第一眼看到这个代码的时候并没有意识到会有什么问题，编译也没什么毛病，就是运行时报错：

```
Exception in thread "main" java.lang.IllegalAccessError: class com.bennyhuo.kotlin.samissue.sub.SubSamKt$main$1 cannot access its superinterface com.bennyhuo.kotlin.samissue.View$OnSizeChangedListener (com.bennyhuo.kotlin.samissue.sub.SubSamKt$main$1 and com.bennyhuo.kotlin.samissue.View$OnSizeChangedListener are in unnamed module of loader 'app')
	at java.base/java.lang.ClassLoader.defineClass1(Native Method)
	at java.base/java.lang.ClassLoader.defineClass(ClassLoader.java:1017)
	at java.base/java.security.SecureClassLoader.defineClass(SecureClassLoader.java:174)
	at java.base/jdk.internal.loader.BuiltinClassLoader.defineClass(BuiltinClassLoader.java:800)
	at java.base/jdk.internal.loader.BuiltinClassLoader.findClassOnClassPathOrNull(BuiltinClassLoader.java:698)
	at java.base/jdk.internal.loader.BuiltinClassLoader.loadClassOrNull(BuiltinClassLoader.java:621)
	at java.base/jdk.internal.loader.BuiltinClassLoader.loadClass(BuiltinClassLoader.java:579)
	at java.base/jdk.internal.loader.ClassLoaders$AppClassLoader.loadClass(ClassLoaders.java:178)
	at java.base/java.lang.ClassLoader.loadClass(ClassLoader.java:522)
	at com.bennyhuo.kotlin.samissue.sub.SubSamKt.main(SubSam.kt:6)
	at com.bennyhuo.kotlin.samissue.sub.SubSamKt.main(SubSam.kt)
```


我一开始觉得可能是编译缓存导致的问题，于是花了十几分钟在 clean 和 reBuild 上，非常恼火。这代码怎么看都不像有问题，实际上我一开始没有能发现这个问题大概就是 Kotlin 写太久了，默认一切都是 public 的了。后来仔细看了下这个问题，又仔细看了下代码，瞬间捕捉到了这个细节：

```java
interface OnSizeChangedListener {
    void onSizeChanged(int width, int height);
}
```

这个接口是包内可见！所以 SubSam.kt 这个文件自然是不应当能够访问到它的。

可是问题又来了，为什么编译器没报错？因为 SAM 转换。注意这个类名：

```kotlin
class com.bennyhuo.kotlin.samissue.sub.SubSamKt$main$1
```

这是错误信息当中提示我们的，这个类其实就是我们的 Lambda 表达式经过 SAM 转换之后生成的类。这个类在编译前不存在，编译之后才生成的，它生成的时机看来是晚于类的可见性检查的，于是就成了编译期的漏网之鱼。

这，我觉得可以算是一个编译器的 BUG　吧。于是我去 YouTrack 提了个 BUG：https://youtrack.jetbrains.com/issue/KT-47104。

解决办法其实很简单，接口改成 public 或者移入相同的包。实际上我们一般情况下也不会把接口约束成包内可见，这个问题并不会对我们造成代码设计上的影响，只是，万一遇到确实有点儿一时手足无措，发现了问题所在之后又着实尴尬。

## 小结

SAM 转换其实是 Kotlin 非常吸引人的一个特性，1.4 引入的 fun interface 则让它更加强大。不过，请大家千万注意，Lambda 不管是在 Java 还是 Kotlin 当中，编译时都大概率会生成一个类（有时候也会只生成几条指令），这往往也是引发问题的根源所在。