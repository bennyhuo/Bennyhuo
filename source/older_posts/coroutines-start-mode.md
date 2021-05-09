# 破解 Kotlin 协程(2) - 协程启动篇

**Kotlin 协程 启动模式**

> 现在你已经知道协程大概是怎么回事了，也应该想要自己尝试一把了吧。本文将为大家详细介绍协程的几种启动模式之间的不同，当然，我不打算现在就开始深入源码剖析原理，大家只需要记住这些规则就能很好的使用协程了。

## 1. 回想一下刚学 Thread 的时候

我相信现在接触 Kotlin 的开发者绝大多数都有 Java 基础，我们刚开始学习 Thread 的时候，一定都是这样干的：

```kotlin
val thread = object : Thread(){
    override fun run() {
        super.run()
        //do what you want to do.
    }
}
thread.start()
```

肯定有人忘了调用 `start`，还特别纳闷为啥我开的线程不启动呢。说实话，这个线程的 `start` 的设计其实是很奇怪的，不过我理解设计者们，毕竟当年还有 `stop` 可以用，结果他们很快发现设计 `stop` 就是一个错误，因为不安全而在 JDK 1.1 就废弃，称得上是最短命的 API 了吧。

> 既然 `stop` 是错误，那么总是让初学者丢掉的 `start` 是不是也是一个错误呢？

哈，有点儿跑题了。我们今天主要说 Kotlin。Kotlin 的设计者就很有想法，他们为线程提供了一个便捷的方法：

```kotlin
val myThread = thread {
    //do what you want
}
```

这个 `thread` 方法有个参数 `start` 默认为 `true`，换句话说，这样创造出来的线程默认就是启动的，除非你实在不想让它马上投入工作：

```kotlin
val myThread = thread(start = false) {
    //do what you want
}
//later on ...
myThread.start()
```

这样看上去自然多了。接口设计就应该让默认值满足 80% 的需求嘛。

## 2. 再来看看协程的启动

说了这么多线程，原因嘛，毕竟大家对它是最熟悉的。协程的 API 设计其实也与之一脉相承，我们来看一段最简单的启动协程的方式：

```kotlin
GlobalScope.launch {
    //do what you want
}
```

那么这段代码会怎么执行呢？我们说过，启动协程需要三样东西，分别是 **上下文**、**启动模式**、**协程体**，**协程体** 就好比 `Thread.run` 当中的代码，自不必说。

本文将为大家详细介绍 **启动模式**。在 Kotlin 协程当中，启动模式是一个枚举：

```kotlin
public enum class CoroutineStart {
    DEFAULT,
    LAZY,
    @ExperimentalCoroutinesApi
    ATOMIC,
    @ExperimentalCoroutinesApi
    UNDISPATCHED;
}
```

| 模式 | 功能 | 
| --- | --- |
| DEFAULT | 立即执行协程体 | 
| ATOMIC | 立即执行协程体，但在开始运行之前无法取消 | 
| UNDISPATCHED | 立即在当前线程执行协程体，直到第一个 suspend 调用 |
| LAZY | 只有在需要的情况下运行 |

### 2.1 DEFAULT

四个启动模式当中我们最常用的其实是 `DEFAULT` 和 `LAZY`。

`DEFAULT` 是饿汉式启动，`launch` 调用后，会立即进入待调度状态，一旦调度器 OK 就可以开始执行。我们来看个简单的例子：

```kotlin
suspend fun main() {
    log(1)
    val job = GlobalScope.launch {
        log(2)
    }
    log(3)
    job.join()
    log(4)
}
```

> 说明： main 函数 支持 suspend 是从 Kotlin 1.3 开始的。另外，main 函数省略参数也是 Kotlin 1.3 的特性。后面的示例没有特别说明都是直接运行在 suspend main 函数当中。

这段程序采用默认的启动模式，由于我们也没有指定调度器，因此调度器也是默认的，在 JVM 上，默认调度器的实现与其他语言的实现类似，它在后台专门会有一些线程处理异步任务，所以上述程序的运行结果可能是：

```kotlin
19:51:08:160 [main] 1
19:51:08:603 [main] 3
19:51:08:606 [DefaultDispatcher-worker-1] 2
19:51:08:624 [main] 4
```

也可能是：

```kotlin
20:19:06:367 [main] 1
20:19:06:541 [DefaultDispatcher-worker-1] 2
20:19:06:550 [main] 3
20:19:06:551 [main] 4
```
这取决于 CPU 对于当前线程与后台线程的调度顺序，不过不要担心，很快你就会发现这个例子当中 2 和 3 的输出顺序其实并没有那么重要。

> JVM 上默认调度器的实现也许你已经猜到，没错，就是开了一个线程池，但区区几个线程足以调度成千上万个协程，而且每一个协程都有自己的调用栈，这与纯粹的开线程池去执行异步任务有本质的区别。
> 
> 当然，我们说 Kotlin 是一门跨平台的语言，因此上述代码还可以运行在 JavaScript 环境中，例如 Nodejs。在 Nodejs 中，Kotlin 协程的默认调度器则并没有实现线程的切换，输出结果也会略有不同，这样似乎更符合 JavaScript 的执行逻辑。
> 
> 更多调度器的话题，我们后续还会进一步讨论。

### 2.2 LAZY

`LAZY` 是懒汉式启动，`launch` 后并不会有任何调度行为，协程体也自然不会进入执行状态，直到我们需要它执行的时候。这其实就有点儿费解了，什么叫我们需要它执行的时候呢？就是需要它的运行结果的时候， `launch` 调用后会返回一个 `Job` 实例，对于这种情况，我们可以：

* 调用 `Job.start`，主动触发协程的调度执行
* 调用 `Job.join`，隐式的触发协程的调度执行

所以这个所谓的”需要“，其实是一个很有趣的措辞，后面你还会看到我们也可以通过 `await` 来表达对 `Deferred` 的需要。这个行为与 `Thread.join` 不一样，后者如果没有启动的话，调用 `join` 不会有任何作用。

```kotlin
log(1)
val job = GlobalScope.launch(start = CoroutineStart.LAZY) {
    log(2)
}
log(3)
job.start()
log(4)
```

基于此，对于上面的示例，输出的结果可能是：

```
14:56:28:374 [main] 1
14:56:28:493 [main] 3
14:56:28:511 [main] 4
14:56:28:516 [DefaultDispatcher-worker-1] 2
```

当然如果你运气够好，也可能出现 2 比 4 在前面的情况。而对于 `join`，

```kotlin
...
log(3)
job.join()
log(4)
```

因为要等待协程执行完毕，因此输出的结果一定是：

```
14:47:45:963 [main] 1
14:47:46:054 [main] 3
14:47:46:069 [DefaultDispatcher-worker-1] 2
14:47:46:090 [main] 4
```

### 2.3 ATOMIC

`ATOMIC` 只有涉及 cancel 的时候才有意义，cancel 本身也是一个值得详细讨论的话题，在这里我们就简单认为 cancel 后协程会被取消掉，也就是不再执行了。那么调用 cancel 的时机不同，结果也是有差异的，例如协程调度之前、开始调度但尚未执行、已经开始执行、执行完毕等等。

为了搞清楚它与 `DEFAULT` 的区别，我们来看一段例子：

```kotlin
log(1)
val job = GlobalScope.launch(start = CoroutineStart.ATOMIC) {
    log(2)
}
job.cancel()
log(3)
```
我们创建了协程后立即 cancel，但由于是 `ATOMIC` 模式，因此协程一定会被调度，因此 1、2、3 一定都会输出，只是 2 和 3 的顺序就难说了。

```
20:42:42:783 [main] 1
20:42:42:879 [main] 3
20:42:42:879 [DefaultDispatcher-worker-1] 2
```

对应的，如果是 `DEFAULT` 模式，在第一次调度该协程时如果 cancel 就已经调用，那么协程就会直接被 cancel 而不会有任何调用，当然也有可能协程开始时尚未被 cancel，那么它就可以正常启动了。所以前面的例子如果改用 `DEFAULT` 模式，那么 2 有可能会输出，也可能不会。

需要注意的是，cancel 调用一定会将该 job 的状态置为 cancelling，只不过`ATOMIC` 模式的协程在启动时无视了这一状态。为了证明这一点，我们可以让例子稍微复杂一些：

```kotlin
log(1)
val job = GlobalScope.launch(start = CoroutineStart.ATOMIC) {
    log(2)
    delay(1000)
    log(3)
}
job.cancel()
log(4)
job.join()
```

我们在 2 和 3 之间加了一个 `delay`，`delay` 会使得协程体的执行被挂起，1000ms 之后再次调度后面的部分，因此 3 会在 2 执行之后 1000ms 时输出。对于 `ATOMIC` 模式，我们已经讨论过它一定会被启动，实际上在遇到第一个挂起点之前，它的执行是不会停止的，而 `delay` 是一个 suspend 函数，这时我们的协程迎来了自己的第一个挂起点，恰好 `delay` 是支持 cancel 的，因此后面的 3 将不会被打印。

> 我们使用线程的时候，想要让线程里面的任务停止执行也会面临类似的问题，但遗憾的是线程中看上去与 cancel 相近的 stop 接口已经被废弃，因为存在一些安全的问题。不过随着我们不断地深入探讨，你就会发现协程的 cancel 某种意义上更像线程的 interrupt。

### 2.4 UNDISPATCHED

有了前面的基础，`UNDISPATCHED` 就很容易理解了。协程在这种模式下会直接开始在当前线程下执行，直到第一个挂起点，这听起来有点儿像前面的 `ATOMIC`，不同之处在于 `UNDISPATCHED` 不经过任何调度器即开始执行协程体。当然遇到挂起点之后的执行就取决于挂起点本身的逻辑以及上下文当中的调度器了。

```kotlin
log(1)
val job = GlobalScope.launch(start = CoroutineStart.UNDISPATCHED) {
    log(2)
    delay(100)
    log(3)
}
log(4)
job.join()
log(5)
```
我们还是以这样一个例子来认识下 `UNDISPATCHED` 模式，按照我们前面的讨论，协程启动后会立即在当前线程执行，因此 1、2 会连续在同一线程中执行，`delay` 是挂起点，因此 3 会等 100ms 后再次调度，这时候 4 执行，`join` 要求等待协程执行完，因此等 3 输出后再执行 5。以下是运行结果：

```
22:00:31:693 [main] 1
22:00:31:782 [main @coroutine#1] 2
22:00:31:800 [main] 4
22:00:31:914 [DefaultDispatcher-worker-1 @coroutine#1] 3
22:00:31:916 [DefaultDispatcher-worker-1 @coroutine#1] 5
```

> 方括号当中是线程名，我们发现协程执行时会修改线程名来让自己显得颇有存在感。运行结果看上去还有一个细节可能会让人困惑，`join` 之后的 5 的线程与 3 一样，这是为什么？我们在前面提到我们的示例都运行在 suspend main 函数当中，所以 suspend main 函数会帮我们直接启动一个协程，而我们示例的协程都是它的子协程，所以这里 5 的调度取决于这个最外层的协程的调度规则了。关于协程的调度，我们后面再聊。

## 3. 小结

本文通过一些例子来给大家逐步揭开协程的面纱。相信大家读完对于协程的执行机制有了一个大概的认识，同时对于协程的调度这个话题想必也非常好奇或者感到困惑，这是正常的——因为我们还没有讲嘛，放心，调度器的内容已经安排了 : )。

## 附录

`log` 函数的定义：

```kotlin
val dateFormat = SimpleDateFormat("HH:mm:ss:SSS")

val now = {
    dateFormat.format(Date(System.currentTimeMillis()))
}

fun log(msg: Any?) = println("${now()} [${Thread.currentThread().name}] $msg")
```

