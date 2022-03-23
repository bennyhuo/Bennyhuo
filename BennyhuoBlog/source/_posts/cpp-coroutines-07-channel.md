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

### Channel 的基本结构

我们先来看一下 `Channel` 的基本结构：

```cpp
template<typename ValueType>
struct Channel {
  ... 

  struct ChannelClosedException : std::exception {
    const char *what() const noexcept override {
      return "Channel is closed.";
    }
  };

  void check_closed() {
    // 如果已经关闭，则抛出异常
    if (!_is_active.load(std::memory_order_relaxed)) {
      throw ChannelClosedException();
    }
  }
 

  explicit Channel(int capacity = 0) : buffer_capacity(capacity) {
    _is_active.store(true, std::memory_order_relaxed);
  }

  // true 表示 Channel 尚未关闭
  bool is_active() {
    return _is_active.load(std::memory_order_relaxed);
  }

  // 关闭 Channel
  void close() {
    bool expect = true;
    // 判断如果已经关闭，则不再重复操作
    // 比较 _is_active 为 true 时才会完成设置操作，并且返回 true
    if(_is_active.compare_exchange_strong(expect, false, std::memory_order_relaxed)) {
      // 清理资源
      clean_up();
    }
  }

  // 不希望 Channel 被移动或者复制
  Channel(Channel &&channel) = delete;
  Channel(Channel &) = delete;
  Channel &operator=(Channel &) = delete;

  // 销毁时关闭
  ~Channel() {
    close();
  }

 private:
  // buffer 的容量
  int buffer_capacity;
  std::queue<ValueType> buffer;
  // buffer 已满时，新来的写入者需要挂起保存在这里等待恢复
  std::list<WriterAwaiter<ValueType> *> writer_list;
  // buffer 为空时，新来的读取者需要挂起保存在这里等待恢复
  std::list<ReaderAwaiter<ValueType> *> reader_list;
  // Channel 的状态标识
  std::atomic<bool> _is_active;

  std::mutex channel_lock;
  std::condition_variable channel_condition;

  void clean_up() {
    std::lock_guard lock(channel_lock);

    // 需要对已经挂起等待的协程予以恢复执行
    for (auto writer : writer_list) {
      writer->resume();
    }
    writer_list.clear();

    for (auto reader : reader_list) {
      reader->resume();
    }
    reader_list.clear();

    // 清空 buffer
    decltype(buffer) empty_buffer;
    std::swap(buffer, empty_buffer);
  }
};
```

通过了解 `Channel` 的基本结构，我们已经知道了 `Channel` 当中存了哪些信息。接下来我们就要填之前埋下的坑了：分别是在协程当中读写值用到的 `read` 和 `write` 函数，以及在挂起协程时 Awaiter 当中调用的 `try_push_writer` 和 `try_push_reader`。

### read 和 write

这两个函数也没什么实质的功能，就是把 Awaiter 创建出来，然后填充信息再返回：

```cpp
template<typename ValueType>
struct Channel {
  auto write(ValueType value) {
    check_closed();
    return WriterAwaiter<ValueType>{.channel = this, ._value = value};
  }

  auto operator<<(ValueType value) {
    return write(value);
  }

  auto read() {
    check_closed();
    return ReaderAwaiter<ValueType>{.channel = this};
  }

  auto operator>>(ValueType &value_ref) {
    auto awaiter =  read();
    // 保存待赋值的变量的地址，方便后续写入
    awaiter.p_value = &value_ref;
    return awaiter;
  }

  ...
}
```

这当中除了 `operator>>` 的实现需要多保存一个变量的地址以外，大家只需要注意一下对于 `check_closed` 的调用即可，它的功能很简单：在 `Channel` 关闭之后调用它会抛出 `ChannelClosedException`。

### `try_push_writer` 和 `try_push_reader`

这是 `Channel` 当中最为核心的两个函数了，他们的功能正好相反。

`try_push_writer` 调用时，意味着有一个新的写入者挂起准备写入值到 `Channel` 当中，这时候有以下几种情况：
1. `Channel` 当中有挂起的读取者，写入者直接将要写入的值传给读取者，恢复读取者，恢复写入者
2. `Channel` 的 buffer 没满，写入者把值写入 buffer，然后立即恢复执行。
3. `Channel` 的 buffer 已满，则写入者被存入挂起列表（writer_list）等待新的读取者读取时再恢复。

了解了思路之后，它的实现就不难写出了，具体如下：

```cpp
void try_push_writer(WriterAwaiter<ValueType> *writer_awaiter) {
  std::unique_lock lock(channel_lock);
  check_closed();
  // 检查有没有挂起的读取者，对应情况 1
  if (!reader_list.empty()) {
    auto reader = reader_list.front();
    reader_list.pop_front();
    lock.unlock();

    reader->resume(writer_awaiter->_value);
    writer_awaiter->resume();
    return;
  }

  // buffer 未满，对应情况 2
  if (buffer.size() < buffer_capacity) {
    buffer.push(writer_awaiter->_value);
    lock.unlock();
    writer_awaiter->resume();
    return;
  }

  // buffer 已满，对应情况 3
  writer_list.push_back(writer_awaiter);
}
```

相对应的，`try_push_reader` 调用时，意味着有一个新的读取者挂起准备从 `Channel` 当中读取值，这时候有以下几种情况：
1. `Channel` 当中有挂起的写入者，写入者直接将要写入的值传给读取者，恢复读取者，恢复写入者
2. `Channel` 的 buffer 非空，读取者从 buffer 当中读取值，然后立即恢复执行。
3. `Channel` 的 buffer 为空，则读取者被存入挂起列表（reader_list）等待新的写入者写入时再恢复。

接下来是具体的实现：

```cpp
void try_push_reader(ReaderAwaiter<ValueType> *reader_awaiter) {
  std::unique_lock lock(channel_lock);
  check_closed();

  // 有写入者挂起，对应情况 1
  if (!writer_list.empty()) {
    auto writer = writer_list.front();
    writer_list.pop_front();
    lock.unlock();

    reader_awaiter->resume(writer->_value);
    writer->resume();
    return;
  }

  // buffer 非空，对应情况 2
  if (!buffer.empty()) {
    auto value = buffer.front();
    buffer.pop();
    lock.unlock();

    reader_awaiter->resume(value);
    return;
  }

  // buffer 为空，对应情况 3
  reader_list.push_back(reader_awaiter);
}
```

至此，我们已经完整给出 `Channel` 的实现。

> **说明**：我们当然也可以在 `await_ready` 的时候提前做一次判断，如果命中第 1、2 两种情况可以直接让写入/读取协程不挂起继续执行，这样可以避免写入/读取者的无效挂起。为了方便介绍，本文就不再做相关优化了。

## 小试牛刀

我们终于又实现了一个新的玩具，现在我们来给它通电试试效果。

```cpp
using namespace std::chrono_literals;

Task<void, LooperExecutor> Producer(Channel<int> &channel) {
  int i = 0;
  while (i < 10) {
    debug("send: ", i);
    // 或者使用 write 函数：co_await channel.write(i++);
    co_await (channel << i++);
    co_await 300ms;
  }

  channel.close();
  debug("close channel, exit.");
}

Task<void, LooperExecutor> Consumer(Channel<int> &channel) {
  while (channel.is_active()) {
    try {
      // 或者使用 read 函数：auto received = co_await channel.read();
      int received;
      co_await (channel >> received);
      debug("receive: ", received);
      co_await 2s;
    } catch (std::exception &e) {
      debug("exception: ", e.what());
    }
  }

  debug("exit.");
}

Task<void, LooperExecutor> Consumer2(Channel<int> &channel) {
  while (channel.is_active()) {
    try {
      auto received = co_await channel.read();
      debug("receive2: ", received);
      co_await 3s;
    } catch (std::exception &e) {
      debug("exception2: ", e.what());
    }
  }

  debug("exit.");
}

int main() {
  auto channel = Channel<int>(2);
  auto producer = Producer(channel);
  auto consumer = Consumer(channel);
  auto consumer2 = Consumer2(channel);
 
  // 等待协程执行完成再退出
  producer.get_result();
  consumer.get_result();
  consumer2.get_result();

  return 0;
}
```

例子非常简单，我们用一个写入者两个接收者向 `Channel` 当中读写数据，为了让示例更加凌乱，我们还加了一点点延时，运行结果如下：

```
08:39:58.129 [Thread-26004] (main.cpp:15) Producer: send:  0
08:39:58.130 [Thread-27716] (main.cpp:31) Consumer: receive:  0
08:39:58.443 [Thread-26004] (main.cpp:15) Producer: send:  1
08:39:58.444 [Thread-17956] (main.cpp:45) Consumer2: receive2:  1
08:39:58.759 [Thread-26004] (main.cpp:15) Producer: send:  2
08:39:59.071 [Thread-26004] (main.cpp:15) Producer: send:  3
08:39:59.382 [Thread-26004] (main.cpp:15) Producer: send:  4
08:40:00.145 [Thread-27716] (main.cpp:31) Consumer: receive:  4
08:40:00.454 [Thread-26004] (main.cpp:15) Producer: send:  5
08:40:01.448 [Thread-17956] (main.cpp:45) Consumer2: receive2:  5
08:40:01.762 [Thread-26004] (main.cpp:15) Producer: send:  6
08:40:02.152 [Thread-27716] (main.cpp:31) Consumer: receive:  6
08:40:02.464 [Thread-26004] (main.cpp:15) Producer: send:  7
08:40:04.164 [Thread-27716] (main.cpp:31) Consumer: receive:  7
08:40:04.460 [Thread-17956] (main.cpp:45) Consumer2: receive2:  2
08:40:04.475 [Thread-26004] (main.cpp:15) Producer: send:  8
08:40:04.787 [Thread-26004] (main.cpp:15) Producer: send:  9
08:40:06.169 [Thread-27716] (main.cpp:31) Consumer: receive:  9
08:40:06.481 [Thread-26004] (main.cpp:22) Producer: close channel, exit.
08:40:07.464 [Thread-17956] (main.cpp:52) Consumer2: exit.
08:40:08.181 [Thread-27716] (main.cpp:38) Consumer: exit.
```

结果我就不分析了。

## 小结

本文给出了 C++ 协程版的 `Channel` 的 demo 实现，这进一步证明了 C++ 协程的基础 API 的设计足够灵活，能够支撑非常复杂的需求场景。

当然，本文给出的 `Channel` 仍然有个小小的限制，那就是需要在持有 `Channel` 实例的协程退出之前关闭，因为我们在 `Channel` 当中持有了已经挂起的读写协程的 `Awaiter` 的指针，一旦协程销毁，这些 `Awaiter` 也会被销毁，`Channel` 在关闭时试图恢复这些读写协程时就会出现程序崩溃（访问了野指针）。不过，这个问题我不想解决了，因为它并不影响我向大家介绍 C++ 协程的 API 的使用方法。

---

## 关于作者

**霍丙乾 bennyhuo**，Kotlin 布道师，Google 认证 Kotlin 开发专家（Kotlin GDE）；**《深入理解 Kotlin 协程》** 作者（机械工业出版社，2020.6）；前腾讯高级工程师，现就职于猿辅导

* GitHub：https://github.com/bennyhuo
* 博客：https://www.bennyhuo.com
* bilibili：[**bennyhuo不是算命的**](https://space.bilibili.com/28615855)
* 微信公众号：**bennyhuo**
