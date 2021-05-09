# 破解 Kotlin 协程(6) - 协程挂起篇 

**Kotlin 协程 协程挂起 任务挂起 suspend 非阻塞**

> 协程的挂起最初是一个很神秘的东西，因为我们总是用线程的概念去思考，所以我们只能想到阻塞。不阻塞的挂起到底是怎么回事呢？说出来你也许会笑~~（哭？。。抱歉这篇文章我实在是没办法写的更通俗易懂了，大家一定要亲手实践！）


## 1. 先看看 delay

我们刚刚学线程的时候，最常见的模拟各种延时用的就是 `Thread.sleep` 了，而在协程里面，对应的就是 `delay`。`sleep` 让线程进入休眠状态，直到指定时间之后某种信号或者条件到达，线程就尝试恢复执行，而 `delay` 会让协程挂起，这个过程并不会阻塞 CPU，甚至可以说从硬件使用效率上来讲是“什么都不耽误”，从这个意义上讲 `delay` 也可以是让协程休眠的一种很好的手段。

`delay` 的源码其实很简单：

```kotlin
public suspend fun delay(timeMillis: Long) {
    if (timeMillis <= 0) return // don't delay
    return suspendCancellableCoroutine sc@ { cont: CancellableContinuation<Unit> ->
        cont.context.delay.scheduleResumeAfterDelay(timeMillis, cont)
    }
}
```

`cont.context.delay.scheduleResumeAfterDelay` 这个操作，你可以类比 JavaScript 的 `setTimeout`，Android 的 `handler.postDelay`，本质上就是设置了一个延时回调，时间一到就调用 `cont` 的 resume 系列方法让协程继续执行。

剩下的最关键的就是 `suspendCancellableCoroutine` 了，这可是我们的老朋友了，前面我们用它实现了回调到协程的各种转换 —— 原来 `delay` 也是基于它实现的，如果我们再多看一些源码，你就会发现类似的还有 `join`、`await` 等等。


## 2. 再来说说 suspendCancellableCoroutine

既然大家对于 `suspendCancellableCoroutine` 已经很熟悉了，那么我们干脆直接召唤一个老朋友给大家：

```kotlin
private suspend fun joinSuspend() = suspendCancellableCoroutine<Unit> { cont ->
    cont.disposeOnCancellation(invokeOnCompletion(handler = ResumeOnCompletion(this, cont).asHandler))
}
```

`Job.join()` 这个方法会首先检查调用者 `Job` 的状态是否已经完成，如果是，就直接返回并继续执行后面的代码而不再挂起，否则就会走到这个 `joinSuspend` 的分支当中。我们看到这里只是注册了一个完成时的回调，那么传说中的 `suspendCancellableCoroutine` 内部究竟做了什么呢？

```kotlin
public suspend inline fun <T> suspendCancellableCoroutine(
    crossinline block: (CancellableContinuation<T>) -> Unit
): T =
    suspendCoroutineUninterceptedOrReturn { uCont ->
        val cancellable = CancellableContinuationImpl(uCont.intercepted(), resumeMode = MODE_CANCELLABLE)
        block(cancellable)
        cancellable.getResult() // 这里的类型是 Any?
    }
```

`suspendCoroutineUninterceptedOrReturn` 这个方法调用的源码是看不到的，因为它根本没有源码：P 它的逻辑就是帮大家拿到 `Continuation` 实例，真的就只有这样。不过这样说起来还是很抽象，因为有一处非常的可疑：`suspendCoroutineUninterceptedOrReturn` 的返回值类型是 `T`，而传入的 lambda 的返回值类型是 `Any?`， 也就是我们看到的 `cancellable.getResult()` 的类型是 `Any?`，这是为什么？

我记得在协程系列文章的开篇，我就提到过 `suspend` 函数的签名，当时是以 `await` 为例的，这个方法大致相当于：

```kotlin
fun await(continuation: Continuation<User>): Any {
    ...
}
```

`suspend` 一方面为这个方法添加了一个 `Continuation` 的参数，另一方面，原先的返回值类型 `User` 成了 `Continuation` 的泛型实参，而真正的返回值类型竟然是 `Any`。当然，这里因为定义的逻辑返回值类型 `User` 是不可空的，因此真实的返回值类型也用了 `Any` 来示意，如果泛型实参是个可空的类型，那么真实的返回值类型也就是 `Any?` 了，这正与前面提到的 `cancellable.getResult()` 返回的这个 `Any?` 相对应。

> 如果大家去查 `await` 的源码，你同样会看到这个 `getResult()` 的调用。

简单来说就是，对于 `suspend` 函数，不是一定要挂起的，可以在需要的时候挂起，也就是要等待的协程还没有执行完的时候，等待协程执行完再继续执行；而如果在开始 `join` 或者 `await` 或者其他 `suspend` 函数，如果目标协程已经完成，那么就没必要等了，直接拿着结果走人即可。那么这个神奇的逻辑就在于 `cancellable.getResult()` 究竟返回什么了，且看：

```kotlin
internal fun getResult(): Any? {
    ...
    if (trySuspend()) return COROUTINE_SUSPENDED // ① 触发挂起逻辑
    ...
    if (state is CompletedExceptionally)  // ② 异常立即抛出
        throw recoverStackTrace(state.cause, this) 
    return getSuccessfulResult(state) // ③ 正常结果立即返回
}
```

这段代码 ① 处就是挂起逻辑了，表示这时候目标协程还没有执行完，需要等待结果，②③是协程已经执行完可以直接拿到异常和正常结果的两种情况。②③好理解，关键是 ①，它要挂起，这返回的是个什么东西？

```kotlin
public val COROUTINE_SUSPENDED: Any get() = CoroutineSingletons.COROUTINE_SUSPENDED

internal enum class CoroutineSingletons { COROUTINE_SUSPENDED, UNDECIDED, RESUMED }
```
这是 1.3 的实现，1.3 以前的实现更有趣，就是一个白板 `Any`。其实是什么不重要，关键是这个东西是一个单例，任何时候协程见到它就知道自己该挂起了。

## 3. 深入挂起操作

既然说到挂起，大家可能觉得还是一知半解，还是不知道挂起究竟怎么做到的，怎么办？说真的这个挂起是个什么操作其实一直没有拿出来给大家看，不是我们太小气了，只是太早拿出来会比较吓人。。

```kotlin
suspend fun hello() = suspendCoroutineUninterceptedOrReturn<Int>{
    continuation ->
    log(1)
    thread {
        Thread.sleep(1000)
        log(2)
        continuation.resume(1024)
    }
    log(3)
    COROUTINE_SUSPENDED
}
```

我写了这么一个 `suspend` 函数，在 `suspendCoroutineUninterceptedOrReturn` 当中直接返回了这个传说中的白板 `COROUTINE_SUSPENDED`，正常来说我们应该在一个协程当中调用这个方法对吧，可是我偏不，我写一段 Java 代码去调用这个方法，结果会怎样呢？

```java
public class CallCoroutine {
    public static void main(String... args) {
        Object value = SuspendTestKt.hello(new Continuation<Integer>() {
            @NotNull
            @Override
            public CoroutineContext getContext() {
                return EmptyCoroutineContext.INSTANCE;
            }

            @Override
            public void resumeWith(@NotNull Object o) { // ①
                if(o instanceof Integer){
                    handleResult(o);
                } else {
                    Throwable throwable = (Throwable) o;
                    throwable.printStackTrace();
                }
            }
        });

        if(value == IntrinsicsKt.getCOROUTINE_SUSPENDED()){ // ②
            LogKt.log("Suspended.");
        } else {
            handleResult(value);
        }
    }

    public static void handleResult(Object o){
        LogKt.log("The result is " + o);
    }
}
```

这段代码看上去比较奇怪，可能会让人困惑的有两处：

① 处，我们在 Kotlin 当中看到的 `resumeWith` 的参数类型是 `Result`，怎么这儿成了 `Object` 了？因为 `Result` 是内联类，编译时会用它唯一的成员替换掉它，因此就替换成了 `Object` （在Kotlin 里面是 `Any?`）

② 处  `IntrinsicsKt.getCOROUTINE_SUSPENDED()` 就是 Kotlin 的 `COROUTINE_SUSPENDED`

剩下的其实并不难理解，运行结果自然就是如下所示了：

```
07:52:55:288 [main] 1
07:52:55:293 [main] 3
07:52:55:296 [main] Suspended.
07:52:56:298 [Thread-0] 2
07:52:56:306 [Thread-0] The result is 1024
```

其实这段 Java 代码的调用方式与 Kotlin 下面的调用已经很接近了：

```kotlin
suspend fun main() {
    log(hello())
}
```

只不过我们在 Kotlin 当中还是不太容易拿到 `hello` 在挂起时的真正返回值，其他的返回结果完全相同。

```
12:44:08:290 [main] 1
12:44:08:292 [main] 3
12:44:09:296 [Thread-0] 2
12:44:09:296 [Thread-0] 1024
```

很有可能你看到这里都会觉得晕头转向，没有关系，我现在已经开始尝试揭示一些协程挂起的背后逻辑了，比起简单的使用，概念的理解和接受需要有个小小的过程。

## 4. 深入理解协程的状态转移

前面我们已经对协程的原理做了一些揭示，显然 Java 的代码让大家能够更容易理解，那么接下来我们再来看一个更复杂的例子：

```kotlin
suspend fun returnSuspended() = suspendCoroutineUninterceptedOrReturn<String>{
    continuation ->
    thread {
        Thread.sleep(1000)
        continuation.resume("Return suspended.")
    }
    COROUTINE_SUSPENDED
}

suspend fun returnImmediately() = suspendCoroutineUninterceptedOrReturn<String>{
    log(1)
    "Return immediately."
}
```

我们首先定义两个挂起函数，第一个会真正挂起，第二个则会直接返回结果，这类似于我们前面讨论 `join` 或者 `await` 的两条路径。我们再用 Kotlin 给出一个调用它们的例子：

```kotlin
suspend fun main() {
    log(1)
    log(returnSuspended())
    log(2)
    delay(1000)
    log(3)
    log(returnImmediately())
    log(4)
}
```

运行结果如下：

```
08:09:37:090 [main] 1
08:09:38:096 [Thread-0] Return suspended.
08:09:38:096 [Thread-0] 2
08:09:39:141 [kotlinx.coroutines.DefaultExecutor] 3
08:09:39:141 [kotlinx.coroutines.DefaultExecutor] Return immediately.
08:09:39:141 [kotlinx.coroutines.DefaultExecutor] 4
```

好，现在我们要揭示这段协程代码的真实面貌，为了做到这一点，我们用 Java 来仿写一下这段逻辑：

> 注意，下面的代码逻辑上并不能做到十分严谨，不应该出现在生产当中，仅供学习理解协程使用。

```java
public class ContinuationImpl implements Continuation<Object> {

    private int label = 0;
    private final Continuation<Unit> completion;

    public ContinuationImpl(Continuation<Unit> completion) {
        this.completion = completion;
    }

    @Override
    public CoroutineContext getContext() {
        return EmptyCoroutineContext.INSTANCE;
    }

    @Override
    public void resumeWith(@NotNull Object o) {
        try {
            Object result = o;
            switch (label) {
                case 0: {
                    LogKt.log(1);
                    result = SuspendFunctionsKt.returnSuspended( this);
                    label++;
                    if (isSuspended(result)) return;
                }
                case 1: {
                    LogKt.log(result);
                    LogKt.log(2);
                    result = DelayKt.delay(1000, this);
                    label++;
                    if (isSuspended(result)) return;
                }
                case 2: {
                    LogKt.log(3);
                    result = SuspendFunctionsKt.returnImmediately( this);
                    label++;
                    if (isSuspended(result)) return;
                }
                case 3:{
                    LogKt.log(result);
                    LogKt.log(4);
                }
            }
            completion.resumeWith(Unit.INSTANCE);
        } catch (Exception e) {
            completion.resumeWith(e);
        }
    }

    private boolean isSuspended(Object result) {
        return result == IntrinsicsKt.getCOROUTINE_SUSPENDED();
    }
}
```

我们定义了一个 Java 类 `ContinuationImpl`，它就是一个 `Continuation` 的实现。

> 实际上如果你愿意，你还真得可以在 Kotlin 的标准库当中找到一个名叫 `ContinuationImpl` 的类，只不过，它的 `resumeWith` 最终调用到了 `invokeSuspend`，而这个 `invokeSuspend` 实际上就是我们的协程体，通常也就是一个 Lambda 表达式 —— 我们通过 `launch`启动协程，传入的那个 Lambda 表达式，实际上会被编译成一个 `SuspendLambda` 的子类，而它又是 `ContinuationImpl` 的子类。

有了这个类我们还需要准备一个 completion 用来接收结果，这个类仿照标准库的 `RunSuspend` 类实现，如果你有阅读前面的文章，那么你应该知道 suspend main 的实现就是基于这个类：

```java
public class RunSuspend implements Continuation<Unit> {

    private Object result;

    @Override
    public CoroutineContext getContext() {
        return EmptyCoroutineContext.INSTANCE;
    }

    @Override
    public void resumeWith(@NotNull Object result) {
        synchronized (this){
            this.result = result;
            notifyAll(); // 协程已经结束，通知下面的 wait() 方法停止阻塞
        }
    }

    public void await() throws Throwable {
        synchronized (this){
            while (true){
                Object result = this.result;
                if(result == null) wait(); // 调用了 Object.wait()，阻塞当前线程，在 notify 或者 notifyAll 调用时返回
                else if(result instanceof Throwable){
                    throw (Throwable) result;
                } else return;
            }
        }
    }
}
```

这段代码的关键点在于 `await()` 方法，它在其中起了一个死循环，不过大家不要害怕，这个死循环是个纸老虎，如果 `result` 是 `null`，那么当前线程会被立即阻塞，直到结果出现。具体的使用方法如下：

```java
...
    public static void main(String... args) throws Throwable {
        RunSuspend runSuspend = new RunSuspend();
        ContinuationImpl table = new ContinuationImpl(runSuspend);
        table.resumeWith(Unit.INSTANCE);
        runSuspend.await();
    }
...
```

> 这写法简直就是 suspend main 的真实面貌了。

我们看到，作为 completion 传入的 `RunSuspend` 实例的 `resumeWith` 实际上是在 `ContinuationImpl` 的 `resumeWtih` 的最后才会被调用，因此它的 `await()` 一旦进入阻塞态，直到 `ContinuationImpl` 的整体状态流转完毕才会停止阻塞，此时进程也就运行完毕正常退出了。

于是这段代码的运行结果如下：

```
08:36:51:305 [main] 1
08:36:52:315 [Thread-0] Return suspended.
08:36:52:315 [Thread-0] 2
08:36:53:362 [kotlinx.coroutines.DefaultExecutor] 3
08:36:53:362 [kotlinx.coroutines.DefaultExecutor] Return immediately.
08:36:53:362 [kotlinx.coroutines.DefaultExecutor] 4
```

我们看到，这段普通的 Java 代码与前面的 Kotlin 协程调用完全一样。那么我这段 Java 代码的编写根据是什么呢？就是 Kotlin 协程编译之后产生的字节码。当然，字节码是比较抽象的，我这样写出来就是为了让大家更容易的理解协程是如何执行的，看到这里，相信大家对于协程的本质有了进一步的认识：

* 协程的挂起函数本质上就是一个回调，回调类型就是 `Continuation`
* 协程体的执行就是一个状态机，每一次遇到挂起函数，都是一次状态转移，就像我们前面例子中的 `label` 不断的自增来实现状态流转一样

如果能够把这两点认识清楚，那么相信你在学习协程其他概念的时候就都将不再是问题了。如果想要进行线程调度，就按照我们讲到的调度器的做法，在 `resumeWith` 处执行线程切换就好了，其实非常容易理解的。官方的协程框架本质上就是在做这么几件事儿，如果你去看源码，可能一时云里雾里，主要是因为框架除了实现核心逻辑外还需要考虑跨平台实现，还需要优化性能，但不管怎么样，这源码横竖看起来就是五个字：状态机回调。

## 5. 小结

不同以往，我们从这一篇开始毫无保留的为大家尝试揭示协程背后的逻辑，也许一时间可能有些难懂，不过不要紧，你可以使用协程一段时间之后再来阅读这些内容，相信一定会豁然开朗的。

当然，这一篇内容的安排更多是为后面的序列篇开路，Kotlin 的 `Sequence` 就是基于协程实现的，它的用法很简单，几乎与普通的 `Iterable` 没什么区别，因此序列篇我们会重点关注它的内部实现原理，欢迎大家关注。

