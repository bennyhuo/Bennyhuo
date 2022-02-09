# 闲话 Swift 协程（6）：Actor 和异步函数的调度

**Swift Swift5.5**

> 异步函数大多数情况下会并发地执行在不同的线程，那么线程安全怎么来保证？

==  Swift|Coroutines|async await ==

## 什么是 actor

Swift 为了解决线程安全的问题，引入了一个非常有用的概念叫做 actor。Actor 模型是计算机科学领域的一个用于并行计算的数学模型，其中 ctor 是模型当中的基本计算单元。

在 Swift 当中，actor 包含 state、mailbox、executor 三个重要的组成部分，其中：

* state 就是 actor 当中存储的值，它是受到 actor 保护的，访问时会有一些限制以避免数据竞争（data race）。
* mailbox 字面意思是邮箱的意思，在这里我们可以理解成一个消息队列。外部对于 actor 的可变状态的访问需要发送一个异步消息到 mailbox 当中，actor 的 executor 会串行地执行 mailbox 当中的消息以确保 state 是线程安全的。
* executor，actor 的逻辑（包括状态修改、访问等）执行所在的执行器。

下面我们给出一个简单的例子：

```swift
actor BankAccount {
    let accountNumber: Int
    var balance: Double

    init(accountNumber: Int, initialDeposit: Double) {
        self.accountNumber = accountNumber
        self.balance = initialDeposit
    }
}
```

我们定义了一个 actor 叫做 BankAccount（这个例子来自 Swift 的 [proposal](https://github.com/apple/swift-evolution/blob/main/proposals/0306-actors.md))，不难看出 actor 在形式上与 struct 或者 class 很像，不仅如此，actor 也能像它们一样定义扩展，声明泛型，实现协议等等。

Actor 用起来更像是确保了数据线程安全的 class，例如：

```swift
let account = BankAccount(accountNumber: 1234, initialDeposit: 1000)
let account2 = account
print(account === account2) // true
```

我们可以用类似于 class 的方式来构造 actor，并且创建多个变量指向同一个实例，以及使用 === 来判断是否指向同一个实例。程序运行时，我们也可以看到 account 和 account2 指向的地址是相同的：

![](media/2022-02-05-21-51-33.png)

## Actor 的属性隔离

为了描述存钱这个行为，我们可能希望在外部修改 balance 的值，如果是 struct 或者 class，这个行为并不麻烦，但对于 actor 来讲，这个修改可能是不安全的，因此不被允许。

那怎么办？我们前面提到修改 actor 的状态需要发邮件，actor 会在收到邮件之后一个一个处理并异步返回给你结果（有没有一种给领导发邮件审批的感觉），这个叫做 actor-isolated（即属性隔离）。

所以我们打开 outlook 发个邮件？当然不是，开个小玩笑。Swift 的 actor 已经把”发邮件“这个操作设计得非常简洁了，简单说就是两点：

1. actor 的可变状态只能在 actor 内部被修改（隔离嘛）
2. 发邮件其实就是一个异步函数调用的过程

所以我们需要给 BankAccount 定义一个存钱的函数来完成对 balance 的修改：

```swift
extension BankAccount {
    func deposit(amount: Double) async {
        assert(amount >= 0)
        balance = balance + amount
    }
}
```

我们把它定义在扩展当中，接下来就可以愉快得存钱了：

```swift
let account = BankAccount(accountNumber: 1234, initialDeposit: 1000)

print(account.accountNumber) // OK，不可变状态
print(await account.balance) // 可变状态的访问需要使用 await

await account.deposit(amount: 90) // actor 的函数调用需要 await
print(await account.balance)
```

这个例子当中有几个细节请大家留意：
1. accountNumber 可以直接访问，因为它不可变。不可变就意味着不存在线程安全问题。
2. 对可变的状态 balance 的访问以及对函数 deposit 的调用都是异步调用，需要用 await，因为这个访问实际上封装了发邮件的过程。

接下来再给大家看一下转账的实现：

```swift
extension BankAccount {
  enum BankError: Error {
    case insufficientFunds
  }

  func transfer(amount: Double, to other: BankAccount) async throws {
    assert(amount > 0)

    if amount > balance {
      throw BankError.insufficientFunds
    }

    balance = balance - amount
    
    // other.balance = other.balance + amount 错误示例
    await other.deposit(amount: amount) // OK
  }
}
```

函数 transfer 是 BankAccount 自己的函数，修改自己 balance 的值自然没有什么问题。但修改 other 这个 BankAccount 实例的 balance 的值却是不行的，因为 tranfer 函数执行时实际上是 self 这个实例在处理自己的邮件，这里面如果偷偷修改了 other 的 balance 的值就可能导致 other 的状态出现问题（试想一下你处理自己的邮件的时候偷偷把领导的邮件给删了，看他发现了之后骂不骂你）。

这个例子告诉我们，actor 的状态只能在自己实例的函数内部修改，而不能跨实例修改。

## 外部函数修改 actor 的状态

前面我们反复提到 actor 的状态只能在自己的函数内部修改，是因为 actor 的函数的调用是在对应的 executor 上安全地执行的。如果外部的函数也能够满足这个调用条件，那么理论上也是安全的。

Swift 提供了 actor-isolated paramters 这样的特性，字面意思即满足 actor 状态隔离的参数，如果我们在定义外部函数时将需要访问的 actor 类型的参数声明为 isolated，那么我们就可以在函数内部修改这个 actor 的状态了。

基于这一点，我们也可以把 deposit 函数定义成顶级函数：

```swift
func deposit(amount: Double, to account: isolated BankAccount) {
    assert(amount >= 0)
    account.balance = account.balance + amount
}
```

注意到参数 account 的类型被关键字 isolated 修饰，表明函数 deposit 的调用需要保证 account 的状态修改安全。不难想到，对于这个函数的调用，我们需要使用 await：

```swift
await deposit(amount: 1000, to: account)
```

显然，这里的 isolated 参数不能有多个（至少现在是这样），不然在实现起来会比较麻烦。

## 声明不需要隔离的属性或函数

Actor 的属性默认都是需要被隔离保护的，但也有一些属性可能并不需要被保护，例如我们前面提到的不可变的状态。Swift 允许为 actor 声明不需要隔离的属性：

```swift
extension BankAccount : CustomStringConvertible {
    nonisolated var description: String {
        "Bank account #\(accountNumber)"
    }
}
```

注意到 description 被声明为 nonisolated，这样对于它的访问就不会受到 balance 那么多的限制了。

nonisolated 同样可以用来修饰函数，但这样的函数就不能直接访问被隔离的状态了，只能像外部函数一样使用 await 来异步访问。

这个特性在 Actor 实现 Protocol 的时候也显得非常有用，例如：

```swift
extension BankAccount : Hashable {
    static func ==(lhs: BankAccount, rhs: BankAccount) -> Bool {
        lhs.accountNumber == rhs.accountNumber
    }
    
    nonisolated func hash(into hasher: inout Hasher) {
        hasher.combine(accountNumber)
    }
    
    nonisolated var hashValue: Int {
        get {
            accountNumber.hashValue
        }
    }
}
```

如果不加 nonisolated，编译器会给出如下提示：

![](media/2022-02-05-22-39-08.png)

顺便提一句，在早期的提案当中，你可能会见到 @actorIndependent，它后来被重命名为 nonisolated，这样在语法上与 nonmutating 也更加一致。

## Actor 与 @Sendable

在介绍协程的过程中，我们见过很多函数的闭包都被声明为 `@Sendable`，例如：

```swift
public func withTaskCancellationHandler<T>(
    operation: () async throws -> T, 
    onCancel handler: @Sendable () -> Void
) async rethrows -> T
```

其中 onCancel 就被声明为 [@Sendable](https://github.com/apple/swift-evolution/blob/main/proposals/0302-concurrent-value-and-concurrent-closures.md)，这表明只有实现了 `Sendable` 协议的类型实例才能被这个闭包所捕获。

Actor 天生就是线程安全的，因此也是符合 Sendable 协议的。实际上 Swift 的每一个 actor 类型都隐式地实现了一个叫做 `Actor` 的协议，而这个协议也正实现了 `Sendable` 协议。

我们看一下 `Actor` 的定义：

```swift
public protocol Actor : AnyObject, Sendable {
    ...
}
```

因此如果大家遇到 @Sendable 闭包需要捕获变量的问题，不妨试一试使用 Actor 来做一层封装。

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