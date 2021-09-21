# 快速迁移 Gradle 脚本至 KTS

**Gradle Groovy Kotlin KTS**

> 接下来我们就把这个示例工程的 Gradle 脚本用 KTS 改写

==  Gradle|Groovy|Kotlin|KTS ==

/bilibili_id/BV1Kf4y1p7zq/

## 0. 准备工作

大家可以在我的 GitHub 页面找到这个工程：[bennyhuo/Android-LuaJavax: Powerful Kotlin style API for Android Lua](https://github.com/bennyhuo/Android-LuaJavax)，在提交记录当中可以看到 release 1.0 和 use kts 这两笔提交，前者使用 Groovy 编写 Gradle 脚本，后者使用 Kotlin 编写。

![提交记录](https://kotlinblog-1251218094.costj.myqcloud.com/9e300468-a645-433d-ae41-60b3eaa97f5a/media/image-20210413070200151.png)

因此，大家如果想要跟着我一起做这个小练习，只需要 clone 这个工程，并 checkout release 1.0 这笔提交记录即可，练习的最终效果也可以在 use kts 这笔记录当中呈现。

接下来我简单介绍一下我们迁移的思路：Groovy 的语法和 Kotlin 的语法虽然相差不小，但在 Gradle DSL 的设计上，还是尽可能保持了统一性，这显然也是为了降低大家的学习和迁移成本。正因为如此，尽管我们还是要对两门语言的一些语法细节进行批量处理，迁移过程实际上并不复杂。

## 1. 处理字符串字面量

我们需要修改的主要就是 settings.gradle 以及几个 build.gradle。经过之前的介绍，大家或多或少应该能了解到，Groovy 当中单引号引起来的也是字符串字面量，因此我们会面对大量这样的写法：

```groovy
include ':app',':luajava', ':luajavax'
```

显然在 Kotlin 当中这是不可以的，因此我们要想办法把字符串字面量的单引号统一改成双引号。

我们很容易地想到使用 IntelliJ IDEA 或者 Android Studio 的全局正则替换（噗，你也可能根本没听说过）：

![使用全局正则匹配替换单引号](https://kotlinblog-1251218094.costj.myqcloud.com/9e300468-a645-433d-ae41-60b3eaa97f5a/media/image-20210413072420709.png)

1. 匹配框输入正则表达式 `'(.*?[^\\])'`，替换框中填写 `"$1"`，这里的 `$1` 对应于正则表达式当中的第一个元组，如果有多个元组，可以用 `$n` 来表示，其中 `$0` 表示匹配到的整个字符
2. 过滤文件后缀，我们只对 `*.gradle` 文件做替换
3. 在文件后缀后面的漏斗当中选择 Excepts String literals and Comments，表示我们只匹配代码部分
4. 在输入框后面选择 `.*`，蓝色高亮表示启用正则匹配

你可以检查一下匹配框当中有没有错误匹配的内容，有的话，再调整一下正则表达式即可。至少在我们的这个示例当中，前面输入的这个正则表达式够用了。

至于这个正则表达式的含义，我就不多说了，你们可能也不想听（都是借口，哈哈）。

点击 Replace All，替换之后所有的单引号都就变成了双引号：

```groovy
include ":app",":luajava", ":luajavax"
```

## 2. 给方法调用加上括号

还是以 settings.gradle 当中的这句为例：

```groovy
include ":app",":luajava", ":luajavax"
```

它实际上是一个方法调用，我们提到过在 Groovy 当中，只要没有歧义，就可以把方法调用的括号去掉，但这显然在 Kotlin 当中是不行的。因此我们还需要先对他们统一做一下加括号的处理。

处理方法，这时候你们应该很自然的就能想到全局正则匹配了：

![全局正则为方法调用加括号](https://kotlinblog-1251218094.costj.myqcloud.com/9e300468-a645-433d-ae41-60b3eaa97f5a/media/image-20210413074530145.png)

在这里，匹配框输入正则表达式 `(\w+) (([^=\{\s]+)(.*))`，替换框中填写 `$1($2)`，其他配置与前面替换引号一样。

你可以检查一下有没有错误匹配的内容，如果有的话，就稍微调整一下正则表达式，或者手动对错误匹配的部分进行修改。

点击全部替换，这时候你就发现所有的方法调用都加上了括号：

```groovy
include(":app",":luajava", ":luajavax")
```

实际上通过正则表达匹配替换的做法不是完美的做法，如果想要精确识别方法调用，还是需要解析 Groovy 的语法才行，但显然那样又没有多大必要。上面给出的正则表达式当然也不是完美的，对于多行的情况就会出现比较尴尬的问题，例如

```groovy
task clean(type: Delete) {
    delete(rootProject.buildDir)
}
```

被替换成了：

```groovy
task(clean(type: Delete) {)
    delete(rootProject.buildDir)
}
```

但这些我们手动修改一下就好了，问题不大，好在这个正则表达式可以解决 90% 的问题。

## 3. 开始迁移

### 3.1 迁移 settings.gradle

迁移时，先把文件名改为 settings.gradle.kts，然后 sync gradle。

就完事儿了。因为经过前面两部操作，settings.gradle 当中的这一行代码已经是合法的 Kotlin 代码了。

### 3.2 迁移根工程下的 build.gradle

我们先贴出来原来的 groovy 版本：

```groovy
buildscript {
    ext.kotlin_version = "1.4.30"
    repositories {
        maven {
            url("https://mirrors.tencent.com/nexus/repository/maven-public/")
        }
    }
    dependencies {
        classpath("com.android.tools.build:gradle:4.0.1")
        classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:$kotlin_version")

        classpath("com.vanniktech:gradle-maven-publish-plugin:0.14.2")
        // For(Kotlin projects, you need to add Dokka.)
        classpath("org.jetbrains.dokka:dokka-gradle-plugin:0.10.1")
    }
}

subprojects {
    repositories {
        maven {
            url("https://mirrors.tencent.com/nexus/repository/maven-public/")
        }
    }
    it.afterEvaluate {
        it.with {
            if(plugins.hasPlugin("com.android.library") || plugins.hasPlugin("java-library")) {
                group = "com.bennyhuo"
                version = "1.0"

                apply(plugin: "com.vanniktech.maven.publish")

            }
        }
    }
}

task(clean(type: Delete) {
    delete(rootProject.buildDir)
})
```

那么我们开始迁移，先给文件名增加后缀 kts，sync gradle 之后开始解决我们的第一个报错：

```
e: ...\Android-Luajavax\build.gradle.kts:3:5: Unresolved reference: ext
```

说 ext 找不到。当然找不到了，因为过去我们是通过 ext 访问 project 对象的动态属性的（可以去参考前面的视频 [Project 的属性都是哪里来的？](https://mp.weixin.qq.com/s?__biz=MzIzMTYzOTYzNA==&mid=2247485130&idx=1&sn=f6240d7b0cc24523e6061e9cbeeebdc6&chksm=e8a059f7dfd7d0e16427f1c21e96ddd5099a3e88c86a7f8ed60386e5d0fb4cd35f1282817d60&token=529021163&lang=zh_CN#rd)），Groovy 的动态特性支持了这一语法，但 Kotlin 作为一门静态语言，这一做就不行了。因此如果我们想要访问 ext，就需要使用 extra 扩展，或者 `getProperties()["ext"]`，所以：

```groovy
ext.kotlin_version = "1.4.30"
```

等价于

```kotlin
extra["kotlin_version"] = "1.4.30"
```

接下来的问题就是对 kotlin_version 的访问了。与 ext 一样，我们不能直接访问，需要把它取出来再使用：

```kotlin
val kotlin_version: String by extra
...
classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:$kotlin_version")
```

有朋友肯定会说，kts 感觉不太行啊，不如 Groovy 用起来方便呢。这一点上来看，确实，毕竟我们希望 Gradle 脚本能够拥有静态语言的高亮和提示，有舍必有得嘛。实际上，我们使用 kts 编写 Gradle 时，有另外好用的办法来定义版本，这个我们后面再谈。

接下来遇到的问题应该就是 maven 的语法了，这个简单，直接修改成

```kotlin
maven("https://mirrors.tencent.com/nexus/repository/maven-public/")
```

然后，我们会看到 afterEvaluate 之处的语法有些问题，实际上我们稍微分析一下就能知道正确的写法。

以下是 Groovy 原版：

```kotlin
subprojects {
    repositories {
        maven("https://mirrors.tencent.com/nexus/repository/maven-public/")
    }
    it.afterEvaluate {
        it.with {
            if(plugins.hasPlugin("com.android.library") || plugins.hasPlugin("java-library")) {
                group = "com.bennyhuo"
                version = "1.0"

                apply(plugin: "com.vanniktech.maven.publish")

            }
        }
    }
}
```

首先 subprojects 的参数 Lambda 的 Receiver 就是 Project，因此 `it.afterEvaluate` 改成 `this.afterEvaluate`；`it.with` 在 Groovy 当中本来也是想要获取 Project 的 Receiver 的，而在这里 afterEvaluate 的参数 Lambda 自带 Project 作为 Receiver，因此直接删掉即可。

剩下的就是 `apply(plugin: "com.vanniktech.maven.publish")` 这句了，这里映射到 kts 当中之后，所有这种通过 key-value 传递的参数基本上都改成了具名参数，因此改写为：`apply(plugin = "com.vanniktech.maven.publish")`。

最后就是创建任务的代码了，其实很好改，想想我们上节的内容（[Gradle 创建 Task 的写法不是 Groovy 的标准语法吧？](https://mp.weixin.qq.com/s?__biz=MzIzMTYzOTYzNA==&mid=2247485168&idx=1&sn=13210d9865f73d6001393c1514aab99c&chksm=e8a059cddfd7d0db01dcfde5ecbe1ac2f73da73213fdd3115c983a28a2b8d7d10a5b0a8dfce2&token=529021163&lang=zh_CN#rd)），它等价于创建了一个叫 clean 的任务。我们翻一下 Gradle 的官方文档，不难看到现在创建任务的推荐使用 register，因此：

```kotlin
tasks.register<Delete>("clean") {
    delete(rootProject.buildDir)
}
```

我们注意到，在 Groovy 当中 Delete 类型是作为参数通过 Key-Value 的形式传递的，Kotlin 当中直接把它当做泛型参数传入，这样设计是非常符合 Kotlin 的设计思想的。

至此根工程下面的 build.gradle 改造完毕。

不知道大家是否发现，改造的过程其实就是一个了解过去 Groovy 写法的本意，并在查阅 Gradle 官方 API 的基础上翻译成 Kotlin 调用的过程。如果你对 Groovy 了解不多，我相信这个过程对你来说还是会有不少的困扰。

### 3.3 迁移 app 模块的 build.gradle

我们先把完整的待改造的版本贴出来：

```groovy
apply(plugin: "com.android.application")
apply(plugin: "kotlin-android")
apply(plugin: "kotlin-android-extensions")

android {
    compileSdkVersion(28)
    buildToolsVersion("28.0.3")
    defaultConfig {
        applicationId("com.bennyhuo.luajavax.sample")
        minSdkVersion(18)
        targetSdkVersion(28)
        versionCode(1)
        versionName("1.0")
    }
    buildTypes {
        release {
            minifyEnabled(true)
            signingConfig(signingConfigs.debug)
            proguardFiles(getDefaultProguardFile("proguard-android.txt"), "proguard-rules.pro")
        }
    }

    lintOptions {
        checkReleaseBuilds(false)
        // Or, if(you prefer, you can continue to check for errors in release builds,)
        // but(continue the build even when errors are found:)
        abortOnError(false)
    }
}

tasks.withType(JavaCompile) {
    options.encoding = "UTF-8"
}

dependencies {
    implementation(project(":luajavax"))
    api("org.jetbrains.kotlin:kotlin-stdlib:$kotlin_version")

    api("org.slf4j:slf4j-api:1.7.21")
    api("com.github.tony19:logback-android-core:1.1.1-6")
    api("com.github.tony19:logback-android-classic:1.1.1-6") {
        // workaround(issue #73)
        exclude(group: "com.google.android", module: "android")
    }
}
```

接下来我们给它加上 kts 后缀，并开始迁移。同样，我们通过 Gradle 的报错信息来各个击破。

首先报错的必然是开头的 apply plugin，因为不是合法的 Kotlin 语法。如果只是语法上做翻译，我们可以改成这样：

```kotlin
apply(plugin = "com.android.application")
apply(plugin = "kotlin-android")
apply(plugin = "kotlin-android-extensions")
```

但这样有个问题，通过这些插件引入的 extension 是无法直接访问的，这一点与 Groovy 有比较明显的区别。在这个例子当中，影响比较大的就是后面的 `android { ... }` 无法直接访问。具体原理可以参考前面的视频：[你的 Gradle 脚本是怎么运行起来的？](https://mp.weixin.qq.com/s?__biz=MzIzMTYzOTYzNA==&mid=2247484963&idx=1&sn=1f475e8f26b62df0c55bcf3418fb5f0a&chksm=e8a0591edfd7d0085bc1344f25613ae93aa9ef8a238dd4b01f52ca0a10d2fbb1bcefbe095c96&token=529021163&lang=zh_CN#rd)。

我们需要通过 `plugins { ... }` 来引入插件，确保在脚本运行的 classpath 阶段就能引入，方便 Gradle 帮我们合成对应的扩展。

```kotlin
//apply(plugin = "com.android.application")
//apply(plugin = "kotlin-android")
//apply(plugin = "kotlin-android-extensions")

plugins {
    id("com.android.application")
    id("kotlin-android")
    id("kotlin-android-extensions")
}
```

这样改写完之后，sync gradle，并等待 IDE 建完索引，你就会发现 `android { ... }` 可以访问了。

接下来我们看到 Gradle 报错的是 defaultConfig 部分：

```kotlin
defaultConfig {
    applicationId("com.bennyhuo.luajavax.sample") // error
    minSdkVersion(18)
    targetSdkVersion(28) 
    versionCode(1) // error
    versionName("1.0") // error
}
```

这个简单，肯定是语法细节上的差异。有了代码提示，我们一点儿都不怂：

![使用代码提示查看 applicationId 的定义](https://kotlinblog-1251218094.costj.myqcloud.com/9e300468-a645-433d-ae41-60b3eaa97f5a/media/image-20210414074737952.png)

原来 applicationId 被识别成了通过 setter 和 getter 方法合成的属性，这个我们熟悉啊，用 Kotlin 代码调用 Java 代码的时候经常会遇到。所以改成：

```kotlin
applicationId = "com.bennyhuo.luajavax.sample"
```

![使用代码提示查看 versionCode 的定义](https://kotlinblog-1251218094.costj.myqcloud.com/9e300468-a645-433d-ae41-60b3eaa97f5a/media/image-20210414074956327.png)

后面的 versionCode 和 versionName 也是如此。

接下来我们看 buildTypes 这一块儿。

![buildTypes 中的报错](https://kotlinblog-1251218094.costj.myqcloud.com/9e300468-a645-433d-ae41-60b3eaa97f5a/media/image-20210414075334467.png)

`release { ... }` 是一个方法调用，不过我们可以很确定的是，所在的作用域内的 Receiver 的类型 NamedDomainObjectContainer 没有这么个方法。而实际上我们也知道 release 其实是一种 BuildType 的名字，因此可以断定这不是一个正常的方法调用。

这时候，我们不难想到上一个视频 [Gradle 创建 Task 的写法不是 Groovy 的标准语法吧？]([Gradle 创建 Task 的写法不是 Groovy 的标准语法吧？ (qq.com)](https://mp.weixin.qq.com/s?__biz=MzIzMTYzOTYzNA==&mid=2247485168&idx=1&sn=13210d9865f73d6001393c1514aab99c&chksm=e8a059cddfd7d0db01dcfde5ecbe1ac2f73da73213fdd3115c983a28a2b8d7d10a5b0a8dfce2&token=529021163&lang=zh_CN#rd))里面讲到的的 Task 的语法的问题，不过大家想想这是 Android 的插件，Gradle 怎么会为 Android 插件的配置添加特殊语法呢？所以这里只有一个可能，它就是一个合法的 Groovy 的语法。

实际上我们在更早的时候介绍 [Project 的属性都是哪里来的？](https://mp.weixin.qq.com/s?__biz=MzIzMTYzOTYzNA==&mid=2247485130&idx=1&sn=f6240d7b0cc24523e6061e9cbeeebdc6&chksm=e8a059f7dfd7d0e16427f1c21e96ddd5099a3e88c86a7f8ed60386e5d0fb4cd35f1282817d60&token=529021163&lang=zh_CN#rd) 的时候就提到过，如果被访问的对象恰好是 **GroovyObject** 的实现类，那么对于找不到的属性，会通过 get/setProperty 来访问，而方法则是通过 **invokeMethod** 来访问。所以关键的问题来了，`release { ... }` 是调用了哪个类的 **invokeMethod** 呢？

是 `NamedDomainObjectContainerConfigureDelegate` 的。在 Groovy 版本的 Gradle 脚本当中，形如 `buildTypes { ... }` 这样的配置代码，实际上都是通过对应的 **ConfigureDelegate** 类来完成配置的，这里的细节大家可以单步调试一下看看为什么是这样。

总之，当我们在 Groovy 当中访问 buildTypes，如果这个配置已经存在，那么会走到以下逻辑：

**DefaultNamedDomainObjectCollection**

```java
public DynamicInvokeResult tryInvokeMethod(String name, Object... arguments) {
    if (isConfigureMethod(name, arguments)) {
        return DynamicInvokeResult.found(ConfigureUtil.configure((Closure) arguments[0], getByName(name)));
    }
    return DynamicInvokeResult.notFound();
}
```

release 是预定义的 BuildType，因此会走到这个逻辑。而如果我们想要自定义其他的 BuildType，那么就会走到创建 BuildType 的路径：

**NamedDomainObjectContainerConfigureDelegate**

```java
protected DynamicInvokeResult _configure(String name, Object[] params) {
    if (params.length == 1 && params[0] instanceof Closure) {
        return DynamicInvokeResult.found(_container.create(name, (Closure) params[0]));
    }
    return DynamicInvokeResult.notFound();
}
```

说了这么多，大家只需要记住对于已经存在的，可以使用 **getByName** 来获取，而不存在的，要使用 **create** 来创建。

因此改写成 Kotlin 以后，对于已经存在的 release，我们要这么写：

```kotlin
buildTypes {
    val release = getByName("release")
    release.apply {
        isMinifyEnabled = true
        signingConfig = signingConfigs.getByName("debug")
        proguardFiles(getDefaultProguardFile("proguard-android.txt"), "proguard-rules.pro")
    }
}
```

当然，Gradle 为 Kotlin 提供了更方便的 API 可以使用：

```kotlin
val release by getting {
    isMinifyEnabled = true
    signingConfig = signingConfigs.getByName("debug")
    proguardFiles(getDefaultProguardFile("proguard-android.txt"), "proguard-rules.pro")
}
```

如果需要创建一个叫 beta 的 BuildType，可以使用 creating：

```kotlin
val beta by creating {
    isMinifyEnabled = false
    signingConfig = signingConfigs.getByName("debug")
    proguardFiles(getDefaultProguardFile("proguard-android.txt"), "proguard-rules.pro")
}
```

![添加新的 BuildType：beta](https://kotlinblog-1251218094.costj.myqcloud.com/9e300468-a645-433d-ae41-60b3eaa97f5a/media/image-20210415081145080.png)

好，关于 BuildType 我们就说这么多。

接下来报错的是 lintOptions，这个比较简单，修改如下：

```kotlin
lintOptions {
    isCheckReleaseBuilds = false
    // Or, if(you prefer, you can continue to check for errors in release builds,)
    // but(continue the build even when errors are found:)
    isAbortOnError = false
}
```

再往下看，是给 Java 编译器配置了一个编码，报错的内容如下：

![通过类型获取任务的报错信息](https://kotlinblog-1251218094.costj.myqcloud.com/9e300468-a645-433d-ae41-60b3eaa97f5a/media/image-20210415080451856.png)

根据 IDE 的提示，不难想到以下的改法：

```kotlin
tasks.withType(JavaCompile::class.java) {
    options.encoding = "UTF-8"
}
```

不过我们有了前面迁移 Task 创建的经验，一猜就知道一定还可以把类型作为泛型参数：

```kotlin
tasks.withType<JavaCompile> {
    options.encoding = "UTF-8"
}
```

最后，就剩 dependencies 里面的两个小问题了，kotlin_version 访问不到的问题我们前面已经提到，后面我们给出替代方案；另一个是 exclude 方法参数的写法问题，改成具名参数，结果为：

```kotlin
dependencies {
    implementation(project(":luajavax"))
    api("org.jetbrains.kotlin:kotlin-stdlib:1.4.30") // 后续给出替代方案，这里先硬编码

    api("org.slf4j:slf4j-api:1.7.21")
    api("com.github.tony19:logback-android-core:1.1.1-6")
    api("com.github.tony19:logback-android-classic:1.1.1-6") {
        // workaround(issue #73)
        exclude(group = "com.google.android", module = "android")
    }
}
```

至此，app 模块当中的 build.gradle 迁移也已经完成。luajava 和 luajavax 两个模块的 build.gradle 是类似的，大家可以自己练习，我们就不再专门介绍。

## 4. 依赖版本号的替代方案

我们在 Groovy 版本的脚本中经常往 ext 当中添加一些值，以便于后续使用，其中最常见的场景就是依赖的管理，特别是版本号。Groovy 当中的这个动态属性固然好用，但同样的问题，我们经常在使用时搞不清楚究竟有哪些属性可以用，也经常搞不清楚属性究竟定义在了哪里。

Kotlin 就没有这个问题了，因为它的静态类型特性把这个动态读写属性的途径彻底禁止了。

### 4.1 Kotlin 风格的属性读写

尽管不能像 Groovy 那样任性，Gradle 也尽可能地为 Kotlin 提供了一些相对易用的 API 供我们使用，除了通过 `extra[...]` 的形式定义属性，还可以采用下面的方法：

```kotlin
val kotlinVersion by extra("1.4.30")
val isRelease by extra {
    getBooleanFromFile("config.properties","buidType")
}
```

这样定义之后，在当前变量所在的范围之内，还可以直接使用。

当然，在后续其他脚本当中想要使用这个属性，就还需要先把它读出来：

```kotlin
val kotlin_version: String by extra
```

### 4.2 在 buildSrc 当中定义

buildSrc 当中的代码可以直接被 Gradle 脚本访问到，我们在工程当中创建 buildSrc 目录，并在其中添加 build.gradle.kts：

```kotlin
plugins {
    `kotlin-dsl`
}

repositories {
    maven("https://mirrors.tencent.com/nexus/repository/maven-public/")
}
```

然后就可以在 src/main/kotlin 目录下编写需要的 Kotlin 代码了：

```kotlin
val kotlinVersion = "1.4.30"
val slf4jVersion = "1.7.21"
```

注意这文件没有包名，如果加了包名的话，后续脚本当中就需要导包，这个看实际情况决定是否需要。

使用也很简单：

```kotlin
dependencies {
    classpath("com.android.tools.build:gradle:4.0.1")
    classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:$kotlinVersion")
	...
}
```

buildSrc 的能力不只这么点儿了，大家有兴趣可以多多探索，也可以随时跟我交流。

## 5. 小结

迁移的过程基本上就是 Groovy 与 Kotlin 语法的对照，所以需要大家对 Groovy 和 Kotlin 多少都要有些了解。视频讲这么细目的也是让大家知其然知其所以然，但如果只是单纯想要做个快速的迁移，可以试试 [bernaferrari/GradleKotlinConverter](https://github.com/bernaferrari/GradleKotlinConverter) 这个项目，其实它的原理就是正则表达式匹配和替换。

本来只是想做这样一个迁移的例子，没想到发散出这么多话题。整个过程当中我其实也发现了一些过去不知道的细节，还是非常有趣的。

希望对大家有帮助。谢谢大家。