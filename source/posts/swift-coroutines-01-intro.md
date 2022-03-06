# 闲话 Swift 协程（1）：Swift 协程长什么样？

**Swift Swift5.5**

> 2021 年 9 月 20 日，Apple 发布了 Swift 5.5，这个版本当中最亮眼的特性就是对 async await 的支持了。

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

### 写在前面

经过几年的打磨，Swift 已经成为一门成熟度非常高的语言。

作为一个 Kotlin 布道师，Android 从业者，我本人对 Swift 的发展也保持了持续的关注。Swift 与 Kotlin 在外形上有着极高的相似度，学习 Swift 的一些特性有时候也可以帮助我更好的理解 Kotlin 的语法。不过，在协程这个特性上，Kotlin 还是走得比较靠前，我当时在写《深入理解 Kotlin 协程》这本书的时候也查阅过 Swift 的一些第三方协程实现，不过当时因为官方一直都没有消息，因此在书中没有提及。

这下好了，Swift 终于在 5.5 当中正式支持了协程，作为现代语言必备的特性，Swift 总算是补齐了自己的短板。

我计划写几篇文章来介绍一下 Swift 协程的特性，内容会以 Swift 协程的基本概念、语法设计、使用场景等方面为基础展开，也会与大前端开发者常见的 Kotlin、JavaScript 做对比，希望能给大家一个更多元化的视角来理解这个语法特性。

> **说明**：最初在 Xcode 13.0 刚发布的时候，Swift 协程需要 iOS 15.0、macOS 12.0 以上；随后在 Xcode 13.2 发布以后，最低版本要求降低到 iOS 13.0、 macOS Catalina（10.15），这样看来线上项目也终于有机会尝试这个新特性了。

### 协程的基本概念

协程（Coroutines）不是一个语言特有的概念，也没有一个特别严格的定义，维基百科对它定义也只是对它最核心的非抢占式多任务调度进行了简单的描述：

> Coroutines are computer program components that generalize subroutines for non-preemptive multitasking, by allowing execution to be suspended and resumed. Coroutines are well-suited for implementing familiar program components such as cooperative tasks, exceptions, event loops, iterators, infinite lists and pipes.

简单来说就是，协程是一种非抢占式或者说协作式的计算机程序并发调度的实现，程序可以主动挂起或者恢复执行。

说起任务调度，我们很自然地想到线程。从任务载体的角度来讲，协程和线程在应用场景上的确有很大的重叠之处，协程最初也确实是被应用于操作系统的任务调度的。只不过后来抢占式的调度成为了操作系统的主流实现，因此以协程为执行任务单位的协作式的调度就很少出现在我们眼前了。我们现在提到线程，基本上指的就是操作系统的内核线程；而提到协程，绝大多数都是编程语言层面实现的任务载体 —— 我们看待一个线程，就好像一艘轮船一样，而协程似乎就是装在上面的一个集装箱。

从任务的承载上来讲，线程比协程更重；从调度执行的能力来讲，线程是由操作系统调度的，而协程则是由编程语言的运行时调度的。所以绝大多数的编程语言当中实现的协程都具备更加轻量和更加灵活的特点。对于高负载的服务端，协程的轻量型就表现地很突出；而对于复杂的业务逻辑，特别是与外部异步交互的场景，协程的灵活性就可以发挥作用。

对于 Swift 而言，主要应对的自然是简化复杂的异步逻辑。而针对类似的场景，各家实际上已经给出了近乎一致的语法：async/await。其中 async 用于修饰函数，将其声明为一个异步函数，await 则用于非阻塞地等待异步函数的结果 —— Swift 也不能免俗。

不过，在有大前端应用场景的语言当中（例如 JavaScript、Dart、C# 等等），有一个“邪教徒”，那就是 Kotlin。相比之下它的语法比较奇葩，只用了一个 suspend 关键字就实现了几乎前面所有的能力（甚至还能做到更多）。Swift 协程与 Kotlin 协程从实现原理上还有代码交互上都颇有渊源，这个我们留在后面专门介绍。

### async/await

为了快速了解 Swift 协程的语法，我们先给出一段代码，让大家感受一下它的样子。

在这个例子当中，我们使用 Alamofire 这个网络框架发起网络请求：

```swift
static func getImageData(url: String) async throws -> Data{
  try await AF.request(url).responseDataAsync() // 调用异步函数，挂起等待结果
}
```

这个 responseDataAsync 函数是我对 Alamofire 框架当中的 DataRequest 做的一个扩展：

```swift
extension DataRequest {
    func responseDecodableAsync<T: Decodable>(...) async throws -> T {
        ...
    }
}
```

它的具体实现我们将在后面给出。

我们先请大家观察这两个函数的形式与普通函数有什么不同。我相信你很容易就能看出来，函数声明的返回值处多了个 async，而在调用函数的时候则多了个 await。使用 async 修饰的函数与普通的同步函数不同，它被称作异步函数。异步函数可以调用其他异步函数，而同步函数则不能调用异步函数。

正如我们前面提到的，async/await 这样的形式其实也是现在主流编程语言所支持的方式，例如：

**JavaScript**

```javascript
async function delay(seconds) {
  ...
}
async function asyncCall() {
	await delay(2); // 调用异步函数，挂起等待结果
	...
}
```

我们看到在 JavaScript 当中同样可以通过 async 关键字来声明一个支持挂起调用的异步函数，而在想要调用另一个异步函数的时候，则需要使用 await。从形式上来看，Swift 只是把 async 放到了函数声明的后面而已。

我们不妨也看一下 Kotlin 的的协程，Kotlin 当中也有异步函数的概念，只不过它选择了 suspend 这个关键字，因此我们在 Kotlin 当中更多的称这样的函数为挂起函数（其实是可挂起的函数）：

**Kotlin**

```kotlin
suspend fun delay(seconds: Long) {
  ...
}

suspend fun asyncCall() {
  delay(2) // 调用 suspend 函数，异步挂起
}
```

从语法的形式上来看，Kotlin 的 suspend 关键字在函数声明时充当了 async 的作用，把函数声明为异步函数；而在调用 suspend 函数的时候则直接相当于强加了 await，如果被调用的 suspend 函数会挂起，那么我们在这个调用点也就只能挂起当前异步函数来等待被调用的异步函数的结果返回了。实际上 Swift 的异步函数调用时也会要求使用 await，而 JavaScript 的 await 则在使用和不使用时分别有不同的含义，有关这个设计问题的讨论，我们后面再探讨。

所以讲到这里我希望大家能够了解两个点：

1. 这些编程语言通过 async 关键字将函数分为两类，过去的普通函数为同步函数，被修饰的函数则为异步函数。
2. 调用异步函数的时候需要使用 await 关键字，使得这个异步调用拥有了挂起等待恢复的语义。

### async/await 解决了怎样的问题？

在 Swift 5.5 以前，getImageData 的实现通常依赖回调来实现结果的返回：

```swift
static func getImageData(url: String,
                    onSuccess: @escaping (Data) -> Void,
                    onError: @escaping (Error) -> Void) {
    AF.request(url).responseData { response in
        switch response.result {
        case .success(let data):
            onSuccess(data)
        case .failure(let error):
            onError(error)
        }
    }
}
```

很自然地，我们如果想要调用这个函数，代码写出来就像下面这样：

```swift
GitHubApi.getImageData(
        url: avatar_url,
        onSuccess: { data in
            ...
        },
        onError: { error in
            ...
        })
```

那如果我想要在回调当中再触发一些其他的异步操作，结果会怎样呢？

```swift
GitHubApi.getImageData(
        url: avatar_url,
        onSuccess: { data in
            ...
            cropImage(
                onSuccess: { croppedImage in
                    saveImage(
                        onSuccess: {
                            ...
                        },
                        onError: {
                            ...
                        })
                },
                onError: {
                    ...
                })
        },
        onError: { error in
            ...
        })
```

不难发现，随着逻辑复杂度的增加，代码的缩进会越来越深，可维护性也越来越差。

但这段代码如果用 async/await 改造一下，结果会怎样呢？

```swift 
do {
    let data = await GitHubApiAsync.getImageData(url: userItem.user.avatar_url)
    let croppedImage = await cropImage(data)
    await saveImage(croppedImage)
} catch {
    ...
}
```

与 getImageData 函数的同步版本相比，onSuccess 和 onError 这两个回调没有了。尽管结果仍然是异步返回的，但写起来却像是同步返回的一样。这样看来，运用 async/await 可以使回调的层级变少，从而使得代码逻辑变得更清晰。

实际上，对于有一个或两个分支的异步回调，我们都可以很轻松地将其转换为使用 async 修饰的异步函数，进而使用 await 来完成调用。这部分内容我们在后面会专门介绍。

### 小结

通过前面对协程概念的简单介绍，以及 async/await 与回调的使用对比，我们不难发现协程在简化异步代码的实现方面有着巨大的优势。知道了这一点，我们后续就可以逐步深入去了解 Swift 协程的使用场景和实现细节了。