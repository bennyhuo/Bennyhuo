---
title: 基于 Node.js 环境的 KotlinJs 工程的完美搭建
date: 2019/03/11
tags:
  - Kotlin
  - Kotlni-Js
---


### 为什么需要这样一篇文章

我们知道 Kotlin 对 Jvm 的支持实在是太好了，以至于我们创建一个 Java 工程，配置一下 Kotlin 的编译插件和标准库就可以很轻松愉快的开始玩耍，什么互调用、什么单步调试都没有毛病——毕竟 KotlinJvm 与 Java 无论从使用上还是从生态上都尽可能的保持了一致，构建也主要用了 gradle，所以从 Java 到 Kotlin 的切换可谓是无缝衔接。

而 Kotlin 同样支持的 JavaScript 就似乎有点儿麻烦了，毕竟二者所处的生态差异略大，KotlinJs 仍然主要采用 gradle 构建，而 JavaScript 的话，例如 Node.js，就使用 npm/yarn 安装管理依赖了。想想可能还是有点儿别扭，你当然可以自己创建一个简单的 KotlinJs 工程，并且自己负责管理 node_modules，但那样的话，node_modules 的依赖并不会被 KotlinJs 直接依赖到，还需要管理 JavaScript 映射到 Kotlin 的接口依赖，例如 jQuery 在 Kotlinjs 侧就有一个接口库方便 Kotlin 以类型安全的方式调用，不过你还是要自己安装好 jQuery 才行，很麻烦对吧。

这一节我们将给大家展示如何搭建一个基于 Node.js 的相对完美的 KotlinJs 的开发环境，这个环境可以做到：

* 依赖只需要在 Gradle 中统一管理即可，node_modules 会被自动安装
* 右键运行 Kotlin 中的 main 函数，就像我们在 KotlinJvm 当中一样
* 单步调试 Kotlin 代码，全程对 JavaScript 的编译结果无感知

基于这个工程，大家就可以很愉快的测试 KotlinJs 的特性啦，就像我们在 KotlinJvm 上面那样，毫无违和感。

<!-- more -->

## 准备工作

首先，你需要一个 IntelliJ Idea Utilmate，俗称的 IU。为什么呢？因为我们需要 IDE 支持 Gradle，所以 WebStorm 就不行啦。

接着，你需要在 IU 中安装 NodeJS 插件，如图：

![](https://kotlinblog-1251218094.costj.myqcloud.com/9ab6e571-684b-4108-9600-a9e3981e7aca/media/15519977140851.jpg)

我的 IU 已经安装了 NodeJS 的插件，因此在左侧可以看到，如果你没有安装，那么点击 Browse repositories 搜索安装即可。安装完成后重启 IU。

最后，为了能够正常运行 Node.js 程序，请大家提前安装好 Node，这个就比较简单了，我就不多说啦。

## 创建工程

创建工程其实也比较简单，选 Gradle，再选择 Kotlin(JavaScript) 即可，后面的根据你的实际情况配置即可。

![](https://kotlinblog-1251218094.costj.myqcloud.com/9ab6e571-684b-4108-9600-a9e3981e7aca/media/15519983002372.jpg)

工程创建完成后，等待 Gradle sync 完成，会得到下图所示的工程目录结构，非常熟悉对不对：

![](https://kotlinblog-1251218094.costj.myqcloud.com/9ab6e571-684b-4108-9600-a9e3981e7aca/media/15520002020882.jpg)

## 开始调试

我们直接在 src/main/kotlin 下面创建一个目录，例如 com/bennyhuo/kotlin/js，创建一个 Main.kt 文件，写下著名的一小步：

```kotlin
fun main() {
    println("Hello")
}
```
然后，这时候你就可以看到 IDE 提示你这个东西可以直接运行：

![](https://kotlinblog-1251218094.costj.myqcloud.com/9ab6e571-684b-4108-9600-a9e3981e7aca/media/15520003818003.jpg)

点击这个按钮，或者右键 main 函数，你都可以看到运行它的选项，点击之~

![](https://kotlinblog-1251218094.costj.myqcloud.com/9ab6e571-684b-4108-9600-a9e3981e7aca/media/15520004304111.jpg)

首先你要选择一个合适的 node 环境，其次这个图提示我们要正确的 JavaScript 路径，由于我们实际上运行的是 Kotlin 编译生成的 JavaScript 文件，因此不要 care 下面的这个 Error，直接点击 run，下一个对话框再点击 “Continue Anyway”。

当然这时候肯定是会报错的，它会报错说没有 kotlin 这个东西，因为默认情况下 KotlinJs  编译得到的 JavaScript 是 plain 类型的，引用的依赖都需要作为全局变量出现。我们要配置它为 commonjs 或者 umd，在 gradle 最后填下以下配置：

```groovy
compileKotlin2Js {
    kotlinOptions.moduleKind = 'commonjs'
    kotlinOptions.sourceMap = true
    kotlinOptions.metaInfo = true
}
```

其他的两项配置主要是为了调试用，比如单步调试映射代码位置等等。

这时候你当然可以选择继续运行了，不过还是会报错，虽然编译的结果已经能够主动去 `require('kotlin')`，但这个 kotlin 在哪儿呢？我们并没有主动去安装它，甚至我们从一开始就声称是基于 node.js 的，我们连 npm init 都没有做过，我们所有的依赖都在 gradle 当中配置：

```groovy
dependencies {
    implementation "org.jetbrains.kotlin:kotlin-stdlib-js"
    testImplementation "org.jetbrains.kotlin:kotlin-test-js"
}
```

这怎么能运行得起来呢？

因此我们还需要一个插件：

```groovy
apply plugin: 'org.jetbrains.kotlin.frontend'
```

为了依赖这个插件，我们需要添加一个仓库，毕竟这个插件还没有发布到 jcenter 的公共仓库或者 gradle 的插件仓库：

```groovy
buildscript {
    repositories {
        maven {
            url "https://dl.bintray.com/kotlin/kotlin-eap"
        }
    }
    dependencies {
        classpath "org.jetbrains.kotlin:kotlin-frontend-plugin:0.0.45"
    }
}
```

这样我们耐心的 sync 一下 gradle，你就会发现 build 目录下多了一些东西：

![](https://kotlinblog-1251218094.costj.myqcloud.com/9ab6e571-684b-4108-9600-a9e3981e7aca/media/15520010125911.jpg)

而这正包含了我们所需要的运行时依赖。kotlin frontend 这个插件会帮我们把 gradle 中配置的依赖也一并通过 npm 安装，它还可以在 gradle 当中为 npm 配置依赖：

```groovy
kotlinFrontend {
    npm {
        dependency "style-loader" // production dependency
        devDependency "karma"     // development dependency
    }
}
```

还支持 webpack 。

好啦，这时候再运行咱们的程序，就会得到结果：

![](https://kotlinblog-1251218094.costj.myqcloud.com/9ab6e571-684b-4108-9600-a9e3981e7aca/media/15520011485464.jpg)

## 体验一把 KotlinJs 的协程

首先添加依赖：

```gradle
implementation 'org.jetbrains.kotlinx:kotlinx-coroutines-core-js:1.1.1'
```

接着，编写我们的 Kotlin 代码：

```kotlin
fun log(msg: Any) {
    println("[${Date().toLocaleTimeString()}] $msg")
}

fun main() {
    log(1)
    GlobalScope.launch {
        log(3)
        val result = withContext(coroutineContext) {
            delay(1000)
            log(4)
            "HelloWorld"
        }
        log("5. $result")
    }
    log(2)
}
```

运行结果如下：

![](https://kotlinblog-1251218094.costj.myqcloud.com/9ab6e571-684b-4108-9600-a9e3981e7aca/media/15520012610528.jpg)

单步调试无需任何特殊配置，直接打断点，点 debug 运行的按钮即可：

![](https://kotlinblog-1251218094.costj.myqcloud.com/9ab6e571-684b-4108-9600-a9e3981e7aca/media/15520013471387.jpg)

![](https://kotlinblog-1251218094.costj.myqcloud.com/9ab6e571-684b-4108-9600-a9e3981e7aca/media/15520013961599.jpg)

我们可以看到 result 的值正是协程内部返回的 HelloWorld。

是不是很美？

## 小结

虽然，在最开始运行的时候会被配置 JavaScript 文件的路径恶心一把，但这个并不会有太多影响，整体体验已经非常不错了。嗯，公司正好有个做了半年的 NodeJs 项目，感觉可以玩一把了，反正组里用啥我说了算 ٩(๑>◡<๑)۶

>从此，小伙伴们与 KotlinJs 过上了幸福的生活~

---

* Bennyhuo 所在的组招 Android 实习生啦
* 主要面向 2020（暑期实习）或者2021 （日常实习）年毕业的计算机相关专业本科及以上的在校生
* Java 基础扎实者优先，熟悉 Kotlin 优先
* 腾讯地图相关业务，坐标 **北京中关村**
* 有兴趣的小伙伴可以发简历到 bennyhuo@kotliner.cn 哈~

--- 

另外，想要找到好 Offer、想要实现技术进阶的迷茫中的 Android 工程师们，推荐大家关注下我的新课《破解Android高级面试》，这门课已经更新完毕，涉及内容均非浅尝辄止，目前已经有200+同学在学习，你还在等什么(*≧∪≦)：

**扫描二维码或者点击链接[《破解Android高级面试》](https://s.imooc.com/SBS30PR)即可进入课程啦！**

![](https://kotlinblog-1251218094.costj.myqcloud.com/9ab6e571-684b-4108-9600-a9e3981e7aca/media/15520936284634.jpg)






