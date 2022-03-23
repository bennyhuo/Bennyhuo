---
title:  渡劫 C++ 协程（7）：用于协程之间消息传递的 Channel 
keywords: C++ Coroutines 
date: 2022/03/22 22:03:14
description: 
tags: 
    - c++
    - coroutines 
---

> 之前我们主要关注的是协程与外部调用者的交互，这次我们也关注一下对等的协程之间的通信。 



<!-- more -->

- [渡劫 C++ 协程（0）：前言](https://www.bennyhuo.com/2022/03/06/cpp-coroutines-README/)
- [渡劫 C++ 协程（1）：C++ 协程概览](https://www.bennyhuo.com/2022/03/09/cpp-coroutines-01-intro/)
- [渡劫 C++ 协程（2）：实现一个序列生成器](https://www.bennyhuo.com/2022/03/11/cpp-coroutines-02-generator/)
- [渡劫 C++ 协程（3）：序列生成器的泛化和函数式变换](https://www.bennyhuo.com/2022/03/14/cpp-coroutines-03-functional/)
- [渡劫 C++ 协程（4）：通用异步任务 Task](https://www.bennyhuo.com/2022/03/19/cpp-coroutines-04-task/)
- [渡劫 C++ 协程（5）：协程的调度器](https://www.bennyhuo.com/2022/03/20/cpp-coroutines-05-dispatcher/)
- [渡劫 C++ 协程（6）：基于协程的挂起实现无阻塞的 sleep](https://www.bennyhuo.com/2022/03/20/cpp-coroutines-06-sleep/)
- [渡劫 C++ 协程（7）：用于协程之间消息传递的 Channel](https://www.bennyhuo.com/2022/03/22/cpp-coroutines-07-channel/)




## 实现目标

### Go routine 的 Channel

Go routine 当中有一个重要的特性就是 Channel。我们可以向 Channel 当中写数据，也可以从中读数据。例如：

```go
// 创建 Channel 实例
channel := make(chan int) 
// 创建只读 Channel 引用
var readChannel <-chan int = channel
// 创建只写 Channel 引用
var writeChannel chan<- int = channel

// 
go func() { 
  fmt.Println("wait for read")
  // 遍历 Channel
  for true {
    // 读取 Channel，值存入 i，状态存入 ok 当中
    i, ok := <-readChannel
    if ok {
      fmt.Println("read", i)
    } else {
      // Channel 被关闭时，ok 为 false
      break
    }
  }
  fmt.Println("read end")
}()


// writer
go func() {
  for i := 0; i < 3; i++{
    fmt.Println("write", i)
    // 向 Channel 当中写数据
    writeChannel <- i
    time.Sleep(time.Second)
  }
  close(writeChannel)
}()
```

这个例子是我写 [《深入理解 Kotlin 协程》](https://item.jd.com/12898592.html) 这本书时用到过的一个非常简单的 Go routine 的例子，它的运行输出如下：

```
wait for read
write 0
read 0
write 1
read 1
write 2
read 2
read end
```

Go 当中的 Channel 默认是没有 buffer 的，我们也可以通过 `make chan` 在初始化 Channel 的时候指定 buffer。在 buffer 已满的情况下，写入者会先挂起等待读取者后再恢复执行，反之亦然。等待的过程中，所处的协程会挂起，执行调度的线程自然也会被释放用于调度其他逻辑。

### C++ 协程的 Channel 实现设计

Kotlin 协程当中也有 Channel，与 Go 的不同之处在于 Kotlin 的 Channel 其实是基于协程最基本的 API 在框架层面实现的，并非语言原生提供的能力。C++ 的协程显然也可以采用这个思路，实际上整个这一系列 C++ 协程的文章都是在介绍如何使用 C++ 20 标准当中提供的基本的协程 API 在构建更复杂的框架支持。

我们来看一下我们最终的 Channel 的用例：

```cpp
Task<void, LooperExecutor> Producer(Channel<int> &channel) {
  int i = 0;
  while (i < 10) {
    // 写入时调用 write 函数
    co_await channel.write(i++);
    // 或者使用 << 运算符
    co_await (channel << i++);
  }

  // 支持关闭
  channel.close();
}

Task<void, LooperExecutor> Consumer(Channel<int> &channel) {
  while (channel.is_active()) {
    try {
      // 读取时使用 read 函数，表达式的值就是读取的值
      auto received = co_await channel.read();
      
      int received;
      // 或者使用 >> 运算符将读取的值写入变量当中
      co_await (channel >> received);
    } catch (std::exception &e) {
      // 捕获 Channel 关闭时抛出的异常
      debug("exception: ", e.what());
    }
  }
}
```

我们的 Channel 也可以在构造的时候传入 buffer 的大小，默认没有 buffer。

## co_await 表达式的支持

想要支持 `co_await` 表达式，只需要为 Channel 读写函数返回的 Awaiter 类型添加相应的 `await_transform` 函数。我们姑且认为 `read` 和 `write` 两个函数的返回值类型 `ReaderAwaiter` 和 `WriterAwaiter`，接下来就添加一个非常简单的 `await_transform` 的支持：

```cpp
// 对于 void 的实例化版本也是一样的
template<typename ResultType, typename Executor>
struct TaskPromise {
  ...

  template<typename _ValueType>
  auto await_transform(ReaderAwaiter<_ValueType> reader_awaiter) {
    reader_awaiter.executor = &executor;
    return reader_awaiter;
  }

  template<typename _ValueType>
  auto await_transform(WriterAwaiter<_ValueType> writer_awaiter) {
    writer_awaiter.executor = &executor;
    return writer_awaiter;
  }

  ...
}
```

由于 `Channel` 的 buffer 和对 `Channel` 的读写本身会决定协程是否挂起或恢复，因此这些逻辑我们都将在 `Channel` 当中给出，`TaskPromise` 能做的就是把调度器传过去，当协程恢复时使用。

## Awaiter 的实现

Awaiter 负责在挂起时将自己存入 `Channel`，并且在需要时恢复协程。因此除了前面看到需要在恢复执行协程时的调度器之外，Awaiter 还需要持有 `Channel`、需要读写的值。

下面是 `WriterAwaiter` 的实现：

```cpp
template<typename ValueType>
struct WriterAwaiter {
  Channel<ValueType> *channel;
  // 调度器不是必须的，如果没有，则直接在当前线程执行（等价于 NoopExecutor）
  AbstractExecutor *executor = nullptr;
  // 写入 Channel 的值
  ValueType _value;
  std::coroutine_handle<> handle;

  bool await_ready() {
    return false;
  }

  auto await_suspend(std::coroutine_handle<> coroutine_handle) {
    // 记录协程 handle，恢复时用
    this->handle = coroutine_handle;
    // 将自身传给 Channel，Channel 内部会根据自身状态处理是否立即恢复或者挂起
    channel->try_push_writer(this);
  }

  void await_resume() {
    // Channel 关闭时也会将挂起的读写协程恢复
    // 要检查是否是关闭引起的恢复，如果是，check_closed 会抛出 Channel 关闭异常
    channel->check_closed();
  }

  // Channel 当中恢复该协程时调用 resume 函数
  void resume() {
    // 我们将调度器调度的逻辑封装在这里
    if (executor) {
      executor->execute([this]() { handle.resume(); });
    } else {
      handle.resume();
    }
  }
};
```

相对应的，还有 `ReaderAwaiter`，实现类似：

```cpp
template<typename ValueType>
struct ReaderAwaiter {
  Channel<ValueType> *channel;
  AbstractExecutor *executor = nullptr;
  ValueType _value;
  // 用于 channel >> received; 这种情况
  // 需要将变量的地址传入，协程恢复时写入变量内存
  ValueType* p_value = nullptr;
  std::coroutine_handle<> handle;

  bool await_ready() { return false; }

  auto await_suspend(std::coroutine_handle<> coroutine_handle) {
    this->handle = coroutine_handle;
    // 将自身传给 Channel，Channel 内部会根据自身状态处理是否立即恢复或者挂起
    channel->try_push_reader(this);
  }

  int await_resume() {
    // Channel 关闭时也会将挂起的读写协程恢复
    // 要检查是否是关闭引起的恢复，如果是，check_closed 会抛出 Channel 关闭异常
    channel->check_closed();
    return _value;
  }

  // Channel 当中正常恢复读协程时调用 resume 函数
  void resume(ValueType value) {
    this->_value = value;
    if (p_value) {
      *p_value = value;
    }
    resume();
  }

  // Channel 关闭时调用 resume() 函数来恢复该协程
  // 在 await_resume 当中，如果 Channel 关闭，会抛出 Channel 关闭异常
  void resume() {
    if (executor) {
      executor->execute([this]() { handle.resume(); });
    } else {
      handle.resume();
    }
  }
};
```

简单说来，Awaiter 的功能就是：
1. 负责用协程的调度器在需要时恢复协程
2. 处理读写的值的传递

## Channel 的实现

接下来我们给出 `Channel` 当中根据 buffer 的情况来处理读写两端的挂起和恢复的逻辑。


## 小试牛刀



## 小结



---

## 关于作者

**霍丙乾 bennyhuo**，Kotlin 布道师，Google 认证 Kotlin 开发专家（Kotlin GDE）；**《深入理解 Kotlin 协程》** 作者（机械工业出版社，2020.6）；前腾讯高级工程师，现就职于猿辅导

* GitHub：https://github.com/bennyhuo
* 博客：https://www.bennyhuo.com
* bilibili：[**bennyhuo不是算命的**](https://space.bilibili.com/28615855)
* 微信公众号：**bennyhuo**
