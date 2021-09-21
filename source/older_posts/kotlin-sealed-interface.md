# Kotlin 1.4.30-RC 密封接口来啦！

**Kotlin News**

> 密封类是 Kotlin 的老成员了，现在也可以有密封接口了。

==  Kotlin|News|sealed interface ==

前两天看到 Kotlin 1.4.30-RC 的邮件，主要添加了对 Java 15 的支持，也支持了密封接口。要知道，Java 15 当中就有个重要的特性叫密封接口，这会难道是 Kotlin 被 Java 倒逼着出了个新特性？

### Java 的密封接口

我们先来看看 Java 的密封接口是怎么回事吧：

```java
sealed interface PlayerState permits Idle, Playing, Error { }

final class Idle implements PlayerState { }

final class Playing implements PlayerState { }

final class Error implements PlayerState { }
```

功能上，与 Kotlin 的密封类类似，都是限制子类个数的，所以这一点儿不应当有什么理解上的困难。

语法上，Java 秉持着它一贯的“啰嗦”的特点，在密封接口定义时，还要明确写出 `permits`，告诉大家这个接口只能够被以下几个类实现。你会不会感觉很奇怪，看一下后面这几行不就知道了，为什么还有加一个 permits？因为我们编写 Java 代码的时候，通常一个类就是一个文件，因此 Java 的密封接口不会去限制只能在文件内部定义实现类（就像 Kotlin 那样），因此 permits 是必须的。

我们还注意到，PlayerState 的子类前面都加了个 final 关键字，意思就是不能被继承。这一点与 Kotlin 的密封类语法类似，Kotlin 当中类型默认就是 final 的，大家可能都没有注意过这个限制。

说到这里，如果大家想要体验 Java 的密封接口的特性，需要给编译器添加 `--enable-preview` 参数，具体在 Gradle 当中可参考以下配置：

```gradle
compileJava {
    it.options.compilerArgs.add('--enable-preview')
}
```

如果使用 Kotlin 与 Java 15 互调用，在 Kotlin 1.4.30-RC 版本当中需要添加下面的参数：

```gradle
compileKotlin {
    kotlinOptions {
        languageVersion = "1.5" // Kotlin 1.5 experimental
        freeCompilerArgs += "-Xjvm-enable-preview" // for java preview 
    }
}
```

### 密封类型子类的子类

那么灵魂拷问来了，不加 final 行不行？

![](https://kotlinblog-1251218094.costj.myqcloud.com/9e300468-a645-433d-ae41-60b3eaa97f5a/media/2021-01-23-09-51-41.png)

三选一，

第一种：sealed，就是你自己也称为密封类，这样子类还是受限制的

第二种： non-sealed，就是明确告诉大家，你不是密封类，而且不是 final，这意味着 Playing 这个类型是可以被其他类型继承的。

啊？？那这样子类不就不受限制了吗？

对呀，子类是不受限制了，但直接子类的个数还是有限的。也就是说密封类实际上限制的是直接子类的个数，这一点之前我们很少提到。

第三种，final，这就比较好理解了，直接把子类的路堵死完事儿。

这么看来，Java 除了支持密封接口以外，也是直接密封类的，而且还能允许密封接口或者密封类的 non-sealed 子类有其他子类，看上去是不是比 Kotlin 高级？

非也非也！

Kotlin 的密封类的子类，也可以有子类的！列位请看：

```kotlin
class Song
class Options

sealed class PlayerState {
    class Error(val t: Throwable): PlayerState()
    object Idle: PlayerState()

    open class Playing(val song: Song): PlayerState()
    class PlayingWithOptions(song: Song, val options: Options): Playing(song)
}
```

Playing 居然可以有个子类，叫做 PlayingWithOptions！这样搞，是不是密封类的特性就被破坏了呀？

当然不是，密封类的子类除了 Error、Idle 以外，仍然只有一种可能，那就是 Playing。这很好理解，对吧。

### Kotlin 的密封接口

好了，接下来我们终于要抬出 1.4.30-RC 当中新增的 Kotlin 的密封接口了，前面的 PlayerState 里面什么都没有，显然我们把它定义成接口更好：

```kotlin
sealed interface PlayerState {
    class Error(val t: Throwable): PlayerState
    object Idle: PlayerState
    open class Playing(val song: Song): PlayerState
    class PlayingWithOptions(song: Song, val options: Options): Playing(song)
}
```

为了配合密封接口的新特性，IDE 在创建 Kotlin 类型的时候也多了个选择：

![](https://kotlinblog-1251218094.costj.myqcloud.com/9e300468-a645-433d-ae41-60b3eaa97f5a/media/2021-01-23-10-12-23.png)

而且你会神奇的发现，内联类跟密封接口可以一起使用了：

```kotlin
sealed interface PlayerState {
    // 注意这里！
    inline class Error(val t: Throwable): PlayerState

    ...
}
```

我们在上一篇文章里面刚刚说到这事儿，虽然可以这么写，这样做意义并不大。因为密封类的子类在使用的过程中总是会声明成父类，这个过程总是会出现装箱：

```kotlin
val playerState: PlayerState = Idle
...
playerState = Error(...) // 装箱
```

所以，我们几乎可以认为，内联类在密封类当中使用基本上都是错误的用法。

稍微提一句，官方在 [KT-42434 Release inline classes as Stable, secure Valhalla compatibility](https://youtrack.jetbrains.com/issue/KT-42434) 当中明确了 inline class 将在 1.4.30 进入 Beta 阶段，在 1.5.0 进入稳定状态；不仅如此，为了配合 [Valhalla](https://openjdk.java.net/projects/valhalla/) 的 Value Type 特性，后续内联类计划被改名叫做 value class，这当然都是后面的事儿了，我们后面有机会再聊。

