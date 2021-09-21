# Kotlin 1.4 新特性预览

**Kotlin 1.4 新版本**

> Kotlin 1.4 没有特别重大的更新，更多的是细节的优化。

== Kotlin|Release|News ==


## 1. 安装 Kotlin 1.4

Kotlin 1.4 的第一个里程碑版本发布了，具体发布信息可以在[这里查看](https://github.com/JetBrains/kotlin/blob/1.4-M1/ChangeLog.md)。

生产环境当中最好仍然使用 Kotlin 的稳定版本（例如最新的 1.3.71），如果你想要立刻马上体验 1.4 的新特性，那么我的建议是先安装一个 EAP 版本的 IntelliJ IDEA EAP 版本是 IntelliJ IDEA 2020.1 Beta，然后再在这个版本的 IntelliJ 上安装最新版的 Kotlin 插件，这样既可以继续使用 1.3 做项目，又不耽误体验新特性：

![](https://kotlinblog-1251218094.costj.myqcloud.com/9e300468-a645-433d-ae41-60b3eaa97f5a/media/2020-03-25-11-10-40.png)

**<center>图 1：IntelliJ IDEA EAP 版本与正式版可以共存</center>**

安装 Kotlin 1.4 的插件方法想必大家都已经轻车熟路了，打开设置，搜 Kotlin，找到插件版本管理的下拉菜单，选择 Early Access Preview 1.4.x 即可：

![](https://kotlinblog-1251218094.costj.myqcloud.com/9e300468-a645-433d-ae41-60b3eaa97f5a/media/2020-03-25-11-20-21.png)

**<center>图 2：升级 Kotlin 插件</center>**

好了，重启 IntelliJ，新建一个工程试试看吧~~

## 2. 主要的语法更新

接下来我们就按照官方博客给出的介绍 [Kotlin 1.4-M1 Released](https://blog.jetbrains.com/kotlin/2020/03/kotlin-1-4-m1-released/) 来体验下新特性。

本文源码均已整理至 GitHub：[Kotlin1.4FeaturesSample](https://github.com/enbandari/Kotlin1.4FeaturesSample)。

### 2.1 Kotlin 接口和函数的 SAM 转换

一个就是大家期待已久的 Kotlin 接口和函数的 SAM 转换。得益于新的类型推导算法，之前一直只有调用接收 Java 单一方法接口的 Java 的方法时才可以有 SAM 转换，现在这个问题不存在了，且看例子：

```kotlin
//注意 fun interface 是新特性
fun interface Action {
    fun run()
}

// Kotlin 函数，参数为 Kotlin 单一方法接口
fun runAction(a: Action) = a.run()
// Kotlin 函数，参数为 Java 单一方法接口
fun runRunnable(r: Runnable) = r.run()
```

在 1.4 以前，我们只能：

```kotlin
runAction(object: Action{
    override fun run() {
        println("Not good..")
    }
})
```

或者

```kotlin
runAction(Action { println("Not good..") })
```

runRunnable 函数虽然接收的是 Java 的接口，同样不支持 SAM。

现在在 1.4 当中呢？

```kotlin
runAction { println("Hello, Kotlin 1.4!") }
runRunnable { println("Hello, Kotlin 1.4!") }
```

真是妙啊。

### 2.2 类型推导支持了更多的场景

类型推导让 Kotlin 的语法获得了极大的简洁性。不过，大家在使用 Kotlin 开发时，一定会发现有些情况下明明类型是很确定的，编译器却一定要让我们显式的声明出来，这其实就是类型推导算法没有覆盖到的场景了。

例如以下代码在 Kotlin 1.3 当中会提示类型不匹配的问题：

```kotlin
val rulesMap: Map<String, (String?) -> Boolean> = mapOf(
    "weak" to { it != null },
    "medium" to { !it.isNullOrBlank() },
    "strong" to { it != null && "^[a-zA-Z0-9]+$".toRegex().matches(it) }
)
```

![](https://kotlinblog-1251218094.costj.myqcloud.com/9e300468-a645-433d-ae41-60b3eaa97f5a/media/2020-03-25-11-47-00.png)

**<center>图 3：Kotlin 1.3 中提示类型不匹配</center>**

博客原文中给出的这个例子乍一看挺复杂，仔细想想问题主要在于我们可以通过 rulesMap 的类型来确定 mapOf 的返回值类型，进而再确定出 mapOf 的参数类型，即 Pair 的泛型参数类型。类型信息是充分的，不过这段代码在 Kotlin 1.4 以前是无法通过编译的，应该是类型推导的层次有点儿多导致算法没有覆盖到。好在新的推导算法解决了这个问题，能够应付更加复杂的推导场景。

### 2.3 Lambda 表达式最后一行的智能类型转换

这个比较容易理解，直接看例子：

```kotlin
val result = run {
    var str = currentValue()
    if (str == null) {
        str = "test"
    }
    str // the Kotlin compiler knows that str is not null here
}
// The type of 'result' is String? in Kotlin 1.3 and String in Kotlin 1.4
```

这里 result 作为 run 的返回值，实际上也是 run 的参数 Lambda 的返回值，因此它的类型需要通过 str 的类型来推断。

在 1.3 当中，str 的类型是可以推断成 String 的，因为 str 是个局部变量，对它的修改是可控的。问题在于虽然 str 被推断为 String 类型，Lambda 表达式的返回值类型却没有使用推断的类型 String 来判断，而是选择使用了 str 的声明类型 String?。

在 1.4 解决了这个问题，既然 str 可以被推断为 String，那么 Lambda 表达式的结果自然就是 String 了。

稍微提一下，IntelliJ 的类型提示貌似有 bug，有些情况下会出现不一致的情况：

![](https://kotlinblog-1251218094.costj.myqcloud.com/9e300468-a645-433d-ae41-60b3eaa97f5a/media/2020-03-25-12-55-09.png)

**<center>图 4：疑似 IntelliJ 行内的类型提示的 bug</center>**

我们可以通过快捷键查看 result 的类型为 String，但是行内的类型提示却为 String?，不过这个不影响程序的运行。

当然，有些开发者经常会抱怨类似下面的这种情况：

```kotlin
var x: String? = null

fun main() {
    x = "Hello"
    if(x != null){
        println(x.length) 
    }
}
```

我明明已经判断了 x 不为空，为什么却不能自动推导成 String？请一定要注意，这种情况不是类型推导算法的问题，而是 x 的类型确实无法推导，因为对于一个共享的可变变量来讲，任何前一秒的判断都无法作为后一秒的依据。

### 2.4 带有默认参数的函数的类型支持

如果一个函数有默认参数，我们在调用它的时候就可以不传入这个参数了，例如：

```kotlin
fun foo(i: Int = 0): String = "$i!"
```

调用的时候既可以是 foo() 也可以是 foo(5)，看上去就如同两个函数一样。在 1.4 以前，如果我们想要获取它的引用，就只能获取到 (Int) -> String 这样的类型，显得不是很方便，现在这个问题解决了：

```kotlin
fun apply1(func: () -> String): String = func()
fun apply2(func: (Int) -> String): String = func(42)

fun main() {
    println(apply1(::foo))
    println(apply2(::foo))
}
```

不过请注意，通常情况下 ::foo 的类型始终为 (Int) -> String，除了作为参数传递给接收 () -> String 的情况下编译器会自动帮忙转换以外，其他情况下是不可以的。

### 2.5 属性代理的类型推导

在推断代理表达式的类型时，以往不会考虑属性代理的类型，因此我们经常需要在代理表达式中显式的声明泛型参数，下面的例子就是这样：

```kotlin
import kotlin.properties.Delegates

fun main() {
    var prop: String? by Delegates.observable(null) { p, old, new ->
        println("$old → $new")
    }
    prop = "abc"
    prop = "xyz"
}
```

这个例子在 1.4 中可以运行，但如果是在 1.3 当中，就需要明确泛型类型：

```kotlin
var prop: String? by Delegates.observable<String?>(null) { p, old, new ->
    println("$old → $new")
}
```

### 2.6 混合位置参数和具名参数

位置参数就是按位置传入的参数，Java 当中只有位置参数，是大家最熟悉的写法。Kotlin 支持了具名参数，那么入参时二者混合使用会怎样呢？

![](https://kotlinblog-1251218094.costj.myqcloud.com/9e300468-a645-433d-ae41-60b3eaa97f5a/media/2020-03-26-08-06-09.png)

**<center>图 5：1.3 当中不允许在具名参数之后添加位置参数</center>**

1.3 当中，第三个参数会提示错误，理由就是位置参数前面已经有了具名参数了，这是禁止的。这样主要的目的也是希望开发者能够避免写出混乱的入参例子，不过这个例子似乎并不会有什么令人疑惑的地方，于是 1.4 我们可以在具名参数后面跟位置参数啦。

其实这个特性并不会对入参有很大的影响。首先位置参数的位置仍然必须是对应的，其次具名参数的位置也不能乱来。例如我们为例子中的 a 添加一个默认值：

![](https://kotlinblog-1251218094.costj.myqcloud.com/9e300468-a645-433d-ae41-60b3eaa97f5a/media/2020-03-26-08-16-35.png)

**<center>图 6：1.4 当中具名参数之后添加位置参数需要保证位置对应</center>**

注意图 6 是 1.4 环境下的情形，这样调用时我们就可以不必显式的传入 a 的值了，这时候直觉告诉我参数 b 后面的参数应该是 c，然而编译器却不领情。这样看来，即便是在 1.4 当中，我们也需要确保具名参数和位置参数与形参的位置对应才能在具名参数之后添加位置参数。

因此，我个人的建议是对于参数比较多且容易混淆的情形最好都以具名参数的形式给出，对于参数个数较少的情形则可以全部采用位置参数。在这里还有另外的一个建议就是函数的参数不宜过多，参数越多意味着函数复杂度越高，越可能需要重构。

### 2.7 优化属性代理的编译

如果大家自己写过属性代理类的话，一定知道 get 和 set 两个函数都有一个 KProperty 的参数，这个参数其实就是被代理的属性。为了获取这个参数，编译器会生成一个数组来存放这代理的属性，例如：

```kotlin
class MyOtherClass {
    val lazyProp by lazy { 42 }
}
```

编译后生成的字节码反编译之后：

```java
public final class com.bennyhuo.kotlin.MyOtherClass {
  static final kotlin.reflect.KProperty[] $$delegatedProperties;
  static {};
  public final int getLazyProp();
  public com.bennyhuo.kotlin.MyOtherClass();
}
```

其中 $$delegatedProperties 这个数组就是我们所说的存被代理的属性的数组。不过，绝大多数的属性代理其实不会用到 KProperty 对象，因此无差别的生成这个数组其实存在一定的浪费。

因此对于属性代理类的 get 和 set 函数实现为内联函数的情形，编译器可以确切的分析出 KProperty 是否被用到，如果没有被用到，那么就不会生成这个 KProperty 对象。

这里还有一个细节，如果一个类当中同时存在用到和没用到 KProperty 对象的两类属性代理，那么生成的数组在 1.4 当中只包含用到的 KProperty 对象，例如：

```kotlin
class MyOtherClass {
    val lazyProp by lazy { 42 }
    var myProp: String by Delegates.observable("<no name>") {
            kProperty, oldValue, newValue ->
        println("${kProperty.name}: $oldValue -> $newValue")
    }
}
```

其中 myProp 用到了 KProperty 对象，lazyProp 没有用到，那么生成的 $$delegatedProperties 当中就只包含 myProp 的属性引用了。

### 2.8 参数列表最后的逗号

这个需求别看小，非常有用。我们来看一个例子：

```kotlin
data class Person(val name: String, val age: Int)

fun main() {
    val person = Person(
        "bennyhuo",
        30
    )
}
```

Person 类有多个参数，传参的时候就会出现前面的参数后面都有个逗号，最后一个没有。这样看上去好像也没什么问题是吧？那有可能你没有用到过多行编辑：

![](https://kotlinblog-1251218094.costj.myqcloud.com/9e300468-a645-433d-ae41-60b3eaa97f5a/media/2020-03-26-11-04-01.png)

**<center>图 7：多行编辑逗号的问题</center>**

这里这个逗号有时候会特别碍事儿，但如何每一行都可以有一个逗号这个问题就简单多了：

![](https://kotlinblog-1251218094.costj.myqcloud.com/9e300468-a645-433d-ae41-60b3eaa97f5a/media/2020-03-26-11-05-25.png)

**<center>图 8：多行编辑所有参数</center>**

除了这个场景之外，还有就是调整参数列表的时候，例如我给 Person 在最后加了个 id，我还得单独给 age 的参数后面加个逗号：

![](https://kotlinblog-1251218094.costj.myqcloud.com/9e300468-a645-433d-ae41-60b3eaa97f5a/media/2020-03-26-11-08-36.png)

**<center>图 9：增加参数给原来的参数加逗号</center>**

这时候我又觉得 id 应该放到最前面，于是做了个复制粘贴，发现还是要修改逗号。当然，最后的这个功能 IntelliJ 有个快捷键可以直接交换行，同时帮我们自动处理逗号的问题，不过整体上这个小功能还是很有意思的。

说起来，JavaScript 当中的对象字面量当中也允许最后一个字段后面加逗号：

![](https://kotlinblog-1251218094.costj.myqcloud.com/9e300468-a645-433d-ae41-60b3eaa97f5a/media/2020-03-26-11-12-48.png)

**<center>图 10：JavaScript 的对象字面量</center>**

不过请注意，尽管它与 JSON 有着深厚的渊源，但 JSON 的最后一个字段后面是不允许加逗号的（当然还有字段要加引号）。

### 2.9 when 表达式中使用 continue 和 break

continue 和 break 的含义没有任何变化，这二者仍然在循环当中使用，只不过循环内部的 when 表达式当中在之前是不可以使用 continue 和 break 的，按照官方的说法，他们之前有意将 continue 或者 break 用作 when 表达式条件 fallthrough 的，不过看样子现在还没想好，只是不想再耽误 continue 和 break 的正常功能了。

### 2.10 尾递归函数的优化

尾递归函数估计大家用的不多，这里主要有两个优化点

* 尾递归函数的默认参数的初始化顺序改为从左向右：
* 尾递归函数不能声明为 open 的，即不能被子类覆写，因为尾递归函数的形式有明确的要求，即函数的最后一个操作必须只能是调用自己，父类的函数声明为 tailrec 并不能保证子类能够正确地按要求覆写，于是产生矛盾。

![](https://kotlinblog-1251218094.costj.myqcloud.com/9e300468-a645-433d-ae41-60b3eaa97f5a/media/2020-03-26-11-25-23.png)

**<center>图 11：1.4 中尾递归函数的默认参数列表初始化顺序</center>**


### 2.11 契约的支持

从 1.3 开始，Kotlin 引入了一个实验特性契约（Contract），主要来应对一些“显而易见”情况下的类型推导或者智能类型转换。

在 1.4 当中，这个特性仍然会继续保持实验状态，不过有两项改进：

* 支持使用内联特化的函数来实现契约
* 1.3当中不能为成员函数添加契约，从1.4开始支持为 final 的成员函数添加契约（当然任意成员函数可能存在被覆写的问题，因而不能添加）

### 2.12 其他的一些改动

除了语法上的明显的改动之外，1.4 当中也直接移除了 1.1-1.2 当中协程的实验阶段的 API，有条件的情况下应该尽快去除对废弃的协程 API 的使用，如果暂时无法完成迁移，也可以使用协程的兼容包 kotlin-coroutines-experimental-compat.jar。

剩下的主要就是针对编译器、使用体验的各种优化了，实际上这才是 Kotlin 1.4 最重要的工作。这些内容相对抽象，我就不做介绍了。

补充一点，在本文撰写过程中，我使用 IntelliJ IDEA 2019.3.3 来运行 Kotlin 1.3，使用 IntelliJ IDEA 2020.1 BETA 来运行 Kotlin 1.4-M1，结果发现后者的代码提示速度似乎有明显的提升，不知道是不是我的错觉，大家可以自行感受下并发表你的评论。

## 3. 小结

Kotlin 目前的语法已经比较成熟了，还是那句话，提升开发体验，扩展应用场景才是它现在最应该发力的点。

未来可期。