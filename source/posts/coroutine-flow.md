# 破解 Kotlin 协程(11) - Flow 篇

**Kotlin 协程 Flow 响应式编程 RxJava**

> `Flow` 就是 Kotlin 协程与响应式编程模型结合的产物，你会发现它与 RxJava 非常像，二者之间也有相互转换的 API，使用起来非常方便。

==  Kotlin|Flow|RxJava ==


随着 RxJava 的流行，响应式编程模型逐步深入人心。`Flow` 就是 Kotlin 协程与响应式编程模型结合的产物。

*本文基于 Kotlinx.coroutines 1.3.3，由于部分功能尚处于实验阶段，后续也可能会发生细微的调整。*

## 认识 Flow

介绍 `Flow` 之前，我们先来回顾下序列生成器：

**代码清单1： 序列生成器**

```kotlin
val ints = sequence {
  (1..3).forEach { 
    yield(it)
  }  
}
```

每次访问 `ints` 的下一个元素的时候它就执行内部的逻辑直到遇到 `yield`，如果我希望在元素之间加个延时呢？

**代码清单2：序列生成器中不能调用其他挂起函数**

```kotlin
val ints = sequence {
  (1..3).forEach { 
    yield(it)
    delay(1000) // ERROR!
  }  
}
```

受 `RestrictsSuspension` 注解的约束，`delay` 不能在 `SequenceScope` 的扩展成员当中被调用，因而不能在序列生成器的协程体内调用了。

假设序列生成器不受这个限制，调用 `delay` 会导致后续的执行流程的线程发生变化，外部的调用者发现在访问 `ints` 的下一个元素的时候居然还会有切换线程的副作用，这个是不是算一个“惊喜”呢？不仅如此，我想通过指定调度器来限定序列创建所在的线程，同样是不可以的，我们甚至没有办法为它设置协程上下文。

既然序列生成器有这么多限制，那我们是时候需要认识一下 `Flow` 了。它的 API 与序列生成器极为相似：

**代码清单3：创建 Flow**

```kotlin
val intFlow = flow {
  (1..3).forEach { 
    emit(it)
    delay(100)
  }
}
```

新元素通过 `emit` 函数提供，Flow 的执行体内部也可以调用其他挂起函数，这样我们就可以在每次提供一个新元素后再延时 100ms 了。

Flow 也可以设定它运行时所使用的调度器：

```kotlin
intFlow.flowOn(Dispatchers.IO)
```

通过 `flowOn` 设置的调度器只对它之前的操作有影响，因此这里意味着 intFlow 的构造逻辑会在 `IO` 调度器上执行。

最终消费 `intFlow` 需要调用 `collect` 函数，这个函数也是一个挂起函数，我们启动一个协程来消费 `intFlow`：

**代码清单4： 消费 Flow**

```kotlin
GlobalScope.launch(myDispatcher) {
  intFlow.flowOn(Dispatchers.IO)
    .collect { println(it) }
}.join()
```

为了区分调度器，我们为协程设置了一个自定义的调度器，它会将协程调度到名叫 `MyThread` 的线程上，结果如下：

```kotlin
[MyThread] 1
[MyThread] 2
[MyThread] 3
```

## 对比 RxJava 的线程切换

RxJava 也是一个基于响应式编程模型的异步框架，它提供了两个切换调度器的 API 分别是 `subscribeOn` 和 `observeOn`：

**代码清单5：RxJava 的调度器切换**

```kotlin
Observable.create<Int> {
  (1..3).forEach { e ->
    it.onNext(e)
  }
  it.onComplete()
}.subscribeOn(Schedulers.io())
.observeOn(Schedulers.from(myExecutor))
.subscribe {
  println(it)
}
```

其中 `subscribeOn` 指定的调度器影响前面的逻辑，`observeOn` 影响的是后面的逻辑，因此 `it.onNext(e)` 执行在它的 `io` 这个调度器上，而最后的 `println(it)` 执行在通过 `myExecutor` 创建出来的调度器上。

Flow 的调度器 API 中看似只有 `flowOn` 与 `subscribeOn` 对应，其实不然， `collect` 所在协程的调度器则与 `observeOn` 指定的调度器对应。

在 RxJava 的学习和使用过程中， `subscribeOn` 和 `observeOn` 经常容易被混淆；而在 Flow 当中 `collect` 所在的协程自然就是观察者，它想运行在什么调度器上它自己指定即可，非常容易区分。

## 冷数据流

一个 Flow 创建出来之后，不消费则不生产，多次消费则多次生产，生产和消费总是相对应的。

**代码清单6：Flow 可以被重复消费**

```kotlin
GlobalScope.launch(dispatcher) {
  intFlow.collect { println(it) }
  intFlow.collect { println(it) }
}.join()
```

`intFlow` 就是本节最开始我们创建的 Flow，消费它会输出 1,2,3，重复消费它会重复输出 1,2,3。

这一点其实类似于我们前面提到的 `sequence` 和 RxJava 例子，它们也都有自己的消费端。我们创建一个序列然后去迭代它，每次迭代都会创建一个新的迭代器从头开始迭代；RxJava 的 `Observable` 也是如此，每次调用它的 `subscribe` 都会重新消费一次。

所谓**冷**数据流，就是只有消费时才会生产的数据流，这一点与 `Channel` 正对应：`Channel` 的发送端并不依赖于接收端。

> **说明** RxJava 也存在热数据流，可以通过一定的手段实现冷热数据流的转化。不过相比之下，冷数据流的应用场景更为丰富。

## 异常处理

Flow 的异常处理也比较直接，直接调用 `catch` 函数即可：

**代码清单7：捕获 Flow 的异常**

```kotlin
flow {
  emit(1)
  throw ArithmeticException("Div 0")
}.catch { t: Throwable ->
  println("caught error: $t")
}
```

我们在 Flow 的参数中抛了一个异常，在 `catch` 函数中就可以直接捕获到这个异常。如果没有调用 `catch` 函数，未捕获异常会在消费时抛出。请注意，`catch` 函数只能捕获它的上游的异常。

如果我们想要在流完成时执行逻辑，可以使用 `onCompletion`：

**代码清单8：订阅流的完成**

```kotlin
flow {
  emit(1)
  throw ArithmeticException("Div 0")
}.catch { t: Throwable ->
  println("caught error: $t")
}.onCompletion { t: Throwable? ->
  println("finally.")
}
```

`onCompletion` 用起来比较类似于 `try ... catch ... finally` 中的 `finally`，无论前面是否存在异常，它都会被调用，参数 `t` 则是前面未捕获的异常。

Flow 的设计初衷是希望确保流操作中异常透明。因此，以下写法是违反 Flow 的设计原则的：

**代码清单9：命令式的异常处理（不推荐）**

```kotlin
flow { 
  try {
    emit(1)
    throw ArithmeticException("Div 0")
  } catch (t: Throwable){
    println("caught error: $t")
  } finally {
    println("finally.")
  }
}
```

在流操作内部使用 `try ... catch ... finally` 这样的写法后续可能被禁用。

在 RxJava 当中还有 `onErrorReturn` 类似的操作：

**代码清单10：RxJava 从异常中恢复**

```kotlin
val observable = Observable.create<Int> {
  ...
}.onErrorReturn {
  println(t)
  10
}
```

捕获异常后，返回 10 作为下一个值。

我们在 Flow 当中也可以模拟这样的操作：

**代码清单11：Flow 从异常中恢复**

```kotlin
flow {
  emit(1)
  throw ArithmeticException("Div 0")
}.catch { t: Throwable ->
  println("caught error: $t")
  emit(10)
}
```

这里我们可以使用 `emit` 重新生产新元素出来。细心的读者一定会发现，`emit` 定义在 `FlowCollector` 当中，因此只要遇到 Receiver 为 `FlowCollector` 的函数，我们就可以生产新元素。

> **说明** onCompletion 预计在协程框架的 1.4 版本中会被重新设计，之后它的作用类似于 RxJava 中 Subscriber 的 onComplete，即作为整个 Flow 的完成回调使用，回调的参数也将包含整个 Flow 的未捕获异常，参见 GitHub Issue：[Breaking change: Experimental Flow.onCompletion contract for cause #1732](https://github.com/Kotlin/kotlinx.coroutines/pull/1732)。

## 末端操作符

前面的例子当中，我们用 `collect` 消费 Flow 的数据。`collect` 是最基本的**末端操作符**，功能与 RxJava 的 `subscribe` 类似。除了 `collect` 之外，还有其他常见的末端操作符，大体分为两类：

1. 集合类型转换操作，包括 `toList`、`toSet` 等。
2. 聚合操作，包括将 Flow 规约到单值的 `reduce`、`fold` 等操作，以及获得单个元素的操作包括 `single`、`singleOrNull`、`first` 等。

实际上，识别是否为末端操作符，还有一个简单方法，由于 Flow 的消费端一定需要运行在协程当中，因此末端操作符都是挂起函数。

## 分离 flow 的消费和触发

我们除了可以在 `collect` 处消费 Flow 的元素以外，还可以通过 `onEach` 来做到这一点。这样消费的具体操作就不需要与末端操作符放到一起，`collect` 函数可以放到其他任意位置调用，例如：

**代码清单12：分离 Flow 的消费和触发**

```kotlin
fun createFlow() = flow<Int> {
    (1..3).forEach {
      emit(it)
      delay(100)
    }
  }.onEach { println(it) }

fun main(){
  GlobalScope.launch {
    createFlow().collect()
  }
}
```

由此，我们又可以衍生出一种新的消费 Flow 的写法：

**代码清单13：使用协程作用域直接触发 Flow**

```kotlin
fun main(){
  createFlow().launchIn(GlobalScope)
}
```

其中 `launchIn` 函数只接收一个 `CoroutineScope` 类型的参数。

## Flow 的取消

Flow 没有提供取消操作，原因很简单：不需要。

我们前面已经介绍了 Flow 的消费依赖于 `collect` 这样的末端操作符，而它们又必须在协程当中调用，因此 Flow 的取消主要依赖于末端操作符所在的协程的状态。

**代码清单14：Flow 的取消**

```kotlin
val job = GlobalScope.launch {
  val intFlow = flow {
    (1..3).forEach {
      delay(1000)
      emit(it)
    }
  }

  intFlow.collect { println(it) }
}

delay(2500)
job.cancelAndJoin()
```

每隔 1000ms 生产一个元素，2500ms 以后协程被取消，因此最后一个元素生产前 Flow 就已经被取消，输出为：

```kotlin
1
▶ 1000ms later
2
```

如此看来，想要取消 Flow 只需要取消它所在的协程即可。

## 其他 Flow 的创建方式

我们已经知道了 `flow { ... }` 这种形式的创建方式，不过在这当中无法随意切换调度器，这是因为 `emit` 函数不是线程安全的：

**代码清单15：不能在 Flow 中直接切换调度器**

```kotlin
flow { // BAD!!
  emit(1)
  withContext(Dispatchers.IO){
    emit(2)
  }
}
```

想要在生成元素时切换调度器，就必须使用 `channelFlow` 函数来创建 Flow：

```kotlin
channelFlow {
  send(1)
  withContext(Dispatchers.IO) {
    send(2)
  }
}
```

此外，我们也可以通过集合框架来创建 Flow：

```kotlin
listOf(1, 2, 3, 4).asFlow()
setOf(1, 2, 3, 4).asFlow()
flowOf(1, 2, 3, 4)
```

## Flow 的背压

只要是响应式编程，就一定会有背压问题，我们先来看看背压究竟是什么。

背压问题在生产者的生产速率高于消费者的处理速率的情况下出现。为了保证数据不丢失，我们也会考虑添加缓存来缓解问题：

**代码清单16：为 Flow 添加缓冲**

```kotlin
flow {
  List(100) {
    emit(it)
  }
}.buffer()
```

我们也可以为 `buffer` 指定一个容量。不过，如果我们只是单纯地添加缓存，而不是从根本上解决问题就始终会造成数据积压。

问题产生的根本原因是生产和消费速率的不匹配，除直接优化消费者的性能以外，我们也可以采取一些取舍的手段。

第一种是 `conflate`。与 `Channel` 的 `Conflate` 模式一致，新数据会覆盖老数据，例如：

**代码清单17：使用 conflate 解决背压问题**

```kotlin
flow {
  List(100) {
    emit(it)
  }
}.conflate()
.collect { value ->
  println("Collecting $value")
  delay(100) 
  println("$value collected")
}
```

我们快速地发送了 100 个元素，最后接收到的只有两个，当然这个结果每次都不一定一样：

```kotlin
Collecting 1
1 collected
Collecting 99
99 collected
```

第二种是 `collectLatest`。顾名思义，只处理最新的数据，这看上去似乎与 `conflate` 没有区别，其实区别大了：它并不会直接用新数据覆盖老数据，而是每一个都会被处理，只不过如果前一个还没被处理完后一个就来了的话，处理前一个数据的逻辑就会被取消。

还是前面的例子，我们稍作修改：

**代码清单18：使用 collectLatest 解决背压问题**

```kotlin
flow {
  List(100) {
    emit(it)
  }
}.collectLatest { value ->
  println("Collecting $value")
  delay(100)
  println("$value collected")
}
```

运行结果如下：

```
Collecting 0
Collecting 1
...
Collecting 97
Collecting 98
Collecting 99
▶ 100ms later
99 collected
```

前面的 `Collecting` 输出了 0 ~ 99 的所有结果，而 `collected` 却只有 99，因为后面的数据到达时，处理上一个数据的操作正好被挂起了（请注意`delay(100)`）。

除 `collectLatest` 之外还有 `mapLatest`、`flatMapLatest` 等等，都是这个作用。

## Flow 的变换

我们已经对集合框架的变换非常熟悉了，`Flow` 看上去极其类似于这样的数据结构，这一点与 RxJava 的 `Observable` 的表现也基本一致。

例如我们可以使用 `map` 来变换 `Flow` 的数据：

**代码清单19：Flow 的元素变换**

```kotlin
flow {
  List(5){ emit(it) } 
}.map { 
  it * 2
}
```

也可以映射成其他 Flow：

**代码清单20：Flow 的嵌套**

```kotlin
flow {
  List(5){ emit(it) } 
}.map {
  flow { List(it) { emit(it) } }
}
```

这实际上得到的是一个数据类型为 `Flow` 的 `Flow`，如果希望将它们拼接起来，可以使用 `flattenConcat`：

**代码清单21：拼接 Flow**

```kotlin
flow {
  List(5){ emit(it) } 
}.map {
  flow { List(it) { emit(it) } }
}.flattenConcat()
  .collect { println(it) }
```

拼接的操作中 `flattenConcat` 是按顺序拼接的，结果的顺序仍然是生产时的顺序；还有一个是 `flattenMerge`，它会并发拼接，因此结果不会保证顺序。

## 使用 Flow 实现多路复用

多数情况下，我们可以通过构造合适的 Flow 来实现多路复用的效果。

上一篇文章[破解 Kotlin 协程(10) - Select 篇](https://www.bennyhuo.com/2020/02/03/coroutine-select/)中对 await 的复用我们可以用 Flow 实现如下：

**代码清单22：使用 Flow 实现对 await 的多路复用**

```kotlin
coroutineScope {
  val login = "..."
  listOf(::getUserFromApi, ::getUserFromLocal) ... ①
    .map { function ->
      function.call(login) ... ②
    }
    .map { deferred ->
      flow { emit(deferred.await()) } ... ③
    }
    .merge() ... ④
    .onEach { user ->
      println("Result: $user")
    }.launchIn(this)
}
```

这其中，① 处用创建了两个函数引用组成的 List；② 处调用它们得到 deferred；③ 处比较关键，对于每一个 deferred 我们创建一个单独的 Flow，并在 Flow 内部发送 deferred.await() 返回的结果，即返回的 User 对象；现在我们有了两个 Flow 实例，我们需要将它们整合成一个 Flow 进行处理，调用 merge 函数即可。

![](https://kotlinblog-1251218094.costj.myqcloud.com/9e300468-a645-433d-ae41-60b3eaa97f5a/media/9ff28c5395881742a6878225807e2dd75c150d63.png)

**图1：使用 merge 合并 Flow**

同样的，对 Channel 的读取复用的场景也可以使用 Flow 来完成。对照[破解 Kotlin 协程(10) - Select 篇](https://www.bennyhuo.com/2020/02/03/coroutine-select/)，我们给出 Flow 的实现版本：

**代码清单23：使用 Flow 实现对 Channel 的复用**

```kotlin
val channels = List(10) { Channel<Int>() }
...
val result = channels.map {
    it.consumeAsFlow()
  }
  .merge()
  .first()
```

这比 `select` 的版本看上去要更简洁明了，每个 Channel 都通过 `consumeAsFlow` 函数被映射成 Flow，再 merge 成一个 Flow，取第一个元素。

## 小结

`Flow` 是协程当中比较重要的异步工具，它的用法与其他类似的响应式编程框架非常相近，大家可以采取类比的学习方式去了解它的功能。