#  渡劫 C++ 协程（5）：协程的调度器

**C++ Coroutines**

> 协程想要实现异步，很大程度上依赖于调度器的设计。

==  C++|Coroutines ==

<cpp-coroutines>


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

考虑到我本身不希望引入 UI 相关的开发概念，这里直接给出一个简单的单线程事件循环的实现，并以此来实现 LooperExecutor：

```cpp
class LooperExecutor : public AbstractExecutor {
 private:
  std::condition_variable queue_condition;
  std::mutex queue_lock;
  std::queue<std::function<void()>> executable_queue;

  volatile bool is_active = true;
  std::thread work_thread;

  // 处理事件循环
  void run_loop() {
    while (is_active || !executable_queue.empty()) {
      std::unique_lock lock(queue_lock);
      if (executable_queue.empty()) {
        queue_condition.wait(lock);
      }
      auto func = executable_queue.front();
      executable_queue.pop();
      lock.unlock();

      func();
    }
  }

 public:

  LooperExecutor() {
    work_thread = std::thread(&LooperExecutor::run_loop, this);
  }

  ~LooperExecutor() {
    shutdown(false);
  }

  void execute(std::function<void()> &&func) override {
    std::lock_guard lock(queue_lock);
    if (is_active) {
      executable_queue.push(func);
      queue_condition.notify_one();
    }
  }

  void shutdown(bool wait_for_complete = true) {
    is_active = false;
    if (wait_for_complete) {
      if (work_thread.joinable()) {
        work_thread.join();
      }
    } else {
      std::lock_guard lock(queue_lock);
      // clear queue.
      decltype(executable_queue) empty_queue;
      std::swap(executable_queue, empty_queue);
      if (work_thread.joinable()) {
        work_thread.detach();
      }
    }
  }
};
```


## 

## 小结

