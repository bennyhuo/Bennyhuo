---
title:  Kotlin、Swift、Scala 的延迟求值 
keywords: Kotlin Swift Property 
date: 2020/05/23
description: 
tags: 
    - kotlin
    - swift
    - scala
    - lazy 
---

> “懒”是程序员最优秀的品质之一，程序也是如此。 



<!-- more -->




> 最近在探索相同特性在不同语言中实现的对比的文章写作思路，如果大家觉得有收获，别忘了点个赞让我感受一下；如果觉得这思路有问题，欢迎评论留言提建议 ~~

## Kotlin 的延迟求值

Kotlin 最初亮相的时候，基于属性代理实现的 Lazy 就是最吸引人的特性之一。只有使用时才会初始化，这个看上去简单的逻辑，通常我们在 Java 当中会写出来非常啰嗦，延迟初始化也经常因为各种原因变成“忘了”初始化，导致程序出现错误。

这一切在 Kotlin 当中变得非常简单。Kotlin 的 Lazy 通过属性代理来实现，并没有引入额外的关键字，这一点似乎非常符合 Kotlin 的设计哲学（就像其他语言的协程都喜欢 async/await 关键字，而 Kotlin 只有一个 suspend 关键字就承载了及其复杂的逻辑一样）：

```kotlin
[Kotlin]

val lazyValue by lazy { 
    complicatedComputing()
}
```

除了可以用于变量声明，Lazy 也同样适用于函数传参，这一点非常重要，我们来看个例子：

```kotlin
[Kotlin]

fun assertAllTrue(vararg conditions: Lazy<Boolean>): Boolean {
    return conditions.all { it.value }
}
```

assertAllTrue 这个函数的目的是判断所有参数的条件都为真，因此如果其中有一个为假，那么后面的条件就不用计算了，这个逻辑类似于我们常见的 `&&` 运算中的逻辑短路。代码中，it.value 的 it 是 `Lazy<Boolean>` 类型，value 是 Lazy 的属性，我们可以通过这个属性来触发 Lazy 逻辑的运算，并且返回这个结果 —— Lazy 用作属性代理时逻辑也是如此。

接下来我们做下实验，首先定义两个函数用于提供条件值并通过打印输出来判断其是否被执行：

```kotlin
[Kotlin]

fun returnFalse() = false.also { println("returnFalse called.") }
fun returnTrue() = true.also { println("returnTrue called.") }
```

接下来我们调用 assertAllTrue 来看看会发生什么：

```kotlin
[Kotlin]

val result = assertAllTrue(lazy { returnFalse() }, lazy { returnTrue() })
println(result)
```

输出结果：

```
returnFalse called.
false
```

不意外吧？我们还可以模拟 `||` 再实现一个类似的函数：

```kotlin
[Kotlin]

fun assertAnyTrue(vararg conditions: Lazy<Boolean>): Boolean {
    return conditions.any { it.value }
}
```

只要有一个为真就立即返回 true，后面的条件就不再计算了。大家可以自己试试给它传几个参数之后看看能得到什么结果。

简单来说，Kotlin 的 Lazy 是一个很普通的类，它可以承载 Kotlin 当中各种对于延迟计算的需求的实现，用在属性定义上时借用了属性代理的语法，用作函数参数时就使用高阶函数 lazy 来构造或者直接传入函数作为参数即可。

除了使用 Lazy 包装真实的值来实现延迟求值，我们当然也可以使用函数来做到这一点：

```kotlin
[Kotlin]

fun assertAllTrue(vararg conditions: () -> Boolean): Boolean {
    return conditions.all { it.invoke() }
}
```

这种情况下，我们传入的参数就是一个函数，延迟计算的意图也更加明显：

```kotlin
[Kotlin]

val result = assertAllTrue({ returnFalse() }, ::returnTrue, ::returnFalse)
```

对于符合参数类型要求的 returnTrue 和 returnFalse 这两个函数，我们既可以直接传入函数引用，也可以构造一个 Lambda 表达式来包装对它们的调用。传入函数作为参数来实现延迟计算是最基本的手段，其他语言的处理也无非就是在此基础上增加一些友好的语法，后面我们在 Scala 和 Swift 部分就可以看到。

## Scala 的延迟求值

在 Scala 当中 lazy 是个关键字。而相比之下，在 Kotlin 当中我们提到 Lazy 是指类型，提到 lazy，则是指构造 Lazy 对象的高阶函数。

Kotlin 当中的 Lazy 用在定义属性时，只支持只读属性或变量上（也就是 val 修饰的属性或变量），这一点 Scala 的用法比较类似，下面是一个比较无聊的例子，不过倒是能说明问题：

```scala
[Scala]

def timeConsumingWork(): Unit ={
    ...
}

...

lazy val stopTime = System.currentTimeMillis()
val startTime = System.currentTimeMillis()

timeConsumingWork()
println(stopTime - startTime)
```

我们想要统计下 timeConsumingWork 这个函数的调用耗时，stopTime 虽然先调用，但因为有 lazy 修饰，实际上等号右面的表达式 `System.currentTimeMillis()` 并没有立即执行，反而是后定义的 startTime 因为没有被 lazy 修饰而立即计算出值。所以这个程序还真能基本正确地输出 timeConsumingWork 函数执行的耗时。

哇，这样看起来 Scala 使用 lazy 关键字定义属性的语法比起 Kotlin 要简单多了哎！不过换个角度，乍一看明明有一行代码放在前面却没有立即执行是不是会很怪呢？如果一时间没有注意到 lazy 关键字，代码阅读起来还真是有点儿令人迷惑呢。

我们接着看看函数参数延迟求值的情况。在 Scala 当中同样存在高阶函数，因此我们几乎可以依样画葫芦写出 assertAllTrue 的 Scala 实现：

```scala
[Scala]

def assertAllTrue(conditions: (() => Boolean)*): Boolean = {
    conditions.forall(_.apply())
}
```

其中 `() => Boolean` 就是 Scala 中返回值为 Boolean 类型的函数类型，后面的 * 表示这是个变长参数；函数体当中我们对所有的条件进行遍历，并在 forall 当中调用 apply 来求出对应 condition 的值，这里的 forall 相当于 Kotlin 当中的 all，apply 相当于 Kotlin 当中函数的 invoke。

用法如下：

```scala
[Scala]

val result = assertAllTrue(returnFalse, returnTrue, () => returnFalse())
```

注意到我们既可以直接把函数名作为值传入，这类似于 Kotlin 当中传入函数引用的做法，最后一个参数 `() => returnFalse()` 则是定义了一个 Lambda 表达式来包装到 returnFalse 函数的调用。

Hmmm，这么看起来跟 Kotlin 真是一模一样啊。

非也非也。Scala 的函数参数除了可以传递值以外，还有一种叫做传名参数，即仅在使用时才会触发求值的参数。我们还是以前面的 assertAllTrue 为例：

```scala
[Scala]

def assertBothTrue(left: => Boolean, right: => Boolean): Boolean = {
    left && right
}
```

可惜的是，Scala 的传名参数不支持变长参数，所以例子有点儿缩水，不过不影响说明问题。

函数体内的最后一行就是函数的返回值，所以 `left && right` 的值就是 assertBothTrue 的返回值了；而 left 和 right 的参数类型长得有点儿奇怪，如果说它是 Boolean 吧，可它的类型前面还有个 `=>`，说它是函数类型吧， `=>` 前面也没有参数呀，而且用起来跟 Boolean 类型的变量看起来也没什么两样 —— 对喽，这就是传名参数，只有访问时才会计算参数的值，访问的方式与普通的变量没有什么区别，不过每次访问都会重新计算它的值，这一点又与函数的行为相同。

接下来我们看下怎么使用：

```scala
[Scala]

val result = assertBothTrue(returnFalse(), returnTrue())
println(result)
```

我们看到传参时也没什么特别之处，直接传就好了，与我们通常的认知的不同之处在于，assertBothTrue 调用时不会立即对它的参数求值，所以其实这样看起来确实不太直观（这大概是 Kotlin 设计者最不喜欢 Scala 的地方了。。）。

整体比较起来，Scala 对延迟求值做了语言级别的正式支持，因此语法上更省事儿，有些情况下代码显得也更自然。

哦，对了，例子缩水的问题其实也是有办法解决的，哪有 Scala 解决不了的问题呢。。。：）

```scala
[Scala]

implicit class BooleanByName(value: => Boolean) {
    def valueByName: Boolean = value
}

def assertAllTrue(conditions: BooleanByName*): Boolean = {
    conditions.forall(_.valueByName)
}
```

思路也简单，既然 Scala 不支持把传名参数声明为变长参数，那么我们就换个其他类型，巧就巧在 Scala 还支持类型隐式转换，所以定义一个 BooleanByName 即可，这样我们调用 assertAllTrue 传的参数就可以是 Boolean 类型的表达式，编译器会帮我们自动转换为 BooleanByName 类型丢给 assertAllTrue 函数。BooleanByName 中的 valueByName 是一个函数，Scala 当中对于不修改类内部状态的无参函数通常声明成没有括号的样子，这样的函数调用时如同访问属性一样（ 如代码中的 `_.valueByName`），这在 Kotlin 当中的等价写法就是一个没有 backingfield 的只读属性的 getter。

## Swift 的延迟求值

最近比较喜欢 Swift，因为跟 Kotlin 长得像啊。不过随着了解的深入，发现二者虽然看起来很像，但用起来差异太大了，至少在延迟求值这个语法特性的设计上，Swift 形式上更像 Scala。

Swift 的 lazy 也是一个关键字，可以修饰类的属性，不过它不支持修饰局部变量，因此我们只能：

```swift
[Swift]

class LazyDemo {
    lazy var value = complicatedComputing()
    
    func complicatedComputing() -> Int {
        ... 
    }
}
```

不难想到，只要第一次访问 value 时，complicatedComputing 才会被调用。从延迟求值的角度来讲与 Scala 是没什么差别的，不过大家仔细看会发现我们声明属性时用的是 var，也就是说 value 是可变的，这与 Scala、Kotlin 都不一样。更有趣的是，如果我们希望 value 是只读的，将它的声明改为 `lazy let value = ...`，Swift 编译器会抱怨说 lazy 只能修饰 var。

纳尼？你们这些语言的设计者是怎么回事，意见居然这么不统一？

其实 Swift 当中对于变量的读写有更严格的设计，这一点从 struct 与 class 的差异就可见一斑。而 lazy 之所以只能修饰 var，原因也很简单，声明的时候 value 虽然还没有初始化，但在后续访问的时候会触发求值，因此存在声明之后再赋值的逻辑。Hmmm，这个赋值行为从语言运行的角度来讲确实如此，可是这个逻辑不应该对开发者是透明的么，为什么要让开发者操心这么多？

当然，如果想要保护 lazy 修饰的属性的写权限，可以考虑私有化 setter：

```swift
[Swift]

private(set) lazy var value = ...
```

但类内部仍然可以修改 value 的值，所以这个方法的作用也很有限。

接下来看下 Swift 当中函数参数的延迟求值。不难想到，我们将函数作为参数传入就可以实现这一点：

```swift
[Swift]

func assertAllTrue(_ conditions: () -> Bool ...) -> Bool {
    conditions.allSatisfy { condition in condition() }
}
```

大体上写法与 Kotlin 类似，不过有几个细节我们来解释下。
* 参数 conditions 前面的下划线，一般语言的参数都只有参数名，也就是 conditions，Swift 还有一个参数标签的概念，用于函数调用时指定（其实我们在 Kotlin 当中调用函数时也可以在参数前加参数名，但作为位置参数时不强制），用下划线可以省略掉这个标签。
* `() -> Bool` 表示 Swift 当中的函数类型，这与 Kotlin 的写法基本一致，后面的 ... 则表示这个参数为变长参数。
* `{ condition in condition() }` 是 Swift 当中的 Lambda （在 Swift 当中称为 Closure，其实是一个东西），完整的写法是 `{ (condition: () -> Bool) in condition() }`，不难看出，in 是用来分隔参数列表和表达式体的，condition 是参数，它的类型是 `() -> Bool`。

好，那我们下面调用一下这个函数试试看：

```swift
[Swift]

let result = assertAllTrue({ returnFalse() }, returnTrue, returnFalse)
```

第一个参数使用 Lambda 表达式包装对 returnFalse 函数的调用；后面的两个参数直接使用函数名传入，这类似于 Kotlin 当中的函数引用的用法。结果不言而喻。

这么看来 Swift 也可以通过传入函数来实现延迟求值。有了前面 Scala 的经验，我们就不免要想，函数参数延迟求值的写法上能否进一步简化呢？答案是能，通过 @autoclosure 来实现。不过不巧的是 @autoclosure 也不支持变长参数（嗯？？这句话好像在哪儿听到过？），所以我们的例子就又缩水成了下面这样：

```swift
[Swift]

func assertBothTrue(_ left: @autoclosure () -> Bool, _ right: @autoclosure () -> Bool) -> Bool {
    left() && right()
}
```

那调用时有什么不一样呢？

```swift
[Swift]

let result = assertBothTrue(returnFalse(), returnTrue())
```

我们直接传入表达式，Swift 会帮我们用 `{}` 把它包装起来，换句话说，参数里面的 returnFalse 和 returnTrue 这两个函数只有用到的时候才会被调用。

简单总结一下，Swift 通过 lazy 关键字来实现类属性的延迟求值，这一点写法上虽然与 Scala 很像，但只能修饰类或结构体的成员，而且是可读写的成员；Swift 同样可以通过传入函数的形式来支持函数参数的延迟求值，可以通过 @autoclosure 来简化调用过程中参数的写法，这一点其实从形式上与 Scala 的传名参数类似。

## 再来一个有趣的例子

当语言设计地足够灵活，基于已有的语法经常也能造出“新特性”，接下来我们就造一个。

常见的语言当中都有 `while` 循环，为什么没有 `whileNot` 呢？聪明的我们想到了这一点，于是就开始造语法了。先来看看 Kotlin 怎么实现：

```kotlin
[Kotlin]

fun whileNot(condition: () -> Boolean, action: () -> Unit) {
    if(!condition()) {
        action()
        whileNot(condition, action)
    }
}
```

用法：

```kotlin
[Kotlin]

var i = 10
whileNot({ i < 0 }){
    println(i)
    i -= 1
}
```

输出就是 10 9 ... 0

Scala 呢？

```scala
[Scala]

def whileNot(condition: => Boolean)(action: => Unit): Unit = {
    if (!condition) {
        action
        whileNot(condition)(action)
    }
}
```

为了能让第二个参数用 `{ ... }` 以类似于 Kotlin 的方式传入，我们用柯里化的方式声明了这个函数，来瞧瞧用法：

```scala
[Scala]

var i = 10
whileNot(i < 0) {
    println(i)
    i -= 1
}
```

矮？是不是有那味了？这看着跟 while 已经没差了。

下面是 Swift 的实现：

```swift
[Swift]

func whileNot(_ condition: @autoclosure () -> Bool, _ action: () -> Void) {
    if !condition() {
        action()
        whileNot(condition(), action)
    }
}
```

我似乎已经感觉到了那味儿~

```swift
[Swift]

var i = 10
whileNot(i < 0) {
    print(i)
    i -= 1
}
```

怎么样，Swift 造出来的 whileNot 也几乎可以以假乱真了。

看来真的只有你家 Kotlin “稍逊一筹” 啊，条件那里还必须加个 `{}`，没有语法糖可以将这个去掉。不过，（咳咳，官方口吻）Kotlin 一向不喜欢偷偷摸摸的，我们必须要保留 `{}` 让你一眼就能看出来那是个函数，而不像某些语言搞得那么暧昧。

其实吧，单从这个例子的角度来讲，函数的参数类型声明还是挺清楚的，现在 IDE 这么牛逼，所以支持一下这样的特性算不算违反 Kotlin 的设计原则其实也不一定，不过目前看来这种不痛不痒的小特性还是算了吧，跨平台才是最牛逼的，加油 Kotlin，我等着 Android Studio 5.0 写 iOS 呢（zZZ）。

## 小结

总结一下：

1. Kotlin 没有 lazy 关键字，通过属性代理实现只读属性的延迟求值，而 Scala 和 Swift 则通过 lazy 关键字来做到这一点
2. Kotlin 和 Scala 对于属性的延迟求值只支持只读属性，Swift 只支持可变属性
3. Kotlin 和 Scala 的延迟求值还支持局部变量，Swift 不支持。
4. 他们仨都支持通过传入函数的方式来实现函数参数的延迟求值。
5. Scala 和 Swift 对函数参数延迟求值在语法上有更友好的支持，前者通过传名参数，后者通过 @autoclosure。
6. Kotlin 是唯一一个通过其他特性顺带支持了一下延迟求值的，这很符合 Kotlin 设计者的一贯做法（(⊙o⊙)…）。

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

