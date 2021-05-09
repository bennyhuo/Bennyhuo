# 破解 Kotlin 协程(7) - 序列生成器篇 

**Kotlin 协程 序列 Sequence**

> 说出来你可能不信，Kotlin 1.1 协程还在吃奶的时候，Sequence 就已经正式推出了，然而，Sequence 生成器的实现居然有协程的功劳。

## 1. 认识 Sequence

在 Kotlin 当中，Sequence 这个概念确切的说是“懒序列”，产生懒序列的方式可以有多种，下面我们介绍一种由基于协程实现的序列生成器。需要注意的是，这个功能内置于 Kotlin 标准库当中，不需要额外添加依赖。

下面我们给出一个斐波那契数列生成的例子：

```kotlin
 val fibonacci = sequence {
    yield(1L) // first Fibonacci number
    var cur = 1L
    var next = 1L
    while (true) {
        yield(next) // next Fibonacci number
        val tmp = cur + next
        cur = next
        next = tmp
    }
}

fibonacci.take(5).forEach(::log)
```

这个 `sequence` 实际上也是启动了一个协程，`yield` 则是一个挂起点，每次调用时先将参数保存起来作为生成的序列迭代器的下一个值，之后返回 `COROUTINE_SUSPENDED`，这样协程就不再继续执行，而是等待下一次 `resume` 或者 `resumeWithException` 的调用，而实际上，这下一次的调用就在生成的序列的迭代器的 `next()` 调用时执行。如此一来，外部在遍历序列时，每次需要读取新值时，协程内部就会执行到下一次 `yield` 调用。

程序运行输出的结果如下：

```
10:44:34:071 [main] 1
10:44:34:071 [main] 1
10:44:34:071 [main] 2
10:44:34:071 [main] 3
10:44:34:071 [main] 5
```

除了使用 `yield(T)` 生成序列的下一个元素以外，我们还可以用 `yieldAll()` 来生成多个元素：

```kotlin
val seq = sequence {
    log("yield 1,2,3")
    yieldAll(listOf(1, 2, 3))
    log("yield 4,5,6")
    yieldAll(listOf(4, 5, 6))
    log("yield 7,8,9")
    yieldAll(listOf(7, 8, 9))
}

seq.take(5).forEach(::log)
```

从运行结果我们可以看到，在读取 4 的时候才会去执行到 `yieldAll(listOf(4, 5, 6))`，而由于 7 以后都没有被访问到，`yieldAll(listOf(7, 8, 9))` 并不会被执行，这就是所谓的“懒”。

```
10:44:34:029 [main] yield 1,2,3
10:44:34:060 [main] 1
10:44:34:060 [main] 2
10:44:34:060 [main] 3
10:44:34:061 [main] yield 4,5,6
10:44:34:061 [main] 4
10:44:34:066 [main] 5
```

## 2. 深入序列生成器

前面我们已经不止一次提到 `COROUTINE_SUSPENDED` 了，我们也很容易就知道 `yield` 和 `yieldAll` 都是 suspend 函数，既然能做到”懒“，那么必然在 `yield` 和 `yieldAll` 处是挂起的，因此它们的返回值一定是  `COROUTINE_SUSPENDED`，这一点我们在本文的开头就已经提到，下面我们来见识一下庐山真面目：

```kotlin
override suspend fun yield(value: T) {
    nextValue = value
    state = State_Ready
    return suspendCoroutineUninterceptedOrReturn { c ->
        nextStep = c
        COROUTINE_SUSPENDED
    }
}
```

这是 `yield` 的实现，我们看到了老朋友 `suspendCoroutineUninterceptedOrReturn`，还看到了 `COROUTINE_SUSPENDED`，那么挂起的问题就很好理解了。而 `yieldAll` 是如出一辙：

```kotlin
override suspend fun yieldAll(iterator: Iterator<T>) {
    if (!iterator.hasNext()) return
    nextIterator = iterator
    state = State_ManyReady
    return suspendCoroutineUninterceptedOrReturn { c ->
        nextStep = c
        COROUTINE_SUSPENDED
    }
}
```

唯一的不同在于 `state` 的值，一个流转到了 `State_Ready`，一个是 `State_ManyReady`，也倒是很好理解嘛。

那么现在就剩下一个问题了，既然有了挂起，那么什么时候执行 `resume` ？这个很容易想到，我们在迭代序列的时候呗，也就是序列迭代器的 `next()` 的时候，那么这事儿就好办了，找下序列的迭代器实现即可，这个类型我们也很容易找到，显然 `yield` 就是它的方法，我们来看看 `next` 方法的实现：

```kotlin
override fun next(): T {
    when (state) {
        State_NotReady, State_ManyNotReady -> return nextNotReady() // ①
        State_ManyReady -> { // ②
            state = State_ManyNotReady
            return nextIterator!!.next()
        }
        State_Ready -> { // ③
            state = State_NotReady
            val result = nextValue as T
            nextValue = null
            return result
        }
        else -> throw exceptionalState()
    }
}
```

我们来依次看下这三个条件：

* ① 是下一个元素还没有准备好的情况，调用 `nextNotReady` 会首先调用 `hasNext` 检查是否有下一个元素，检查的过程其实就是调用 `Continuation.resume`，如果有元素，就会再次调用 `next`，否则就抛异常
* ② 表示我们调用了 `yieldAll`，一下子传入了很多元素，目前还没有读取完，因此需要继续从传入的这个元素集合当中去迭代
* ③ 表示我们调用了一次 `yield`，而这个元素的值就存在 `nextValue` 当中

`hasNext` 的实现也不是很复杂：

```kotlin
override fun hasNext(): Boolean {
    while (true) {
        when (state) {
            State_NotReady -> {} // ①
            State_ManyNotReady -> // ②
                if (nextIterator!!.hasNext()) {
                    state = State_ManyReady
                    return true
                } else {
                    nextIterator = null
                }
            State_Done -> return false // ③
            State_Ready, State_ManyReady -> return true // ④
            else -> throw exceptionalState()
        }

        state = State_Failed
        val step = nextStep!!
        nextStep = null
        step.resume(Unit)
    }
}
```

我们在通过 `next` 读取完一个元素之后，如果已经传入的元素已经没有剩余，状态会转为 `State_NotReady`，下一次取元素的时候就会在 `next` 中触发到 `hasNext` 的调用，① 处什么都没有干，因此会直接落到后面的 `step.resume()`，这样就会继续执行我们序列生成器的代码，直到遇到 `yield` 或者 `yieldAll`。

## 3. 小结

序列生成器很好的利用了协程的状态机特性，将序列生成的过程从形式上整合到了一起，让程序更加紧凑，表现力更强。本节讨论的序列，某种意义上更像是生产 - 消费者模型中的生产者，而迭代序列的一方则像是消费者，其实在 kotlinx.coroutines 库中提供了更为强大的能力来实现生产 - 消费者模式，我们将在后面的文章当中展示给大家看。

协程的回调特性可以让我们在实践当中很好的替代传统回调的写法，同时它的状态机特性也可以让曾经的状态机实现获得新的写法，除了序列之外，也许还会有更多有趣的适用场景等待我们去发掘~



