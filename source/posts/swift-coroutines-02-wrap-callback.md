# 闲话 Swift 协程（2）：将回调改写成 async 函数

**Swift Swift5.5**

> 最理想的情况下，系统、第三方框架当中使用回调的 API 都最好在一夜之间改成 async 函数，显然这不太现实。

==  Swift|Coroutines|async await ==

- [闲话 Swift 协程（1）：Swift 协程长什么样？](https://www.bennyhuo.com/2021/10/11/swift-coroutines-01-intro/)
- [闲话 Swift 协程（2）：将回调改写成 async 函数](https://www.bennyhuo.com/2021/10/13/swift-coroutines-02-wrap-callback/)
- [闲话 Swift 协程（3）：在程序当中调用异步函数](https://www.bennyhuo.com/2022/01/21/swift-coroutines-03-call-async-func/)
- [闲话 Swift 协程（4）：TaskGroup 与结构化并发](https://www.bennyhuo.com/2022/01/22/swift-coroutines-04-structured-concurrency/)
- [闲话 Swift 协程（5）：Task 的取消](https://www.bennyhuo.com/2022/01/28/swift-coroutines-05-cancellation/)
- [闲话 Swift 协程（6）：Actor 和属性隔离](https://www.bennyhuo.com/2022/02/12/swift-coroutines-06-actor/)
- [闲话 Swift 协程（7）：GlobalActor 和异步函数的调度](https://www.bennyhuo.com/2022/02/12/swift-coroutines-07-globalactor/)
- [闲话 Swift 协程（8）：TaskLocal](https://www.bennyhuo.com/2022/02/12/swift-coroutines-08-tasklocal/)
- [闲话 Swift 协程（9）：异步函数与其他语言的互调用](https://www.bennyhuo.com/2022/02/16/swift-coroutines-09-interop/)

我们前面已经简单介绍了 Swift 的协程，可以确认的一点是，如果你只是看了上一篇文章，那么你肯定还是不会用这一个特性。你一定还有一些疑问：

* 异步函数是谁提供的？
* 我可以自己定义吗？
* 我该怎么正确地定义一个异步函数？

异步函数谁都可以提供，不然它的应用范围就会大大受限制，因此我们既可以有机会使用到系统或者第三方框架提供的异步函数，也自然有机会自己去定义。那关键的问题就是如何定义异步函数了。

我们先随便定义一个函数：

```swift
func hello() -> Int{
    1
}
```

这个函数返回了一个整数 1。接下来我们把它改造成异步函数，只需要加上 async 关键字：

```swift
func hello() async -> Int{
    1
}
```

那么，它现在真的是异步的吗？当然不是，它只是长得像罢了。

async 关键字并不会真正带来异步，那么异步的能力是谁提供的？这时候我们就要想想，过去我们见到的异步函数都是什么样的：

```swift
func helloAsync(onComplete: @escaping (Int) -> Void) {
    DispatchQueue.global().async {
        onComplete(Int(arc4random()))
    }
}
```

这是一个很简单的例子，我们在 helloAsync 当中通过 DispatchQueue 将代码逻辑调度到 global() 上，使得回调 onComplete 的调用脱离了 helloAsync 的调用栈。调用这个函数的样子就像这样：

```swift
helloAsync { result in
    print("Got result from callback: \(result)")
}
```

这么看来，我们在异步函数当中都应该有这么个切换调用栈的过程，并且有个类似于回调的东西将结果能传递出去。那在 Swift 协程当中，谁来扮演这个角色呢？

这里就要稍微提一下 Swift 协程的设计原理了。它采用了一种叫做 Continuation Passing Style 的设计思路（熟悉 Kotlin 的朋友是不是觉得非常熟悉？），而这个所谓的Continuation 就充当了回调的作用。我们把 Swift 标准库当中提供的 Continuation 的定义给出来，大家简单了解一下它的形式即可：

```swift
@frozen public struct UnsafeContinuation<T, E> where E : Error {

    public func resume(returning value: T) where E == Never

    public func resume(returning value: T)

    public func resume(throwing error: E)
}
```

注意到它实际上有两种类型的函数，一种是 returning，一种是 throwing。也就是说，对于任何一段代码逻辑，其执行的结果都无非返回结果和抛出异常两种。Continuation 其实就是描述协程当中异步代码在挂起点的状态，而当程序需要恢复执行时，调用它对应的 resume 函数即可。

好了，现在我们知道有了 Continuation 这个东西了，相当于我们已经知道对于 Swift 的 async 函数而言，我们可以通过 Continuation 来传递异步结果。那么下一个问题就是如何获取这个 Continuation 的实例呢？Swift 标准库提供了相应的函数来做到这一点：

```swift 
public func withCheckedContinuation<T>(
    function: String = #function, 
    _ body: (CheckedContinuation<T, Never>) -> Void
) async -> T

public func withCheckedThrowingContinuation<T>(
    function: String = #function, 
    _ body: (CheckedContinuation<T, Error>) -> Void
) async throws -> T
```

如果我们的异步函数不会抛出异常，那就用 withCheckedContinuation 来获取 Continuation；如果会抛出异常，那就用 withCheckedThrowingContinuation。这么看来，改造前面的回调的方法就显而易见了：

```swift
func helloAsync() async -> Int {
    await withCheckedContinuation { continuation in
        DispatchQueue.global().async {
            continuation.resume(returning: Int(arc4random()))
        }
    }
}
```

如果需要抛出异常，那么：

```swift
func helloAsyncThrows() async throws -> Int {
    try await withCheckedThrowingContinuation { continuation in
        DispatchQueue.global().async {
            do {
                let result = try doSomethingThrows() // 可能抛异常
                continuation.resume(returning: result)
            } catch {
                continuation.resume(throwing: error)
            }
        }
    }
}
```

注意 Swift 要求对于标记为 throws 的函数需要使用 try 关键字来调用。

好了，现在我们已经学会如何将异步回调转成异步函数了，距离最终的目标又近了一步。下一篇文章当中我们将介绍如何从程序入口调用异步函数，试着把程序跑起来。