# Kotlin 最近怎么样了

**Kotlin 新特性 近况**

> Kotlin 已经很成熟了。有多成熟呢？Kotlin Team 现在的重心已经是在为各个领域内的 Kotlin 实践提供支持了。

## 新特性

KotlinConf 在 12月5日前后的那几天开完了。Kotlin 1.4 有什么新特性吗？还真有一个，那就是 Kotlin 接口的 SAM 转换（KT-7770）

```kotlin
interface Action {
    fun doAction()
}

fun runAction(action: Action){
    
}

fun main(){
    runAction {
        //action here
    }
}
```

哈哈，终于在新的类型推导到来时，这个特性被支持了。前不久我在录制 《Kotlin 入门到精通》这门课的时候讲到这个点的时候还说“我也不知道什么时候，会不会支持这个特性”，好了，Kotlin Team 终于听到了人民的呼声。

## 新形势

Kotlin 1.0 发布到现在已经快 4 年了，我推广 Kotlin 差不多也 4 年多了。在 Google 开始决定扶持 Kotlin 之前，我们社区的小伙伴的内心感觉大概跟之前的 Rust 社区的小伙伴差不多吧，然后 Google 从 2017 年把 Kotlin 确定为 Android 的一级语言（表示会从官方提供支持，开发者可以使用）到 2019 年转变为首选语言（表示官方推荐你用 Kotlin），社区小伙伴们最初得到这样的消息大概也许相当于 Rust 社区的小伙伴们听到微软决定要用 Rust 来重写部分操作系统模块一样吧（激动）。

我们来看看现在 Kotlin 的排名情况，第一个是大家用的比较多的：

**TIOBE Index for December 2019**
![](https://kotlinblog-1251218094.costj.myqcloud.com/9e300468-a645-433d-ae41-60b3eaa97f5a/media/15761917429814.jpg)

这个排名上 Kotlin 上升的还是比较缓慢的，不过也已经不错了，两年前的时候还在 50 名那儿呢。当然，这个排名其实也有一些争议，因为它是按照互联网上现有的某一门语言的网页数来计算排名的，排名前几的某些语言其实有很多网页都大概都没什么人访问。

第二个是我觉得比较能反映现在大家对待一门语言的态度的排名：

**PYPL PopularitY of Programming Language**

![](https://kotlinblog-1251218094.costj.myqcloud.com/9e300468-a645-433d-ae41-60b3eaa97f5a/media/15761920410684.jpg)

（我把图截得大了一些，主要是想把我同样也很喜欢的 Lua 截进来，(～￣▽￣)～）

这个索引比较科学的地方主要在于它关注的是大家搜索这门语言的教程的频次，这个表明今年 12月大家学习 Kotlin 的热度比起去年上升了 0.5%，名次上升了 4 位。

也就是说，这两个索引一个反应存量，一个反应增量，数据上就能看出 Kotlin 的潜力还是非常巨大的，尽管现在开发者群体还比不上当红的 Java Python 这类“发达”语言，但这个增速绝对就是“发展中”语言中一道亮丽的风景线。

![](https://kotlinblog-1251218094.costj.myqcloud.com/9e300468-a645-433d-ae41-60b3eaa97f5a/media/15770731567913.jpg)
PYPL 的排名确实能够比较真实的反映时下大家的态度，Java 已经被唱衰了好几年，Python 近几年火热到一下冒出特别多新书。Kotlin 在 Native 领域存活自然需要直面 Go，在 JavaScript 上当然也离不开 TypeScript，正好我们也对比下它们各自的发展，Kotlin 作为后起之秀真实有后来居上的气势。

## 新发展

事实上，Kotlin 的主要应用领域当然就是  Android 了。可以说 Kotlin 简直运气好到了极点（也可以说是 Kotlin Team 的决策高明），选择从 Android 撕开一道口子切入市场，道理很简单啊，搞后台的人选择面太广了，Android 端除了忍受 Java，实在没有什么办法，我当时尝试了 Groovy 和 Scala 写 Android，结果标准库方法数一个 3W ，一个 5W，几年前我们还在饱受方法数的折磨，大家应该懂我是什么意思。可是 Kotlin 就很聪明，我不造轮子，标准库方法数 7k ，而且一直到现在都没怎么增加太多，所以大家就开始尝试。到现在，很多人都还觉得 Kotlin 一定是给 Android 开发者准备的 —— 怎么会呢。不过要说支持的比较好的，当然还是 Android，[KTX 的库](https://developer.android.com/kotlin/ktx)已经非常丰富，[Lifecycle](https://developer.android.com/topic/libraries/architecture/lifecycle)、[Room](https://developer.android.com/topic/libraries/architecture/room) 这样的组件也已经支持协程（前者提供 scope，后者的 Dao 支持 suspend 函数），第三方的 [Retrofit](https://github.com/square/retrofit) 早在 2.6.0 就支持 suspend 函数，[OkHttp](https://github.com/square/okhttp) 4.x 已经完全用 Kotlin 重写等等。就连我们公司年初开源的（实际上这个项目在内部也早就开源）插件化框架 [Shadow](https://github.com/Tencent/Shadow) 也有很多模块是使用 Kotlin 开发的。数不胜数。

其次自然就是 Java 所覆盖的其他领域。印象中 [Spring 5.0 就开始支持 Kotlin](https://spring.io/blog/2017/01/04/introducing-kotlin-support-in-spring-framework-5-0)，前不久试了下 [WebFlux 都已经支持 `suspend` 函数作为 RestController 的 API ](https://www.baeldung.com/spring-boot-kotlin-coroutines)，也提供了各种 `Flux` 与 `Flow` 的互转操作，使用体验真实不要太赞。Kotlin Team 的亲儿子 [Ktor](https://ktor.io) 就更不用说了，函数式的 Route 声明，让我一度以为自己在写 Node.js，但又显然不是，Node.js 哪里会提示有什么 API 呢；原生的协程支持，让我们几乎处处可以写 `suspend` 调用，感觉空气都新鲜了。

不甘寂寞的 Kotlin Team 很早就开始支持 Js，不过工具链却一直没有跟上，今年还是重点迭代的 [Dukat](https://github.com/Kotlin/dukat) 项目就是为了解决 Kotlin 与 JavaScript 交互时，Kotlin 的强类型问题。这个项目可以把现有的 JavaScript 界类型的事实标准 *.d.ts 文件转成 Kotlin 声明，这样就很好的解决了类型问题，省得我们以前写 Kotlin 调用 JavaScript API 的时候要么自己手动在 Kotlin 源码中声明对应的 API，要么就是各种类型都声明为 dynamic 逃过编译器检查。听说 WASM 也要独立门户了，过去一直都在 Kotlin Native 当中，后面也许也是一个重点的发力方向。

Kotlin Native 最早比较让人难受的就是编译慢的问题了。最开始编译 Hello World 都需要 40s，后来终于缩短到了 10s 以内（我的笔记本是 2015 mbp），当然这个时间随着代码量的增加也并不会有特别显著的增长，所以对于大型项目来讲，编译时间已经不再是问题。还有就是调试麻烦的事儿，如果是写独立的 Kotlin Native 项目，可以直接 CLion 中调试，也可以在 IntelliJ 中安装 Native Debug 插件调试，可是最近很流行的 Kotlin Native 写 iOS 程序呢，貌似不太好办 —— Kotlin Team 宣布会在明年开始 preview 一款运行在 Android Studio 上的插件用来调试跑在 iOS 上的 Kotlin Native 代码，这就有点儿秀了。哦，对了，Kotlin Native 的协程只能跑在一个线程当中的问题也应该很快就能解决，期待一下。

还有 Kotlin 的脚本，在 3.0 时代就开始尝试支持 Kotlin 的 [Gradle 在 5.0 正式宣布支持 Kotlin](https://docs.gradle.org/5.0/release-notes.html)，并且官方文档都配备了 Kotlin 和 Groovy 两个版本，写过 Gradle 插件的都知道，Gradle API 本来就比较复杂，用 Groovy 写没有 IDE 提示的日子有多痛苦，用 Kotlin 就完全不同了。

更重磅的是，来看看新鲜出炉的 [kotlin-jupyter](https://github.com/Kotlin/kotlin-jupyter)，官方博客也刚刚更新了 [Kotlin 对科学计算支持的介绍文章](https://blog.jetbrains.com/kotlin/2019/12/making-kotlin-ready-for-data-science/)。看来，Kotlin Team 的野心真的不小啊，我现在就是有点儿担心 Kotlin Team 人手不够了 —— 玩笑话，Kotlin 已经不再是 Kotlin Team 自己的了，而是我们所有开发者的。

稍微提一下，在函数式编程方面，Kotlin Team 目前没有（明面儿上）专门支持，不过开源项目 [Arrow](https://github.com/arrow-kt/arrow)  已经颇具规模，由于 Kotlin 1.4 有公开编译器插件的 API 的计划，Arrow 团队也在积极引进编译器层面的支持来加强某些特性的实现（例如 typeclass，目前在 Java 平台上主要靠 APT）。

## 一如既往的建议

尽管发展趋势日新月异，不过建议却一直没变。现如今的 Kotlin 的发展形势越来越好 ，如果现在你还没有趁早用起来，难道要等到几年后后悔吗？当然也有很多小伙伴说用 Kotlin 的时候“巨坑”，然后我问他们都哪儿坑了，说出来之后结果发现都是因为对 Kotlin 甚至是对 Java 不熟悉造成的。其实大家只要认真阅读官方文档，稍微练习上几天，一定会逐渐熟悉起来的，如果英文吃力，可以关注下[中文 Kotlin 官网](https://www.kotlincn.net)，有问题可以到[Kotlin 中文论坛](https://discuss.kotliner.cn/)提问。当然，如果大家喜欢通过视频学习，也可以在慕课网关注下 "[新版 Kotlin 从入门到精通](https://coding.imooc.com/class/398.html)" 这门课，我大概从国庆前后开始基于 Kotlin 1.3.50 制作了这套新版的视频教程，Kotlin 的知识点基本上都有覆盖，也结合了过去推广教学的经验对重难点进行了深入剖析，希望对大家在 Kotlin 入门或是进阶的过程中提供帮助。

Have a nice Kotlin!

