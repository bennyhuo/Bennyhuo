# 闲话 Swift 协程（9）：异步函数与其他语言的互调用

**Swift Swift5.5**

> 现在很多 iOS 应用还是用 Objective-C 写的，异步函数怎么调用也是个问题。

==  Swift|Coroutines|async await ==

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

有了异步函数之后，我们可以把它做一下包装：

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

这个包装包括结果的异步返回、异常的传播以及对取消的支持。从异步回调到异步函数总是要经过这样一个包装的过程，这个过程实际上并不轻松。我们更希望第三方开发者在提供异步回调的时候同时提供异步函数的版本来方便我们按需使用。

## Objective-C 的异步回调

在以前的 iOS SDK 当中，接收 completionHandler 回调的 Objective-C 函数有 1000 多个。例如：

```objective-c
- (void)signData:(NSData *)signData 
withSecureElementPass:(PKSecureElementPass *)secureElementPass 
      completion:(void (^)(NSData *signedData, NSData *signature, NSError *error))completion;
```

如果我们需要对这些函数一个一个完成包装，那必然会非常痛苦。因此 Swift 对接收 completionHandler 并符合一定条件的 Objective-C 函数自动做了一些转换，上述函数就可以被自动转换为：

```swift
func sign(_ signData: Data, using secureElementPass: PKSecureElementPass) async throws -> (Data, Data)
```

我们来简单分析一下这个转换过程。

1. 参数 completion 被移除了。 completion 是 Objective-C 的 block，其实就是个回调，可以用了处理异步结果的返回。
2. 转换后的异步函数的返回值 (Data, Data)，它实际上对应于 completion 除 `NSError *` 之外的两个参数。
3. completion 的参数 `NSError *` 表示结果有可能会出现异常，因此转换后的异步函数是会抛出异常的，声明为 throws。

那这个转换需要符合什么条件呢？

* 函数本身和参数回调的返回值均为 void
* 回调只能被调用一次
* 函数被显式地用 swift_async 修饰或者隐式地通过参数名来推导，其中支持推导的情况包括：
  * 函数只有一个参数且它的标签为 WithCompletion、WithCompletionHandler、WithCompletionBlock、WithReplyTo、WithReply。
  * 函数有多个参数，且最后一个是回调，并且它的标签为 completion，withCompletion，completionHandler，withCompletionHandler，completionBlock，withCompletionBlock，replyTo，withReplyTo，reply 或者 replyTo。
  * 函数有多个参数，且最后一个参数的标签以一个参数的情况当中列出的标签结尾，最后一个参数是回调。

我们再给一个例子：

```objective-c
-(void)getUserAsync:(NSString *)name completion:(void (^)(User *, NSError *))completion;
```

转换后：

```swift
func userAsync(_ name: String!) async throws -> User?
```

注意函数转换之后，函数名当中的 get 被去除了，这是一个比较特殊的情况。其他规则与前面提到的一致。

有了这个转换，很多旧 SDK 当中的 Objective-C 回调函数都可以当成 Swift 的异步函数来调用，可以极大的简化我们的开发。

反过来，如果我们定义了 Swift 的异步函数，并且希望在 Objective-C 当中调用，则可以声明成 @objc 异步函数，例如：

```swift
@objc class GitHubApiAsync: NSObject {
    @objc static func listFollowers(for userName: String) async throws -> [User] {
        try await AF.request("\(GITHUB_API_ENDPOINT)/users/\(userName)/followers").responseDecodableAsync()
    }
}
```

listFollowers 函数相当于：

```objective-c
@interface GitHubApiAsync : NSObject
+ (void)listFollowersFor:(NSString * _Nonnull)userName completionHandler:(void (^ _Nonnull)(NSArray<User *> * _Nullable, NSError * _Nullable))completionHandler;
@end
```

## 


## 小结

