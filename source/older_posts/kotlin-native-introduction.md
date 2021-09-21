# 闲聊 Kotlin-Native (0) - 我们为什么应该关注一下 Kotlin Native？

**Kotlin-Native**

> 一直想写点儿 Kotlin-Native 相关的话题，今天开始~

==  Kotlin|Native ==


## 尴尬的 Kotlin-Native

![](https://kotlinblog-1251218094.costj.myqcloud.com/9e300468-a645-433d-ae41-60b3eaa97f5a/media/2020-07-14-21-41-58.png)

**<center>官方题图：Kotlin-Native 的世界</center>**

Kotlin-Native 的定位略显尴尬，为什么这么说呢？ 因为现在的编程语言实在太多了，新语言出来必然要解决现有某个语言的痛点，这样才能快速切入该语言所覆盖的领域。Kotlin 也是这样在当年崭露头角的，要不是 Android 上没有很好的替代语言，估计 Kotlin 也不会这么快进入大家的视野。

![](https://kotlinblog-1251218094.costj.myqcloud.com/9e300468-a645-433d-ae41-60b3eaa97f5a/media/2020-07-14-21-44-05.png)

**<center>2017 年 Google IO 大会宣布 Kotlin 称为 Android 一级开发语言</center>**

说到这里问题就来了， Kotlin-Native 的目标用户到底是谁呢？

 编译成机器码可以直接在原生环境中运行，我首先能想到的自然是 C 语言。可真的是要去替代 C 吗？显然不可能，毕竟没有 Go 跑得快，用 Go 来替代 C 语言似乎更说得过去。
 
 当然有专家尝试用 Go 写了个操作系统发现 Go 的 GC 时间的不确定性会给系统的运行带来一些问题。那没关系啊，对于实时性要求高的场景可以换 Rust 嘛，至少微软已经决定要这么做了，Rust 可以精准控制内存的管理，这一点到现在可能还真没有哪一门语言与之媲美，也难怪它最近几年这么火。

![](https://kotlinblog-1251218094.costj.myqcloud.com/9e300468-a645-433d-ae41-60b3eaa97f5a/media/2020-07-14-17-42-11.png)

![](https://kotlinblog-1251218094.costj.myqcloud.com/9e300468-a645-433d-ae41-60b3eaa97f5a/media/2020-07-14-18-47-36.png)

![](https://kotlinblog-1251218094.costj.myqcloud.com/9e300468-a645-433d-ae41-60b3eaa97f5a/media/2020-07-14-18-48-03.png)

**<center>2020.07 TIOBE 编程语言排名：C:1，Go:12，Rust:18，Kotlin:27</center>**

就算将来 Kotlin-Native 在性能上也优化到 Go 和 Rust 的水平，考虑到它的 Java 背景， C 和 C++ 的程序员可能也不太愿意接受这样一个“外来户”。

![](https://kotlinblog-1251218094.costj.myqcloud.com/9e300468-a645-433d-ae41-60b3eaa97f5a/media/2020-07-14-21-49-01.png)

**<center>Java 跟 C++ 的火拼现场，PHP 或成最大受害者</center>**

那 Kotlin-Native 就这么凉了？

据我观察它的目标用户群体至少应该不是 Java 开发者，因为 Java 开发者只有在写 JNI 的时候才会有 Native 代码开发的需要，而 Kotlin-Native 做了 C-interop 就去做 Objective-C 的 interop，很多人开 issue 问官方要不要搞一个简化 JNI 调用的功能，官方的答复竟然是“为啥不直接在 Java 虚拟机上写 Kotlin 呢？” 。

不过说到这儿似乎官方的意图很明显了，就是要去拉拢 iOS 的开发了，但高傲的 iOS 开发者们会这么轻易被收买吗？Hmmm，我突然想到了之前跟某位大哥聊天，他说搞 Flutter 的基本上都是 Android 转的，所以。。Kotlin-Native 的实际目标用户群体还是 Android 开发者，只不过是在他们的老板裁掉同组的 iOS 开发之后或者。。。（啊，我是不是说太多了！）

这么说来接下来我写的这系列 Kotlin-Native 的文章的目标用户还是 Android 开发者为主的 Kotlin 开发者。

当我跟几个小伙伴说了我的下一步的想法，《Kotlin 编程实践》的译者禹昂就打趣到：“你的协程书还没看完呢，跟不上了啊。” 没事儿没事儿，Kotlin 的版本更新已经算是很慢的了，我也会尽量让自己的文章更新的慢一点儿（似乎找到了一个很好的拖更的理由！）。

## 为什么我们需要了解下 Kotlin-Native

### 零成本多平台抽象

前面我们的分析大致可以得出结论：Kotlin-Native 似乎也就是在 iOS 上有些前途。然而现实可能更残酷，因为可能大多数 App 根本没有什么逻辑，用 Flutter 跨平台岂不是更好，为什么还要搞 Kotlin-Native 呢？

![](https://kotlinblog-1251218094.costj.myqcloud.com/9e300468-a645-433d-ae41-60b3eaa97f5a/media/2020-07-15-10-16-22.png)

原因也很简单，与 Flutter 的定位不同，Kotlin-Native 给予了我们开发者更多的可能。Kotlin 的设计思路其实一直都是这样，给开发者或者社区留足发挥的空间，做好语言应该做的事儿。类似的还有协程的设计，语言层面打好基础你就可以在框架层面造出各种飞机大炮。

![](https://kotlinblog-1251218094.costj.myqcloud.com/9e300468-a645-433d-ae41-60b3eaa97f5a/media/2020-07-14-21-53-40.png)

**<center>Kotlin 在 Android & iOS 上共享逻辑</center>**

用 Kotlin 的多平台特性，其实我们完全可以抽象出一套 UI 框架，用相同的 API 在不同的平台上使用各自的 UI 控件。这似乎有点儿像 React Native？对，思路完全一样，不同之处在于 Kotlin 没有额外的开销，Android 上 Kotlin 代码就是原生的代码，iOS 上 Kotlin-Native 与 Swift 编译出来的机器码没有任何实质上的区别。实际上已经有牛人开发了这样一个框架了，有兴趣的同学可以了解下：[moko-widgets](https://github.com/icerockdev/moko-widgets)。

官方在这方面也是非常努力的，从 1.4 预览版就开始都支持 Swift 调用 suspend 函数了，我倒是很期待 Android Studio 直接开发 iOS 的事儿。这也真不是我瞎说，Kotlin 之父在 Kotlin Conf 上自己说的，1.4 官宣发布的时候又再次提到了这一点，而且 JetBrains 全家桶里面本来就有 AppCode 用来开发 Apple 体系下的应用，整合一下应该不是什么难事，工作量问题吧。

你可以在不同的平台上做抽象，而这根本没有什么成本，不仅仅在 Android 与 iOS 上。我注意到最近关于 Rust 写前端的文章尤其多，其实就是因为 Rust 支持编译成 WASM 跑在支持它的浏览器上，Kotlin-Native 又何尝不可呢。

不仅如此，Kotlin-Native 现在的开发体验已经比以前强太多了，标准库虽然还比较小，不过至少基本的集合框架类都是有的，字符串之类的支持也都是有的。没有的我们自己用 C 接口包装一下也不是什么事儿对吧，照着 JDK 的 API，用 MPP 的特性自己实现其他平台的，似乎也不是什么不可能的事儿。还真有人在尝试这么干，不信大家瞧瞧这里：[pw.binom.io](https://github.com/caffeine-mgn/pw.binom.io)，使用这个框架可以在它支持的所有平台上写出下面的代码：

```kotlin
fun main(args: Array<String>) {
    val data = "Simple Text".asUTF8ByteArray()

    val file = File("Simple File")
    FileOutputStream(file, false).use {
        it.write(data, 0, data.size)
        it.flush()
    }

    println("Write data: \"${data.asUTF8String()}\"")

    val out = ByteArrayOutputStream()
    FileInputStream(file).use {
        it.copyTo(out)
    }

    println("Read data: \"${out.toByteArray().asUTF8String()}\"")
}
```

这个例子告诉我们 Kotlin 的这个特性为我们提供了把任意它支持的平台当做我们最熟悉的那个平台来开发的机会。

### 多平台特性的持续优化

1.4-M2 开始支持结构化多平台特性，也就是大佬们经常提到的 HMPP。

多平台代码之间之前只有 common 部分是可以共享的，但这显然不够，例如 Linux 的各种衍生版本之间还可以共享一部分代码，之前不能，现在终于可以了。

这个特性咱们普通开发者可能感受不是特别明显，不过你很难想想框架开发的大佬期待这个特性期待了多久，协程框架马上就用这个特性把多线程的能力做了抽象，等后面达到一个相对稳定的状态之后也许你就会发现 Jvm 和 Native 上的多线程抽象居然用的是同一套代码，不同的就是各自的线程的具体 API 的使用。

![](https://kotlinblog-1251218094.costj.myqcloud.com/9e300468-a645-433d-ae41-60b3eaa97f5a/media/2020-07-14-07-51-38.png)

**<center>结构化多平台特性示意图</center>**

1.4 发布之后，多平台特性官宣进入 alpha 阶段，尽管还不是 release 的状态，但也是 release 倒计时了。客观的讲，多平台相关的绝大多数 API 经过几轮大规模迭代，已经进入较为稳定的状态，之所以还称为 alpha，估计是部分平台的周边支持例如 kotlin-js 的 dukat 还在快速迭代当中。

多平台的重大意义在于 Kotlin 生态的建立。一旦这个特性扶正了，那 Kotlin 跨平台的框架生态发展可以直接得到提速，框架的开发者可以花更低的成本开发全平台适用的 Kotlin 框架，生态好才是王道。

### “新基建”的时代背景

前面我们已经看到 C 语言又力压 Java Python 夺得榜首，因为物联网？因为 5G？因为新基建？反正这几年公司项目的原因接触了不少智能硬件相关的团队和公司，虽然 Android 开始逐渐进入大家的视野，但厉害点儿的硬件还是用 Linux 直接开发。

![](https://kotlinblog-1251218094.costj.myqcloud.com/9e300468-a645-433d-ae41-60b3eaa97f5a/media/2020-07-14-22-06-10.png)

**<center>4G 时代为消费互联网的繁荣提供了土壤，而 5G 时代下的赢家又是谁？</center>**

过去的十年迅猛发展的手机性能极大的改善了我们的生活，而现在手机的发展似乎除了大屏和高性能已经没有什么新意了，互联网的浪潮也早已没有了昔日的疯狂。

说到这儿，想起一个有趣的故事。我曾听曾经在 3W 咖啡馆工作的师兄讲那会儿有人在大冬天极冷的条件下坐在外面干活，想要以此证明他顽强的毅力来吸引投资人的注意。现在想想真是不可思议。那个年代只要会写 APP 就能进大公司，现在遍地都是会写 APP 的，你的竞争力体现在哪里呢？

现在很多时候我们要解决的需求大不再是简单的写个 APP 那么简单，搭配硬件已经是常规操作。IoT 在 5G 背景下可以实现高速率、低延时的远程控制和更多设备的接入，专业领域的小系统在这方面有着天然的优势。

而硬件厂商通常有着多年的 Linux 系统开发的经验积累，同时又对 Android 系统在此类场景下的稳定性表现出了极大的不信任。开发者在这个时代背景下想要脱颖而出，C 语言功底总要有吧？了解下 Kotlin-Native 还能顺带提高一下 C 的水平，与自己现有技术栈也能充分结合起来，甚至还可以把以前运行在其他平台的逻辑轻松地移植过来，何乐而不为呢。

## 我们该怎么学习 Kotlin-Native 呢？

先了解下 Kotlin-Native 需要的背景知识。

1. 扎实的 Kotlin 语法基础。这一点只要是习惯了使用 Kotlin 开发 Android 应用的开发者，一般来讲问题不大。语法上 Kotlin 不管是在哪个平台，包括 Kotlin-js，差异几乎可以忽略。
2. C 语言背景。学习 Kotlin-Native 之前掌握 C 语言是必要的，这与我们开发 Kotlin-Jvm 程序需要先了解 Java 及其生态是一样的道理。

有了这两点基础，在学习的过程中就基本上不会有太大的障碍了。

接下来就是搞清楚自己的需求。学习 Kotlin-Native 的目的是什么呢？如果是开发一款与 Android 共享部分代码的 iOS 应用来实践 Kotlin 跨平台的特性，那么你还需要对 Objective-C 或者 Swift 有一定的了解。

或者你想要了解一下 Kotlin-Native 的垃圾回收机制，对比下与 C++ 的智能指针、Rust 的内存管理甚至与 JVM 的内存垃圾回收机制的区别，那你就要去啃一下 Kotlin-Native 的源码了。

说了这么多，我后面的文章大概会写点儿什么内容呢？

1. Kotlin-Native 编译逻辑以及工程的搭建。这个是必不可少的，而且这块儿还稍微有点儿复杂。幸运的是 Gradle 也支持 Kotlin 脚本，所以我们不必再忍受 Groovy 的动态特性的摧残。
2. Kotlin-Native 组件的发布逻辑。也许我们将来会考虑自己发一款跨平台的框架来取悦自己，所以这个也是很重要的。
3. Kotlin-Native 与其他语言的互调用，主要是 C 和 Objective-C（Swift）。当然，我们也可以尝试通过 C 接口调用一下 Python 或者 Lua，甚至是 JNI。
4. 研究一下 Kotlin-Native 的运行机制，目前能想到的主要就是内存管理吧。
5. 协程在 Kotlin-Native 上对于并发的支持。
6. Ktor 上 CIO 对 Kotlin-Native 的支持。目前这个特性还在开发中，CIO 已经对 JVM 做了支持，我也在《深入理解 Kotlin 协程》当中稍微做了介绍，不过跨平台版本应该很值得期待。

其他。。。我还没有想到，先挖这么多坑吧，后面慢慢填。

## 小结

这篇文章算是这一系列的先导篇吧，谢谢大家的关注，咱们下一篇再见。
