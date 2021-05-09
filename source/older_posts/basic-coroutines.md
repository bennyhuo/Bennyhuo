# 破解 Kotlin 协程(1) - 入门篇

**Kotlin 协程 入门**

> 假定你对协程（Coroutine）一点儿都不了解，通过阅读本文看看是否能让你明白协程是怎么一回事。

## 1. 引子

我之前写过一些协程的文章，很久以前了。那会儿还是很痛苦的，毕竟 [kotlinx.coroutines](https://github.com/Kotlin/kotlinx.coroutines) 这样强大的框架还在襁褓当中，于是乎我写的几篇协程的文章几乎就是在告诉大家如何写这样一个框架——那种感觉简直糟糕透了，因为没有几个人会有这样的需求。

这次准备从协程用户（也就是程序员你我他啦）的角度来写一下，希望对大家能有帮助。

## 2. 需求确认

在开始讲解协程之前，我们需要先确认几件事儿：

1. 你用过线程对吧？
2. 你写过回调对吧？
3. 你用过 RxJava 类似的框架吗？

看下你的答案：

* 如果上面的问题的回答都是 “Yes”，那么太好了，这篇文章非常适合你，因为你已经意识到回调有多么可怕，并且找到了解决方案；
* 如果前两个是 “Yes”，没问题，至少你已经开始用回调了，你是协程潜在的用户；
* 如果只有第一个是 “Yes”，那么，可能你刚刚开始学习线程，那你还是先打好基础再来吧~


## 3. 一个常规例子

我们通过 Retrofit 发送一个网络请求，其中接口如下：

```kotlin
interface GitHubServiceApi {
    @GET("users/{login}")
    fun getUser(@Path("login") login: String): Call<User>
}

data class User(val id: String, val name: String, val url: String)
```

Retrofit 初始化如下：

```kotlin
val gitHubServiceApi by lazy {
    val retrofit = retrofit2.Retrofit.Builder()
            .baseUrl("https://api.github.com")
            .addConverterFactory(GsonConverterFactory.create())
            .build()

    retrofit.create(GitHubServiceApi::class.java)
}
```

那么我们请求网络时：

```kotlin
gitHubServiceApi.getUser("bennyhuo").enqueue(object : Callback<User> {
    override fun onFailure(call: Call<User>, t: Throwable) {
        handler.post { showError(t) }
    }

    override fun onResponse(call: Call<User>, response: Response<User>) {
        handler.post { response.body()?.let(::showUser) ?: showError(NullPointerException()) }
    }
})
```

请求结果回来之后，我们切换线程到 UI 线程来展示结果。这类代码大量存在于我们的逻辑当中，它有什么问题呢？

* 通过 Lambda 表达式，我们让线程切换变得不是那么明显，但它仍然存在，一旦开发者出现遗漏，这里就会出现问题
* 回调嵌套了两层，看上去倒也没什么，但真实的开发环境中逻辑一定比这个复杂的多，例如登录失败的重试
* 重复或者分散的异常处理逻辑，在请求失败时我们调用了一次 `showError`，在数据读取失败时我们又调用了一次，真实的开发环境中可能会有更多的重复

Kotlin 本身的语法已经让这段代码看上去好很多了，如果用 Java 写的话，你的直觉都会告诉你：你在写 Bug。

> 如果你不是 Android 开发者，那么你可能不知道 handler 是什么东西，没关系，你可以替换为 `SwingUtilities.invokeLater{ ... }` (Java Swing)，或者 `setTimeout({ ... }, 0)` (Js) 等等。

## 4. 改造成协程

你当然可以改造成 RxJava 的风格，但 RxJava 比协程抽象多了，因为除非你熟练使用那些 operator，不然你根本不知道它在干嘛（试想一下 `retryWhen`）。协程就不一样了，毕竟编译器加持，它可以很简洁的表达出代码的逻辑，不要想它背后的实现逻辑，它的运行结果就是你直觉告诉你的那样。

对于 Retrofit，改造成协程的写法，有两种，分别是通过 CallAdapter 和 suspend 函数。

### 4.1 CallAdapter 的方式

我们先来看看 CallAdapter 的方式，这个方式的本质是让接口的方法返回一个协程的 Job：

```kotlin
interface GitHubServiceApi {
    @GET("users/{login}")
    fun getUser(@Path("login") login: String): Deferred<User>
}
```

> 注意 Deferred 是 Job 的子接口。

那么我们需要为 Retrofit 添加对 `Deferred` 的支持，这需要用到开源库：

```gradle
implementation 'com.jakewharton.retrofit:retrofit2-kotlin-coroutines-adapter:0.9.2'
```

构造 Retrofit 实例时添加：

```kotlin
val gitHubServiceApi by lazy {
    val retrofit = retrofit2.Retrofit.Builder()
            .baseUrl("https://api.github.com")
            .addConverterFactory(GsonConverterFactory.create())
            //添加对 Deferred 的支持
            .addCallAdapterFactory(CoroutineCallAdapterFactory())
            .build()

    retrofit.create(GitHubServiceApi::class.java)
}
```

那么这时候我们发起请求就可以这么写了：

```kotlin
GlobalScope.launch(Dispatchers.Main) {
    try {
        showUser(gitHubServiceApi.getUser("bennyhuo").await())
    } catch (e: Exception) {
        showError(e)
    }
}
```

>说明： `Dispatchers.Main` 在不同的平台上的实现不同，如果在 Android 上为 `HandlerDispatcher`，在 Java Swing 上为 `SwingDispatcher` 等等。

首先我们通过 `launch` 启动了一个协程，这类似于我们启动一个线程，`launch` 的参数有三个，依次为协程上下文、协程启动模式、协程体：

```kotlin
public fun CoroutineScope.launch(
    context: CoroutineContext = EmptyCoroutineContext, // 上下文
    start: CoroutineStart = CoroutineStart.DEFAULT,  // 启动模式
    block: suspend CoroutineScope.() -> Unit // 协程体
): Job 
```

**启动模式**不是一个很复杂的概念，不过我们暂且不管，默认直接允许调度执行。

**上下文**可以有很多作用，包括携带参数，拦截协程执行等等，多数情况下我们不需要自己去实现上下文，只需要使用现成的就好。上下文有一个重要的作用就是线程切换，`Dispatchers.Main` 就是一个官方提供的上下文，它可以确保 `launch` 启动的协程体运行在 UI 线程当中（除非你自己在 `launch` 的协程体内部进行线程切换、或者启动运行在其他有线程切换能力的上下文的协程）。

换句话说，在例子当中整个 `launch` 内部**你看到的代码**都是运行在 UI 线程的，尽管 `getUser` 在执行的时候确实切换了线程，但返回结果的时候会再次切回来。这看上去有些费解，因为直觉告诉我们，`getUser` 返回了一个 `Deferred` 类型，它的 `await` 方法会返回一个 `User` 对象，意味着 `await` 需要等待请求结果返回才可以继续执行，那么 `await` 不会阻塞 UI 线程吗？

答案是：不会。当然不会，不然那 `Deferred` 与 `Future` 又有什么区别呢？这里 `await` 就很可疑了，因为它实际上是一个 suspend 函数，这个函数只能在协程体或者其他 suspend 函数内部被调用，它就像是回调的语法糖一样，它通过一个叫 `Continuation` 的接口的实例来返回结果：

```kotlin
@SinceKotlin("1.3")
public interface Continuation<in T> {
    public val context: CoroutineContext
    public fun resumeWith(result: Result<T>)
}
```

1.3 的源码其实并不是很直接，尽管我们可以再看下 `Result` 的源码，但我不想这么做。更容易理解的是之前版本的源码：

```kotlin
@SinceKotlin("1.1")
public interface Continuation<in T> {
    public val context: CoroutineContext
    public fun resume(value: T)
    public fun resumeWithException(exception: Throwable)
}
```

相信大家一下就能明白，这其实就是个回调嘛。如果还不明白，那就对比下 Retrofit 的 `Callback`：

```java
public interface Callback<T> {
  void onResponse(Call<T> call, Response<T> response);
  void onFailure(Call<T> call, Throwable t);
}
```

有结果正常返回的时候，`Continuation` 调用 `resume` 返回结果，否则调用 `resumeWithException` 来抛出异常，简直与 `Callback` 一模一样。

所以这时候你应该明白，这段代码的执行流程本质上是一个异步回调：

```kotlin
GlobalScope.launch(Dispatchers.Main) {
    try {
        //showUser 在 await 的 Continuation 的回调函数调用后执行
        showUser(gitHubServiceApi.getUser("bennyhuo").await())
    } catch (e: Exception) {
        showError(e)
    }
}
```
而代码之所以可以看起来是同步的，那就是编译器的黑魔法了，你当然也可以叫它“语法糖”。

这时候也许大家还是有问题：我并没有看到 `Continuation` 啊，没错，这正是我们前面说的编译器黑魔法了，在 Java 虚拟机上，`await` 这个方法的签名其实并不像我们看到的那样：

```kotlin
public suspend fun await(): T
```

它真实的签名其实是：

```java
kotlinx/coroutines/Deferred.await (Lkotlin/coroutines/Continuation;)Ljava/lang/Object;
```

即接收一个 `Continuation` 实例，返回 `Object` 的这么个函数，所以前面的代码我们可以大致理解为：

```kotlin
//注意以下不是正确的代码，仅供大家理解协程使用
GlobalScope.launch(Dispatchers.Main) {
    gitHubServiceApi.getUser("bennyhuo").await(object: Continuation<User>{
            override fun resume(value: User) {
                showUser(value)
            }
            override fun resumeWithException(exception: Throwable){
                showError(exception)
            }
    })
}
```

而在 `await` 当中，大致就是：

```kotlin
//注意以下并不是真实的实现，仅供大家理解协程使用
fun await(continuation: Continuation<User>): Any {
    ... // 切到非 UI 线程中执行，等待结果返回
    try {
        val user = ...
        handler.post{ continuation.resume(user) }
    } catch(e: Exception) {
        handler.post{ continuation.resumeWithException(e) }
    }
}
```

这样的回调大家一看就能明白。讲了这么多，请大家记住一点：从执行机制上来讲，协程跟回调没有什么本质的区别。

### 4.2 suspend 函数的方式

suspend 函数是 Kotlin 编译器对协程支持的唯一的黑魔法（表面上的，还有其他的我们后面讲原理的时候再说）了，我们前面已经通过 `Deferred` 的 `await` 方法对它有了个大概的了解，我们再来看看 Retrofit 当中它还可以怎么用。

> Retrofit 当前的 release 版本是 2.5.0，还不支持 suspend 函数。因此想要尝试下面的代码，需要最新的 Retrofit 源码的支持；当然，也许你看到这篇文章的时候，Retrofit 的新版本已经支持这一项特性了呢。

首先我们修改接口方法：

```kotlin
@GET("users/{login}")
suspend fun getUser(@Path("login") login: String): User
```

这种情况 Retrofit 会根据接口方法的声明来构造 `Continuation`，并且在内部封装了 `Call` 的异步请求（使用 enqueue），进而得到 `User` 实例，具体原理后面我们有机会再介绍。使用方法如下：

```kotlin
GlobalScope.launch {
    try {
        showUser(gitHubServiceApi.getUser("bennyhuo"))
    } catch (e: Exception) {
        showError(e)
    }
}
```

它的执行流程与 `Deferred.await` 类似，我们就不再详细分析了。

## 5. 协程到底是什么

好，坚持读到这里的朋友们，你们一定是异步代码的“受害者”，你们肯定遇到过“回调地狱”，它让你的代码可读性急剧降低；也写过大量复杂的异步逻辑处理、异常处理，这让你的代码重复逻辑增加；因为回调的存在，还得经常处理线程切换，这似乎并不是一件难事，但随着代码体量的增加，它会让你抓狂，线上上报的异常因线程使用不当导致的可不在少数。

而**协程**可以帮你优雅的处理掉这些。

协程本身是一个脱离语言实现的概念，我们“很严谨”（哈哈）的给出维基百科的定义：

> Coroutines are computer program components that generalize subroutines for non-preemptive multitasking, by allowing execution to be suspended and resumed. Coroutines are well-suited for implementing familiar program components such as cooperative tasks, exceptions, event loops, iterators, infinite lists and pipes.

简单来说就是，协程是一种非抢占式或者说协作式的计算机程序并发调度的实现，程序可以主动挂起或者恢复执行。这里还是需要有点儿操作系统的知识的，我们在 Java 虚拟机上所认识到的线程大多数的实现是映射到内核的线程的，也就是说线程当中的代码逻辑在线程抢到 CPU 的时间片的时候才可以执行，否则就得歇着，当然这对于我们开发者来说是透明的；而经常听到所谓的协程更轻量的意思是，协程并不会映射成内核线程或者其他这么重的资源，它的调度在用户态就可以搞定，任务之间的调度并非抢占式，而是协作式的。

> 关于并发和并行：正因为 CPU 时间片足够小，因此即便一个单核的 CPU，也可以给我们营造多任务同时运行的假象，这就是所谓的“并发”。并行才是真正的同时运行。并发的话，更像是 Magic。

如果大家熟悉 Java 虚拟机的话，就想象一下 Thread 这个类到底是什么吧，为什么它的 run 方法会运行在另一个线程当中呢？谁负责执行这段代码的呢？显然，咋一看，Thread 其实是一个对象而已，run 方法里面包含了要执行的代码——仅此而已。协程也是如此，如果你只是看标准库的 API，那么就太抽象了，但我们开篇交代了，学习协程不要上来去接触标准库，[kotlinx.coroutines](https://github.com/Kotlin/kotlinx.coroutines) 框架才是我们用户应该关心的，而这个框架里面对应于 Thread 的概念就是 Job 了，大家可以看下它的定义：

```kotlin
public interface Job : CoroutineContext.Element {
    ...
    public val isActive: Boolean
    public val isCompleted: Boolean
    public val isCancelled: Boolean

    public fun start(): Boolean
    public fun cancel(cause: CancellationException? = null)
    public suspend fun join()
    ...
}
```

我们再来看看 Thread 的定义：

```java
public class Thread implements Runnable {
    ...    
    public final native boolean isAlive();
    public synchronized void start() { ... }
    @Deprecated
    public final void stop() { ... }
    public final void join() throws InterruptedException  { ... }
    ...
}
```
这里我们非常贴心的省略了一些注释和不太相关的接口。我们发现，Thread 与 Job 基本上功能一致，它们都承载了一段代码逻辑（前者通过 run 方法，后者通过构造协程用到的 Lambda 或者函数），也都包含了这段代码的运行状态。

而真正调度时二者才有了本质的差异，具体怎么调度，我们只需要知道调度结果就能很好的使用它们了。

## 6. 小结

我们先通过例子来引入，从大家最熟悉的代码到协程的例子开始，演化到协程的写法，让大家首先能从感性上对协程有个认识，最后我们给出了协程的定义，也告诉大家协程究竟能做什么。

这篇文章没有追求什么内部原理，只是企图让大家对协程怎么用有个第一印象。如果大家仍然感觉到迷惑，不怕，后面我将再用几篇文章从例子入手来带着大家分析协程的运行，而原理的分析，会放到大家能够熟练掌握协程之后再来探讨。

