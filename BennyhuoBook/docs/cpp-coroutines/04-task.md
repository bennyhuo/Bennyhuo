# 4. 通用异步任务 Task

> 协程主要用来降低异步任务的编写复杂度，异步任务各式各样，但归根结底就是一个结果的获取。



## 实现目标

为了方便介绍后续的内容，我们需要再定义一个类型 `Task` 来作为协程的返回值。`Task` 类型可以用来封装任何返回结果的异步行为（持续返回值的情况可能更适合使用序列生成器）。

实现的效果如下：

```cpp
Task<int> simple_task2() {
  // sleep 1 秒
  using namespace std::chrono_literals;
  std::this_thread::sleep_for(1s);

  co_return 2;
}

Task<int> simple_task3() {
  // sleep 2 秒
  using namespace std::chrono_literals;
  std::this_thread::sleep_for(2s);

  co_return 3;
}

Task<int> simple_task() {
  // result2 == 2
  auto result2 = co_await simple_task2();

  // result3 == 3
  auto result3 = co_await simple_task3();
  
  co_return 1 + result2 + result3;
}
```

我们定义以 `Task<ResultType>` 为返回值类型的协程，并且可以在协程内部使用 `co_await` 来等待其他 `Task` 的执行。

外部非协程内的函数当中访问 `Task` 的结果时，我们可以通过回调或者同步阻塞调用两种方式来实现：

```cpp
int main() {
  auto simpleTask = simple_task();

  // 异步方式
  simpleTask.then([](int i) {
    ... // i == 6
  }).catching([](std::exception &e) {
    ...
  });

  // 同步方式
  try {
    auto i = simpleTask.get_result();
    ... // i == 6
  } catch (std::exception &e) {
    ...
  }

  return 0;
}
```

按照这个效果，我们大致可以分析得到：

1. 需要一个结果类型来承载正常返回和异常抛出的情况。
2. 需要为 `Task` 定义相应的 `promise_type` 类型来支持 `co_return` 和 `co_await`。
3. 为 `Task` 实现获取结果的阻塞函数 `get_result` 或者用于获取返回值的回调 `then` 以及用于获取抛出的异常的回调 `catching`。

## 结果类型的定义

描述 `Task` 正常返回的结果和抛出的异常，只需要定义一个持有二者的类型即可：

```cpp
#include <exception>

template<typename T>
struct Result {
  // 初始化为默认值
  explicit Result() = default;

  // 当 Task 正常返回时用结果初始化 Result
  explicit Result(T &&value) : _value(value) {}

  // 当 Task 抛异常时用异常初始化 Result
  explicit Result(std::exception_ptr &&exception_ptr) : _exception_ptr(exception_ptr) {}

  // 读取结果，有异常则抛出异常
  T get_or_throw() {
    if (_exception_ptr) {
      std::rethrow_exception(_exception_ptr);
    }
    return _value;
  }

 private:
  T _value{};
  std::exception_ptr _exception_ptr;
};
```

其中，`Result` 的模板参数 `T` 对应于 `Task` 的返回值类型。有了这个结果类型，我们就可以很方便地在需要读取结果的时候调用 `get_or_throw`。

## promise_type 的定义

promise_type 的定义自然是最为重要的部分。


### 基本结构

基于前面几篇文章的基础，我们能够~~很轻松地~~给出它的基本结构：

```cpp
template<typename ResultType>
struct TaskPromise {
  // 协程立即执行
  std::suspend_never initial_suspend() { return {}; }

  // 执行结束后挂起，等待外部销毁。该逻辑与前面的 Generator 类似
  std::suspend_always final_suspend() noexcept { return {}; }

  // 构造协程的返回值对象 Task
  Task<ResultType> get_return_object() {
    return Task{std::coroutine_handle<TaskPromise>::from_promise(*this)};
  }

  void unhandled_exception() {
    // 将异常存入 result
    result = Result<ResultType>(std::current_exception());
  }

  void return_value(ResultType value) {
    // 将返回值存入 result，对应于协程内部的 'co_return value'
    result = Result<ResultType>(std::move(value));
  }


 private:
  // 使用 std::optional 可以区分协程是否执行完成
  std::optional<Result<ResultType>> result;

};
```

### await_transform

光有这些还不够，我们还需要为 `Task` 添加 `co_await` 的支持。这里我们有两个选择：

1. 为 `Task` 实现 `co_await` 运算符
2. 在 `promise_type` 当中定义 `await_transform`

从效果上来看，二者都可以做到。但区别在于，`await_transform` 是 `promsie_type` 的内部函数，可以直接访问到 `promise` 内部的状态；同时，`await_transform` 的定义也会限制协程内部对于其他类型的 `co_await` 的支持，将协程内部的挂起行为更好的管控起来，方便后续我们做统一的线程调度。因此此处我们采用 `await_transform` 来为 `Task` 提供 `co_await` 支持：

```cpp
template<typename ResultType>
struct TaskPromise {
  ...

  // 注意这里的模板参数
  template<typename _ResultType>
  TaskAwaiter<_ResultType> await_transform(Task<_ResultType> &&task) {
    return TaskAwaiter<_ResultType>(std::move(task));
  }
  
  ...
}
```

代码很简单，返回了一个 `TaskAwaiter` 的对象。不过再次请大家注意，这里存在两个 `Task`，一个是 `TaskPromise` 对应的 `Task`，一个是 `co_await` 表达式的操作数 `Task`，后者是 `await_transform` 的参数。

下面是 `TaskAwaiter` 的定义：

```cpp
template<typename Result>
struct TaskAwaiter {
  explicit TaskAwaiter(Task<Result> &&task) noexcept
      : task(std::move(task)) {}

  TaskAwaiter(TaskAwaiter &&completion) noexcept
      : task(std::exchange(completion.task, {})) {}

  TaskAwaiter(TaskAwaiter &) = delete;

  TaskAwaiter &operator=(TaskAwaiter &) = delete;

  constexpr bool await_ready() const noexcept {
    return false;
  }

  void await_suspend(std::coroutine_handle<> handle) noexcept {
    // 当 task 执行完之后调用 resume
    task.finally([handle]() {
      handle.resume();
    });
  }

  // 协程恢复执行时，被等待的 Task 已经执行完，调用 get_result 来获取结果
  Result await_resume() noexcept {
    return task.get_result();
  }

 private:
  Task<Result> task;

};
```

当一个 `Task` 实例被 co_await 时，意味着它在 co_await 表达式返回之前已经执行完毕，当 `co_await` 表达式返回时，`Task` 的结果也就被取到，`Task` 实例在后续就没有意义了。因此 `TaskAwaiter` 的构造器当中接收 `Task &&`，防止 `co_await` 表达式之后继续对 `Task` 进行操作。

### 同步阻塞获取结果

为了防止 `result` 被外部随意访问，我们特意将其改为私有成员。接下来我们还需要提供相应的方式方便外部访问 `result`。

先来看一下如何实现同步阻塞的结果返回：

```cpp
template<typename ResultType>
struct TaskPromise {
  ...

  void unhandled_exception() {
    std::lock_guard lock(completion_lock);
    result = Result<ResultType>(std::current_exception());
    // 通知 get_result 当中的 wait
    completion.notify_all();
  }

  void return_value(ResultType value) {
    std::lock_guard lock(completion_lock);
    result = Result<ResultType>(std::move(value));
    // 通知 get_result 当中的 wait
    completion.notify_all();
  }

  ResultType get_result() {
    // 如果 result 没有值，说明协程还没有运行完，等待值被写入再返回
    std::unique_lock lock(completion_lock);
    if (!result.has_value()) {
      // 等待写入值之后调用 notify_all
      completion.wait(lock);
    }
    // 如果有值，则直接返回（或者抛出异常）
    return result->get_or_throw();
  }

 private:
  std::optional<Result<ResultType>> result;

  std::mutex completion_lock;
  std::condition_variable completion;
}
```

既然要阻塞，就免不了用到锁（mutex）和条件变量（condition_variable），熟悉它们的读者一定觉得事情变得不那么简单了：这些工具在以往都是用在多线程并发的环境当中的。我们现在这么写其实也是为了后续应对多线程的场景，有关多线程调度的问题我们将在下一篇文章当中讨论。

### 异步结果回调

异步回调的实现稍微复杂一些，其实主要复杂在对于函数的运用。实际上对于回调的支持，主要就是支持回调的注册和回调的调用。根据结果类型的不同，回调又分为返回值的回调或者抛出异常的回调：

```cpp
template<typename ResultType>
struct TaskPromise {
  ...

  void unhandled_exception() {
    std::lock_guard lock(completion_lock);
    result = Result<ResultType>(std::current_exception());
    completion.notify_all();
    // 调用回调
    notify_callbacks();
  }

  void return_value(ResultType value) {
    std::lock_guard lock(completion_lock);
    result = Result<ResultType>(std::move(value));
    completion.notify_all();
    // 调用回调
    notify_callbacks();
  }

  void on_completed(std::function<void(Result<ResultType>)> &&func) {
    std::unique_lock lock(completion_lock);
    // 加锁判断 result
    if (result.has_value()) {
      // result 已经有值
      auto value = result.value();
      // 解锁之后再调用 func
      lock.unlock();
      func(value);
    } else {
      // 否则添加回调函数，等待调用
      completion_callbacks.push_back(func);
    }
  }

 private:
  ...

  // 回调列表，我们允许对同一个 Task 添加多个回调
  std::list<std::function<void(Result<ResultType>)>> completion_callbacks;
  
  void notify_callbacks() {
    auto value = result.value();
    for (auto &callback : completion_callbacks) {
      callback(value);
    }
    // 调用完成，清空回调
    completion_callbacks.clear();
  }

}
```

同样地，如果只是在单线程环境内运行协程，这里的异步回调的作用可能并不明显。这里只是先给出定义，待我们后续支持线程调度之后，这些回调支持就会非常有价值了。

## Task 的实现

现在我们已经实现了最为关键的 `promise_type`，接下来给出 `Task` 类型的完整定义。我想各位读者一定明白，`Task` 不过就是个摆设，它的能力大多都是通过调用 `promise_type` 来实现的。

```cpp
template<typename ResultType>
struct Task {

  // 声明 promise_type 为 TaskPromise 类型
  using promise_type = TaskPromise<ResultType>;

  ResultType get_result() {
    return handle.promise().get_result();
  }

  Task &then(std::function<void(ResultType)> &&func) {
    handle.promise().on_completed([func](auto result) {
      try {
        func(result.get_or_throw());
      } catch (std::exception &e) {
        // 忽略异常
      }
    });
    return *this;
  }

  Task &catching(std::function<void(std::exception &)> &&func) {
    handle.promise().on_completed([func](auto result) {
      try {
        // 忽略返回值
        result.get_or_throw();
      } catch (std::exception &e) {
        func(e);
      }
    });
    return *this;
  }

  Task &finally(std::function<void()> &&func) {
    handle.promise().on_completed([func](auto result) { func(); });
    return *this;
  }

  explicit Task(std::coroutine_handle<promise_type> handle) noexcept: handle(handle) {}

  Task(Task &&task) noexcept: handle(std::exchange(task.handle, {})) {}

  Task(Task &) = delete;

  Task &operator=(Task &) = delete;

  ~Task() {
    if (handle) handle.destroy();
  }

 private:
  std::coroutine_handle<promise_type> handle;
};
```

现在我们完成了 `Task` 的第一个通用版本的实现，这个版本的实现当中尽管我们对 `Task` 的结果做了加锁，但考虑到目前我们仍没有提供线程切换的能力，因此这实际上是一个无调度器版本的 `Task` 实现。

## Task 的 void 特化

前面讨论的 `Task` 有一个作为返回值类型的模板参数 `ResultType`。实际上有些时候我们只是希望一段任务可以异步执行完，而不关注它的结果，这时候 `ResultType` 就需要是 `void`。例如：

```cpp
Task<void> Producer(Channel<int> &channel) {
  ...
}
```

但很快你就会发现问题。编译器会告诉你模板实例化错误，因为我们没法用 `void` 来声明变量；编译器还会告诉你协程体里面如果没有返回值，你应该提供为 `promise_type` 提供 `return_void` 函数。

看来情况没有那么简单。当然也没有那么复杂。C++ 的模板经常会遇到这种需要特化的情况，我们只需要对之前的 `Task<ResultType>` 版本的定义稍作修改，就可以给出 `Task<void>` 的版本：

```cpp
template<>
struct Task<void> {
  // 用 void 作为第一个模板参数实例化 TaskPromise
  using promise_type = TaskPromise<void>;

  // 返回 void
  void get_result() {
    // 因为是 void，因此不用 return
    // 这时这个函数的作用就是阻塞当前线程等待协程执行完成
    handle.promise().get_result();
  }

  // func 的类型参数 void()，注意之前这个模板类型构造器还有个参数 ResultType
  Task &then(std::function<void()> &&func) {
    handle.promise().on_completed([func](auto result) {
      try {
        // 我们也会对 result 做 void 版本的实例化，这里只是检查有没有异常抛出
        result.get_or_throw();
        func();
      } catch (std::exception &e) {
        // ignore.
      }
    });
    return *this;
  }

  Task &catching(std::function<void(std::exception &)> &&func) {
    handle.promise().on_completed([func](auto result) {
      try {
        result.get_or_throw();
      } catch (std::exception &e) {
        func(e);
      }
    });
    return *this;
  }
  ...
};
```

你会发现变化的只是跟结果相关的部分。相应的，`TaskPromise` 也需要做出修改：

```cpp
template<>
struct TaskPromise<void> {
  ...

  // 注意 Task 的模板参数
  Task<void> get_return_object() {
    return Task{std::coroutine_handle<TaskPromise>::from_promise(*this)};
  }

  ...

  // 返回值类型改成 void
  void get_result() {
    ...
    // 不再需要 return
    result->get_or_throw();
  }

  void unhandled_exception() {
    std::lock_guard lock(completion_lock);
    // Result 的模板参数变化
    result = Result<void>(std::current_exception());
    completion.notify_all();
    notify_callbacks();
  }

  // 不再是 return_value 了
  void return_void() {
    std::lock_guard lock(completion_lock);
    result = Result<void>();
    completion.notify_all();
    notify_callbacks();
  }

  // 注意 Result 的模板参数 void 
  void on_completed(std::function<void(Result<void>)> &&func) {
    ... 
  }

 private:
  // 注意 Result 的模板参数 void
  std::optional<Result<void>> result;
  std::list<std::function<void(Result<void>)>> completion_callbacks;

  ...
};
```

还有 `Result` 也有对应的 `void` 实例化版本，其实就是把存储返回值相关的逻辑全部删掉，只保留异常相关的部分：

```cpp
template<>
struct Result<void> {

  explicit Result() = default;

  explicit Result(std::exception_ptr &&exception_ptr) : _exception_ptr(exception_ptr) {}

  void get_or_throw() {
    if (_exception_ptr) {
      std::rethrow_exception(_exception_ptr);
    }
  }

 private:
  std::exception_ptr _exception_ptr;
};
```

至此，我们进一步完善了 `Task` 对不同类型的结果的支持，理论上我们可以使用 `Task` 来构建各式各样的协程了。

## 小试牛刀

接下来我们可以试着把文章开头的代码运行一下了。为了更仔细地观察程序的执行，我们也在一些节点打印了日志：

```cpp
Task<int> simple_task2() {
  debug("task 2 start ...");
  using namespace std::chrono_literals;
  std::this_thread::sleep_for(1s);
  debug("task 2 returns after 1s.");
  co_return 2;
}

Task<int> simple_task3() {
  debug("in task 3 start ...");
  using namespace std::chrono_literals;
  std::this_thread::sleep_for(2s);
  debug("task 3 returns after 2s.");
  co_return 3;
}

Task<int> simple_task() {
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

其中 `debug` 是我自定义的一个宏，可以在打印日志的时候附加上时间、线程、函数等信息，运行结果如下：

```
16:46:30.448 [Thread-25132] (main.cpp:40) simple_task: task start ...
16:46:30.449 [Thread-25132] (main.cpp:24) simple_task2: task 2 start ...
16:46:31.459 [Thread-25132] (main.cpp:27) simple_task2: task 2 returns after 1s.
16:46:31.460 [Thread-25132] (main.cpp:42) simple_task: returns from task2:  2
16:46:31.461 [Thread-25132] (main.cpp:32) simple_task3: in task 3 start ...
16:46:33.469 [Thread-25132] (main.cpp:35) simple_task3: task 3 returns after 2s.
16:46:33.470 [Thread-25132] (main.cpp:44) simple_task: returns from task3:  3
16:46:33.471 [Thread-25132] (main.cpp:51) operator (): simple task end:  6
16:46:33.471 [Thread-25132] (main.cpp:57) main: simple task end from get:  6
```

由于我们的任务在执行过程中没有进行任何线程切换，因此各个 `Task` 的执行实际上是串行的，就如同我们调用普通函数一样。当然，这显然不是我们的最终目的，下一篇我们就来介绍如何给 `Task` 增加调度器的支持。

## 小结

本文我们详细介绍了无调度器版本的 `Task` 的实现。尽管程序尚未真正实现异步执行，但至少从形式上，我们已经非常接近协程最神奇的地方了。

---

## 关于作者

**霍丙乾 bennyhuo**，Kotlin 布道师，Google 认证 Kotlin 开发专家（Kotlin GDE）；**《深入理解 Kotlin 协程》** 作者（机械工业出版社，2020.6）；前腾讯高级工程师，现就职于猿辅导

* GitHub：https://github.com/bennyhuo
* 博客：https://www.bennyhuo.com
* bilibili：[**bennyhuo不是算命的**](https://space.bilibili.com/28615855)
* 微信公众号：**bennyhuo**