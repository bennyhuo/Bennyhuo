---
title:  Kotlin 1.4.30-M1 增强的内联类是个什么东西？ 
keywords: Kotlin News 
date: 2021/01/18
description: 
tags: 
    - kotlin
    - news
    - inline class 
---

> 内联类从 1.3 推出，一直处于实验状态。 



<!-- more -->




内联类要解决的问题呢，其实也与以往我们接触到的内联函数类似，大体思路就是提供某种语法，提升代码编写体验和效率，同时又借助编译器的优化手段来减少这样做的成本。

## 1. 从内联函数说起

我们先以各类编程语言当中广泛存在的内联函数为例来说明内联的作用。

函数调用时有成本的，这涉及到参数的传递，结果的返回，调用栈的维护等一系列工作。因此，对于一些比较小的函数，可以在编译时使用函数的内容替换函数的调用，以减少函数的调用层次，例如：

```kotlin
fun max(a: Int, b: Int): Int = if(a > b) a else b

fun main() {
    println(max(1, 2))
}
```

在 main 函数当中调用 max 函数，从代码编写的角度来看，使用函数 max 让我们的代码意图更加明显，也使得求最大值的逻辑更容易复用，因此在日常的开发当中我们也一直鼓励大家这样做。

不过，这样的结果就是一个简单的比较大小的事儿变成了一次函数的调用：

```java
  public final static main()V
   L0
    LINENUMBER 6 L0
    ICONST_1
    ICONST_2
    INVOKESTATIC com/bennyhuo/kotlin/InlineFunctionKt.max (II)I
    INVOKESTATIC kotlin/io/ConsoleKt.println (I)V
```

如果我们把 max 声明成内联函数：

```kotlin
inline fun max(a: Int, b: Int): Int = if(a > b) a else b
```

结果就不一样了：

```java
  public final static main()V
   L0
    LINENUMBER 6 L0
    ICONST_1
    ISTORE 0
    ICONST_2
    ISTORE 1
   L1
    ICONST_0
    ISTORE 2
   L2
    LINENUMBER 8 L2
   L3
    ILOAD 1
   L4
   L5
    ISTORE 0
   L6
    LINENUMBER 6 L6
   L7
    ICONST_0
    ISTORE 1
   L8
    GETSTATIC java/lang/System.out : Ljava/io/PrintStream;
    ILOAD 0
    INVOKEVIRTUAL java/io/PrintStream.println (I)V
```

这样我们就已经看不到 max 函数的调用了。

当然，对于这样的小函数，编译器和运行时已经足够聪明到可以自己自动做优化了，内联函数在 Kotlin 当中最大的作用其实是高阶函数的内联，我们就以最为常见的 forEach 为例：

```kotlin
inline fun <T> Array<out T>.forEach(action: (T) -> Unit): Unit {
    for (element in this) action(element)
}
```

forEach 函数被声明为 inline，这说明它是一个内联函数。按照我们的前面对内联函数的理解，下面的代码：

```kotlin
arrayOf(1,2,3,4).forEach {
    println(it)
}
```

编译之后大致相当于：

```kotlin
for (element in arrayOf(1,2,3,4)) {
    { it: Int -> println(it) }(element)
}
```

这样 forEach 自身的调用就被消除掉了。不过，这还不够，因为我们看到 `{ it: Int -> println(it) }(element)` 其实就是前面 forEach 定义当中的 `action(element)`，这也是一个函数调用，也是有成本的。更为甚者，每一次循环当中都会创建一个函数对象（Lambda）并且调用它，这样一来，还会有频繁创建对象的开销。

所以，Kotlin 当中的内联函数也会同时对函数类型的参数进行内联，因此前面的调用编译之后实际上相当于：

```kotlin
for (element in arrayOf(1,2,3,4)) {
    println(element)
}
```

而且这样也更符合我们的直觉。

总结一下，内联函数可以减少函数对象的创建和函数调用的次数。

> 提问：所以你知道为什么 IDE 会对 max 这样的非高阶函数的内联发出警告了吗？

## 2. 什么是内联类

内联函数可以减少对象的创建，内联类实际上也是如此。

内联类实际上就是对其他类型的一个包装，就像内联函数其实是对一段代码的包装一样，在编译的时候对于内联类对象的访问都会被编译器拆掉包装而得到内部真实的类型。因此，内联类一定有且只有一个属性，而且这个属性还不能被修改。

内联类的语法其实也简单，与 Kotlin 当中其他的枚举类、密封类、数据类的定义方式类似，在 class 前面加一个 inline 即可：

```kotlin
inline class PlayerState(val value: Int)
```

使用时大多数情况下就像普通类型那样：

```kotlin
val idleState = PlayerState(0)
println(idleState.value)
```

虽然这里创建了一个 PlayerState 的实例 idleState，我们也对这个实例的成员 value 进行了访问，但编译完之后这段代码大致相当于：

```kotlin
val value = 0
println(value)
```

因为 PlayerState 这个类型的实例被内联，结果就剩下 value 本身了。

我们当然也可以给内联类定义其他成员，这其中包括无状态的属性（没有 backing field）和函数：

```kotlin
inline class PlayerState(val value: Int) {
    val isIdle
        get() = value == 0
    
    fun isPlaying() = value == 1
}
```

访问这些成员的时候，编译器也并不会将内联类的实例创建出来，而是转换成静态方法调用：

```kotlin
val idleState = PlayerState(0)
println(idleState.isIdle)
println(idleState.isPlaying())
```

因而就相当于：

```kotlin
val value = 0
println(PlayerState.isIdle-impl(value))
println(PlayerState.isPlaying-impl(value))
```

`isIdle-impl` 和 `isPlaying-impl` 这两个函数是编译器自动为 PlayerState 生成的静态方法，它们的方法名中加了 `-` 这样的非法字符，这意味着这些方法对于 Java 来讲是不友好的，换句话讲，内联类不能与 Java 的语法兼容。

我们再看一个稍微复杂的情形：

```kotlin
val idleState = PlayerState(0)
println(idleState)
```

我们直接将这个内联类的实例传给 println，这下编译器会怎么办呢？编译器只会在尽可能需要的情况下完成内联，但对于这种强制需要内联类实例的情况，也是无法绕过的，因此在这里会发生一次“装箱”操作，把内联类实例真正创建出来，大致相当于：

```kotlin
val value = 0
println(PlayerState(value))
```

简单总结一下就是：

1. 在一定范围内，内联类可以像普通类那样使用。言外之意，其实内联类也有挺多限制的，这个我们待会儿再聊。
2. 编译之后，编译器会尽可能地将内联类的实例替换成其成员，减少对象的创建。

## 3. 内联类有什么限制？

通过前面对于内联类概念的讨论，我们已经知道内联类

1. 有且仅有一个不可变的属性
2. 可以定义其他属性，但不能有状态

实际上，由于内联类存在状态限制，因此内联类也不能继承其他类型，但这不会影响它实现接口，例如标准库当中的无符号整型 UInt 定义如下：

```kotlin
inline class UInt internal constructor(internal val data: Int) : Comparable<UInt> {
  ...

  override inline operator fun compareTo(other: UInt): Int = uintCompare(this.data, other.data)

  ...
}
```

这个例子里面其实还有惊喜，那就是 UInt 的构造器是 internal 的，如果你想要一样画葫芦在自己的代码当中这样写，怕是要看一下编译器的脸色了：

**以下为 Kotlin 1.4.20 当中的效果**

![](https://kotlinblog-1251218094.costj.myqcloud.com/9e300468-a645-433d-ae41-60b3eaa97f5a/media/2021-01-17-09-21-50.png)

在 Kotlin 1.4.30 以前，内联类的构造器必须是 public 的，这意味着在过去我们不能通过内联类来完成对某一种特定类型的部分值的包装：因为外部一样可以创造出来新的内联类实例。

不过，1.4.30-M1 当中已经解除了这一限制，详情参见：**KT-28056 Consider supporting non-public primary constructors for inline classes**(https://youtrack.jetbrains.com/issue/KT-28056)，因而我们现在可以将内联类的构造器声明为 internal 或者 private，以防止外部随意创建新实例：

```kotlin
inline class PlayerState
private constructor(val value: Int) {
    companion object {
        val error = PlayerState(-1)
        val idle = PlayerState(0)
        val playing = PlayerState(1)
    }
}
```

这样，PlayerState 的实例就仅限于 error、idle、playing 这几个了。

除了前面限制实例的场景，有些情况下我们其实只是希望通过内联类提供一些运行时的校验，这就需要我们在 init 块当中来完成这样的工作了，但内联类的 init 块在 1.4.30 以前也是禁止的：

![](https://kotlinblog-1251218094.costj.myqcloud.com/9e300468-a645-433d-ae41-60b3eaa97f5a/media/2021-01-17-09-43-05.png)

1.4.30-M1 开始解除了这一限制，详情参见：**KT-28055 Consider supporting init blocks inside inline classes**(https://youtrack.jetbrains.com/issue/KT-28055)。不过需要注意的是，虽然 init 块当中的逻辑只在运行时有效，但这样的特性可以让被包装类型的值与它的条件在代码当中紧密结合起来，提供更良好的一致性。

## 4. 内联类有什么应用场景？

前面在讨论内联类的概念和限制时，我们已经给出了一些示例，大家也大概能够想到内联类的具体作用。接下来我们再整体梳理一下内联类的应用场景。

### 4.1 加强版的类型别名

内联类最一开始给人的感觉就是“类型别名 Plus”，因为内联类在运行时会被尽可能替换成被包装的类型，这与类型别名看上去很接近。不过，类型别名本质上就是一个别名，它不会导致新类型的产生，而内联类是确实会产生新类型的：

```kotlin
inline class Flag0(val value: Int)
typealias Flag1 = Int

fun main() {
    println(Flag0::class == Int::class) // false
    println(Flag1::class == Int::class) // true
    
    val flag0 = Flag0(0)
    val flag1 = 0
}
```

### 4.2 替代枚举类

内联类在 1.4.30 之后可以通过私有化构造函数来限制实例个数，这样也可以达到枚举的目的，我们前面已经给出过例子：

**内联类的写法**
```kotlin
inline class PlayerState
private constructor(val value: Int) {
    companion object {
        val error = PlayerState(-1)
        val idle = PlayerState(0)
        val playing = PlayerState(1)
    }
}
```

**枚举类的写法**

```kotlin
enum class PlayerState {
    error, idle, playing
}
```

我们还可以为内联类添加各种函数来增强它的功能，这些函数最终都会被编译成静态方法：

```kotlin
inline class PlayerState
private constructor(val value: Int) {
    companion object {
        val error = PlayerState(-1)
        val idle = PlayerState(0)
        val playing = PlayerState(1)
        
        fun values() = arrayOf(error, idle, playing)
    }
    
    fun isIdle() = this == idle
}
```

虽然内联类似乎写起来稍微啰嗦了一些，但在内存上却跟直接使用整型几乎是一样的效果。

话说到这儿，不知道大家是不是能想起 Android 当中的注解 IntDef，结果上都是使用整型来替代枚举，但内联类显然更安全，IntDef 只是一种提示而已。不仅如此，内联类也可以用来包装字符串等其他类型，无疑将是一种更加灵活的手段。

当然，使用的内联类相较于枚举类有一点点小缺点，那就是使用 when 表达式时必须添加 else 分支：

**使用内联类**

```kotlin
val result = when(state) {
  PlayerState.error -> { ... }
  PlayerState.idle -> { ... }
  PlayerState.playing -> { ... }
  else -> { ... } // 必须，因为编译器无法推断出前面的条件是完备的
}
```

而由于编译器能够确定枚举类的实例可数的，因此 else 不再需要了：

**使用枚举类**

```kotlin
val result = when(state) {
  PlayerState.error -> { ... }
  PlayerState.idle -> { ... }
  PlayerState.playing -> { ... }
}
```

### 4.3 替代密封类

密封类用于子类可数的场景，枚举类则用于实例可数的场景。

我们前面给出的 PlayerState 其实不够完善，例如状态为 error 时，也应该同时附带错误信息；状态为 playing 时也应该同时有歌曲信息。显然当前一个简单的整型是做不到这一点的，因此我们很容易能想到用密封类替代枚举：

```kotlin
class Song {
  ...
}

sealed class PlayerState

class Error(val t: Throwable): PlayerState()
object Idle: PlayerState()
class Playing(val song: Song): PlayerState()
```

如果应用场景对于内存不敏感，这样写实际上一点儿问题都没有，而且代码的可读性和可维护性都会比状态值与其相对应的异常和播放信息独立存储要强得多。

这里的 Error、Playing 这两个类型其实就是包装了另外的两个类型 Throwable 和 Song 而已，是不是我们可以把它们定义为内联类呢？直接定义肯定是不行的，因为 PlayerState 是个密封类，密封类本质上也是一个类，我们前面提到过内联类有不能继承类型的限制，当时给出的理由是内联类不能包含其他状态。这样看来，如果父类当中足够简单，不包含状态，是不是将来有希望支持继承呢？

其实问题不只是状态那么简单，还有多态引发的装箱和拆箱的问题。因为一旦涉及到父类，内联类很多时候都无法实现内联，我们假定下面的写法是合法的：

```kotlin
sealed class PlayerState

inline class Error(val t: Throwable): PlayerState()
object Idle: PlayerState()
inline class Playing(val song: Song): PlayerState()
```

那么：

```kotlin
var state: PlayerState = Idle
...
state = Error(IOExeption("...")) // 必须装箱，无法内联
...
state = Playing(Song(...)) // 必须装箱，无法内联
```

这里内联机制就失效了，因为我们无法将 Song 的实例直接赋值给 state，IOException 的实例也是如此。

不过，作为变通，其实我们也可以这样改写上面的例子：

```kotlin
inline class PlayerState(val state: Any?) {
    init {
        require(state == null || state is Throwable || state is Song)
    }
    
    fun isIdle() = state == null
    fun isError() = state is Throwable
    fun isPlaying() = state is Song
}
```

这样写就与标准库当中大名鼎鼎的 Result 类有异曲同工之妙了：

```kotlin
inline class Result<out T> internal constructor(
    internal val value: Any?
) : Serializable {

  val isSuccess: Boolean get() = value !is Failure

  val isFailure: Boolean get() = value is Failure
  
  ...
}
```

## 5. 小结

本文我们简单介绍了一下内联类的作用，实现细节，以及使用场景。简单总结如下：

1. 内联类是对其他类实例的包装
2. 内联类在编译时会尽可能地将实例替换成被包装的对象
3. 内联类的函数（包括无状态属性）都将被编译成静态函数
4. 内联类在内存敏感的场景下可以一定程度上替代枚举类、密封类的使用
5. 内联类不能与 Java 兼容



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

