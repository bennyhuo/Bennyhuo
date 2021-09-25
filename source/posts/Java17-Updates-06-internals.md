## JEP 403: Strongly Encapsulate JDK Internals

这一条对于使用 JDK 内部 API 的应用场景来讲会比较受影响。

实际上 JDK 给开发者提供了相当长的过渡期，从 Java 9 引入模块化开始，JDK 对于其内部的 API 的访问限制就已经明确开始落地，只是当时我们可以通过启动参数 --illegal-access=permit 来继续使用 JDK 的内部 API，其中 Java 9 - Java  15 默认 permit，Java 16 默认 deny。

现在不可以了。在 Java 17 当中使用 --illegal-access 将会得到以下警告，并且没有任何效果：

```
Java HotSpot(TM) 64-Bit Server VM warning: Ignoring option --illegal-access=permit; support was removed in 17.0
```

按照提案的说明，被严格限制的这些内部 API 包括：

*  java.* 包下面的部分非 public 类、方法、属性，例如 Classloader 当中的 defineClass 等等。
* sun.* 下的所有类及其成员都是内部 API。
* 绝大多数 com.sun.* 、 jdk.* 、org.* 包下面的类及其成员也是内部 API。

举个例子：

```java
package com.sun.beans;

...
public final class WeakCache<K, V> {
    private final Map<K, Reference<V>> map = new WeakHashMap<K, Reference<V>>();

    public V get(K key) { ... }

    public void put(K key, V value) { ... }
	...
}

```

在 java.desktop 模块下有这么一个类，非常简单，就是对 WeakHashMap 做了个包装。我想要用一下它，我该怎么办呢？

复制一份到我的工程里面。

![](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates/738DD603.png)

不是，不是。。。好的程序员不应该 CV 代码。。。所以我直接使用它。

![](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates/image-20210921083515465.png)

啊，不行。那我可以反射呀~ 我可真是个小机灵鬼。这波反射下来真实无人能敌。

```java
try {
    var weakCacheClass = Class.forName("com.sun.beans.WeakCache");
    var weakCache = weakCacheClass.getDeclaredConstructor().newInstance();
    var putMethod = weakCacheClass.getDeclaredMethod("put", Object.class, Object.class);
    var getMethod = weakCacheClass.getDeclaredMethod("get", Object.class);
    putMethod.invoke(weakCache, "name", "bennyhuo");
    System.out.println(getMethod.invoke(weakCache, "name"));
} catch (Exception e) {
    e.printStackTrace();
}
```

![](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates/7352D343.gif)

满怀欣喜的运行它。。。

```java
java.lang.IllegalAccessException: class com.bennyhuo.java17.ReflectionsInternal cannot access class com.sun.beans.WeakCache (in module java.desktop) because module java.desktop does not export com.sun.beans to unnamed module @776ec8df
	at java.base/jdk.internal.reflect.Reflection.newIllegalAccessException(Reflection.java:392)
	at java.base/java.lang.reflect.AccessibleObject.checkAccess(AccessibleObject.java:674)
	at java.base/java.lang.reflect.Constructor.newInstanceWithCaller(Constructor.java:489)
	at java.base/java.lang.reflect.Constructor.newInstance(Constructor.java:480)
	at com.bennyhuo.java17.ReflectionsInternal.useWeakCache(ReflectionsInternal.java:16)
	at com.bennyhuo.java17.ReflectionsInternal.main(ReflectionsInternal.java:10)
```

en？？？这让我想起了 Android P，你看这个字母 P，它的发音充满了挑衅，它的形状还有点儿像官方在嘲笑我们

![](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates/73940E6B.gif)

现在 Java 17 也玩这个啊，反射都不行了啊这。。

Java 16 我们可以通过在运行时加入 `--illegal-access=permit` 来运行，虽然会有一堆警告：

```
# java --illegal-access=permit com.bennyhuo.java17.ReflectionsInternal

Java HotSpot(TM) 64-Bit Server VM warning: Option --illegal-access is deprecated and will be removed in a future release.
WARNING: An illegal reflective access operation has occurred
WARNING: Illegal reflective access by com.bennyhuo.java17.ReflectionsInternal (file:/mnt/c/Users/benny/WorkSpace/Mario/SourceCode/Java17UpdatesDemo/src/) to constructor com.sun.beans.WeakCache()
WARNING: Please consider reporting this to the maintainers of com.bennyhuo.java17.ReflectionsInternal
WARNING: Use --illegal-access=warn to enable warnings of further illegal reflective access operations
WARNING: All illegal access operations will be denied in a future release
bennyhuo
```

不过正如我们前面所说，Java 17 当中这个参数无效了

```
# java --illegal-access=permit com.bennyhuo.java17.ReflectionsInternal

Java HotSpot(TM) 64-Bit Server VM warning: Ignoring option --illegal-access=permit; support was removed in 17.0
java.lang.IllegalAccessException: class com.bennyhuo.java17.ReflectionsInternal cannot access class com.sun.beans.WeakCache (in module java.desktop) because module java.desktop does not export com.sun.beans to unnamed module @372f7a8
d
        at java.base/jdk.internal.reflect.Reflection.newIllegalAccessException(Reflection.java:392)
        at java.base/java.lang.reflect.AccessibleObject.checkAccess(AccessibleObject.java:674)
        at java.base/java.lang.reflect.Constructor.newInstanceWithCaller(Constructor.java:489)
        at java.base/java.lang.reflect.Constructor.newInstance(Constructor.java:480)
        at com.bennyhuo.java17.ReflectionsInternal.useWeakCache(ReflectionsInternal.java:16)
        at com.bennyhuo.java17.ReflectionsInternal.main(ReflectionsInternal.java:10)
```

这就是上帝在关门的时候（Java 9），顺便也提醒我们窗户也马上要关上了，还不赶紧给我出去？然后上帝又花了三年把窗户也关上了。不过，它总算是还留了一个通气孔。。。

 Java  17 当中 --add-opens 仍然有效，通过开启它可以让我们的程序还可以在运行时通过反射访问指定的类：

```
--add-opens java.desktop/com.sun.beans=ALL-UNNAMED
```

所以，上面的代码想要运行，只能：

```
# java --add-opens java.desktop/com.sun.beans=ALL-UNNAMED com.bennyhuo.java17.ReflectionsInternal

bennyhuo
```

所以这波是要来真的，赶快跑吧！

![](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates/739B92AC.jpg)

大家也可以参考 [受影响的 API 清单](https://cr.openjdk.java.net/~mr/jigsaw/jdk8-packages-strongly-encapsulated) 来规划自己的 JDK 升级。

