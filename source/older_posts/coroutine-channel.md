# 破解 Kotlin 协程(9) - Channel 篇 

**Kotlin 协程 Channel 生产消费者**

> `Channel` 实际上就是协程在生产消费者模型上的应用，把过去你用 `BlockingQueue` 实现的功能替换成 `Channel`，也许会有新的发现~

## 1. 认识 Channel 

Channel 实际上就是一个队列，而且是并发安全的，它可以用来连接协程，实现不同协程的通信。废话不多说，直接看例子：

```kotlin
suspend fun main() {
    val channel = Channel<Int>()

    val producer = GlobalScope.launch {
        var i = 0
        while (true){
            channel.send(i++)
            delay(1000)
        }
    }

    val consumer = GlobalScope.launch {
        while(true){
            val element = channel.receive()
            Logger.debug(element)
        }
    }

    producer.join()
    consumer.join()
}
```

我们构造了两个协程，分别叫他们 producer 和 consumer，我们没有明确的指定调度器，所以他们的调度器都是默认的，在 Java 虚拟机上就是那个大家都很熟悉的线程池：他们可以运行在不同的线程上，当然也可以运行在同一个线程上。

例子的运行机制是，producer 当中每隔 1s 向 `Channel` 中发送一个数字，而 consumer 那边则是一直在读取 Channel 来获取这个数字并打印，我们能够发现这里发端是比收端慢的，在没有值可以读到的时候，receive 是挂起的，直到有新元素 send 过来——所以你知道了 receive 是一个挂起函数，那么 send 呢？

## 2. Channel 的容量

如果你自己去 IDE 写了这段代码，你会发现 send 也是挂起函数。额，发端为什么会挂起？想想我们以前熟知的 `BlockingQueue`，我们往里面添加元素的时候，元素在队列里实际上是占用了空间的，如果这个队列空间不足，那么再往里面添加的时候就是两种情况：1. 阻塞，等待队列腾出空间；2. 抛异常，拒绝添加元素。send 也会面临同样的问题，我们说 Channel 实际上就是一个队列嘛，队列不应该有缓冲区吗，那么这个缓冲区一旦满了，并且也一直没有人调用 receive 取走元素的话，send 不就挂起了嘛。那么接下来我们看下 `Channel` 的缓冲区的定义：

```kotlin
public fun <E> Channel(capacity: Int = RENDEZVOUS): Channel<E> =
    when (capacity) {
        RENDEZVOUS -> RendezvousChannel()
        UNLIMITED -> LinkedListChannel()
        CONFLATED -> ConflatedChannel()
        else -> ArrayChannel(capacity)
    }
```

我们构造 `Channel` 的时候调用了一个叫 `Channel` 的函数，hmm，这玩意儿确实不是它的构造器，在 Kotlin 当中我们可以随便定义一个顶级函数跟某些类名一样来伪装成构造器，这本质上就是个工厂方法。

> 类似的还有 String，不信你去试试

它有一个参数叫 capacity，指定缓冲区的容量，默认值 `RENDEZVOUS` 就是 0，这个词本意就是描述“不见不散”的场景，所以你不来 receive，我这 send 就一直搁这儿挂起等着。换句话说，我们开头的例子里面，如果 consumer 不 receive，producer 里面的第一个 send 就给挂起了：

```kotlin
val producer = GlobalScope.launch {
    var i = 0
    while (true){
        i++ //为了方便输出日志，我们将自增放到前面
        Logger.debug("before send $i")
        channel.send(i)
        Logger.debug("before after $i")
        delay(1000)
    }
}

val consumer = GlobalScope.launch {
    while(true){
        delay(2000) //receive 之前延迟 2s
        val element = channel.receive()
        Logger.debug(element)
    }
}
```

我们故意让收端的节奏放慢，你就会发现，send 总是会挂起，直到 receive 之后才会继续往下执行：

```
07:11:23:119 [DefaultDispatcher-worker-2 @coroutine#1]  before send 1
07:11:24:845 [DefaultDispatcher-worker-2 @coroutine#2]  1
07:11:24:846 [DefaultDispatcher-worker-2 @coroutine#1]  before after 1
07:11:25:849 [DefaultDispatcher-worker-4 @coroutine#1]  before send 2
07:11:26:850 [DefaultDispatcher-worker-2 @coroutine#2]  2
07:11:26:850 [DefaultDispatcher-worker-3 @coroutine#1]  before after 2
```

`UNLIMITED` 比较好理解，来者不拒，从它给出的实现 `LinkedListChannel` 来看，这一点也与我们的 `LinkedBlockingQueue` 有异曲同工之妙。

`CONFLATED`，这个词是合并的意思，跟 inflate 是同一个词根，con- 前缀表示反着来，那是不是说我发了个 1、2、3、4、5 那边收的时候就会收到一个 [1,2,3,4,5] 的集合呢？毕竟字面意思是合并嘛。但实际上这个的效果是只保留最后一个元素，不是合并，应该是置换，换句话说，这个类型的 Channel 有一个元素大小的缓冲区，但每次有新元素过来，都会用新的替换旧的，也就是说我发了个 1、2、3、4、5 之后收端才接收的话，就只能收到 5 了。

剩下的就是 `ArrayChannel` 了，它接收一个值作为缓冲区容量的大小，这也比较类似于 `ArrayBlockingQueue`。

## 3. 迭代 Channel

前面我们在发送和读取 `Channel` 的时候用了 `while(true)`，因为我们想要去不断的进行读写操作，`Channel` 本身实际上也有点儿像序列，可以一个一个读，所以我们在读取的时候也可以直接获取一个 `Channel` 的 iterator：

```kotlin
val consumer = GlobalScope.launch {
    val iterator = channel.iterator()
    while(iterator.hasNext()){ // 挂起点
        val element = iterator.next()
        Logger.debug(element)
        delay(2000)
    }
}
```

那么这个时候，iterator.hasNext() 是挂起函数，在判断是否有下一个元素的时候实际上就需要去 `Channel` 当中读取元素了。

这个写法自然可以简化成 for each：

```kotlin
val consumer = GlobalScope.launch {
    for (element in channel) {
        Logger.debug(element)
        delay(2000)
    }
}
```

## 4. produce 和 actor

前面我们在协程外部定义 `Channel`，并在协程当中访问它，实现了一个简单的生产-消费者的示例，那么有没有便捷的办法构造生产者
和消费者呢？

```kotlin
val receiveChannel: ReceiveChannel<Int> = GlobalScope.produce {
    while(true){
        delay(1000)
        send(2)
    }
}
```

我们可以通过 `produce` 这个方法启动一个生产者协程，并返回一个 `ReceiveChannel`，其他协程就可以拿着这个 `Channel` 来接收数据了。反过来，我们可以用 `actor` 启动一个消费者协程：

```kotlin
val sendChannel: SendChannel<Int> = GlobalScope.actor<Int> {
    while(true){
        val element = receive()
    }
}
```

> ReceiveChannel 和 SendChannel 都是 Channel 的父接口，前者定义了 receive，后者定义了 send，Channel 也因此既可以 receive 又可以 send。

`produce` 和 `actor` 与 `launch` 一样都被称作“协程启动器”。通过这两个协程的启动器启动的协程也自然的与返回的 `Channel` 绑定到了一起，因此 `Channel` 的关闭也会在协程结束时自动完成，以 `produce` 为例，它构造出了一个 `ProducerCoroutine` 的对象：

```kotlin
internal open class ProducerCoroutine<E>(
    parentContext: CoroutineContext, channel: Channel<E>
) : ChannelCoroutine<E>(parentContext, channel, active = true), ProducerScope<E> {
    ...
    override fun onCompleted(value: Unit) {
        _channel.close() // 协程完成时
    }

    override fun onCancelled(cause: Throwable, handled: Boolean) {
        val processed = _channel.close(cause) // 协程取消时
        if (!processed && !handled) handleCoroutineException(context, cause)
    }
}
```

注意到在协程完成和取消的方法调用中，对应的 `_channel` 都会被关闭。

这样看上去还是挺有用的。不过截止这俩 API `produce` 和 `actor` 目前都没有稳定，前者仍被标记为 `ExperimentalCoroutinesApi`，后者则标记为 `ObsoleteCoroutinesApi`，这就比较尴尬了，明摆着不让用嘛。`actor` 的文档中提到的 issue 的讨论也说明相比基于 Actor 模型的并发框架，Kotlin 协程提供的这个 `actor` API 也不过就是提供了一个 `SendChannel` 的返回值而已。当然，协程的负责人也有实现一套更复杂的 Actor 的想法，只是这一段时间的高优明显是 `Flow`——这货从协程框架的 v1.2 开始公测，到协程 v1.3 就稳定，真是神速，我们后面的文章会介绍它。

虽然 `produce` 没有被标记为 `ObsoleteCoroutinesApi`，显然它作为 `actor` 的另一半，不可能单独转正的，这俩 API 我的建议是看看就好了。

## 5. Channel 的关闭

前我们提到了 `produce` 和 `actor` 返回的 `Channel` 都会伴随着对应的协程执行完毕而关闭。哦，原来 `Channel` 还有一个关闭的概念。

`Channel` 和我们后面的文章即将要探讨的 `Flow` 不同，它是在线的，是一个热数据源，换句话说就是有想要收数据，就要有人在对面给他发，就像发微信一样。既然这样，就难免曲终人散，对于一个 `Channel`，如果我们调用了它的 `close`，它会立即停止接受新元素，也就是说这时候它的 `isClosedForSend` 会立即返回 `true`，而由于 `Channel` 缓冲区的存在，这时候可能还有一些元素没有被处理完，所以要等所有的元素都被读取之后 `isClosedForReceive` 才会返回 `true`。

```kotlin
val channel = Channel<Int>(3)

val producer = GlobalScope.launch {
    List(5){
        channel.send(it)
        Logger.debug("send $it")
    }
    channel.close()
    Logger.debug("close channel. ClosedForSend = ${channel.isClosedForSend} ClosedForReceive = ${channel.isClosedForReceive}")
}

val consumer = GlobalScope.launch {
    for (element in channel) {
        Logger.debug("receive: $element")
        delay(1000)
    }

    Logger.debug("After Consuming. ClosedForSend = ${channel.isClosedForSend} ClosedForReceive = ${channel.isClosedForReceive}")
}
```

我们把例子稍作修改，开了一个缓冲区大小为 3 的 `Channel`，在 producer 协程里面快速的发送元素出去，发送5个之后关闭 `Channel`，而在 consumer 协程当中每秒读取一个， 结果如下：

```
11:05:20:678 [DefaultDispatcher-worker-1]  send 0
11:05:20:678 [DefaultDispatcher-worker-3]  receive: 0
11:05:20:678 [DefaultDispatcher-worker-1]  send 1
11:05:20:678 [DefaultDispatcher-worker-1]  send 2
11:05:20:678 [DefaultDispatcher-worker-1]  send 3
11:05:21:688 [DefaultDispatcher-worker-3]  receive: 1
11:05:21:688 [DefaultDispatcher-worker-3]  send 4
11:05:21:689 [DefaultDispatcher-worker-3]  close channel. ClosedForSend =true ClosedForReceive = false
11:05:22:693 [DefaultDispatcher-worker-3]  receive: 2
11:05:23:694 [DefaultDispatcher-worker-4]  receive: 3
11:05:24:698 [DefaultDispatcher-worker-4]  receive: 4
11:05:25:700 [DefaultDispatcher-worker-4]  After Consuming. ClosedForSend =true ClosedForReceive = true
```

下面我们来探讨下 `Channel` 关闭的意义。

一说起关闭，我们就容易想到 IO，如果不关闭可能造成资源泄露，那么 `Channel` 的关闭是个什么概念呢？我们前面提到过，`Channel` 其实内部的资源就是个缓冲区，这个东西本质上就是个线性表，就是一块儿内存，所以如果我们开了一个 `Channel` 而不去关闭它，其实也不会造成什么资源泄露，发端如果自己已经发完，它就可以不理会这个 `Channel` 了。嗯，看上去好像没什么问题是吧？

But，这时候在接收端就比较尴尬了，它不知道会不会有数据发过来，如果 `Channel` 是微信，那么接收端打开微信的窗口可能一直看到的是『对方正在输入』，然后它就一直这样了，孤独终老。所以这里的关闭更多像是一种约定：

> 女：咱俩没戏，你别傻等了。
> 男：哦。（您的消息未发送成功）

那么 `Channel` 的关闭究竟应该有谁来处理呢？正常的通信，如果是单向的，就好比领导讲话，讲完都会说『我讲完了』，你不能在领导还没讲完的时候就说『我听完了』，所以单向通信的情况比较推荐由发端处理关闭；而对于双向通信的情况，就要考虑协商了，双向通信从技术上两端是对等的，但业务场景下通常来说不是，建议由主导的一方处理关闭。

还有一些复杂的情况，前面我们看到的例子都是一对一的收发，其实还有一对多，多对多的情况，这种也仍然存在主导一方，`Channel` 的生命周期最好由主导方来维护。官方文档给出的扇入(fan-in)和扇出(fan-out)，其实就是这种情况。

> 扇入和扇出的概念可能大家不是很熟悉，网上的说法不是很通俗，大家就想象它是一把折扇，折扇的边射向圆心就是扇入，这种情况圆心如果是通信的一端，那它就是接收方，如果是一个函数，那它就是被调用方。扇入越大，说明模块的复用程度越高，以函数为例，如果一个函数被调用的次数越多，那说明复用的程度越高。扇出就是反过来的情况，描述的是复杂度高的情形，例如一个 Model，负责调用网络模块、数据库、文件等很多模块。

## 6. BroadcastChannel

前面提到了一对多的情形，从数据处理的本身来讲，虽然有多个接收端，同一个元素只会被一个接收端读到。广播则不然，多个接收端不存在互斥行为。

直接创建 `broadcastChannel` 的方法跟普通的 `Channel` 似乎也没什么太多的不一样：

```kotlin
val broadcastChannel = broadcastChannel<Int>(5)
```

如果要订阅，那么只需要调用：

```kotlin
val receiveChannel = broadcastChannel.openSubscription()
```

这样我们就得到了一个 `ReceiveChannel`，获取订阅的消息，只需要调用它的 `receive`。

我们看一个完整一点儿的例子，例子中我们在发端发送 1 - 5，并启动 3 个协程同时接收广播：

```kotlin
val producer = GlobalScope.launch {
    List(5) {
        broadcastChannel.send(it)
        Logger.debug("send $it")
    }
    channel.close()
}
    
List(3) { index ->
    GlobalScope.launch {
        val receiveChannel = broadcast.openSubscription()
        for (element in receiveChannel) {
            Logger.debug("[$index] receive: $element")
            delay(1000)
        }
    }
}.forEach { it.join() }
    
producer.join()
```

输出结果如下：

```
12:34:59:656 [DefaultDispatcher-worker-6]  [2] receive: 0
12:34:59:656 [DefaultDispatcher-worker-3]  [1] receive: 0
12:34:59:656 [DefaultDispatcher-worker-5]  [0] receive: 0
12:34:59:656 [DefaultDispatcher-worker-7]  send 0
12:34:59:657 [DefaultDispatcher-worker-7]  send 1
12:34:59:658 [DefaultDispatcher-worker-7]  send 2
12:35:00:664 [DefaultDispatcher-worker-3]  [0] receive: 1
12:35:00:664 [DefaultDispatcher-worker-5]  [1] receive: 1
12:35:00:664 [DefaultDispatcher-worker-6]  [2] receive: 1
12:35:00:664 [DefaultDispatcher-worker-8]  send 3
12:35:01:669 [DefaultDispatcher-worker-8]  [0] receive: 2
12:35:01:669 [DefaultDispatcher-worker-3]  [1] receive: 2
12:35:01:669 [DefaultDispatcher-worker-6]  [2] receive: 2
12:35:01:669 [DefaultDispatcher-worker-8]  send 4
12:35:02:674 [DefaultDispatcher-worker-8]  [0] receive: 3
12:35:02:674 [DefaultDispatcher-worker-7]  [1] receive: 3
12:35:02:675 [DefaultDispatcher-worker-3]  [2] receive: 3
12:35:03:678 [DefaultDispatcher-worker-8]  [1] receive: 4
12:35:03:678 [DefaultDispatcher-worker-3]  [0] receive: 4
12:35:03:678 [DefaultDispatcher-worker-1]  [2] receive: 4
```

这里请大家重点关注每一个收端协程都可以读取到每一个元素。

> 日志顺序不能非常直观的反映数据的读写顺序，如果大家自己再次运行，顺序上可能也有出入。

除了直接创建以外，我们也可以直接用前面定义的普通的 `Channel` 来做个转换：

```kotlin
val channel = Channel<Int>()
val broadcast = channel.broadcast(3)
```

其中，参数表示缓冲区的大小。

实际上这里得到的这个 `broadcastChannel` 可以认为与原 `Channel` 是级联关系，这个扩展方法的源码其实很清晰的为我们展示了这一点：

```kotlin
fun <E> ReceiveChannel<E>.broadcast(
    capacity: Int = 1,
    start: CoroutineStart = CoroutineStart.LAZY
): broadcastChannel<E> =
    GlobalScope.broadcast(Dispatchers.Unconfined, capacity = capacity, start = start, onCompletion = consumes()) {
        for (e in this@broadcast) {  //这实际上就是在读取原 Channel
            send(e)
        }
    }
```

哦~原来对于 `BroadcastChannel`，官方也提供类似于 `produce` 和 `actor` 的方式，我们可以通过 `CoroutineScope.broadcast` 来直接启动一个协程，并返回一个 `BroadcastChannel`。

需要注意的是，从原始的 `Channel` 转换到 `BroadcastChannel` 其实就是对原 `Channel` 的一个读取操作，如果还有其他协程也在读这个原始的 `Channel`，那么会与 `BroadcastChannel` 产生互斥关系。

另外，`BroadcastChannel` 相关的 API 大部分被标记为 `ExperimentalCoroutinesApi`，后续也许还会有调整。

## 7. Channel 版本的序列生成器

前面的文章我们讲到过 `Sequence`，它的生成器是基于标准库的协程的 API 实现的，实际上 `Channel` 本身也可以用来生成序列，例如：

```kotlin
val channel = GlobalScope.produce(Dispatchers.Unconfined) {
    Logger.debug("A")
    send(1)
    Logger.debug("B")
    send(2)
    Logger.debug("Done")
}

for (item in channel) {
    Logger.debug("Got $item")
}
```

有了前面的基础这个就很容易看懂了，`produce` 创建的协程返回了一个缓冲区大小为 0 的 `Channel`，为了问题描述起来比较容易，我们传入了一个 `Dispatchers.Unconfined` 调度器，意味着协程会立即在当前协程执行到第一个挂起点，所以会立即输出 `A` 并在 `send(1)` 处挂起，直到后面的 for 循环读到第一个值时，实际上就是 `channel` 的 `iterator` 的 `hasNext` 方法的调用，这个 `hasNext` 方法会检查是否有下一个元素，是一个挂起函数，在检查的过程中就会让前面启动的协程从 `send(1)` 挂起的位置继续执行，因此会看到日志 `B` 输出，然后再挂起到 `send(2)` 这里，这时候 `hasNext` 结束挂起，for 循环终于输出第一个元素，依次类推。输出结果如下：

```
22:33:56:073 [main @coroutine#1]  A
22:33:56:172 [main @coroutine#1]  B
22:33:56:173 [main]  Got 1
22:33:56:173 [main @coroutine#1]  Done
22:33:56:176 [main]  Got 2
```

我们看到 `B` 居然比 `Got 1` 先输出，同样，`Done` 也比 `Got 2` 先输出，这个看上去比较不符合直觉，不过挂起恢复的执行顺序确实如此，关键点就是我们前面提到的 `hasNext` 方法会挂起并触发了协程内部从挂起点继续执行的操作。如果你选择了其他调度器，当然也会有其他合理的结果输出。不管怎么样，我们体验了一把用 `Channel` 模拟 `sequence`。如果类似的代码换作 `sequence`，是这样的：

```kotlin
val sequence = sequence {
    Logger.debug("A")
    yield(1)
    Logger.debug("B")
    yield(2)
    Logger.debug("Done")
}

Logger.debug("before sequence")

for (item in sequence) {
    Logger.debug("Got $item")
}
```

`sequence` 的执行顺序要直观的多，它没有调度器的概念，而且 `sequence` 的 `iterator` 的 `hasNext` 和 `next` 都不是挂起函数，在 `hasNext` 的时候同样会触发元素的查找，这时候就会触发 `sequence` 内部逻辑的执行，因此这次实际上是先触发了 `hasNext` 才会输出 A，`yield` 把 1 传出来作为 `sequence` 的第一个元素，这样就会有 Got 1 这样的输出，完整输出如下：

```kotlin
22:33:55:600 [main]  A
22:33:55:603 [main]  Got 1
22:33:55:604 [main]  B
22:33:55:604 [main]  Got 2
22:33:55:604 [main]  Done
```

`sequence` 本质上就是基于标准库的协程 API 实现的，没有上层协程框架的作用域以及 Job 这样的概念。

所以我们可以在 `Channel` 的例子里面切换不同的调度器来生成元素，例如：

```kotlin
val channel = GlobalScope.produce(Dispatchers.Unconfined) {
    Logger.debug(1)
    send(1)
    withContext(Dispatchers.IO){
        Logger.debug(2)
        send(2)
    }
    Logger.debug("Done")
}
```

sequence 就不行了。

当然，单纯的用 `Channel` 当做序列生成器来使用有点儿小题大做，这里更多的是告诉大家存在这样的可能性，大家在将来遇到合适的场景时，就可以灵活运用了。

## 8. Channel 的内部结构

前面我们提到 `sequence` 无法享受更上层的协程框架概念下的各种能力，还有一点 `sequence` 显然不是线程安全的，而 `Channel` 可以在并发场景下使用。

`Channel` 内部结构我们主要说下缓冲区分别是链表和数组的版本。链表版本的定义主要是在 `AbstractSendChannel` 当中：

```kotlin
internal abstract class AbstractSendChannel<E> : SendChannel<E> {
    protected val queue = LockFreeLinkedListHead()
    ...    
}
```

`LockFreeLinkedListHead` 本身其实就是一个双向链表的节点，实际上 `Channel` 把它首尾相连成为了循环链表，而这个 `queque` 就是哨兵(sentinel)节点。有新的元素添加时，就在 `queue` 的前面插入，实际上就相当于在整个队列的最后插入元素了。

它所谓的 `LockFree` 在 Java 虚拟机上其实是通过原子读写来实现的， 对于链表来说，需要修改的无非就是前后节点的引用：

```kotlin
public actual open class LockFreeLinkedListNode {
    private val _next = atomic<Any>(this) // Node | Removed | OpDescriptor
    private val _prev = atomic<Any>(this) // Node | Removed
    ...   
}
```

它的实现基于一篇论文中提到的无锁链表的实现，由于 CAS 原子操作通常只能修改一个引用，对于需要原子同时修改前后节点引用的情形是不适用的，例如单链表插入节点时需要修改两个引用，分别是操作节点的前一个节点的 next 和自己的 next，即 Head -> A -> B -> C 在 A 、B 之间插件 X 时会需要先修改 X -> B 再修改 A -> X，如果这个过程中 A 被删除，那么可能的结果是 X 一并被删除，得到的链表是 Head -> B -> C。

这个无锁链表的实现通过引入 prev 来辅助解决这个问题，即在 A 被删除的问题发生的同时，其实我们是可以做到 X.next = B，X.prev = A 的，这时候判断如果 A 已经被移除了，那么 B.prev 本来是 A，结果就变成了 Head，这时候就可以将 X.prev 再次赋值为 B.prev 来修复，当然这个过程稍稍有些复杂，有兴趣的同学也可以参考 `LockFreeLinkedListNode` 在 Jvm 上的实现。

而对于数组版本，`ArrayChannel` 就相对粗暴了，内部就是一个数组：

```kotlin
//缓冲区大小大于 8，会先分配大小为 8 的数组，在后续进行扩容
private var buffer: Array<Any?> = arrayOfNulls<Any?>(min(capacity, 8))
```
对这个数组读写时则直接用了一个 `ReentrantLock` 进行加锁。

这里是不是有优化的空间呢？其实对于数组的元素，我们同样可以进行 CAS 读写，如果大家有兴趣，可以参考下 `ConcurrentHashMap` 的实现，JDK 7 的实现中对于段数组的读写采用了 `UnSafe` 的 CAS 读写，JDK 1.8 直接干掉了分段，对于桶的读写也采用了 `UnSafe` 的 CAS。

> 协程在 Js 和 Native 上的实现就要简单得多，因为它们的协程都只是在单线程上运行，基本不需要处理并发问题。

## 9. 小结

`Channel` 的出现，应该说为协程注入了灵魂。每一个独立的协程不再是孤独的个体，`Channel` 可以让他们更加方便的协作起来。实际上 `Channel` 的概念并不是 Kotlin 原创的，且不说 Golang 里面的 `channel`，就说 Java NIO 当中也存在 `Channel` 这样的概念，其实这时候大家很容易就应该想到多路复用，多路复用的时候我们还能像前面那样简单的挂起吗？或者不挂起我们该怎么办呢？且看下回分解。


