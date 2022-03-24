#  渡劫 C++ 协程（8）：一个简单的协程使用示例

**C++ Coroutines**

> 截止目前，我们一直专注于构建基于协程 API 的框架支持，这次我们用这些框架来写个简单的示例。

==  C++|Coroutines ==

<cpp-coroutines>

## 实现目标

本文的内容会相对轻松，因为我们终于停止了基于协程的基础 API 的探索。这次，我们将使用前文实现好的 `Task` 来发起一个简单的网络请求。

我们会借助一些已有的框架来完成这次的目标：

```
cpp-httplib/0.10.4
openssl/3.0.2
nlohmann_json/3.10.5
```

这些框架可以通过 [conan](https://www.bilibili.com/video/BV1wL411u74B/) 很轻松的完成安装。

## 示例代码

首先我们给出发起网络请求的核心代码：

```cpp
// 用协程包装网络请求，请求的处理调度到 std::async 上
Task<std::string, AsyncExecutor> http_get(std::string host, std::string path) {
  httplib::Client cli(host);

  // 阻塞地发起网络请求
  auto res = cli.Get(path.c_str());

  if (res) {
    // 返回响应内容，类型为 std::string
    co_return res->body;
  } else {
    co_return httplib::to_string(res.error());
  }
}
```

使用 httplib 来完成网络请求的处理非常简单直接，我们只需要把 url 传入即可。通常我们的网络请求都会在 io 线程当中发起，因此我们将其调度到 `AsyncExecutor` 上。

接下来，我们再定义一个协程来调用 `http_get`：

```cpp
Task<void, LooperExecutor> test_http() {
  try {
    debug("send request..."); // Looper 线程上执行

    // 发起网络请求，切换线程，当前协程挂起，Looper 线程被释放（此时 Looper 线程可以去调度其他任务）
    auto result = co_await http_get("https://api.github.com", "/users/bennyhuo");
    // 请求返回，当前协程接着在 Looper 线程上调度执行
    debug("done.");

    // 业务逻辑处理，解析 json
    auto json = nlohmann::json::parse(result);
    
    // 打印 json 内容
    debug(json.dump(2));
    // 假装这是其他业务处理
    debug(json["login"], json["url"]);
  } catch (std::exception &e) {
    debug(e.what());
  }
}
```

程序运行结果如下：

```
22:10:54.046 [Thread-08056] (main.cpp:27) test_http: send request...
22:10:54.953 [Thread-08056] (main.cpp:29) test_http: done.
22:10:54.953 [Thread-08056] (main.cpp:31) test_http: {
  "avatar_url": "https://avatars.githubusercontent.com/u/6336960?v=4",
  "bio": "Google Developer Expert @Kotlin",
  "blog": "https://www.bennyhuo.com",
  ...  中间内容很多，省略掉 ...
  "updated_at": "2022-03-23T13:51:26Z",
  "url": "https://api.github.com/users/bennyhuo"
}
22:10:54.953 [Thread-08056] (main.cpp:32) test_http: "bennyhuo"
22:10:54.954 [Thread-08056] (main.cpp:33) test_http: "https://api.github.com/users/bennyhuo"
22:10:54.954 [Thread-08056] (main.cpp:34) test_http: "Google Developer Expert @Kotlin"
```

## 详细说明

有朋友可能不太明白这个示例的意义，因为我们引入了协程似乎并没有解决程序阻塞的问题。

没错，确实如此。

之前我们在介绍无阻塞的 sleep 的案例时提到我们可以使用协程的挂起恢复来提高线程的利用率，可现在这个例子连线程利用率似乎都没有改善，那它解决了什么问题？

实际上，我们通常会把处理 IO 的任务调度到专属的 IO 线程池上执行。特别是在 UI 相关的应用开发场景当中，UI 线程是敏感资源，我们不能阻塞 UI 线程来处理 IO，否则会影响用户体验。这种情况下切换线程的需求就会非常常见，异步带来的逻辑编写复杂度使得程序的设计难度指数级增加。

协程的出现则正好解决了这个问题，大家不妨再回去看一下我们的例子，`test_http` 当中的代码全程在 Looper 线程当中执行。这就类似于调度在 UI 线程当中一样，尽管我们中间穿插了一个异步网络请求，但这看上去丝毫没有影响程序的连贯性和简洁性。

当然，通过前面对 Awaiter 的改造，

## 小结

