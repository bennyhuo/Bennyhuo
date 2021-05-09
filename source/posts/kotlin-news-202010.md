# 说说最近官方公布的 Kotlin 的动态

**Kotlin News**

> Kotlin 的发展可以认为是正式进入了下一个阶段。

==  Kotlin|News ==

有段时间没有写文章了。

今年年底还有些事情要做，所幸大多数都与 Kotlin 有关系，不算耽搁太多。加上现阶段大家有相对充足的资料学习 Kotlin，尽管协程之前的资料相对匮乏，我也在年中出版了一本书暂时补齐了这块儿缺漏，因此我就这么安慰自己不要压力太大，以免腰更加突出，哈哈。

不过，官方最近有些消息放出来让我有些坐不住了。

## 1. Kotlin 的发版节奏

过去 Kotlin 的版本节奏一直比较佛系，从 1.0 到 1.1 花了一年多，到 1.2 才半年，到 1.3 又近一年，1.4 却花了将近两年。为什么会这样呢？因为越往后，Kotlin 自身的体系越庞大，想要做点儿什么的复杂度可想而知的变高，自然版本节奏就没那么好把控了。

功能优先还是版本优先？

显然这个问题在不同的发展阶段是有不同的答案的。项目刚开始，自然需要稳扎稳打，做一个功能就是一个功能，因此可以说 1.4 及以前的所有版本的迭代计划都是按照这个思路展开的，功能啥时候做好啥时候上，做不好就 delay。

而现如今，

Kotlin 经过 1.0 正式发布

![](https://kotlinblog-1251218094.costj.myqcloud.com/9e300468-a645-433d-ae41-60b3eaa97f5a/media/2020-10-19-12-00-49.png)

1.1 正式支持 JavaScript 并开始试验协程

![](https://kotlinblog-1251218094.costj.myqcloud.com/9e300468-a645-433d-ae41-60b3eaa97f5a/media/2020-10-19-12-01-08.png)

1.2 开始试验多平台

![](https://kotlinblog-1251218094.costj.myqcloud.com/9e300468-a645-433d-ae41-60b3eaa97f5a/media/2020-10-19-12-01-29.png)

1.3 正式支持协程并开始了 Native 的 beta，多平台的生态随之也开始逐渐展开

![](https://kotlinblog-1251218094.costj.myqcloud.com/9e300468-a645-433d-ae41-60b3eaa97f5a/media/2020-10-19-12-01-48.png)

1.4 有做了一系列整体的性能优化和提升，编译器重构也基本完成

![](https://kotlinblog-1251218094.costj.myqcloud.com/9e300468-a645-433d-ae41-60b3eaa97f5a/media/2020-10-19-12-02-06.png)

可以说 Kotlin 现阶段的基本盘已经形成，当前版本足以长期支撑开发者完成开发工作了。

接下来的工作重点我们在之前的文章当中就曾经谈到，其实就是应用场景的挖掘，开发体验的优化和提升，以及多平台的完善和生态的建设。这些大都不算是巨大的语言特性，因此 Kotlin Team 宣布后面发版半年一次，这意味着 Kotlin 1.5 将在明年春天发布，规划的特性实行班车机制，赶得上版本就发布，赶不上就下一趟。

这样做好处也是很明显的，版本的节奏感会给开发者带来期待，我们不再需要猜下一个版本什么时候来，以及下一个版本会有什么，因为这些都会很早就公布；一些细节的改进我们也不需要苦等很久才能体验到，因为版本节奏快了，一些小的改进会更快的被呈现在开发者面前。

## 2. Kotlin 的 Roadmap

我过去想要提前了解 Kotlin 下一步的动态，主要去 Kotlin 的 GitHub 的仓库和 YouTrack 当中去爬 issue，看大家的讨论，这个过程会比较有趣，因为大佬们经常吵架。如果只是想要消遣，这个方式跟刷知乎也没什么两样，不过如果是去获取信息，那就需要自己认认真真的瞎猜了。

再往前的时候，Kotlin Team 还会维护一下 Kotlin 在 GitHub 上开的 Keep 仓库，不过这个仓库现在已经是一副年久失修的感觉了。说来还真是要好好提一下，Kotlin 协程的设计文档就在 Keep 仓库当中，虽然感觉比较久远了，但还是很值得一读的。

![](https://kotlinblog-1251218094.costj.myqcloud.com/9e300468-a645-433d-ae41-60b3eaa97f5a/media/2020-10-19-12-27-41.png)

现在好了，官方直接公布了 Roadmap，这一招配合 Kotlin 的发版节奏的改变，极大的方便了我们这些吃瓜群众。不是想知道 Kotlin 啥时候实现自举吗？Kotlin Team 已经在解决这个问题了，不信看这里：

![](https://kotlinblog-1251218094.costj.myqcloud.com/9e300468-a645-433d-ae41-60b3eaa97f5a/media/2020-10-18-21-54-22.png)

顺便我们也看到了 Kotlin 编译器插件的 API 现在还没有排到最高优先级，所以等等吧。

这次 Roadmap 的公布，还是有一些比较有趣的点的，例如：

![](https://kotlinblog-1251218094.costj.myqcloud.com/9e300468-a645-433d-ae41-60b3eaa97f5a/media/2020-10-18-21-57-40.png)

多个 receiver 的函数，可能有些朋友还没有用到过。其实这个特性现在也有办法来模拟，就是通过隐式 receiver 的方式来实现，但如果能够有专门的语法来支持的，应该还会有更会玩的用法出现。

Kotlin 近期公布的 Roadmap 见：[Kotlin Roadmap](https://kotlinlang.org/roadmap.html)，大家可以自己看看有没有自己感兴趣的内容。

## 3. KMM 插件

KMM 算是 Kotlin Team 为多平台这个重磅特性挖掘的一个重要的应用场景。

![](https://kotlinblog-1251218094.costj.myqcloud.com/9e300468-a645-433d-ae41-60b3eaa97f5a/media/2020-10-19-12-28-19.png)

毕竟 Kotlin 的用户大多是 Android 开发，Android 开发者的老板们有迫切的希望他手底下的 Android 开发能拿一份工资干两人的活，对吧。不仅如此，Android 开发也希望自己在市场上更有竞争力，如果 Kotlin 适用场景变多了，那么自己岂不是就像买了股票一样跑赢大盘？所以 KMM 简直就是众望所归。

KMM 运行在 iOS 上的实际上就是 Kotlin Native 的代码，通过 Kotlin MPP 与运行在 Android 上的 Kotlin Jvm 代码来共享逻辑。最近随着 Kotlin 1.4 发布推出的 KMM 插件也支持了在 Android Studio 上直接运行 iOS 应用，启动 iOS 模拟器，甚至单步调试运行在 iOS 上的 Kotlin Native 代码的能力。

不过，如果想要将 KMM 直接应用于移动端跨平台上上，还是有些问题需要解决的，这主要就是 Kotlin Native 对于 iOS 的支持的问题，例如：

1. Kotlin Native 的并发模型比较严格，也正是如此，Kotlin 协程的 Kotlin Native 版本迟迟没有正式推出多线程版本，在 iOS 上使用 Kotlin 协程目前还受制于所调用的 API 是否本身已经自己支持了异步以及回调的线程切换。
2. Kotlin 目前尚不能像在 Android 上那样全面替代 Java，从目前以导出 Framework 的方式引入 iOS 工程的做法来看，Swift 和 Objective-C 暂时还是无法完全干掉的。
3. Kotlin Native 可用的框架目前仍然比较少，如果想要编写 Kotlin 多平台的代码，也需要我们引入的框架支持 Kotlin 多平台，例如序列化框架可选的目前主要就是官方的 kotlinx-serialization，时间框架主要也是官方提供的 kotlinx-datetime 等等。

不过这倒也不算什么大问题，毕竟才刚刚开始，Kotlin Native 的并发模型的问题以及 Kotlin Native 开发 iOS 的支持问题都在逐渐优化。

至于依赖框架的问题，这恰恰也是 Kotlin 的生存哲学之一，Kotlin 游走与各个平台上，一向是以充分利用所在平台的优势为基础的。我们且等它把这些平台的基础 API 进行统一封装，以方便我们实现逻辑层的一致性。

再稍微提一下，KMM 插件尽管支持了很多功能，但对于 iOS 工程却仍然不能有效支持，这主要体现在对于 Swift、Objective-C 的代码无法高亮、调试等问题上，如果需要编辑 SwiftUI 或者其他使用 Swift 编写的代码模块，还是需要在 Xcode 当中完成。至于将来会不会支持，这一点目前还没有确切的消息。

## 4. 小结

Kotlin 1.4 发布了两个月，整体反应来看，大家还是比较平静的，因为这次确实出了 SAM 转换让人期待已久以外，别的都不是很以外。不过，从最近发生的这些变化来看，Kotlin 的将来还是值得期待一下的，至少，它已经找到了自己的路，并开始一步一步走下去了。

---

![](https://kotlinblog-1251218094.costj.myqcloud.com/9e300468-a645-433d-ae41-60b3eaa97f5a/media/2020-10-19-12-34-14.png)

最后再提一句，国外疫情肆虐，KotlinConf 今年没法线下开展，这不，也改成线上了。大家可以在 [Kotlin 1.4 Online Event](https://kotlinlang.org/lp/event-14/) 这个地址找到所有的视频，内容还是值得了解一下的。

当然，视频直接收看可能需要一些操作，后面的话我看看能不能跟官方的小伙伴商量下尽快搬到国内的视频平台上。此外，我们目前也在准备后面结合这次 Kotlin 的 Event 在国内做一些分享，届时也会通过公众号发布具体的安排，请大家留意~
