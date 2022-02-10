# 闲话 Swift 协程（7）：GlobalActor 和异步函数的调度

**Swift Swift5.5**

> 我们已经知道可以使用 actor 来确保数据的线程安全，但对于数据的保护总是需要定义专门的 actor 实例是不是太麻烦了一些？

==  Swift|Coroutines|async await ==

## 什么是 GlobalActor

前面我们为了保护特定的状态，就把这些状态包装到一个特定的 actor 实例当中，保护的方式就是将对于这些状态的访问调度到相应的 actor 的调度器当中串行执行。

那么问题来了，如果我有很多分散到不同类甚至不同模块的状态，希望统一调度，该怎么办？最典型的例子就是将 UI 操作调度到主线程，UI 本身就分散在不同的组件当中，对于 UI 的操作更是如此。为了应对这种场景，Swift 在提供了 actor 的基础上又进一步提供了 GlobalActor，旨在提供全局统一的执行调度。

## Actor 的 executor 与协程的调度

我们在最一开始就提到 actor 有一个很重要的东西就是 executor，因为 actor 之所以能确保数据的安全性，靠的就是这个串行处理”邮件“的 executor。

那么问题来了，actor 的 executor 是什么？

```swift
public protocol Actor : AnyObject, Sendable {
    nonisolated var unownedExecutor: _Concurrency.UnownedSerialExecutor { get }
}
```

其实在 `Actor` 协议当中还定义了一个只读属性 unownedExecutor，这就是用于处理”邮件”的那个 executor 了。这个属性由 Swift 编译器隐式提供，并在异步访问 actor 的状态时使用，无需开发者直接使用。

这里就涉及到我们的异步函数到底执行在哪里的问题了，也就是协程的调度问题。

Swift 的协程在这个问题上目前还比较含蓄，文档当中很少提及异步函数的执行以及异步函数返回时如何恢复。实际上，异步函数所在的调用位置会关联一个调度器，这个调度器要么来自于所在的 Task，要么来自于当前函数所属于的 actor 实例。

Swift 定义了两个默认的调度器，一个是并发的，一个是串行的；另外，还有一个主线程的调度器用于将异步函数调度到主线程上。

下面的例子当中，我们使用 @MainActor 修饰函数 calledOnMain：

```swift
@MainActor func calledOnMain() {
    log("onMain")
}
```

接下来创建一个 Task 来调用它：

```swift
Task { () -> Int in
    log("task start")
    await calledOnMain()
    log("task end")
    return 1
}
```

这里我们使用 log 这个定义的函数来打印输出，它与 print 的不同之处在于它会同时打印当前线程：

```swift
[<NSThread: 0x6000015c41c0>{number = 2, name = (null)}] task start
[<_NSMainThread: 0x6000015c4080>{number = 1, name = main}] onMain
[<NSThread: 0x6000015c41c0>{number = 2, name = (null)}] task end
```

可以看到，calledOnMain 被调度到了 MainThread 上执行。task start 和 task end 执行所在的线程相同（当然也可以不同，但一定是相同的调度器所属的线程），这说明 calledOnMain 返回之后 Task 又被调度与之关联的调度器上执行。

@MainActor 也可以被用于修饰闭包的类型，例如：

```swift
func runOnMain(block: @MainActor @escaping () async -> Void) async {
    log("runOnMyExecutor start")
    await block()
    log("runOnMyExecutor end")
}
```

我们试着调用一下这个函数：

```swift
Task { () -> Int in
    log("task start")
    await runOnMain {
        log("on main")
    }
    log("task end")
    return 1
}
```

运行结果如下：

```swift
[<NSThread: 0x600000ac8480>{number = 2, name = (null)}] task start
[<NSThread: 0x600000ac8480>{number = 2, name = (null)}] runOnMain before
[<_NSMainThread: 0x600000ac8380>{number = 1, name = main}] on main
[<NSThread: 0x600000ac8480>{number = 2, name = (null)}] runOnMain after
[<NSThread: 0x600000ac8480>{number = 2, name = (null)}] task end
```

这次只有 block 才会被调度到 MainThread 上，因为只有它被 @MainActor 修饰。

从这个例子当中我们其实还能推测出调度发生的位置，即：
* 异步函数开始执行
* 异步函数返回之处

实际上除此之外，Task 开始时也可能会发生一次调度。这些都是可能的调度位置，Swift 的运行时会根据实际情况判断调度前后是不是属于同一个调度器，以决定是不是真的需要发生调度。这些也能从我们待会儿的例子当中得到印证。

接下来我们试着自己定义一个调度器。请注意，Swift 协程对于自定义调度器的支持还在提案阶段（细节可参见：[Custom Executors](https://github.com/rjmccall/swift-evolution/blob/custom-executors/proposals/0000-custom-executors.md)），因此下面的代码也许在将来的版本当中会不被支持。

首先我们参照 `Actor` 协议当中的要求，定义一个 `SerialExecutor`：

```swift
final class MyExecutor : SerialExecutor {

    // 自定义 DispatchQueue，用于真正地调度异步函数
    private static let dispatcher: DispatchQueue = DispatchQueue(label: "MyActor")

    // 需要调度时，Swift 的协程运行时会创建一个 UnownedJob 实例调用 enqueue 进行调度
    func enqueue(_ job: UnownedJob) {
        log("enqueue")
        MyExecutor.dispatcher.async {
            // 执行这个 job
            job._runSynchronously(on: self.asUnownedSerialExecutor())
        }
    }

    // 获取 unowned 引用，得到 UnownedSerialExecutor 实例
    func asUnownedSerialExecutor() -> UnownedSerialExecutor {
        UnownedSerialExecutor(ordinary: self)
    }
}
```

接下来我们给出 actor 的定义：

```swift
@globalActor actor MyActor: GlobalActor {

    // 实现 GlobalActor 协议当中的 associatedtype
    public typealias ActorType = MyActor

    // 实现 GlobalActor 当中的 shared，返回一个全局共享的 MyActor 实例
    static let shared: MyActor = MyActor()

    private static let _sharedExecutor = MyExecutor()

    // 实现 GlobalActor 当中的 sharedUnownedExecutor，返回自己的调度器
    static let sharedUnownedExecutor: UnownedSerialExecutor = _sharedExecutor.asUnownedSerialExecutor()

    // 显示实现 Actor 协议当中的调度器，避免让编译器自动生成
    let unownedExecutor: UnownedSerialExecutor = sharedUnownedExecutor
}
```

注意到 `MyActor` 实现了 `GlobalActor` 这个协议，这个写法实际上是参照 `MainActor` 完成的。此外，我们还使用 `@globalActor` 来修饰 `MyActor`，这样我们就可以用 `@MyActor` 像 `@MainActor` 那样去修饰函数，并让它调度到我们自己实现的调度器上了。

参照前面讲 `MainActor` 的例子，我们给出使用自定义调度器的类似的函数定义：

```swift
func runOnMyExecutor(block: @MyActor @escaping () async -> Void) async {
    log("runOnMyExecutor start")
    await block()
    log("runOnMyExecutor end")
}

@MyActor func calledOnMyExecutor() {
    log("onMyExecutor")
}
```

接下来调用它们：

```swift
Task { () -> Int in
    log("task start")
    await calledOnMyExecutor()

    await runOnMyExecutor {
        log("on MyExecutor before sleep")
        await Task.sleep(1000_000_000)
        log("on MyExecutor after sleep")
    }
    log("task end")
    return 1
}
```

运行结果如下：

```swift
[<NSThread: 0x600003eb4040>{number = 2, name = (null)}] task start
[<NSThread: 0x600003eb4040>{number = 2, name = (null)}] enqueue
[<NSThread: 0x600003eb4040>{number = 2, name = (null)}] onMyExecutor
[<NSThread: 0x600003eb4040>{number = 2, name = (null)}] runOnMyExecutor start
[<NSThread: 0x600003eb4040>{number = 2, name = (null)}] enqueue
[<NSThread: 0x600003eb4040>{number = 2, name = (null)}] on MyExecutor before sleep
[<NSThread: 0x600003eb8040>{number = 3, name = (null)}] enqueue
[<NSThread: 0x600003eb8040>{number = 3, name = (null)}] on MyExecutor after sleep
[<NSThread: 0x600003eb8040>{number = 3, name = (null)}] runOnMyExecutor end
[<NSThread: 0x600003eb8040>{number = 3, name = (null)}] task end
```

注意到 `calledOnMyExecutor` 调用时、`runOnMyExecutor` 当中的 `block` 执行时、`block` 当中的 sleep 之后恢复时分别执行了一次 `enqueue`。大家有兴趣的话也可以在其中穿插一些需要调度到主线程的函数调用，看看实际的调度情况。

关于调度器，我们再给出最后一组示例。我们在前面介绍 Task 的构造时，讲到过可以使用 `init` 和 `detached` 两种方式来构造 Task 实例，前者会继承外部的环境，包括 actor、TaskLocal 等，后者则不会。下面的例子将会证明这一点：

```swift
Task { () -> Int in
    log("task start")
    await runOnMain {
        await Task {
            log("task in runOnMain")
        }.value

        await Task.detached {
            log("detached task in runOnMain")
        }.value
    }
    log("task end")
    return 1
}
```

通过前面的介绍，我们已经知道 runOnMain 的参数 block 会被调度到 MainThread 上执行，那么其中的两个 `Task` 的日志输出理论上会有不同的表现：

```swift
[<NSThread: 0x600001520180>{number = 2, name = (null)}] task start
[<NSThread: 0x600001520180>{number = 2, name = (null)}] runOnMyExecutor start
[<_NSMainThread: 0x600001520080>{number = 1, name = main}] task in runOnMain
[<NSThread: 0x600001520180>{number = 2, name = (null)}] detached task in runOnMain
[<_NSMainThread: 0x600001520080>{number = 1, name = main}] runOnMyExecutor end
[<_NSMainThread: 0x600001520080>{number = 1, name = main}] task end
```

实际上也正是如此，`task in runOnMain` 打印到了 MainThread 上，而 `detached task in runOnMain` 因为通过 `detached` 创建的 `Task` 实例不会继承外部的 actor（以及其调度器），因此打印到了其他线程上（也就是默认的调度器上）。

当然，这里自定义调度器的做法仅仅是为了研究，代码实现不一定严谨，更何况官方目前也没有给出明确推荐的途径。让我们期待 [Custom Executors](https://github.com/rjmccall/swift-evolution/blob/custom-executors/proposals/0000-custom-executors.md) 的后续进展吧。

## 小结

本文我们详细介绍了 Swift 协程当中对于 actor 的实现细节，包括属性隔离的运用、对 Sendable 协议的支持以及调度器的介绍。至此，读者已经接触到了 Swift 协程当中绝大多数的特性。