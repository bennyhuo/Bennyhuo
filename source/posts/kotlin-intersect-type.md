# Kotlin 新版本也有了交叉类型和联合类型？

**Kotlin 1.4 类型系统**

> Kotlin 1.4 会默认使用一套新的类型推导算法，类型系统也相比之前更强大了。

== Kotlin|Type ==

Kotlin 1.4-m1 发布之后，我曾整理了一下官方博客中提到的语法更新，见 [Kotlin 1.4 新特性预览](https://www.bennyhuo.com/2020/03/26/kotlin-1.4-preview/)。除了前面的文章中提到的变化，新类型推导算法对于我们平常的代码编写的提升实际上还会体现在很多方面，接下来我们再为大家展示一个 case，来一起感受下新版本的厉害之处。

## 1. 分支表达式的类型推导问题

先来看一段代码：

**代码清单 1：Kotlin 的分支表达式**

```kotlin
val number = if (validation()) 1F else 2.0
```

请问 number 的类型是什么？

直觉告诉我们，number 的类型应该就是 Number 呀，因为两个分支分别是 Float 和 Double 类型，而 Number 是它俩的父类，因此是 Number 没毛病。

逻辑上确实如此，不过实际情况就要各种打脸了。你也许想不到，Float 还实现了一个 Comparable<Float> 的接口，而 Double 则实现了 Comparable<Double>，于是 Float 和 Double 应该同样是 Comparable 的子类才对。也就是说 Float 和 Double 有两个父类（接口），那么再想想，number 究竟是什么类型？Comparable 还是 Number？

都不是。Kotlin 1.3 当中，我们可以通过 IntelliJ 很容易的得到答案：

![](https://kotlinblog-1251218094.costj.myqcloud.com/9e300468-a645-433d-ae41-60b3eaa97f5a/media/2020-04-06-16-13-42.png)

**<center>图 1：Kotlin 1.3 对分支表达式的类型推导</center>**

是不是很吃惊？居然是 Any。因为 Kotlin 编译器在类型推导时遇到这种模棱两可的情况实在不知道如何做出选择，因此干脆不选。

当然，如果你为 number 添加类型声明，例如：

**代码清单 2：为分支表达式添加类型信息**

```kotlin
val number: Number = if (validation()) 1F else 2.0
```

这样 number 的类型就可以确定为 Number 了，Kotlin 编译器也算是松了一口气。

> 有关这个问题的详细分析，我曾经在两年前写过一篇文章 [val b = a?: 0，a 是 Double 类型，那 b 是什么类型？](https://mp.weixin.qq.com/s?__biz=MzIzMTYzOTYzNA==&mid=2247484051&idx=1&sn=4676580d88e9751df9a5ae192fd8d0da&chksm=e8a05daedfd7d4b8d7b7cc9201f287ba3f3206ddba246266c450c02d821959b99344e4cbf42c&token=482430266&lang=zh_CN#rd)，有兴趣的读者可以去了解下。

## 2. 新类型推导算法的推导结果

那么问题来了，新类型推导算法难道可以自动帮我们选择我们想要的类型嘛？额，说实话，这种情况下编译器并不知道你究竟想要什么类型，于是做出选择那是不可能的事儿了。既然做不出选择，那为什么还要选呢？小孩子才做选择，我当然是都要啊！


![](https://kotlinblog-1251218094.costj.myqcloud.com/9e300468-a645-433d-ae41-60b3eaa97f5a/media/2020-04-06-16-26-20.png)

**<center>图 2：Kotlin 1.4 对分支表达式的类型推导</center>**

这是什么情况？这个类型我没见过啊。确实如此，这样的类型我们也没有办法显式声明出来，只有靠编译器推导才能得到。那么这个 {A & B} 的类型究竟算是什么类型呢？字面意思就是既是 A 类型，又是 B 类型，实际含义也是如此。也就是说，{Comparable{Double & Float} & Number} 这个类型既是 Comparable 类型，又是 Number 类型。

于是在 Kotlin 1.4 当中，以下代码就成了合法的用法：

**代码清单 3：Kotlin 1.4 中对于分支表达式类型的使用**

```kotlin
operator fun Number.compareTo(other: Number): Int {
    return this.toDouble().compareTo(other.toDouble())
}

val number = if (validation()) 1F else 2.0
if (number > 2) {
    println("$number > 2")
} else {
    println("$number <= 2")
}
```

这段代码在 Kotlin 1.3 当中默认会无法通过编译。

## 3. 交叉类型与联合类型

![](https://kotlinblog-1251218094.costj.myqcloud.com/9e300468-a645-433d-ae41-60b3eaa97f5a/media/2020-04-06-16-49-34.png)

**<center>图 3：Double 和 Float 的类型关系</center>**

两个类型的交叉类型就是两个类型的交集，因此对于类型 A & B，如果我们把 A 和 B 看做集合的话，相当于 A ∩ B。图 3 的含义其实还涉及到另一个概念：联合类型。对于文章开头的分支表达式，它的类型是 Double 或者 Float，即 Double | Float，这个类型就是一个联合类型，从集合的角度来讲实际上就是 Double ∪ Float。通俗的说，交叉类型是“既是 A 也是 B”的关系，联合类型则是“不是 A 就是 B”的关系。

既然如此，从图上来看，Comparable & Number == Double | Float，因为我们前面讲到过，Double 和 Float 的公共父类（接口）包括 Comparable 和 Number。请注意，Kotlin 在表达联合类型时实际上是取了一个类型的近似值，这个值就是公共父类。

坦率地讲，Kotlin 当中的联合类型与真正理想的联合类型还是不一样的，我们给出 TypeScript 中的联合类型让大家感受下：

**代码清单 4：TypeScript 中的联合类型**

```typescript
interface Bird {
    fly(): void;
    layEggs(): void;
}

interface Fish {
    swim(): void;
    layEggs(): void;
}

declare function getSmallPet(): Fish | Bird;

let pet = getSmallPet();
// OK，两个类型的公共成员
pet.layEggs();
```

虽然 Bird 和 Fish 两个接口没有公共父接口，但 Bird | Fish 却有二者的公共成员 layEggs。如果这段代码放到 Kotlin 当中，结果可想而知：

**代码清单 5：Kotlin 的联合类型**

```kotlin
interface Bird {
    fun fly()
    fun layEggs()
}

interface Fish {
    fun swim()
    fun layEggs()
}

val pet = if(validation()) object : Bird{ ... } else object : Fish{ ... }
pet.layEggs() // Error
```

这里 pet 理论上应该是 Bird | Fish，但 Kotlin 编译器总是会尝试将其类型“退化”成一个当前类型系统可表达的类型，这个退化的方法就是寻找二者的公共父类，即 Any。因此，Kotlin 编译器将分支表达式的类型推导为 Any，pet 自然无法直接访问 layEggs 了，尽管 Bird 和 Fish 都有这个函数。

按照 Kotlin 语言规范的说法，Kotlin 当中的交叉类型和联合类型都是不能直接声明的，只是会在某些语法现象中产生，例如类型智能转换等等。一旦产生了这样的类型，Kotlin 会采用类型近似、类型退化等手段来找到一个现有类型系统中合适的类型来表达它们。

## 4. 为什么不直接支持交叉类型和联合类型呢？

其实这个问题已经争论了挺久了。从各方的讨论来看，目前 Kotlin 没有正式引入这样的类型主要有以下原因：

1. 伪需求。支持引入这个特性的开发者提供的一些 use case 多数情况下可以通过诸如函数重载、泛型约束等特性来实现，有些情况下实际上更应该优化类型设计而不是寄希望于一个更复杂的类型系统。
2. 存在滥用风险。类型系统复杂一点点，带来的项目代码的复杂度提升可能都会是巨大的。这一点从 Kotlin 对函数类型的支持上就可见一斑，当然不同之处在于函数类型确实是刚需。

对于这个问题大家怎么看呢？留言说出你的看法吧。