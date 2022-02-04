# 闲话 Swift 协程（6）：Actor 和线程安全

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

为了描述存钱这个行为，我们可能希望在外部修改 balance 的值，如果是 struct 或者 class，这个行为并不麻烦，但对于 actor 来讲，这个修改可能是不安全的，因此不被允许。

那怎么办？我们前面提到修改 actor 的状态需要发邮件，actor 会在收到邮件之后一个一个处理并异步返回给你结果（有没有一种给领导发邮件审批的感觉），这个叫做 actor-isolating。

所以我们打开 outlook 发个邮件？当然不是，开个小玩笑。Swift 的 actor 已经把发邮件这个操作设计得非常简洁了，简单说就是两点：

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

这个例子告诉我们，actor 的状态只能在内部修改指的是自己的实例内部，修改别人的实例仍然是不行的。

## 小结

本文简单讨论了一下 Task 和 TaskGroup 的异常传播。这个设计非常符合直觉，异常作为结果返回而不是副作用直接抛出，更容易让我们对 Task 的执行产生深刻的认识。