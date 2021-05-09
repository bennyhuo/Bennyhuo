---
title: 也许你需要这个为数据类生成 DeepCopy 方法的库
date: 2018/12/02
tags:
  - Kotlin
  - dataclass
---

前不久 JetBrains 在北京搞了一次技术大会，我在演讲当中提到了一个叫 DeepCopy 的库，那么我们今天就来详细说说它。

<!--more-->

## 我们有什么拷贝的需求？

我们知道 Kotlin 的 data class 出厂自带了一套 `copy` 方法，这个 `copy` 方法呢，就是实打实的一个浅拷贝，例如：

```kotlin
data class GitUser(val name: String)
```
它的 `copy` 方法其实就相当于：

```kotlin
data class GitUser(val name: String) {
    fun copy(name: String = this.name) = GitUser(name)
}
```

如果成员是 `val` 那倒也还好，可如果是另一个数据类呢？

```kotlin
data class GitUser(val name: String)
data class Project(val name: String)
data class Owner(val gitUser: GitUser, val project: Project)
```

我们如果需要 `copy` 一下 `Owner` 的话，我们就会发现新实例与旧实例共享了 `GitUser` 和 `Project` 的实例，万一项目的名称是可以改的：

```kotlin
data class Project(var name: String)
```

新实例的 `project` 的名称我想更改一下，结果发现老实例的也被改了。

所以你需要一个 DeepCopy 的方法：

```kotlin
data class Owner(val gitUser: GitUser, val project: Project){
    fun deepCopy(gitUser: GitUser = this.gitUser, project: Project = this.project): Owner {
        return Owner(gitUser.copy(), project.copy())
    }
}
```

你这时候想，虽然 `GitUser` 和 `Project` 这两个数据类内部的字段都是基本类型，用 `copy` 进行复制似乎也问题不大，可如果它们的成员当中也存在数据类呢？所以，你需要为每一个数据类定制一个 `deepCopy` 方法。。。

## 来来来，先实现个简单的

天哪。那岂不是要写死了。

不过问题不大，我们总是会想办法让编译器或者运行时来帮我们搞定一切，于是我想到了要不要写个 Kotlin 的编译期插件呢，正巧 KotlinConf 也有人分享了一下这个话题，不过由于目前这套机制还没有正式开放，就算我写了你们也不敢用，更何况我还不会写呢ψ(｀∇´)ψ

于是我想到了最简单的，用反射！用反射再配合 Kotlin 最优秀的特性之一的扩展方法，我们就可以为所有的类无缝提供一个 `deepCopy` 的扩展方法，当然，我们的目标是为数据类服务，所以其他类调用这个方法我们一概直接返回(～￣▽￣)～

```kotlin
fun <T : Any> T.deepCopy(): T {
    //①判断是否为数据类，不是的话直接返回
    if (!this::class.isData) {
        return this
    }
    //②数据类一定有主构造器，不用怕，这里放心使用 !! 来转为非空类型
    return this::class.primaryConstructor!!.let { primaryConstructor ->
        primaryConstructor.parameters
            .map { parameter ->
                val value =
                    (this::class as KClass<T>).declaredMemberProperties.first { it.name == parameter.name }.get(this)
                //③如果主构造器参数类型为数据类，递归调用
                if ((parameter.type.classifier as? KClass<*>)?.isData == true) {
                    parameter to value?.deepCopy()
                } else {
                    parameter to value
                }
            }
            .toMap()
            .let(primaryConstructor::callBy)
    }
}
```

看上去很简单吧！正好秀一波反射的肌肉(￣▽￣)~* 

其实反射还真挺简单的，不会反射的小伙伴们也不要害怕，现在大家都觉得反射有性能问题而不敢用，不会就不会吧(╯°□°）╯︵┻━┻
 
这个库我已经扔到 jcenter，因此你可以通过添加依赖来使用它：

```gradle
compile 'com.bennyhuo.kotlin:deepcopy-reflect:1.1.0'
```

当然，这里由于是运行时才知道类型的构造器参数列表，因此没办法添加默认参数。但注解处理器可以呀，不信你瞧——

## 来我们再试试注解处理器

注解处理器实现理论上是可以的。额，实际上当然也是可以的，不然这在 JetBrains 大会上讲过的东西要是不行的话，我可丢不起那人。。。

不过有些细节需要注意，我们在 Java 编译期的角度是无法认知哪些是数据类的，也没有什么所谓的主构造器一说，所以我们需要通过 `Metadata` 来获取到这些信息。

读取 `Metadata` 需要用到下面这个框架，其实 Kotlin 反射跟这个原理一样，不同之处在于反射在运行时读取，我们则在编译时读取：

``` gradle
compile "org.jetbrains.kotlinx:kotlinx-metadata-jvm:0.0.4"
```

读取的方法我就不细说啦，后面我会提供源码，大家有兴趣可以花两分钟详细阅读下ヽ(；´Д｀)ﾉ

需要提一句的是，我们通过注解处理器生成的 `deepCopy` 可以添加默认参数，这里有不少细节需要处理，也是得益于 `Metadata` 的信息。

下面给大家看看例子吧：

首先添加依赖，配置注解处理器：

```gradle
repositories {
    jcenter()
    //kotlinx-metadata-jvm 目前部署到了这个仓库
    maven { url "https://kotlin.bintray.com/kotlinx/" }
}

...
apply plugin: "kotlin-kapt"
...

dependencies {
    kapt 'com.bennyhuo.kotlin:deepcopy-compiler:1.1.0'
    compile 'com.bennyhuo.kotlin:deepcopy-annotations:1.1.0'
}
```

接着为我们的数据类配置注解：

```kotlin
@DeepCopy
data class GitUser(val name: String)

@DeepCopy
data class Project(val name: String)

@DeepCopy
data class Owner(val gitUser: GitUser, val project: Project)
```

build 一下，生成了下面的扩展函数：

```kotlin
fun Owner.deepCopy(gitUser: GitUser = this.gitUser, project: Project = this.project): Owner =
    Owner(gitUser.deepCopy(), project.deepCopy()) 
```

我们看到，这已经跟出厂自带的 `copy` 很像了，不同之处就是我们会递归的检查哪些数据类被标注为 `DeepCopy`，如果标注，就递归调用对应的 `deepCopy` 函数。

其实如果不添加默认值，这个注解处理器非常容易写的，因为它不需要处理泛型，不需要处理与 Java 的类型映射，也不需要处理别名，一气呵成，就像这样：

```kotlin
fun Owner.deepCopy(): Owner = Owner(gitUser.deepCopy(), project.deepCopy()) 
```

可是一旦加上了默认值，那就意味着我们需要为函数添加参数，那么我们就需要搞清楚参数的类型，是否协变，等等。但仍然问题不大，经过一下午的折腾（耽误了我看 KPL 季后赛了都），我们支持了参数类型有泛型实参，形参，星投影，甚至泛型参数嵌套，型变，例如：

```kotlin
@DeepCopy
data class GenericParameter(val map: HashMap<String, List<String>>)

@DeepCopy
data class GenericParameterT<K: Number, V>(val map: HashMap<K, V>)

@DeepCopy
data class StarProjection(val map: List<Map<*, String>>)

@DeepCopy
data class Variances1(val map: HashMap<String, out List<Number>>)
```

如果还有哪些情况没有覆盖到，那么尽管给我开 Issue 就好啦。


## 项目详情

这个项目在 11月17日的 JetBrains 大会上我已经提到过了，项目在 Github 上，地址：[https://github.com/enbandari/KotlinDeepCopy](https://github.com/enbandari/KotlinDeepCopy)，我知道公众号没法点地址，因此点击阅读原文，就可以很方便的找到它。

别犹豫了，Star 一波吧，千万别手软。

---
转载请注明出处：微信公众号 Kotlin

![](https://kotlinblog-1251218094.costj.myqcloud.com/80f29e08-11ff-4c47-a6d1-6c4a4ae08ae8/arts/Kotlin.jpg)


