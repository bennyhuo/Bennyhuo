# 我写了一本书，《深入理解 Kotlin 协程》

**Kotlin 协程 书**

> 没想到 Kotlin 的协程居然会成为一个有争议的话题，谁让官方材料太少呢。

== Kotlin|Coroutines ==



Kotlin 从 1.1 开始推出协程特性，当时还是实验性质的特性。

我研究 Kotlin 协程的过程其实主要分了三个阶段。

**第一个阶段，深入理解 Kotlin 协程的三篇文章**。翻了翻过去的文章记录，我在 2017 年 1 月当时 Kotlin 1.1-beta 刚刚发布之时就发布了第一篇介绍协程的文章[深入理解 Kotlin Coroutine （一）](https://mp.weixin.qq.com/s?__biz=MzIzMTYzOTYzNA==&mid=2247483875&idx=1&sn=b1b565f651ee1221d4bda19ab12009ce&chksm=e8a05ededfd7d7c878c1c483c577ec53bcf42ee4cb0fe5d13f29d12ff62a1e335c4afa616ffa&token=10610078&lang=zh_CN#rd)，主要介绍了协程的标准库的 API，以及简单的协程封装思路。随后在那年的春节发了第二篇[深入理解 Kotlin Coroutine (二）](https://mp.weixin.qq.com/s?__biz=MzIzMTYzOTYzNA==&mid=2247483878&idx=1&sn=710189e6e22a13fc7d1ea67bc2dd9270&chksm=e8a05edbdfd7d7cd163ee1a2d5769fc2bf003e2d5a6d3f9c6382531b7efc22a6ab75300bb906&token=10610078&lang=zh_CN#rd)，介绍协程的框架 kotlinx.coroutines 的一些功能，当时这个框架还非常的小，源码很容易就能够通读完，与现在简直不可同日而语了。期间也搞了一些线下的活动来分享协程的用法和作用，在 1.1 正式发布不久之后又写了一篇介绍协程的使用场景的文章[深入理解 Kotlin Coroutine（三）](https://mp.weixin.qq.com/s?__biz=MzIzMTYzOTYzNA==&mid=2247484000&idx=1&sn=12f6a010c6fb554b94f68fd5ab6f941e&chksm=e8a05d5ddfd7d44b66c354041fd5f330a297c42b8d451f0b1f38676e83018263b2200c60be57&token=10610078&lang=zh_CN#rd)。

**第二个阶段，[CoroutineLite](https://github.com/enbandari/CoroutineLite)**。这是我仿照官方协程框架 kotlinx.coroutines 的 API 自己实现的一套协程框架，目的主要是为了教学和研究，因此代码编写时主要考虑的目标是可读性，与官方框架追求性能的实现有着本质的不同。当然，这个框架的实现只包括了最基本的内容，像 Channel、Flow 这样更上层的组件便没有提供了。这个框架最初是在我在制作[基于GitHub App业务 深度讲解 Kotlin高级特性与框架设计](https://coding.imooc.com/class/232.html) 这门视频课程时开发的，由于当时 Kotlin 的版本是 1.2，因此视频当中提及的 CoroutineLite 还是一个雏形，直到我去年重制[Kotlin从入门到精通](https://coding.imooc.com/class/398.html)和编写[《深入理解 Kotlin 协程》](https://item.jd.com/12898592.html)时，才为它添加了作用域、取消支持等功能，并进一步的完善很多细节上的设计。这个框架目前已经开源，希望它能够帮助各位读者更好的了解 Kotlin 协程的内部运行机制，这是必要的，也是必须的。

**第三个阶段，破解 Kotlin 协程系列文章**。这几年在帮助大家学习 Kotlin 的过程中，我发现大家对于协程逐渐产生不解、害怕甚至是不屑等各种各样的情绪，一方面是因为 Kotlin 的大部分受众源自于 Android 开发者群体，Android 开发者群体如果从一开始就在这个小圈子内成长的话，确实没有什么机会接触到协程。我自己也是 Android 开发，能够深刻的体会到 Android 技术圈子的局限性，只不过我有幸有机会多接触了几门语言和应用领域。这一系列文章就是想直接基于 Kotlin 1.3 以来已经成熟的生态和框架来介绍 Kotlin 协程，一写就是十几篇，我制作了一个文章合集，有兴趣的朋友可以参阅：[Kotlin 协程文集](https://mp.weixin.qq.com/mp/homepage?__biz=MzIzMTYzOTYzNA==&hid=4&sn=eb02d1dc6f5d92096f214688c6f87196)。

![](https://kotlinblog-1251218094.costj.myqcloud.com/9e300468-a645-433d-ae41-60b3eaa97f5a/media/2020-06-21-08-50-26.png)

**<center>视频课程“Kotlin从入门到精通”中对协程的剖析</center>**

现在，我把前面的这些积累以及在于大家交流过程中发现的问题进行了分析和整理，参考了各家语言对于协程的实现，系统地剖析了 Kotlin 协程的方方面面，编撰成了这样一本《深入理解 Kotlin 协程》的书籍。

这本书主要回答了以下几个常见的问题：

1. 协程是什么？Kotlin 协程又是什么？
2. Kotlin 协程的工作机制是怎样的？
3. 如何将 Kotlin 协程投入生产实践当中？

不仅如此，本书还致力于让大家能够自己尝试动手实现自己的协程框架，成为深谙 Kotlin 协程之道的高手，这样才配得上“深入理解”这个标题。

还有一个小细节。本书印刷版中所有的代码都采用了 JetBrains Mono 这个字体，插图的文字也是如此。另外，本书代码缩进采用了 2 个空格的样式，目的也是为了减少折行，提高版面的空间利用率，进而提升阅读体验。

![](https://kotlinblog-1251218094.costj.myqcloud.com/9e300468-a645-433d-ae41-60b3eaa97f5a/media/2020-07-06-10-23-25.png)

**<center>使用 JetBrains Mono 排版的代码效果</center>**

书的编写过程也比较有意思。我是用 VSCode + Pandoc + graphviz + mermaid.js + plantUML + rx-marbles 等工具来编写的。其中，使用 VSCode 处理文字内容；使用 Pandoc 将 md 文件编译成 docx 文件；使用后面的四个工具来绘制插图 —— 它们实际上是将源码编译成图片的处理工具。

![](https://kotlinblog-1251218094.costj.myqcloud.com/9e300468-a645-433d-ae41-60b3eaa97f5a/media/2020-06-21-08-39-57.png)

**<center>《深入理解 Kotlin 协程》的插图制作</center>**

环境的配置，以及对这些工具的定制花去了我将近两个月的业余时间。除了使用 Haskell 编写的 Pandoc 的插件 cross-ref 我实在无法快速上手以外，我学习到了如何使用 Python 和 Lua 编写用来在编译过程中处理图片生成逻辑和文字预处理的 Pandoc 过滤器，以及如何通过修改源码解决 plantUML、mermaid.js、rx-marbles 的样式定制和字体的支持的问题，最后还借机学会了如何制作 docker 镜像。

当然，我在本书写作过半之时，突发奇想开始学习双拼输入法，刚开始的那一段时间曾一度因为不知道如何打字而憋得着急上火，不过那时的感觉像极了十几年前在大学里刚买电脑之后连 QQ 都聊不明白的光景，自己似乎又年轻了一回。

可以说，这一本书的编写过程，除了促使我对 Kotlin 协程有了一个更加宏观的概念把控之外，我还学到了非常多有意思的东西。

当然，除了有意思之外，在写作的过程中我也确实无数次感觉到了对文字细节的疲惫，但一次次的修改和校对之后又觉得非常值得。

感谢这样的一个机会，在这不平凡的 2020 年里，我写了一本书 ：）