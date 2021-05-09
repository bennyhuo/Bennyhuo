
# 破解 Kotlin 协程(10) - Select 篇 

>本文转自 **Bennyhuo 的博客**
>
>原文地址：https://www.bennyhuo.com/2020/02/03/coroutine-select/

---

**关键词：Kotlin 协程 Select 多路复用**

> Select 并不是什么新鲜概念，我们在 IO 多路复用的时候就见过它，在 Java NIO 里面也见过它。接下来给各位介绍的是 Kotlin 协程的 Select。 



## 复用多个 await

我们前面已经接触了很多挂起函数，那么如果我有这样一个场景，两个 API 分别从网络和本地缓存获取数据，期望哪个先返回就先用哪个做展示：

```kotlin
fun CoroutineScope.getUserFromApi(login: String) = async(Dispatchers.IO){
    gitHubServiceApi.getUserSuspend(login)
}

fun CoroutineScope.getUserFromLocal(login:String) = async(Dispatchers.IO){
    File(localDir, login).takeIf { it.exists() }?.readText()?.let { gson.fromJson(it, User::class.java) }
}
```

不管先调用哪个 API 返回的 `Deferred` 的 `await`，都会被挂起，如果想要实现这一需求就要启动两个协程来调用 `await`，这样反而将问题复杂化了。

接下来我们用 `select` 来解决这个问题：

```kotlin
GlobalScope.launch {
    val localDeferred = getUserFromLocal(login)
    val remoteDeferred = getUserFromApi(login)

    val userResponse = select<Response<User?>> {
        localDeferred.onAwait { Response(it, true) }
        remoteDeferred.onAwait { Response(it, false) }
    }
    ...
}.join()
```

大家可以看到，我们没有直接调用 `await`，而是调用了 `onAwait` 在 `select` 当中注册了个回调，不管哪个先回调，`select` 立即返回对应回调中的结果。假设 `localDeferred.onAwait` 先返回，那么 `userResponse` 的值就是 `Response(it, true)`，当然由于我们的本地缓存可能不存在，因此 `select` 的结果类型是 `Response<User?>`。

对于这个案例本身，如果先返回的是本地缓存，那么我们还需要获取网络结果来展示最新结果：

```kotlin
GlobalScope.launch {
    ...
    userResponse.value?.let { log(it) }
    userResponse.isLocal.takeIf { it }?.let {
        val userFromApi = remoteDeferred.await()
        cacheUser(login, userFromApi)
        log(userFromApi)
    }
}.join()
```

## 复用多个 Channel

对于多个 `Channel` 的情况，也比较类似：

```kotlin
val channels = List(10) { Channel<Int>() }

select<Int?> {
    channels.forEach { channel ->
        channel.onReceive { it }
        // OR
        channel.onReceiveOrNull { it }
    }
}
```

对于 `onReceive`，如果 `Channel` 被关闭，`select` 会直接抛出异常；而对于 `onReceiveOrNull` 如果遇到 `Channel` 被关闭的情况，`it` 的值就是 `null`。

## SelectClause

我们怎么知道哪些事件可以被 `select` 呢？其实所有能够被 `select` 的事件都是 `SelectClauseN` 类型，包括：

* `SelectClause0`：对应事件没有返回值，例如 `join` 没有返回值，对应的 `onJoin` 就是这个类型，使用时 `onJoin` 的参数是一个无参函数：

    ```kotlin
    select<Unit> {
        job.onJoin { log("Join resumed!") }
    }
    ```
* `SelectClause1`：对应事件有返回值，前面的 `onAwait` 和 `onReceive` 都是此类情况。
* `SelectClause2`：对应事件有返回值，此外还需要额外的一个参数，例如 `Channel.onSend` 有两个参数，第一个就是一个 `Channel` 数据类型的值，表示即将发送的值，第二个是发送成功时的回调：

    ```kotlin
    List(100) { element ->
        select<Unit> {
            channels.forEach { channel ->
                channel.onSend(element) { sentChannel -> log("sent on $sentChannel") }
            }
        }
    }
    ```
    在消费者的消费效率较低时，数据能发给哪个就发给哪个进行处理，`onSend` 的第二个参数的参数是数据成功发送到的 `Channel` 对象。

因此如果大家想要确认挂起函数是否支持 `select`，只需要查看其是否存在对应的 `SelectClauseN` 即可。

## 小结

在协程当中，Select 的语义与 Java NIO 或者 Unix 的 IO 多路复用类似，它的存在使得我们可以轻松实现 1 拖 N，实现哪个先来就处理哪个。尽管 Select 和 Channel 比起标准库的协程 API 已经更接近业务开发了，不过个人认为它们仍属于相对底层的 API 封装，在实践当中多数情况下也可以使用 Flow API 来解决。

而这个 Flow API，完全就是响应式编程的协程版 API，我们简直可以照着 RxJava 来学习它，所以我们下一篇再见吧~~~
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