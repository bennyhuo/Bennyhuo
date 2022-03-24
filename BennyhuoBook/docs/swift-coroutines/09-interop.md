# 9. 异步函数与其他语言的互调用

> 现在很多 iOS APP 还是用 Objective-C 写的，异步函数在 Objective-C 当中怎么调用也是个问题。


## 从异步回调到异步函数

截止目前，我们已经详细探讨了 Swift 协程当中的绝大多数语法设计，这其中最基本也是最重要的就是异步函数。

在异步函数出现之前，我们通常会为函数添加回调来实现异步结果返回，以 Swift 的网络请求库 Alamofire 为例，它的 DataRequest 有这样一个函数：

```swift
public func responseData(
  queue: DispatchQueue = .main,
  dataPreprocessor: DataPreprocessor = DataResponseSerializer.defaultDataPreprocessor,
  emptyResponseCodes: Set<Int> = DataResponseSerializer.defaultEmptyResponseCodes,
  emptyRequestMethods: Set<HTTPMethod> = DataResponseSerializer.defaultEmptyRequestMethods,
  completionHandler: @escaping (AFDataResponse<Data>) -> Void
) -> Self {
    ...
}
```

这个函数有很多参数，不过我们只需要关心最后一个：completionHandler，它是一个闭包，接收一个参数为 `AFDataResponse<Data>` 的类型作为请求结果。

从 Swift 5.5 开始，我们可以将其包装成异步函数，添加对结果的异步返回、异常的传播以及对取消响应的支持：

```swift
func responseDataAsync(
  queue: DispatchQueue = .main,
  dataPreprocessor: DataPreprocessor = DataResponseSerializer.defaultDataPreprocessor,
  emptyResponseCodes: Set<Int> = DataResponseSerializer.defaultEmptyResponseCodes,
  emptyRequestMethods: Set<HTTPMethod> = DataResponseSerializer.defaultEmptyRequestMethods
) async throws -> Data {
    try await withTaskCancellationHandler {
        try await withCheckedThrowingContinuation { continuation in
            responseData(
                queue: queue,
                dataPreprocessor: dataPreprocessor,
                emptyResponseCodes: emptyResponseCodes, emptyRequestMethods: emptyRequestMethods
            ) { response in
                switch response.result {
                case .success(let data): continuation.resume(returning: data)
                case .failure(let error): continuation.resume(throwing: error)
                }
            }
        }
    } onCancel: {
        cancel()
    }
}
```

从异步回调到异步函数总是要经过这样一个包装的过程，这个过程实际上并不轻松。因此我们也更希望第三方开发者在提供异步回调的时候同时提供异步函数的版本来方便我们按需使用。

## Objective-C 的异步回调

### Objective-C 回调函数的自动转换

在以前的 iOS SDK 当中，接收形如 completionHandler 这样的回调的 Objective-C 函数有 1000 多个。例如：

```objective-c
- (void)signData:(NSData *)signData 
withSecureElementPass:(PKSecureElementPass *)secureElementPass 
      completion:(void (^)(NSData *signedData, NSData *signature, NSError *error))completion;
```

这个函数相当于 Swift 的如下函数声明：

```swift
func sign(_ signData: Data, 
    using secureElementPass: PKSecureElementPass, 
completion: @escaping (Data?, Data?, Error?) -> Void)
```

如果我们对这些函数一个一个完成包装，那必然会耗费大量的时间和精力。因此，Swift 对接收类似的回调并符合一定条件的 Objective-C 函数自动做了一些转换，以上述 signData 函数为例，可以被自动转换为：

```swift
func sign(_ signData: Data, using secureElementPass: PKSecureElementPass) async throws -> (Data, Data)
```

我们来简单分析一下这个转换过程。

1. 参数 completion 被移除了。 completion 的类型是 Objective-C 的 block，可以用来处理异步结果的返回。
2. 转换后的异步函数的返回值 (Data, Data)，它实际上对应于 completion 除 `NSError *` 之外的两个参数。需要注意的是，回调当中的 signedData 和 signature 的类型均为 `NSData *`，它们实际上是可以为 nil 的，单纯考虑类型的映射，它们应该映射成 Swift 的 `Data?` 类型，而在转换之后的异步函数当中则为 `Data` 类型，这是因为逻辑上如果这俩个 `Data` 返回 nil，则应该通过参数 `NSError *` 来使得异步函数抛出异常。这个细节一定要注意。
3. completion 的参数 `NSError *` 表示结果有可能会出现异常，因此转换后的异步函数是会抛出异常的，声明为 throws。

那这个转换需要符合什么条件呢？

* 函数本身和参数回调的返回值均为 void
* 回调只能被调用一次
* 函数被显式地用 swift_async 修饰或者隐式地通过参数名来推导，其中支持推导的情况包括：
  * 函数只有一个参数且它的标签为 WithCompletion、WithCompletionHandler、WithCompletionBlock、WithReplyTo、WithReply。
  * 函数有多个参数，且最后一个是回调，并且它的标签为 completion，withCompletion，completionHandler，withCompletionHandler，completionBlock，withCompletionBlock，replyTo，withReplyTo，reply 或者 replyTo。
  * 函数有多个参数，且最后一个参数的标签以一个参数的情况当中列出的标签结尾，最后一个参数是回调。

我们再给一个例子，请大家注意它的函数名：

```objective-c
-(void)getUserAsync:(NSString *)name completion:(void (^)(User *, NSError *))completion;
```

转换后：

```swift
func userAsync(_ name: String!) async throws -> User?
```

对于以 get 开头的 Objective-C 函数，转换之后函数名当中的 get 被去除了。除此之外其他规则与前面提到的一致。

有了这个转换，很多旧 SDK 当中的 Objective-C 回调函数都可以当成 Swift 的异步函数来调用，可以极大的简化我们的开发流程。

### 在 Objective-C 当中调用 Swift 的异步函数

相反地，如果我们定义了 Swift 的异步函数，并且希望在 Objective-C 当中调用，则可以声明成 @objc 异步函数，例如：

```swift
@objc class GitHubApiAsync: NSObject {
    @objc static func listFollowers(for userName: String) async throws -> [User] {
        try await AF.request("\(GITHUB_API_ENDPOINT)/users/\(userName)/followers").responseDecodableAsync()
    }
}
```

GitHubApiAsync 类当中的 listFollowers 函数相当于：

```objective-c
@interface GitHubApiAsync : NSObject
+ (void)listFollowersFor:(NSString * _Nonnull)userName completionHandler:(void (^ _Nonnull)(NSArray<User *> * _Nullable, NSError * _Nullable))completionHandler;
@end
```

## 调用 Kotlin 的挂起函数（suspend function）

了解了 Swift 的异步函数如何与 Objective-C 互调用的细节之后，再来看一下 Kotlin 的挂起函数是如何支持被 Swift 调用的。当然这个特性还在实验当中，后续也可能会发生变化。

### 支持 Objective-C 回调

Kotlin 1.4 开始引入了挂起函数对 Swift 的支持，支持的方式就是讲挂起函数转成回调，例如：

```kotlin
// kotlin
class Greeting {
    fun greeting(): String {
        return "Hello, ${Platform().platform}!"
    }

    suspend fun greetingAsync(): String {
        return "Hello, ${Platform().platform}"
    }
}
```

编译之后会生成 Objective-C 头文件，如下：

```objective-c
__attribute__((objc_subclassing_restricted))
__attribute__((swift_name("Greeting")))
@interface SharedGreeting : SharedBase
...
- (NSString *)greeting __attribute__((swift_name("greeting()")));
- (void)greetingAsyncWithCompletionHandler:(void (^)(NSString * _Nullable, NSError * _Nullable))completionHandler __attribute__((swift_name("greetingAsync(completionHandler:)")));
@end;
```

生成的类名为 `SharedGreeting`，其中 Shared 是模块名。`__attribute__((swift_name("Greeting")))` 使得这个 Objective-C 类映射到 Swift 当中的名字是 `Greeting`。

我们重点关注一下 greetingAsync 函数，它映射成了下面的回调形式：

```objective-c
- (void)greetingAsyncWithCompletionHandler:(void (^)(NSString * _Nullable, NSError * _Nullable))completionHandler __attribute__((swift_name("greetingAsync(completionHandler:)")));
```

### 支持 Swift 异步函数

Kotlin 挂起函数对于 Objective-C 回调的支持，正好命中了前面讨论的回调自动转换成 Swift 异步函数的条件，因此理论上在 Swift 5.5 当中，我们也可以直接把 Kotlin 的挂起函数当成 Swift 的异步函数去调用：

```swift
// swift
func greet() async throws -> String {
    try await Greeting().greetingAsync()
}
```

当然这里还有一些细节的问题。Kotlin 1.5.30 当中也对此做了一点点跟进，在生成的 Objective-C 头文件当中添加了对 `_Nullable_result` 的支持，这使得 Kotlin 的挂起函数在返回可空类型时，能够正确被转化成返回 optional 类型的 Swift 异步函数，例如：

```swift
suspend fun greetingAsyncNullable(): String? {
    return "Hello, ${Platform().platform}"
}
```

注意到这个例子的返回值类型声明为 `String?`，生成的 Objective-C 函数如下：

```oc
- (void)greetingAsyncNullableWithCompletionHandler:(void (^)(NSString * _Nullable_result, NSError * _Nullable))completionHandler __attribute__((swift_name("greetingAsyncNullable(completionHandler:)")));
```

仔细对比与 greetingAsync 的差异不难发现，返回值的类型在 greetingAsyncNullable 当中被映射成了 `NSString * _Nullable_result`，而在 greetingAsync 当中则映射成了 `NSString * _Nullable`。这就不得不提一下 `_Nullable_result` 与 `_Nullable` 的差异了，前者可以令转化之后的 Swift 异步函数返回 optional 类型（对应于 Kotlin 的可空类型，nullable type），而后者则返回非 optional 类型（对应于 Kotlin 的不可空类型，nonnull type）。

### Kotlin 挂起函数的异常传播

如果 Kotlin 的挂起函数没有声明为 `@Throws`，则只有 `CancellationException` 会被转换为 `NSError` 抛到 Swift 当中，其他的都会作为严重错误使程序退出，因此如果需要暴露给 Swift 调用，我们通常建议对于可能有异常抛出的 Kotlin 函数添加 `@Throws` 注解，例如：

```kotlin
// kotlin
@Throws(Throwable::class)
suspend fun greetingAsync(): String {
    throw IllegalArgumentException("error from Kotlin")
    return "Hello, ${Platform().platform}"
}
```

这样在 Swift 调用时也可以直接捕获到这个异常：

```swift
//swift
do {
    print(try await Greeting().greetingAsync())
} catch {
    print(error)
}
```

程序输出如下：

```
Error Domain=KotlinException Code=0 "error from Kotlin" UserInfo={NSLocalizedDescription=error from Kotlin, KotlinException=kotlin.IllegalArgumentException: error from Kotlin, KotlinExceptionOrigin=}
```

### 上下文零传递

尽管目前 Kotlin 的挂起函数可以被当做 Swift 的异步函数去调用，但 Kotlin 侧仍没有专门仔细地针对 Swift 异步函数调用的场景进行专门的设计和定制。因此像 Swift 侧的取消状态（在 Kotlin 挂起函数中获取 Swift 的 Task 的取消状态）、调度器（Swift 的 actor 以及与 Task 绑定的调度器）、TaskLocal 变量以及 Kotlin 侧挂起函数执行时的调度器、协程上下文等状态都是没有实现传递的。

基于这一点，大家在使用过程中应当尽可能将函数的设计进行简化，避免场景过于复杂而引发令人难以理解的问题。

## 小结

本文我们探讨了 Swift 协程当中的异步函数（async function）与 Objective-C 的互调用问题，其中介绍了 Objective-C 回调自动映射成 Swift 异步函数的条件和细节，以及 Kotlin 挂起函数对 Swift 异步函数的支持。

---

## 关于作者

**霍丙乾 bennyhuo**，Kotlin 布道师，Google 认证 Kotlin 开发专家（Kotlin GDE）；**《深入理解 Kotlin 协程》** 作者（机械工业出版社，2020.6）；前腾讯高级工程师，现就职于猿辅导

* GitHub：https://github.com/bennyhuo
* 博客：https://www.bennyhuo.com
* bilibili：[**bennyhuo不是算命的**](https://space.bilibili.com/28615855)
* 微信公众号：**bennyhuo**