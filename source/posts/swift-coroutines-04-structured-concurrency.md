# 闲话 Swift 协程（4）：TaskGroup 与结构化并发

**Swift Swift5.5**

> 上一篇文章我们提到了结构化并发，这听上去很高级。

==  Swift|Coroutines|async await ==

## TaskGroup 的基本用法

我们现在已经知道怎么在自己的程序里面调用异步函数了。

不难发现，调用异步函数的关键点是创建 Task 的实例。通过 Task 的构造器或者 detach 函数创建的 Task 实例都是顶级的，这意味着这些实例都需要单独管理。在真实的业务场景中，我们难免会创建很多 Task 实例来执行不同的异步任务，但这些任务之间往往都是存在关联的，因此我们绝大多数情况下更希望这些 Task 实例是作为一个或者几个整体来统一管理的。

这就需要 TaskGroup 了。

创建 TaskGroup 的方式非常简单，使用 `withTaskGroup(of:returning:body:)` 函数即可，它的完整定义如下：

```swift
func withTaskGroup<ChildTaskResult, GroupResult>(
    of childTaskResultType: ChildTaskResult.Type, 
    returning returnType: GroupResult.Type = GroupResult.self, 
    body: (inout TaskGroup<ChildTaskResult>) async -> GroupResult
) async -> GroupResult
```
它有三个参数，但实际上前两个其实就是泛型参数，其中

* `ChildTaskResult` 表示这个 TaskGroup 内创建的 Task 的结果类型
* `GroupResult` TaskGroup 自身的结果类型

后者其实也是第三个参数 body 的返回值类型。

注意到 `withTaskGroup` 是异步函数，它会在 TaskGroup 当中所有的子 Task 执行完之后再返回。我们可以在 body 当中向 TaskGroup 当中添加子 Task，用到 addTask 函数：

```swift
public mutating func addTask(
    priority: _Concurrency.TaskPriority? = nil, 
    operation: @escaping @Sendable () async -> ChildTaskResult
)
```

其中：
* priority 是当前任务的优先级
* operation 就是任务的执行体

尽管 `withTaskGroup` 会等待子 Task 执行完，但有些情况下我们希望在 body 当中就提前等待子 Task 的执行结果，这时候我们有两种做法：

* 如果只关心子 Task 是否执行完，可以调用 TaskGroup 的 `waitForAll` 函数。不难想到，这也是一个异步函数。
* 更常见的情况是获取子 Task 的结果，这时候我们可以直接迭代 TaskGroup，或者调用 TaskGroup 的 `next` 函数来获取下一个已完成的子 Task 的结果。注意，获取的结果的顺序取决于子 Task 完成的顺序，而不是它们添加到 TaskGroup 当中的顺序。

## 一个结构化并发的简单示例

下面我们给大家看一个非常简单的异步分段计算的例子：

```swift
// 定义一个计算 [min, max) 范围内整数的和的闭包，注意前闭后开
let add = { (min: Int, max: Int) -> Int in
    var sum = 0
    for i in min..<max {
        sum += i
    }
    return sum
}

let seg = 10 // 分段大小
let n = Int(arc4random_uniform(10000)) // 产生一个随机数，下面计算 [0, n] 内的整数和

let result = await withTaskGroup(of: Int.self, returning: Int.self) { group -> Int in
    // 计算分段和
    for i in 1...(n / seg) {
        group.addTask { add(seg * (i - 1), seg * i) }
    }

    // 如果 n 不能被 seg 整除，计算剩余部分的和
    if n % seg > 0 {
        group.addTask {
            add(n - n % seg, n + 1)
        }
    }

    // 迭代 group 的子任务结果，汇总
    var totalSum = 0
    for await result in group {
        totalSum += result
    }

    return totalSum
}

print(n)
print(result)
```

通过 `withTaskGroup` 创建了一个 TaskGroup 实例，子 Task 的结果类型和 TaskGroup 的类型都是 Int，我们将 [0, n] 的整数按照 seg 进行分段，每段整数的和通过一个子 Task 来完成计算。

由于子 Task 的实例我们是无法直接拿到的，因此我们需要通过 TaskGroup 的实例来获取子任务的结果。通过上面的例子我们不难发现 group 是可以被迭代的，很自然的能想到 TaskGroup 有以下函数：

```swift
public mutating func next() async -> ChildTaskResult?
```

并且实现了 AsyncSequence 协议：

```swift
extension TaskGroup : _Concurrency.AsyncSequence { ... }
```

AsyncSequence 与 Sequence 的不同之处在于它的迭代器的 next 函数是异步函数，这就与前面 TaskGroup 的 next 函数对应上了。

计算 totalSum 除了使用经典的 for 循环以外，我们也可以使用 reduce：

```swift
let totalSum = await group.reduce(0) { acc, i in
    acc + i
}
```

其中 reduce 的第一个参数是初始值，第二个参数是个闭包，它的参数 acc 是累积的结果，i 是当前的元素，返回值则会作为下一个元素调用时的 acc 传入，最终得到的就是所有子 Task 的结果的和。

## 会抛异常的 TaskGroup

大家可能发现了，我们前面创建的 TaskGroup 里面的子 Task 不能抛异常。因此我们很自然的想到还有一套可以抛异常的 TaskGroup 的函数：

```swift
public func withThrowingTaskGroup<ChildTaskResult, GroupResult>(
    of childTaskResultType: ChildTaskResult.Type, 
    returning returnType: GroupResult.Type = GroupResult.self, 
    body: (inout _Concurrency.ThrowingTaskGroup<ChildTaskResult, Error>) async throws -> GroupResult
) async rethrows -> GroupResult
```

通过它创建的 TaskGroup 的类型是：

```swift
@frozen public struct ThrowingTaskGroup<ChildTaskResult, Failure> where Failure : Error
```

ThrowingTaskGroup 与 TaskGroup 的本质是一致的，只不过 ThrowingTaskGroup 的所有成员函数都增加了 throws 关键字。

```swift
do {
    _ = try await withThrowingTaskGroup(of: Int.self) { group -> String in
        try await Task.sleep(nanoseconds: 1000000)
        return "OK"
    }
} catch {
    ...
}
```

注意到 withThrowingTaskGroup 是 rethrows 的，如果闭包参数里面有异常抛出，调用时也需要做异常处理。例子当中调用到了 Task 的 sleep 函数，需要大家注意的是 Task 有两个 sleep 函数，带 nanoseconds 的这个版本是会抛异常的：

```swift
// 参数没有 label，没有标记为 throws，调用时不需要处理异常
public static func sleep(_ duration: UInt64) async

// 参数有 label，标记为 throws
public static func sleep(nanoseconds duration: UInt64) async throws
```

因此这里需要使用 `withThrowingTaskGroup` 来做异常的传递。

除抛异常这个点以外，ThrowingTaskGroup 的用法与 TaskGroup 完全一致。

## 不要把 TaskGroup 的实例泄漏到外部

从前面的例子我们大致可以看出，Swift 的 TaskGroup 的 API 设计还是非常谨慎的，TaskGroup 的实例只有在 `withTaskGroup` 的闭包参数当中使用，外部没有办法直接获取。

那有没有办法能让 TaskGroup 的实例逃逸出这个闭包呢？我们来做一点儿小尝试：

```swift
var taskGroup: TaskGroup<Int>?
_ = await withTaskGroup(of: Int.self) { (group) -> Int in
    taskGroup = group
    group.addTask { 1 }
    return 0
}

guard let group = taskGroup else {
    print("group is nil")
    return
}

for await i in group { 
    print(i)
}
```

我们在闭包外面定义一个变量 taskGroup，在闭包里面给 taskGroup 赋值。接下来我们在外面尝试访问以下 taskGroup 的子任务结果，运行之后就会发现：

```
Process finished with exit code 133 (interrupted by signal 5: SIGTRAP)
```

错误发生的位置就是这里： `for await i in group { ... }`。

为什么会出现异常呢？我们前面提到过， `withTaskGroup` 会在所有的子 Task 执行完以后再返回，这是否意味着 TaskGroup 的实例也会在此时被销毁呢？

遇到这种问题，我们只需要翻阅一下 swift 的源码：

```swift
public func withTaskGroup<ChildTaskResult, GroupResult>(
    of childTaskResultType: ChildTaskResult.Type,
    returning returnType: GroupResult.Type = GroupResult.self,
    body: (inout TaskGroup<ChildTaskResult>) async -> GroupResult
) async -> GroupResult {
    let _group = Builtin.createTaskGroup(ChildTaskResult.self)
    var group = TaskGroup<ChildTaskResult>(group: _group)

    // Run the withTaskGroup body.
    let result = await body(&group)

    await group.awaitAllRemainingTasks()

    Builtin.destroyTaskGroup(_group)
    return result  
}
```

可见，withTaskGroup 返回前会先等待所有的子 Task 执行完毕，然后将 TaskGroup 销毁。因此将 TaskGroup 的实例泄漏到外部没有任何意义。

## 不要在子 Task 当中修改 TaskGroup

TaskGroup 泄漏到外部是危险的，这其实很容易想到。那么在子 Task 当中呢？

```swift
await withTaskGroup(of: Void.self) { (group) -> Void in
    group.addTask {
        group.addTask { // error!
            print("inner task")
        }
    }
}
```

如果你尝试在子 Task 当中去修改 group（addTask 是 mutating func），你会得到这样的错误：

```
Mutation of captured parameter 'group' in concurrently-executing code
```

正如前面提到不能把 TaskGroup 的实例泄漏到外面一样，它也同样不能泄漏到子 Task 的执行体当中。道理也很简单，子 Task 的执行体可能会被调度到不同的线程上，这样就导致对 TaskGroup 的修改是并发的，不安全。

## 小结

本文我们简单介绍了一下 TaskGroup 的用法，大家可以基于这些内容开始做一些简单的尝试了。结构化并发当中还有一些重要的概念我们将在接下来的几篇文章当中逐步介绍。