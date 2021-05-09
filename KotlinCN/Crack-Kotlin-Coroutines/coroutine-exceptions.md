
# 破解 Kotlin 协程(4) - 异常处理篇 

>本文转自 **Bennyhuo 的博客**
>
>原文地址：https://www.bennyhuo.com/2019/04/23/coroutine-exceptions/

---

**关键词：Kotlin 协程 异常处理**

> 异步代码的异常处理通常都比较让人头疼，而协程则再一次展现了它的威力。 



我们在前面一篇文章当中提到了这样一个例子：

```kotlin
typealias Callback = (User) -> Unit

fun getUser(callback: Callback){
    ...
}
```

我们通常会定义这样的回调接口来实现异步数据的请求，我们可以很方便的将它转换成协程的接口：

```kotlin
suspend fun getUserCoroutine() = suspendCoroutine<User> {
    continuation ->
    getUser {
        continuation.resume(it)
    }
}
```

并最终交给按钮点击事件或者其他事件去触发这个异步请求：

```kotlin
getUserBtn.setOnClickListener {
    GlobalScope.launch(Dispatchers.Main) {
        userNameView.text = getUserCoroutine().name
    }
}
```

那么问题来了，既然是请求，总会有失败的情形，而我们这里并没有对错误的处理，接下来我们就完善这个例子。

## 2. 添加异常处理逻辑

首先我们加上异常回调接口函数：

```kotlin
interface Callback<T> {
    fun onSuccess(value: T)

    fun onError(t: Throwable)
}
```

接下来我们在改造一下我们的 `getUserCoroutine`：

```kotlin
suspend fun getUserCoroutine() = suspendCoroutine<User> { continuation ->
    getUser(object : Callback<User> {
        override fun onSuccess(value: User) {
            continuation.resume(value)
        }

        override fun onError(t: Throwable) {
            continuation.resumeWithException(t)
        }
    })
}
```

大家可以看到，我们似乎就是完全把 `Callback` 转换成了一个 `Continuation`，在调用的时候我们只需要：

```kotlin
GlobalScope.launch(Dispatchers.Main) {
    try {
        userNameView.text = getUserCoroutine().name
    } catch (e: Exception) {
        userNameView.text = "Get User Error: $e"
    }
}
```

是的，你没看错，一个异步的请求异常，我们只需要在我们的代码中捕获就可以了，这样做的好处就是，请求的全流程异常都可以在一个 `try ... catch ... ` 当中捕获，那么我们可以说真正做到了把异步代码变成了同步的写法。

如果你一直在用 RxJava 处理这样的逻辑，那么你的请求接口可能是这样的：

```kotlin
fun getUserObservable(): Single<User> {
    return Single.create<User> { emitter ->
        getUser(object : Callback<User> {
            override fun onSuccess(value: User) {
                emitter.onSuccess(value)
            }

            override fun onError(t: Throwable) {
                emitter.onError(t)
            }
        })
    }
}
```

调用时大概是这样的：

```kotlin
getUserObservable()
        .observeOn(AndroidSchedulers.mainThread())
        .subscribe ({ user ->
            userNameView.text = user.name
        }, {
            userNameView.text = "Get User Error: $it"
        })
```

其实你很容易就能发现在这里 RxJava 做的事儿跟协程的目的是一样的，只不过协程用了一种更自然的方式。

> 也许你已经对 RxJava 很熟悉并且感到很自然，但相比之下，RxJava 的代码比协程的复杂度更高，更让人费解，这一点我们后面的文章中也会持续用例子来说明这一点。

## 3. 全局异常处理

线程也好、RxJava 也好，都有全局处理异常的方式，例如：

```kotlin
fun main() {
    Thread.setDefaultUncaughtExceptionHandler {t: Thread, e: Throwable ->
        //handle exception here
        println("Thread '${t.name}' throws an exception with message '${e.message}'")
    }

    throw ArithmeticException("Hey!")
}
```

我们可以为线程设置全局的异常捕获，当然也可以为 RxJava 来设置全局异常捕获：

```kotlin
RxJavaPlugins.setErrorHandler(e -> {
        //handle exception here
        println("Throws an exception with message '${e.message}'")
});
```

协程显然也可以做到这一点。类似于通过 `Thread.setUncaughtExceptionHandler` 为线程设置一个异常捕获器，我们也可以为每一个协程单独设置 `CoroutineExceptionHandler`，这样协程内部未捕获的异常就可以通过它来捕获：

```kotlin
private suspend fun main(){
    val exceptionHandler = CoroutineExceptionHandler { coroutineContext, throwable ->
        log("Throws an exception with message: ${throwable.message}")
    }

    log(1)
    GlobalScope.launch(exceptionHandler) {
        throw ArithmeticException("Hey!")
    }.join()
    log(2)
}
```

运行结果：

```
19:06:35:087 [main] 1
19:06:35:208 [DefaultDispatcher-worker-1 @coroutine#1] Throws an exception with message: Hey!
19:06:35:211 [DefaultDispatcher-worker-1 @coroutine#1] 2
```

`CoroutineExceptionHandler` 竟然也是一个上下文，协程的这个上下文可真是灵魂一般的存在，这倒是一点儿也不让人感到意外。

当然，这并不算是一个全局的异常捕获，因为它只能捕获对应协程内未捕获的异常，如果你想做到真正的全局捕获，在 Jvm 上我们可以自己定义一个捕获类实现：

```kotlin
class GlobalCoroutineExceptionHandler: CoroutineExceptionHandler {
    override val key: CoroutineContext.Key<*> = CoroutineExceptionHandler

    override fun handleException(context: CoroutineContext, exception: Throwable) {
        println("Coroutine exception: $exception")
    }
}
```

然后在 classpath 中创建 META-INF/services/kotlinx.coroutines.CoroutineExceptionHandler，文件名实际上就是 `CoroutineExceptionHandler` 的全类名，文件内容就写我们的实现类的全类名：

```
com.bennyhuo.coroutines.sample2.exceptions.GlobalCoroutineExceptionHandler
```

这样协程中没有被捕获的异常就会最终交给它处理。

> Jvm 上全局 `CoroutineExceptionHandler` 的配置，本质上是对 `ServiceLoader` 的应用，之前我们在讲 `Dispatchers.Main` 的时候提到过，Jvm 上它的实现也是通过 `ServiceLoader` 来加载的。

需要明确的一点是，通过 `async` 启动的协程出现未捕获的异常时会忽略 `CoroutineExceptionHandler`，这与 `launch` 的设计思路是不同的。

## 4. 异常传播

异常传播还涉及到协程作用域的概念，例如我们启动协程的时候一直都是用的 `GlobalScope`，意味着这是一个独立的顶级协程作用域，此外还有 `coroutineScope { ... }` 以及 `supervisorScope { ... }`。

* 通过 GlobeScope 启动的协程单独启动一个协程作用域，内部的子协程遵从默认的作用域规则。通过 GlobeScope 启动的协程“自成一派”。
* coroutineScope 是继承外部 Job 的上下文创建作用域，在其内部的取消操作是双向传播的，子协程未捕获的异常也会向上传递给父协程。它更适合一系列对等的协程并发的完成一项工作，任何一个子协程异常退出，那么整体都将退出，简单来说就是”一损俱损“。这也是协程内部再启动子协程的默认作用域。
* supervisorScope 同样继承外部作用域的上下文，但其内部的取消操作是单向传播的，父协程向子协程传播，反过来则不然，这意味着子协程出了异常并不会影响父协程以及其他兄弟协程。它更适合一些独立不相干的任务，任何一个任务出问题，并不会影响其他任务的工作，简单来说就是”自作自受“，例如 UI，我点击一个按钮出了异常，其实并不会影响手机状态栏的刷新。需要注意的是，supervisorScope 内部启动的子协程内部再启动子协程，如无明确指出，则遵守默认作用域规则，也即 supervisorScope 只作用域其直接子协程。

这么说还是比较抽象，因此我们拿一些例子来分析一下：

```kotlin
suspend fun main() {
    log(1)
    try {
        coroutineScope { //①
            log(2)
            launch { // ②
                log(3)
                launch { // ③ 
                    log(4)
                    delay(100)
                    throw ArithmeticException("Hey!!")
                }
                log(5)
            }
            log(6)
            val job = launch { // ④
                log(7)
                delay(1000)
            }
            try {
                log(8)
                 job.join()
                log("9")
            } catch (e: Exception) {
                log("10. $e")
            }
        }
        log(11)
    } catch (e: Exception) {
        log("12. $e")
    }
    log(13)
}
```

这例子稍微有点儿复杂，但也不难理解，我们在一个 `coroutineScope` 当中启动了两个协程 ②④，在 ② 当中启动了一个子协程 ③，作用域直接创建的协程记为①。那么 ③ 当中抛异常会发生什么呢？我们先来看下输出：

```
11:37:36:208 [main] 1
11:37:36:255 [main] 2
11:37:36:325 [DefaultDispatcher-worker-1] 3
11:37:36:325 [DefaultDispatcher-worker-1] 5
11:37:36:326 [DefaultDispatcher-worker-3] 4
11:37:36:331 [main] 6
11:37:36:336 [DefaultDispatcher-worker-1] 7
11:37:36:336 [main] 8
11:37:36:441 [DefaultDispatcher-worker-1] 10. kotlinx.coroutines.JobCancellationException: ScopeCoroutine is cancelling; job=ScopeCoroutine{Cancelling}@2bc92d2f
11:37:36:445 [DefaultDispatcher-worker-1] 12. java.lang.ArithmeticException: Hey!!
11:37:36:445 [DefaultDispatcher-worker-1] 13
```

注意两个位置，一个是 10，我们调用 `join`，收到了一个取消异常，在协程当中支持取消的操作的suspend方法在取消时会抛出一个 `CancellationException`，这类似于线程中对 `InterruptException` 的响应，遇到这种情况表示 `join` 调用所在的协程已经被取消了，那么这个取消究竟是怎么回事呢？

原来协程 ③ 抛出了未捕获的异常，进入了异常完成的状态，它与父协程 ② 之间遵循默认的作用域规则，因此 ③ 会通知它的父协程也就是 ② 取消，② 根据作用域规则通知父协程 ① 也就是整个作用域取消，这是一个自下而上的一次传播，这样身处 ① 当中的 `job.join` 调用就会抛异常，也就是 10 处的结果了。如果不是很理解这个操作，想一下我们说到的，`coroutineScope` 内部启动的协程就是“一损俱损”。实际上由于父协程 ① 被取消，协程④ 也不能幸免，如果大家有兴趣的话，也可以对 ④ 当中的 `delay`进行捕获，一样会收获一枚取消异常。

还有一个位置就是 12，这个是我们对 `coroutineScope` 整体的一个捕获，如果 `coroutineScope` 内部以为异常而结束，那么我们是可以对它直接 `try ... catch ...` 来捕获这个异常的，这再一次表明协程把异步的异常处理到同步代码逻辑当中。 

那么如果我们把 `coroutineScope` 换成 `supervisorScope`，其他不变，运行结果会是怎样呢？

```
11:52:48:632 [main] 1
11:52:48:694 [main] 2
11:52:48:875 [main] 6
11:52:48:892 [DefaultDispatcher-worker-1 @coroutine#1] 3
11:52:48:895 [DefaultDispatcher-worker-1 @coroutine#1] 5
11:52:48:900 [DefaultDispatcher-worker-3 @coroutine#3] 4
11:52:48:905 [DefaultDispatcher-worker-2 @coroutine#2] 7
11:52:48:907 [main] 8
Exception in thread "DefaultDispatcher-worker-3 @coroutine#3" java.lang.ArithmeticException: Hey!!
	at com.bennyhuo.coroutines.sample2.exceptions.ScopesKt$main$2$1$1.invokeSuspend(Scopes.kt:17)
	at kotlin.coroutines.jvm.internal.BaseContinuationImpl.resumeWith(ContinuationImpl.kt:33)
	at kotlinx.coroutines.DispatchedTask.run(Dispatched.kt:238)
	at kotlinx.coroutines.scheduling.CoroutineScheduler.runSafely(CoroutineScheduler.kt:594)
	at kotlinx.coroutines.scheduling.CoroutineScheduler.access$runSafely(CoroutineScheduler.kt:60)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.run(CoroutineScheduler.kt:742)
11:52:49:915 [DefaultDispatcher-worker-3 @coroutine#2] 9
11:52:49:915 [DefaultDispatcher-worker-3 @coroutine#2] 11
11:52:49:915 [DefaultDispatcher-worker-3 @coroutine#2] 13
```

我们可以看到，1-8 的输出其实没有本质区别，顺序上的差异是线程调度的前后造成的，并不会影响协程的语义。差别主要在于 9 与 10、11与12的区别，如果把 scope 换成 `supervisorScope`，我们发现 ③ 的异常并没有影响作用域以及作用域内的其他子协程的执行，也就是我们所说的“自作自受”。

这个例子其实我们再稍做一些改动，为 ② 和 ③ 增加一个 `CoroutineExceptionHandler`，就可以证明我们前面提到的另外一个结论：

首先我们定义一个 `CoroutineExceptionHandler`，我们通过上下文获取一下异常对应的协程的名字：

```kotlin
val exceptionHandler = CoroutineExceptionHandler { coroutineContext, throwable ->
    log("${coroutineContext[CoroutineName]} $throwable")
}
```

接着，基于前面的例子我们为 ② 和 ③ 添加 `CoroutineExceptionHandler` 和名字：

```kotlin
...
supervisorScope { //①
    log(2)
    launch(exceptionHandler + CoroutineName("②")) { // ②
        log(3)
        launch(exceptionHandler + CoroutineName("③")) { // ③
            log(4)
...
```

再运行这段程序，结果就比较有意思了：

```
...
07:30:11:519 [DefaultDispatcher-worker-1] CoroutineName(②) java.lang.ArithmeticException: Hey!!
...
```

我们发现触发的 `CoroutineExceptionHandler` 竟然是协程 ② 的，意外吗？不意外，因为我们前面已经提到，对于 `supervisorScope` 的子协程 （例如 ②）的子协程（例如 ③），如果没有明确指出，它是遵循默认的作用于规则的，也就是 `coroutineScope` 的规则了，出现未捕获的异常会尝试传递给父协程并尝试取消父协程。

究竟使用什么 Scope，大家自己根据实际情况来确定，我给出一些建议：

* 对于没有协程作用域，但需要启动协程的时候，适合用 GlobalScope
* 对于已经有协程作用域的情况（例如通过 GlobalScope 启动的协程体内），直接用协程启动器启动
* 对于明确要求子协程之间相互独立不干扰时，使用 supervisorScope 
* 对于通过标准库 API 创建的协程，这样的协程比较底层，没有 Job、作用域等概念的支撑，例如我们前面提到过 suspend main 就是这种情况，对于这种情况优先考虑通过 coroutineScope 创建作用域；更进一步，大家尽量不要直接使用标准库 API，除非你对 Kotlin 的协程机制非常熟悉。

当然，对于可能出异常的情况，请大家尽量做好异常处理，不要将问题复杂化。

### 5. join 和 await

前面我们举例子一直用的是 `launch`，启动协程其实常用的还有 `async`、`actor` 和 `produce`，其中 `actor` 和 `launch` 的行为类似，在未捕获的异常出现以后，会被当做为处理的异常抛出，就像前面的例子那样。而 `async` 和 `produce`  则主要是用来输出结果的，他们内部的异常只在外部消费他们的结果时抛出。这两组协程的启动器，你也可以认为分别是“消费者”和“生产者”，消费者异常立即抛出，生产者只有结果消费时抛出异常。

> `actor` 和 `produce` 这两个 API 目前处于比较微妙的境地，可能会被废弃或者后续提供替代方案，不建议大家使用，我们在这里就不展开细讲了。

那么消费结果指的是什么呢？对于 `async` 来讲，就是 `await`，例如：

```kotlin
suspend fun main() {
    val deferred = GlobalScope.async<Int> { 
        throw ArithmeticException()
    }
    try {
        val value = deferred.await()
        log("1. $value")
    } catch (e: Exception) {
        log("2. $e")
    }
}
```

这个从逻辑上很好理解，我们调用 `await` 时，期望 `deferred` 能够给我们提供一个合适的结果，但它因为出异常，没有办法做到这一点，因此只好给我们丢出一个异常了。

```
13:25:14:693 [main] 2. java.lang.ArithmeticException
```

我们自己实现的 `getUserCoroutine` 也属于类似的情况，在获取结果时，如果请求出了异常，我们就只能拿到一个异常，而不是正常的结果。相比之下，`join` 就有趣的多了，它只关注是否执行完，至于是因为什么完成，它不关心，因此如果我们在这里替换成 `join`：

```kotlin
suspend fun main() {
    val deferred = GlobalScope.async<Int> {
        throw ArithmeticException()
    }
    try {
        deferred.join()
        log(1)
    } catch (e: Exception) {
        log("2. $e")
    }
}
```

我们就会发现，异常被吞掉了！

```
13:26:15:034 [main] 1
```

如果例子当中我们用 `launch` 替换 `async`，`join` 处仍然不会有任何异常抛出，还是那句话，它只关心有没有完成，至于怎么完成的它不关心。不同之处在于， `launch` 中未捕获的异常与 `async` 的处理方式不同，`launch` 会直接抛出给父协程，如果没有父协程（顶级作用域中）或者处于 `supervisorScope` 中父协程不响应，那么就交给上下文中指定的 `CoroutineExceptionHandler`处理，如果没有指定，那传给全局的 `CoroutineExceptionHandler` 等等，而 `async` 则要等 `await` 来消费。

> 不管是哪个启动器，在应用了作用域之后，都会按照作用域的语义进行异常扩散，进而触发相应的取消操作，对于 `async` 来说就算不调用 `await` 来获取这个异常，它也会在 `coroutineScope` 当中触发父协程的取消逻辑，这一点请大家注意。

### 6. 小结

这一篇我们讲了协程的异常处理。这一块儿稍微显得有点儿复杂，但仔细理一下主要有三条线：

1. **协程内部异常处理流程**：launch 会在内部出现未捕获的异常时尝试触发对父协程的取消，能否取消要看作用域的定义，如果取消成功，那么异常传递给父协程，否则传递给启动时上下文中配置的 CoroutineExceptionHandler 中，如果没有配置，会查找全局（JVM上）的 CoroutineExceptionHandler 进行处理，如果仍然没有，那么就将异常交给当前线程的 UncaughtExceptionHandler 处理；而 async 则在未捕获的异常出现时同样会尝试取消父协程，但不管是否能够取消成功都不会后其他后续的异常处理，直到用户主动调用 await 时将异常抛出。
2. **异常在作用域内的传播**：当协程出现异常时，会根据当前作用域触发异常传递，GlobalScope 会创建一个独立的作用域，所谓“自成一派”，而 在 coroutineScope 当中协程异常会触发父协程的取消，进而将整个协程作用域取消掉，如果对 coroutineScope 整体进行捕获，也可以捕获到该异常，所谓“一损俱损”；如果是 supervisorScope，那么子协程的异常不会向上传递，所谓“自作自受”。
3.  **join 和 await 的不同**：join 只关心协程是否执行完，await 则关心运行的结果，因此 join 在协程出现异常时也不会抛出该异常，而 await 则会；考虑到作用域的问题，如果协程抛异常，可能会导致父协程的取消，因此调用 join 时尽管不会对协程本身的异常进行抛出，但如果 join 调用所在的协程被取消，那么它会抛出取消异常，这一点需要留意。

如果大家能把这三点理解清楚了，那么协程的异常处理可以说就非常清晰了。文中因为异常传播的原因，我们提到了取消，但没有展开详细讨论，后面我们将会专门针对取消输出一篇文章，帮助大家加深理解。

### 附加说明

join 在父协程被取消时有一个 bug 会导致不抛出取消异常，我在准备本文时发现该问题，目前已经提交到官方并得到了修复，预计合入到 1.2.1 发版，大家有兴趣可以查看这个 issue：[No CancellationException thrown when join on a crashed Job](https://github.com/Kotlin/kotlinx.coroutines/issues/1123)。

当然，这个 bug 对于生成环境的影响很小，大家也不要担心。



---

欢迎关注 Kotlin 中文社区！

中文官网：[https://www.kotlincn.net/](https://www.kotlincn.net/)

中文官方博客：[https://www.kotliner.cn/](https://www.kotliner.cn/)

公众号：Kotlin

知乎专栏：[Kotlin](https://zhuanlan.zhihu.com/bennyhuo)

CSDN：[Kotlin中文社区](https://blog.csdn.net/qq_23626713)

掘金：[Kotlin中文社区](https://juejin.im/user/5cea6293e51d45775e33f4dd/posts)

简书：[Kotlin中文社区](https://www.jianshu.com/u/a324daa6fa19)

开发者头条：[Kotlin中文社区](https://toutiao.io/u/532060/subjects)