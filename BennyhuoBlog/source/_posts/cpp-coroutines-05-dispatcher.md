---
title:  渡劫 C++ 协程（5）：协程的调度器 
keywords: C++ Coroutines 
date: 2022/03/20 12:03:19
description: 
tags: 
    - c++
    - coroutines 
---

> 协程想要实现异步，很大程度上依赖于调度器的设计。 



<!-- more -->

- [渡劫 C++ 协程（0）：前言](https://www.bennyhuo.com/2022/03/06/cpp-coroutines-README/)
- [渡劫 C++ 协程（1）：C++ 协程概览](https://www.bennyhuo.com/2022/03/09/cpp-coroutines-01-intro/)
- [渡劫 C++ 协程（2）：实现一个序列生成器](https://www.bennyhuo.com/2022/03/11/cpp-coroutines-02-generator/)
- [渡劫 C++ 协程（3）：序列生成器的泛化和函数式变换](https://www.bennyhuo.com/2022/03/14/cpp-coroutines-03-functional/)
- [渡劫 C++ 协程（4）：通用异步任务 Task](https://www.bennyhuo.com/2022/03/19/cpp-coroutines-04-task/)
- [渡劫 C++ 协程（5）：协程的调度器](https://www.bennyhuo.com/2022/03/20/cpp-coroutines-05-dispatcher/)
- [渡劫 C++ 协程（6）：基于协程的挂起实现无阻塞的 sleep](https://www.bennyhuo.com/2022/03/20/cpp-coroutines-06-sleep/)
- [渡劫 C++ 协程（7）：用于协程之间消息传递的 Channel](https://www.bennyhuo.com/2022/03/22/cpp-coroutines-07-channel/)




## 调度器的抽象设计

为了实现协程的异步调度，我们需要提供调度器的实现。调度器听起来有些厉害，但实际上就是负责执行一段逻辑的工具。

下面我们给出调度器的抽象设计：

```cpp
class AbstractExecutor {
 public:
  virtual void execute(std::function<void()> &&func) = 0;
};
```

是的，你没看错，调度器本身就是这么简单。

## 调度的位置

现在我们已经知道了调度器的样子，那么问题来了，怎么才能把它接入到协程当中呢？这个问题换个说法，那就是什么情况下我们需要调度，或者说什么情况下我们可以实现调度。

这个问题如果你不知道答案，让你随便蒙，你大概也没有什么其他的选项可以选。因为协程的本质就是挂起和恢复，因此想要实现调度，就必须在挂起和恢复上做文章。想要在 C++ 的协程的挂起和恢复上做文章，那我们就只能考虑定制 Awaiter 了。我们再来回顾一下前面提到的 TaskAwaiter 的定义：

```cpp
template<typename Result>
struct TaskAwaiter {
  ...

  constexpr bool await_ready() const noexcept {
    return false;
  }

  void await_suspend(std::coroutine_handle<> handle) noexcept {
    task.finally([handle]() {
      handle.resume();
    });
  }

  Result await_resume() noexcept {
    return task.get_result();
  }

  ...
};
```

我们只保留了最核心的三个函数，其他的代码都略去了。可以看到，想要实现调度，就只能在 `await_suspend` 上面做文章，因为其他两个函数都要求同步返回。

实际上，按照 C++ 协程的设计，`await_suspend` 确实是用来提供调度支持的，由于这个时间点协程已经完全挂起，因此我们可以在任意一个线程上调用 `handle.resume()`，你甚至不用担心线程安全的问题。这样看来，如果有调度器的存在，代码大概会变成下面这样：

```cpp 
// 调度器的类型有多种，因此专门提供一个模板参数 Executor
template<typename Result, typename Executor>
struct TaskAwaiter {

  // 构造 TaskAwaiter 的时候传入调度器的具体实现
  explicit TaskAwaiter(AbstractExecutor *executor, Task<Result, Executor> &&task) noexcept
      : _executor(executor), task(std::move(task)) {}

  ...

  void await_suspend(std::coroutine_handle<> handle) noexcept {
    task.finally([handle, this]() {
      // 将 resume 函数的调用交给调度器执行
      _executor->execute([handle]() {
        handle.resume();
      });
    });
  }

  ...

 private:
  Task<Result, Executor> task;
  AbstractExecutor *_executor;

};
```

## 调度器应该由谁持有

`TaskAwaiter` 当中的调度器实例是从外部传来的，这样设计的目的是希望把调度器的创建和绑定交给协程本身。换句话说，调度器应该属于协程。这样设计的好处就是协程内部的代码均会被调度到它对应的调度器上执行，可以确保逻辑的一致性和正确性。

这么看来，调度器应该与 `Task` 或者 `TaskPromise` 绑定到一起。

当协程创建时，我们可以以某种方式执行一个调度器，让协程的执行从头到尾都调度到这个调度器上执行。例如：

```cpp
Task<int, LooperExecutor> simple_task() {
  // 协程启动时就要调度到 LooperExecutor 上
  debug("task start ...");
  auto result2 = co_await simple_task2();
  // 协程从 simple_task2 挂起后恢复执行，也要调度到 LooperExecutor 上
  debug("returns from task2: ", result2);
  auto result3 = co_await simple_task3();
  // 同上
  debug("returns from task3: ", result3);
  co_return 1 + result2 + result3;
}
```

我们通过模板参数为 `Task` 绑定了一个叫做 `LooperExecutor` 的调度器（我们现在先不去管 `LooperExecutor` 的具体实现，这个我们后面会讲），这样一来，我们希望 `simple_task` 当中所有的代码都会被调度到 `LooperExecutor` 上执行。

请大家参考注释的说明，我们了解到所有挂起的位置都需要在恢复时拿到同一个 `LooperExecutor` 的实例，因此我们考虑首先对 `TaskPromise` 的定义做一下修改，引入 `Executor`：

```cpp
// 增加模板参数 Executor
template<typename ResultType, typename Executor>
struct TaskPromise {
  // 协程启动时也需要在恢复时实现调度
  DispatchAwaiter initial_suspend() { return DispatchAwaiter{&executor}; }

  std::suspend_always final_suspend() noexcept { return {}; }

  // Task 类型增加模板参数 Executor 可以方便创建协程时执行调度器的类型
  Task<ResultType, Executor> get_return_object() {
    return Task{std::coroutine_handle<TaskPromise>::from_promise(*this)};
  }

  // 注意模板参数
  template<typename _ResultType, typename _Executor>
  TaskAwaiter<_ResultType, _Executor> await_transform(Task<_ResultType, _Executor> &&task) {
    return TaskAwaiter<_ResultType, _Executor>(&executor, std::move(task));
  }

  ...

 private:
  Executor executor;

  ...

};
```

由于我们在 `TaskPromise` 当中定义了 `await_transform`，因此协程当中只支持对 `Task` 类型的 `co_await` 操作，这样可以保证所有的 `co_await <task>` 都会在恢复执行时通过 `TaskAwaiter` 来确保后续逻辑的正确调度。

剩下的就是协程在启动时的 `initial_suspend` 了，这个也比较容易处理，我们给出 `DispatchAwaiter` 的定义：

```cpp
struct DispatchAwaiter {

  explicit DispatchAwaiter(AbstractExecutor *executor) noexcept
      : _executor(executor) {}

  bool await_ready() const { return false; }

  void await_suspend(std::coroutine_handle<> handle) const {
    // 调度到协程对应的调度器上
    _executor->execute([handle]() {
      handle.resume();
    });
  }

  void await_resume() {}

 private:
  AbstractExecutor *_executor;
};
```

如此一来，协程内部的所有逻辑都可以顺利地调度到协程对应的调度器上了。

`Task` 的改动不大，只是增加了模板参数 `Executor`：

```cpp
// NewThreadExecutor 是 AbstractExecutor 的子类，作为模板参数 Executor 的默认值
template<typename ResultType, typename Executor = NewThreadExecutor>
struct Task {

  // 将模板参数 Executor 传给 TaskPromise
  using promise_type = TaskPromise<ResultType, Executor>;

  ...
};
```

我们还可以默认给 `Task` 指定一个调度器的实现 `NewThreadExecutor`。这些调度器可以通过指定类型在 `TaskPromise` 当中执行初始化，因为我们会保证他们都会有默认的无参构造器实现。

## 调度器的实现

接下来我们给出几种简单的调度器实现作为示例，读者有兴趣也可以按照自己的需要设计调度器的实现。

### NoopExecutor

看名字相比大家也能猜个八九不离十，这就是个什么都不干的调度器：

```cpp
class NoopExecutor : public AbstractExecutor {
 public:
  void execute(std::function<void()> &&func) override {
    func();
  }
};
```

如果我们给 `Task` 搭配这个调度器，`Task` 的执行线程就完全取决于调用者或者恢复者所在的线程了。

### NewThreadExecutor

顾名思义，每次调度都创建一个新的线程。实现非常简单：

```cpp
class NewThreadExecutor : public AbstractExecutor {
 public:
  void execute(std::function<void()> &&func) override {
    std::thread(func).detach();
  }
};
```

### AsyncExecutor

这个在思路上与 `NewThreadExecutor` 差别不大，只是调度时交给了 `std::async` 去执行：

```cpp
class AsyncExecutor : public AbstractExecutor {
 public:
  void execute(std::function<void()> &&func) override {
    auto future = std::async(func);
  }
};
```

相比之下，这个调度器可以利用 `std::async` 背后的线程调度，提升线程的利用率。

### LooperExecutor

LooperExecutor 稍微复杂一些，它通常出现在主线程为事件循环的场景，例如 UI 相关应用的开发场景。

考虑到我本身不希望引入 UI 相关的开发概念，这里直接给出一个简单的单线程事件循环，并以此来实现 LooperExecutor：

```cpp
class LooperExecutor : public AbstractExecutor {
 private:
  std::condition_variable queue_condition;
  std::mutex queue_lock;
  std::queue<std::function<void()>> executable_queue;

  // true 的时候是工作状态，如果要关闭事件循环，就置为 false
  std::atomic<bool> is_active;
  std::thread work_thread;

  // 处理事件循环
  void run_loop() {
    // 检查当前事件循环是否是工作状态，或者队列没有清空
    while (is_active.load(std::memory_order_relaxed) || !executable_queue.empty()) {
      std::unique_lock lock(queue_lock);
      if (executable_queue.empty()) {
        // 队列为空，需要等待新任务加入队列或者关闭事件循环的通知
        queue_condition.wait(lock);
        // 如果队列为空，那么说明收到的是关闭的通知
        if (executable_queue.empty()) {
          // 现有逻辑下此处用 break 也可
          // 使用 continue 可以再次检查状态和队列，方便将来扩展
          continue;
        }
      }
      // 取出第一个任务，解锁再执行。
      // 解锁非常：func 是外部逻辑，不需要锁保护；func 当中可能请求锁，导致死锁
      auto func = executable_queue.front();
      executable_queue.pop();
      lock.unlock();

      func();
    }
  }

 public:

  LooperExecutor() {
    is_active.store(true, std::memory_order_relaxed);
    work_thread = std::thread(&LooperExecutor::run_loop, this);
  }

  ~LooperExecutor() {
    shutdown(false);
    // 等待线程执行完，防止出现意外情况
    join();
  }

  void execute(std::function<void()> &&func) override {
    std::unique_lock lock(queue_lock);
    if (is_active.load(std::memory_order_relaxed)) {
      executable_queue.push(func);
      lock.unlock();
      // 通知队列，主要用于队列之前为空时调用 wait 等待的情况
      // 通知不需要加锁，否则锁会交给 wait 方导致当前线程阻塞
      queue_condition.notify_one();
    }
  }

  void shutdown(bool wait_for_complete = true) {
    // 修改后立即生效，在 run_loop 当中就能尽早（加锁前）就检测到 is_active 的变化
    is_active.store(false, std::memory_order_relaxed);
    if (!wait_for_complete) {    
      std::unique_lock lock(queue_lock);
      // 清空任务队列
      decltype(executable_queue) empty_queue;
      std::swap(executable_queue, empty_queue);
      lock.unlock();
    }

    // 通知 wait 函数，避免 Looper 线程不退出
    // 不需要加锁，否则锁会交给 wait 方导致当前线程阻塞
    queue_condition.notify_all();
  }

  void join() {
    if (work_thread.joinable()) {
      work_thread.join();
    }
  }
};
```
各位读者可以参考代码注释来理解其中的逻辑。简单来说就是：
1. 当队列为空时，Looper 的线程通过 `wait` 来实现阻塞等待。
2. 有新任务加入时，通过 `notify_one` 来通知 `run_loop` 继续执行。

### SharedLooperExecutor

这个其实就是 `LooperExecutor` 的一个马甲，它的作用就是让各个协程共享一个 `LooperExecutor` 实例。

```cpp
class SharedLooperExecutor : public AbstractExecutor {
 public:
  void execute(std::function<void()> &&func) override {
    static LooperExecutor sharedLooperExecutor;
    sharedLooperExecutor.execute(std::move(func));
  }
};
```

<<<<<<< HEAD
当然，各位读者也可以发挥自己的想象力，按照类似的方式定义出更加有用或者有趣的调度器。

=======
>>>>>>> 241a2ff176da497980f1b8bdd21dcf137325e28f
## 小试牛刀

这次我们基于上一篇文章当中的 demo 加入调度器的支持：

```cpp
// 使用了 Async 调度器
// 这意味着每个恢复的位置都会通过 std::async 上执行
Task<int, AsyncExecutor> simple_task2() {
  debug("task 2 start ...");
  using namespace std::chrono_literals;
  std::this_thread::sleep_for(1s);
  debug("task 2 returns after 1s.");
  co_return 2;
}

// 使用了 NewThread 调度器
// 这意味着每个恢复的位置都会新建一个线程来执行
Task<int, NewThreadExecutor> simple_task3() {
  debug("in task 3 start ...");
  using namespace std::chrono_literals;
  std::this_thread::sleep_for(2s);
  debug("task 3 returns after 2s.");
  co_return 3;
}

// 使用了 Looper 调度器
// 这意味着每个恢复的位置都会在同一个线程上执行
Task<int, LooperExecutor> simple_task() {
  debug("task start ...");
  auto result2 = co_await simple_task2();
  debug("returns from task2: ", result2);
  auto result3 = co_await simple_task3();
  debug("returns from task3: ", result3);
  co_return 1 + result2 + result3;
}

int main() {
  auto simpleTask = simple_task();
  simpleTask.then([](int i) {
    debug("simple task end: ", i);
  }).catching([](std::exception &e) {
    debug("error occurred", e.what());
  });
  try {
    auto i = simpleTask.get_result();
    debug("simple task end from get: ", i);
  } catch (std::exception &e) {
    debug("error: ", e.what());
  }
  return 0;
}
```

这个例子的代码跟上次不能说完全没有修改吧，那也是几乎没有修改，除了加了调度器的类型作为 `Task` 的模板参数。运行结果如下：

```
11:46:03.305 [Thread-32620] (main.cpp:40) simple_task: task start ...
11:46:03.307 [Thread-33524] (main.cpp:24) simple_task2: task 2 start ...
11:46:04.310 [Thread-33524] (main.cpp:27) simple_task2: task 2 returns after 1s.
11:46:04.312 [Thread-32620] (main.cpp:42) simple_task: returns from task2:  2
11:46:04.313 [Thread-42232] (main.cpp:32) simple_task3: in task 3 start ...
11:46:06.327 [Thread-42232] (main.cpp:35) simple_task3: task 3 returns after 2s.
11:46:06.329 [Thread-32620] (main.cpp:44) simple_task: returns from task3:  3
11:46:06.329 [Thread-32620] (main.cpp:51) operator (): simple task end:  6
11:46:06.330 [Thread-30760] (main.cpp:57) main: simple task end from get:  6
```

请大家仔细观察，所有 `simple_task` 函数的日志输出都在 id 为 32620 的线程上，这实际上就是我们的 Looper 线程。当然，由于 `simple_task2` 和 `simple_task3` 当中没有挂起点，因此它们只会在 `initial_suspend` 时调度一次。

## 小结

本文我们终于给 `Task` 添加了调度器的支持。如此一来，我们就可以把 `Task` 绑定到合适的线程调度器上，来应对更加复杂的业务场景了。

读者也可以发挥自己的想象力，按照类似的方式定义出更加有用或者有趣的调度器。当然，本文给出的调度器没有做调度优化，有兴趣的读者也可以自己尝试


---

## 关于作者

**霍丙乾 bennyhuo**，Kotlin 布道师，Google 认证 Kotlin 开发专家（Kotlin GDE）；**《深入理解 Kotlin 协程》** 作者（机械工业出版社，2020.6）；前腾讯高级工程师，现就职于猿辅导

* GitHub：https://github.com/bennyhuo
* 博客：https://www.bennyhuo.com
* bilibili：[**bennyhuo不是算命的**](https://space.bilibili.com/28615855)
* 微信公众号：**bennyhuo**
