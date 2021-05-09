---
title: 父类返回子类类型的函数写法
date: 2019/02/18
tags:
  - Kotlin
  - SelfType
---

今天的话题很简单，分享下也许对大家可以有帮助或者有启发。

## 1. 背景

一看题目，有点儿晕。看个例子马上就明白了：

```kotlin
abstract class EventBuilder() {
    protected var retryLimit = 3

    fun retryLimit(retryLimit: Int): EventBuilder {
        this.retryLimit = retryLimit
        return this
    }

    abstract fun build(): PollingEvent
}
```

我们有这么一个类，一看就是要写 Builder 模式。不过由于我们的这个 Event 的类型比较多，因此希望写一个父类，来一个子类感受下：

```kotlin
class DisposableEventBuilder : EventBuilder() {
    private var delay: Long = 0L
    fun delay(delay: Long): DisposableEventBuilder {
        this.delay = delay
        return this
    }

    override fun build() = object: DisposableEvent(name, delay){
        override fun onDisposableEvent() {
            callback.onEvent(this)
        }
    }
}
```

看上去也没啥大毛病，用一下吧：

```kotlin
DisposableEventBuilder().retryLimit(3)
        .delay(60_000) // ERROR!! 
        .build()
```
我们调用完父类的 `retryLimit` 方法后，想要设置下 `delay`，结果发现没有这个方法。

> “我 X，这什么玩意儿”，你嘟囔了一句。

<!--more-->

因为返回的是父类，所以链式调用掉链子了。这就尴尬了。

## 2. Scala 的解法

如果这段代码用 Scala 写，那么用 `this.type` 就简直完美的解决了这个问题：

```scala
abstract class SuperBuilder {
    private var retryLimit: Int = 0

    def retryLimit(retryLimit: Int): this.type = {
        this.retryLimit = retryLimit
        this
    }
}

class SubBuilder extends SuperBuilder {
    private var delay: Long = 0

    def delay(delay: Long): SubBuilder = {
        this.delay = delay
        this
    }
}
```

调用时：

```scala
new SubBuilder().retryLimit(3).delay(60000)
```

一点儿毛病都么有。

Kotlin 有这个特性吗？并没有。

## 3. Kotlin 的解法

Kotlin 倒也不是没有办法解决这个问题，用下泛型就好了：

```kotlin
abstract class EventBuilder<T : EventBuilder<T>>() {
    protected var retryLimit = 3

    fun retryLimit(retryLimit: Int): T {
        this.retryLimit = retryLimit
        return this as T
    }

    abstract fun build(): PollingEvent
}
```

这个泛型给父类加了一个泛型参数，这个参数则必须是当前类的子类，那么这样的话我们就可以在返回自身类型的位置返回 T 这个类型了。

子类的改动就很简单了，只需要给父类加一个泛型参数为自己的类型即可：

```kotlin
class DisposableEventBuilder : EventBuilder<DisposableEventBuilder>() {
     ...
}
```

其他的什么也不用动，这时候我们的链式调用就没啥问题了：

```kotlin
DisposableEventBuilder().retryLimit(3)
        .delay(60_000) // OK!!
        .build()
```

这一点上 Kotlin 和 Java 其实是一致的，所以你也可以用 Java 写出类似的代码：

```java
abstract class SuperBuilder<T extends SuperBuilder<T>> {
    private int retryLimit = 0;

    T retryLimit(int retryLimit) {
        this.retryLimit = retryLimit;
        return (T) this;
    }
}

class SubBuilder extends SuperBuilder<SubBuilder> {
    private long delay = 0;

    SuperBuilder delay(long delay) {
        this.delay = delay;
        return this;
    }
}
```

好了，今天就先这样~~



