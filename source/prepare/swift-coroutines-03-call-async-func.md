# 闲话 Swift 协程（3）：在程序当中调用异步函数

**Swift Swift5.5**

> 异步函数需要被异步函数调用，这听上去就是一个鸡生蛋蛋生鸡的问题。关键的问题在于，第一个异步函数从哪儿来？

==  Swift|Coroutines|async await ==

我们现在已经知道怎么定义异步函数了，也可以很轻松的转换将现有的异步回调 API 转成异步函数。那下一个问题就是，既然普通函数不能调用异步函数，那定义好的这些异步函数该从哪儿开始调用呢？

其实从上一节我们分析如何将回调转成异步函数的时候就已经发现，异步函数的关键在于 Continuation。所以，只要调用异步函数的位置能让异步函数获取到 Continuation，那么调用异步函数的问题就解决了。Swift 标准库提供了 Task 类来提供这个能力。

我们给出 Task 的构造器的定义：

```swift
public init(
    priority: _Concurrency.TaskPriority? = nil, 
    operation: @escaping @Sendable () async -> Success)

public init(
    priority: _Concurrency.TaskPriority? = nil, 
    operation: @escaping @Sendable () async throws -> Success)
```

它接收一个异步闭包作为参数，创建一个 Task 实例并运行这个异步闭包。而在这个闭包当中，我们就可以调用任意异步函数了：

```swift
Task {
    let result = await helloAsync()
    print(result)
}
```

Task 本身也有结果，因此如果我们乐意，我们也可以在其他异步函数当中使用 await 来获取它的结果：

```swift
let task = Task {
    await helloAsync()
}

print(try await task.value)
```

这里由于 value 可能会抛出异常，因此需要用 try 关键字来调用。

除了直接构造 Task 之外，还可以调用 Task 的 detach 函数来创建一个不一样的 Task：

```swift
Task.detached (operation: {
    await helloAsync()
})
```

这个函数返回的也是一个 Task 实例，我们不妨看一下它的定义：

```swift
public static func detached(
    priority: _Concurrency.TaskPriority? = nil, 
    operation: @escaping @Sendable () async -> Success
) -> _Concurrency.Task<Success, Failure>

public static func detached(
    priority: _Concurrency.TaskPriority? = nil, 
    operation: @escaping @Sendable () async throws -> Success
) -> _Concurrency.Task<Success, Failure>
```

注意到它其实是 Task 的静态函数，返回值正是 Task 类型。

那通过 detach 创建的 Task 和直接使用 Task 的构造器创建的 Task 实例有什么不同呢？