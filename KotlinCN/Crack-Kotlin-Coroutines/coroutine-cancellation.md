
# 破解 Kotlin 协程(5) - 协程取消篇 

>本文转自 **Bennyhuo 的博客**
>
>原文地址：https://www.bennyhuo.com/2019/04/30/coroutine-cancellation/

---

**关键词：Kotlin 协程 协程取消 任务停止**

> 协程的任务的取消需要靠协程内部调用的协作支持，这就类似于我们线程中断以及对中断状态的响应一样。 



我们先从大家熟悉的话题讲起。线程有一个被废弃的 `stop` 方法，这个方法会让线程立即死掉，并且释放它持有的锁，这样会让它正在读写的存储处于一个不安全的状态，因此 `stop` 被废弃了。如果我们启动了一个线程并让它执行一些任务，但很快我们就后悔了，`stop` 还不让用，那该怎么办？

```kotlin
val thread = thread {
    ...
}
thread.stop() // !!! Deprecated!!!
```

我们应该想办法让线程内部正在运行的任务跟我们合作把任务停掉，这样线程内部的任务停止之前还有机会清理一些资源，比如关闭流等等。

```kotlin
val thread = thread {
    try {
        Thread.sleep(10000)
    } catch (e: InterruptedException) {
        log("Interrupted, do cleaning stuff.")
    }
}
thread.interrupt()
```

像 `sleep` 这样的方法调用，文档明确指出它支持 `InterruptedException`，因此当线程被标记为中断状态时，它就会抛出 `InterruptedException` ，那么我们自然就可以捕获异常并做资源清理了。

所以请注意所谓的协作式的任务终止，协程的取消也就是 `cancel` 机制的思路也是如此。

## 2. 协程类似的例子

我们来看一个协程取消的例子：

```kotlin
fun main() = runBlocking {
    val job1 = launch { // ①
        log(1)
        delay(1000) // ②
        log(2)
    }
    delay(100)
    log(3)
    job1.cancel() // ③
    log(4)
}
```

这次我们用了一个不一样的写法，我们没有用 suspend main，而是直接用 `runBlocking` 启动协程，这个方法在 Native 上也存在，都是基于当前线程启动一个类似于 Android 的 Looper 的死循环，或者叫消息队列，可以不断的发送消息给它进行处理。`runBlocking` 会启动一个 `Job`，因此这里也存在默认的作用域，不过这对于我们今天的讨论暂时没有太大影响。

这段代码 ① 处启动了一个子协程，它内部先输出 1，接着开始 `delay`， `delay` 与线程的 `sleep` 不同，它不会阻塞线程，你可以认为它实际上就是触发了一个延时任务，告诉协程调度系统 1000ms 之后再来执行后面的这段代码（也就是 log(2)）；而在这期间，我们在 ③ 处对刚才启动的协程触发了取消，因此在 ② 处的 `delay` 还没有回调的时候协程就被取消了，因为 `delay` 可以响应取消，因此 `delay` 后面的代码就不会再次调度了，不调度的原因也很简单，② 处的 `delay` 会抛一个 `CancellationException`：

```kotlin
...
log(1)
try {
    delay(1000)
} catch (e: Exception) {
    log("cancelled. $e")
}
log(2)
...
```

那么输出的结果就不一样了：

```
06:54:56:361 [main] 1
06:54:56:408 [main] 3
06:54:56:411 [main] 4
06:54:56:413 [main] cancelled. kotlinx.coroutines.JobCancellationException: Job was cancelled; job=StandaloneCoroutine{Cancelling}@e73f9ac
06:54:56:413 [main] 2
```

大家看，这与线程的中断逻辑是不是非常的类似呢？

## 3. 完善我们之前的例子

之前我们有个例子，上一篇文章已经加入了异常处理逻辑，那么这次我们给它加上取消逻辑。之前是这样：

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

加取消逻辑，那需要我们的 `getUser` 回调版本支持取消，我们看下我们的 `getUser` 是怎么实现的：

```kotlin
fun getUser(callback: Callback<User>) {
    val call = OkHttpClient().newCall(
            Request.Builder()
                    .get().url("https://api.github.com/users/bennyhuo")
                    .build())

    call.enqueue(object : okhttp3.Callback {
        override fun onFailure(call: Call, e: IOException) {
            callback.onError(e)
        }

        override fun onResponse(call: Call, response: Response) {
            response.body()?.let {
                try {
                    callback.onSuccess(User.from(it.string()))
                } catch (e: Exception) {
                    callback.onError(e) // 这里可能是解析异常
                }
            }?: callback.onError(NullPointerException("ResponseBody is null."))
        }
    })
}
```

我们发了个网络请求给 Github，让它把一个叫 `bennyhuo` 的用户信息返回来，我们知道 OkHttp 的这个 `Call` 是支持 `cancel` 的， 取消后，网络请求过程中如果读取到这个取消的状态，就会把请求给停止掉。既然这样，我们干脆直接改造 `getUser` 好了，这样还能省掉我们自己的 `Callback` 回调过程：

```kotlin
suspend fun getUserCoroutine() = suspendCancellableCoroutine<User> { continuation ->
    val call = OkHttpClient().newCall(...)

    continuation.invokeOnCancellation { // ①
        log("invokeOnCancellation: cancel the request.")
        call.cancel()
    }

    call.enqueue(object : okhttp3.Callback {
        override fun onFailure(call: Call, e: IOException) {
            log("onFailure: $e")
            continuation.resumeWithException(e)
        }

        override fun onResponse(call: Call, response: Response) {
            log("onResponse: ${response.code()}")
            response.body()?.let {
                try {
                    continuation.resume(User.from(it.string()))
                } catch (e: Exception) {
                    continuation.resumeWithException(e)
                }
            } ?: continuation.resumeWithException(NullPointerException("ResponseBody is null."))
        }
    })
}
```

我们这里用到了 `suspendCancellableCoroutine`，而不是之前的 `suspendCoroutine`，这就是为了让我们的挂起函数支持协程的取消。该方法将获取到的 `Continuation` 包装成了一个 `CancellableContinuation`，通过调用它的 `invokeOnCancellation` 方法可以设置一个取消事件的回调，一旦这个回调被调用，那么意味着 `getUserCoroutine` 调用所在的协程被取消了，这时候我们也要相应的做出取消的响应，也就是把 OkHttp 发出去的请求给取消掉。

那么我们在调用它的时候，如果遇到了取消，会怎么样呢？

```kotlin
val job1 = launch { //①
    log(1)
    val user = getUserCoroutine()
    log(user)
    log(2)
}
delay(10)
log(3)
job1.cancel()
log(4)
```

注意我们启动 ① 之后仅仅延迟了 10ms 就取消了它，网络请求的速度一般来讲还不会这么快，因此取消的时候大概率 `getUserCoroutine` 被挂起了，因此结果大概率是：

```kotlin
07:31:30:751 [main] 1
07:31:31:120 [main] 3
07:31:31:124 [main] invokeOnCancellation: cancel the request.
07:31:31:129 [main] 4
07:31:31:131 [OkHttp https://api.github.com/...] onFailure: java.io.IOException: Canceled
```

我们发现，取消的回调被调用了，OkHttp 在收到我们的取消指令之后，也确实停止了网络请求，并且回调给我们一个 IO 异常，这时候我们的协程已经被取消，在处于取消状态的协程上调用 `Continuation.resume` 、 `Continuation.resumeWithException` 或者 `Continuation.resumeWith` 都会被忽略，因此 OkHttp 回调中我们收到 IO 异常后调用的 `continuation.resumeWithException(e)` 不会有任何副作用。

## 4. 再谈 Retrofit 的协程扩展

### 4.1 Jake Wharton 的 Adapter 存在的问题

我在[破解 Kotlin 协程 - 入门篇](https://www.bennyhuo.com/2019/04/01/basic-coroutines/) 提到了 Jake Wharton 大神为 Retrofit 写的 协程 Adapter，

```gradle
implementation 'com.jakewharton.retrofit:retrofit2-kotlin-coroutines-adapter:0.9.2'
```

它确实可以完成网络请求，不过有细心的小伙伴发现了它的问题：它怎么取消呢？我们把使用它的代码贴出来：

```kotlin
interface GitHubServiceApi {
    @GET("users/{login}")
    fun getUserCoroutine(@Path("login") login: String): Deferred<User>
}
```
定义好接口，创建 Retrofit 实例的时候传入对应的 Adapter：

```kotlin
val gitHubServiceApi by lazy {
    val retrofit = retrofit2.Retrofit.Builder()
            .baseUrl("https://api.github.com")
            .addConverterFactory(GsonConverterFactory.create())
            .addCallAdapterFactory(CoroutineCallAdapterFactory()) // 这里添加 Adapter
            .build()

    retrofit.create(GitHubServiceApi::class.java)
}
```

用的时候就这样：

```kotlin
val deferred = gitHubServiceApi.getUserCoroutine("bennyhuo")
try {
    showUser(deferred.await())
} catch (e: Exception) {
    showError(e)
}
```

如果要取消，我们可以直接调用 `deferred.cancel()`，例如：

```kotlin
log("1")
val deferred = gitHubServiceApi.getUserCoroutine("bennyhuo")
log("2")
withContext(Dispatchers.IO){
    deferred.cancel()
}
try {
    showUser(deferred.await())
} catch (e: Exception) {
    showError(e)
}
```

运行结果如下：

```
12:59:54:185 [DefaultDispatcher-worker-1] 1
12:59:54:587 [DefaultDispatcher-worker-1] 2
kotlinx.coroutines.JobCancellationException: Job was cancelled; job=CompletableDeferredImpl{Cancelled}@36699211
```

这种情况下，其实网络请求确实是被取消的，这一点我们可以看下源码的处理：

```kotlin
...
override fun adapt(call: Call<T>): Deferred<T> {
      val deferred = CompletableDeferred<T>()

      deferred.invokeOnCompletion { // ①
        if (deferred.isCancelled) {
          call.cancel()
        }
      }

      call.enqueue(object : Callback<T> {
        ...
      }     
}
...
```

注意 ① 处，`invokeOnCompletion` 在协程进入完成状态时触发，包括异常和正常完成，那么在这时候如果发现它的状态是已经取消的，那么结果就直接调用 `Call` 的取消即可。

这看上去确实很正常啊~ 不过 @阿永 在公众号的评论里面提到了一个 Case，仔细一看还真是有问题。我们给出示例来复现这个 Case：

```kotlin
val job = GlobalScope.launch {
    log("1")
    val deferred = gitHubServiceApi.getUserCoroutine("bennyhuo")
    log("2")
    deferred.invokeOnCompletion {
        log("invokeOnCompletion, $it, ${deferred.isCancelled}")
    }
    try {
        showUser(deferred.await())
    } catch (e: Exception) {
        showError(e)
    }
    log(3)
}
delay(10)
job.cancelAndJoin()
```

我们启动一个协程，在其中执行网络请求，那么正常来说，这时候 `getUserCoroutine` 返回的 `Deferred` 可以当做一个子协程，它应当遵循默认的作用域规则，在父作用域取消时被取消掉，但现实却并不是这样：

```kotlin
13:06:54:332 [DefaultDispatcher-worker-1] 1
13:06:54:829 [DefaultDispatcher-worker-1] 2
kotlinx.coroutines.JobCancellationException: Job was cancelled; job=StandaloneCoroutine{Cancelling}@19aea38c
13:06:54:846 [DefaultDispatcher-worker-1] 3
13:06:56:937 [OkHttp https://api.github.com/...] invokeOnCompletion, null, false
```

我们看到在调用 `deferred.await()` 的时候抛了个取消异常，这主要是因为 `await()` 所在的协程已经被我们用 `cancelAndJoin()` 取消，但从随后  `invokeOnCompletion` 的回调结果来看， `getUserCoroutine` 返回的 `Deferred`  并没有被取消，再仔细一看，时间上这个回调比前面的操作晚了 2s，那必然是网络请求返回之后才回调的。

所以问题究竟在哪里？在 `CoroutineCallAdapterFactory` 的实现中，为了实现异步转换，手动创建了一个 `CompletableDeferred`：

```kotlin
override fun adapt(call: Call<T>): Deferred<T> {
  val deferred = CompletableDeferred<T>() // ①
  ...
}
```

这个 `CompletableDeferred` 本身就是一个 `Job` 的实现，它的构造可接受一个 `Job` 实例作为它的父协程，那么问题来了，这里并没有告诉它父协程究竟是谁，因此也就谈不上作用域的事儿了，这好像我们用 `GlobalScope.launch` 启动了一个协程一样。如果大家在 Android 当中使用 `MainScope`，那么同样因为前面说到的这个原因，导致 `CompletableDeferred` 没有办法被取消。

> @阿永 在公众号评论中提到这个问题，并提到了一个比较好的解决方案，下面我们为大家详细介绍。感谢 @阿永。

说到这里我们再简单回顾下，作用域主要有 `GlobalScope`、`coroutineScope`、`supervisorScope`，对于取消，除了 `supervisorScope` 比较特别是单向取消，即父协程取消后子协程都取消，Android 中 `MainScope` 就是一个调度到 UI 线程的 `supervisorScope`；`coroutineScope` 的逻辑则是父子相互取消的逻辑；而 `GlobalScope` 会启动一个全新的作用域，与它外部隔离，内部遵循默认的协程作用域规则。

那么有没有办法解决这个问题呢？

直接解决还是比较困难的，因为 `CompletableDeferred` 构造所处的调用环境不是 suspend 函数，因而也没有办法拿到（很可能根本就没有！）父协程。

### 4.2 如何正确的将回调转换为协程

前面我们提到既然 `adapt` 方法不是 suspend 方法，那么我们是不是应该在其他位置创建协程呢？

其实我们前面在讲 `getUserCoroutine` 的时候就不断为大家展示了如何将一个回调转换为协程调用的方法：

```kotlin
suspend fun getUserCoroutine() = suspendCancellableCoroutine<User> { continuation ->
    ...
}
```

`suspendCancellableCoroutine` 跟最初我们提到的 `suspendCoroutine` 一样，都是要获取当前协程的 `Continuation` 实例，这实际上就相当于要继承当前协程的上下文，因此我们只需要在真正需要切换协程的时候再去做这个转换即可：

```kotlin
public suspend fun <T : Any> Call<T>.await(): T {
    return suspendCancellableCoroutine { continuation ->
        enqueue(object : Callback<T> {
            override fun onResponse(call: Call<T>?, response: Response<T?>) {
                continuation.resumeWith(runCatching { // ①
                    if (response.isSuccessful) {
                        response.body()
                            ?: throw NullPointerException("Response body is null: $response")
                    } else {
                        throw HttpException(response)
                    }
                })
            }

            override fun onFailure(call: Call<T>, t: Throwable) {
                if (continuation.isCancelled) return // ②
                continuation.resumeWithException(t)
            }
        })

        continuation.invokeOnCancellation {
            try {
                cancel()
            } catch (ex: Throwable) {  // ③
                //Ignore cancel exception 
            }
        }
    }
}
```

大家看着这段代码会不会很眼熟？这与我们 `getUserCoroutine` 的写法几乎如出一辙，不过有几处细节值得关注，我用数字标注了他们的位置：

* ① 处 `runCatching` 可以将一段代码的运行结果或者抛出的异常封装到一个 `Result` 类型当中，Kotlin 1.3 开始新增了 `Continuation.resumeWith(Result)` 这个方法， 这个点比起我们前面的写法更具 Kotlin 风格。
* ② 处在异常抛出时，判断了是否已经被取消。实际上如果网络请求被取消，这个回调确实会被调到，那么由于取消的操作是协程的由 `Continuation` 的取消发起的，因此这时候没必要再调用 `continuation.resumeWithException(t)` 来将异常再抛回来了。尽管我们前面其实也提到过，这时候继续调用  `continuation.resumeWithException(t)`  也没有任何逻辑上的副作用，但性能上多少还是会有一些开销。
* ③ 处，尽管 `Call.cancel` 的调用比较安全，但网络环境和状态难免情况复杂，因此对异常进行捕获会让这段代码更加健壮。如果 `cancel` 抛异常而没有捕获的话，那么等同于协程体内部抛出异常，具体如何传播看所在作用域的相关定义了。

需要指出的是，这段代码片段源自 [gildor/kotlin-coroutines-retrofit](https://github.com/gildor/kotlin-coroutines-retrofit) ，大家也可以直接添加依赖进行使用：

```gradle
compile 'ru.gildor.coroutines:kotlin-coroutines-retrofit:1.1.0'
```

这个框架代码量很少，但经过各路 Kotlin 协程专家的锤炼，逻辑手法很细腻，值得大家学习。

## 5. 小结

这篇文章我们从线程中断的概念切入，类比学习协程的取消，实际上大家就会发现这二者从逻辑上和场景上有多么的相似。接着我们将之前我们一直提到的回调转协程的例子进一步升级，支持取消，这样大家就可以轻易的将回调转变为协程的挂起调用了。最后我们还分析了一下 Retrofit 的协程扩展的一些问题和解决方法，这个例子也进一步可以引发我们对协程作用域以及如何将现有程序协程化的思考。

再稍微提一句，协程不是一个简单的东西，毕竟它的原理涉及到对操作系统调度、程序运行机制这样程序界毕竟原始的话题，但你说如果我对前面提到的这些都不是很熟悉或者根本没有接触过，是不是就要跟协程拜拜了呢，其实也不是，只不过如果你对这些都不熟悉，那么可能需要多加练习培养出感觉，而不必一开始就关注原理和细节，依样画葫芦一样可以用的很好，就像大家不知道 RxJava 原理一样可以用的很好一样，协程也可以做到这一点的。

当然，作为一个有追求的程序员，我们不止要会用，还要用得好，无论如何我们都需要知道来龙去脉，这其中涉及到的基础知识的欠缺也是需要尽快补充的，不能偷懒哈 ：）



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