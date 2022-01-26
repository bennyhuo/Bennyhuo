# 闲话 Swift 协程（5）：Task 的取消

**Swift Swift5.5**

> 但凡是个任务，就有可能被取消。取消了该怎么办呢？

==  Swift|Coroutines|async await ==

## Task 的取消就是个状态

Task 的取消其实非常简单，就是将 Task 标记为取消状态。那 Task 的执行体要怎么做才能让任务真正取消呢？我们先看个简单的例子：

```swift
let task = Task {
    print("task start")
    await Task.sleep(10_000_000_000)
    print("task finish")
}

await Task.sleep(500_000_000)
task.cancel()
print(await task.result)
```

我们创建了一个 Task，正常情况下它应该很快被执行到，因此第一行日志可以打印出来，随即进入 10s 的睡眠状态。但我们在 Task 外部等了 500ms 之后把它取消了，如果不出什么意外的话，在 Task 睡眠时它就被取消了。

既然任务被取消了，凭我们主观的判断，第二句日志应该是打印不出来的，但实际的情况却是：

```
task start
task finish
success()
```

这说明 Task 的取消只是一个状态标记，它不会强制 Task 的执行体中断，换句话说 Task 的取消并不像杀进程那样粗暴。

实际上，我们可以在任务的执行体当中读取到 Task 的取消状态，我们把程序稍作修改如下：

```swift
let task = Task {
    log("task start")
    await Task.sleep(10_000_000_000)
    log("task finish, isCancelled: \(Task.isCancelled)")
}

await Task.sleep(500_000_000)
task.cancel()
log(await task.result)
```

运行结果如下：

```
task start
task finish, isCancelled: true
success()
```

可以看到，Task 确实被取消了，我们也可以读取到这个状态，如果我们需要让我们的 Task 执行体响应它的取消状态，那就需要做出这个状态的判断，并且做出响应，例如：

```swift
Task {
    if !Task.isCancelled {
        log("task start")
        await Task.sleep(10_000_000_000)
        if !Task.isCancelled {
            log("task finish, isCancelled: \(Task.isCancelled)")
        }
    }
}
```

当然，这个例子还不够理想，毕竟睡眠的 10s 是不能响应取消的。那如果让 sleep 函数内部也能响应取消，问题是不是就解决了？

## 通过抛 CancellationError 来响应取消

Task 的执行过程中，难免会存在多层异步函数的嵌套的情况，如果最深处的某一个函数响应了取消状态，怎样才能让外部的异步函数也能很好的配合好这个响应？这其实就是在回答上一节留下的 sleep 该如何响应取消的问题。如果想要优雅地给出这个答案，只能通过抛异常的方式了，因为任何条件分支的判断都无法实现有效的传播，而异常天然就具备这样的特性。

所以常见的异常响应方式非常简单，如果你在编写一个需要响应取消状态的异步函数，当你检查到 Task 被取消时，只需要抛一个 `CancellationError` 即可，大家都遵守这个规则，那么这个 Task 就能被优雅地结束。

实际上 Task 一共有两个 sleep 函数，我们仔细对比一下它们的定义：

```swift
public static func sleep(_ duration: UInt64) async
public static func sleep(nanoseconds duration: UInt64) async throws
```

二者的区别有两处：
* 参数的 label
* 是否会抛出异常

第二个函数明确通过参数的 label 告诉我们参数是纳秒，同时它还会抛出异常。什么异常？自然是在 Task 被取消时抛出 `CancellationError`。这么看来我们只需要稍微调整一下代码就能完美解决问题：

```swift
let task = Task {
    log("task start")
    try await Task.sleep(nanoseconds: 10_000_000_000)
    log("task finish, isCancelled: \(Task.isCancelled)")
}

await Task.sleep(500_000_000)
task.cancel()
log(await task.result)
```

运行结果如下：

```
task start
failure(Swift.CancellationError())
```

符合预期。

实际上，如果大家仔细查阅 Swift 的文档，你就会发现第一个 sleep 函数已经被废弃了，它的问题想必大家也已经非常明白了吧。

## checkCancellation：更方便地检查取消状态

前面的例子我们算是躺赢了，但如果实际的代码是下面这样呢？

```swift
let task = Task {
    log("task start")
    for i in 0...10000 {
        doHardWork(i) 
    }
    log("task finish, isCancelled: \(Task.isCancelled)")
}
```

不难，我们只需要加个判断嘛，这样在每次循环的开始，如果 Task 已经被取消，我们就能够及时地停止这个任务的执行：

```swift
let task = Task {
    log("task start")
    for i in 0...10000 {
        if Task.isCancelled {
            throw CancellationError()
        }
        doHardWork(i)
    }
    log("task finish, isCancelled: \(Task.isCancelled)")
}
```

其实，这里有个更方便的写法：

```swift
let task = Task {
    log("task start")
    for i in 0...10000 {
        try Task.checkCancellation()
        doHardWork(i)
    }
    log("task finish, isCancelled: \(Task.isCancelled)")
}
```

这个函数也没啥神秘的，因为它的实现非常直接：

```swift
public static func checkCancellation() throws {
    if Task<Never, Never>.isCancelled {
        throw _Concurrency.CancellationError()
    }
}
```

## 注册取消回调

前面提到的响应取消的情况实际上是两种类型：
* 调用其他支持响应取消的异步函数，在取消时它会抛出 CancellationError
* 自己的代码当中主动检查取消状态，并抛出 CancellationError（或者直接退出执行逻辑）

在真实的业务场景中，其实还有一种情况，解决起来要稍微复杂一些，例如：

```swift

```

## 小结

本文我们简单介绍了一下 TaskGroup 的用法，大家可以基于这些内容开始做一些简单的尝试了。结构化并发当中还有一些重要的概念我们将在接下来的几篇文章当中逐步介绍。