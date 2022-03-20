#  渡劫 C++ 协程（6）：基于协程的挂起实现无阻塞的 sleep

**C++ Coroutines**

> 如果你想要等待 100ms，你会怎么做？sleep_for(100ms) 吗？

==  C++|Coroutines ==

<cpp-coroutines>


## 实现目标

在以往，我们想要让程序等待 100ms，我们只能调用线程的 sleep 函数来阻塞当前线程 100ms。

这样做确实可以让程序等待 100ms，但坏处就是这 100ms 期间，被阻塞的当前线程什么也做不了，白白占用了内存。协程出现之后，我们其实完全可以让协程在需要 sleep 的时候挂起，100ms 之后再来恢复执行，完全不需要阻塞当前线程。

想法不错，马上把用例给出来：

```cpp
Task<int, AsyncExecutor> simple_task2() {
  debug("task 2 start ...");
  using namespace std::chrono_literals;
  // 之前的写法，用 sleep_for 让当前线程睡眠 1 秒
  // std::this_thread::sleep_for(1s);
  // 等待 1 秒，注意 1s 是 chrono_literals 的字面值写法
  co_await 1s;
  debug("task 2 returns after 1s.");
  co_return 2;
}
```

这个例子大家已经见过多次了，之前用的是 `sleep_for` 让线程睡眠 1 秒，这次我们直接用 `co_await 1s`，看上去是不是特别的厉害？

## 为 duration 实现 await_transform

如果大家对于 C++ 11 不熟悉，可能会比较疑惑 `co_await 1s` 当中的 `1s` 是个什么东西。实际上这是 C++ 11 对字面值的一种支持，本质上就是一个运算符重载，这里的 `1s` 的类型是 `duration<long long>`。除了秒以外，时间的单位也可以是毫秒、纳秒、分钟、小时等等，这些 C++ 11 的 `duration` 都已经提供了完善的支持，因此我们只要对 `duration` 做支持即可。

```cpp
template<typename ResultType, typename Executor>
struct TaskPromise {
  ...
  template<typename _Rep, typename _Period>
  SleepAwaiter await_transform(std::chrono::duration<_Rep, _Period> &&duration) {
    return SleepAwaiter(&executor, std::chrono::duration_cast<std::chrono::milliseconds>(duration).count());
  }
  ...
}
```

这里引入了一个新的类型 `SleepAwaiter`，它的任务有两个：
1. 确保当前协程在若干毫秒之后恢复执行。
2. 确保当前协程恢复执行时要调度到对应的调度器上。

不难想到，`std::chrono::duration_cast<std::chrono::milliseconds>(duration).count()` 实际上就是把任意单位的 `duration` 转换成毫秒。

`SleepAwaiter` 的实现也很简单，我们直接给出：

```cpp
struct SleepAwaiter {

  explicit SleepAwaiter(AbstractExecutor *executor, long long duration) noexcept
      : _executor(executor), _duration(duration) {}

  bool await_ready() const { return false; }

  void await_suspend(std::coroutine_handle<> handle) const {
    // 自定义的延时执行工具类，全局只需要一个实例
    static Scheduler scheduler;

    scheduler.execute([this, handle]() {
      // _duration 毫秒之后执行下面的代码
      _executor->execute([handle]() {
        handle.resume();
      });
    }, _duration);
  }

  void await_resume() {}

 private:
  AbstractExecutor *_executor;
  long long _duration;
}
```

这当中最为关键的就是 `Scheduler` 的实现了，这个类实际上本身就是一个独立的定时任务调度器。

## 定时任务调度器 Scheduler

定时任务调度器，本质上就是一个时间管理大师。任何交给它的任务都需要有优先级，优先级的计算规则当然就是延时的长短，于是我们需要用到优先级队列来存储待执行的任务。

等下，任务队列？这让我想起上一篇文章当中的 `LooperExecutor`，如果我们给它加上计时执行的能力，`Scheduler` 的功能就差不多完成了。换个角度看，`LooperExecutor` 其实就是 `Scheduler` 的一个特化版本，它的所有任务的延时都是 0。

### 定义定时任务的描述类型

为了方便管理定时任务，我们需要定义一个类型 `DelayedExecutable`，它包含一个函数和它要执行的绝对时间：

```cpp
class DelayedExecutable {
 public:
  DelayedExecutable(std::function<void()> &&func, long long delay) : func(std::move(func)) {
    using namespace std;
    using namespace std::chrono;
    auto now = system_clock::now();
    // 当前的时间戳，单位毫秒
    auto current = duration_cast<milliseconds>(now.time_since_epoch()).count();

    // 计算出任务的计划执行时间
    scheduled_time = current + delay;
  }

  // 调用时，返回从当前时间还需要多少毫秒到任务执行时间
  long long delay() const {
    using namespace std;
    using namespace std::chrono;

    auto now = system_clock::now();
    auto current = duration_cast<milliseconds>(now.time_since_epoch()).count();
    return scheduled_time - current;
  }

  long long get_scheduled_time() const {
    return scheduled_time;
  }

  void operator()() {
    func();
  }

 private:
  long long scheduled_time;
  std::function<void()> func;
};
```

定时任务的描述类 `DelayedExecutable` 非常简单，相信大家一看就明白。

为了将 `DelayedExecutable` 存入优先级队列当中，我们还需要给它提给一个比较大小的类：

```cpp
class DelayedExecutableCompare {
 public:
  bool operator()(DelayedExecutable &left, DelayedExecutable &right) {
    return left.get_scheduled_time() > right.get_scheduled_time();
  }
};
```

这个类就很简单了，直接将对 `DelayedExecutable` 的比较转换成对它们的执行时间的比较。使用这个类对 `DelayedExecutable` 进行排序时，会使得时间靠前的对象排到前面。

### 实现定时任务调度器

接下来我们直接给出 `Scheduler` 的实现，由于这个类与前面的 `LooperExecutor` 很像，我们只给出不同的部分：

```cpp
class Scheduler {
 private:
  std::condition_variable queue_condition;
  std::mutex queue_lock;
  // 注意这里改用优先级队列
  std::priority_queue<DelayedExecutable, std::vector<DelayedExecutable>, DelayedExecutableCompare> executable_queue;

  std::atomic<bool> is_active;
  std::thread work_thread;

  void run_loop() {
    while (is_active.load(std::memory_order_relaxed) || !executable_queue.empty()) {
      std::unique_lock lock(queue_lock);
      if (executable_queue.empty()) {
        queue_condition.wait(lock);
        if (executable_queue.empty()) {
          continue;
        }
      }

      // 从这里开始于 LooperExecutor 不同，这里需要判断优先级队头的任务，也就是最先要执行的任务是否需要立即执行
      auto executable = executable_queue.top();
      long long delay = executable.delay();
      if (delay > 0) {
        // 队头的任务还没到执行时间，等待 delay 毫秒
        auto status = queue_condition.wait_for(lock, std::chrono::milliseconds(delay));
        // 如果等待期间没有延时比 delay 更小的任务加入，这里就会返回 timeout
        if (status != std::cv_status::timeout) {
          // 不是 timeout，需要重新计算队头的延时
          continue;
        }
      }
      executable_queue.pop();
      lock.unlock();
      executable();
    }
  }
 public:

  Scheduler() {
    ... // 与 LooperExecutor 完全相同
  }

  ~Scheduler() {
    ... // 与 LooperExecutor 完全相同
  }

  void execute(std::function<void()> &&func, long long delay) {
    delay = delay < 0 ? 0 : delay;
    std::unique_lock lock(queue_lock);
    if (is_active.load(std::memory_order_relaxed)) {
      // 只有队列为空或者比当前队头任务的延时更小时，需要调用 notify_one
      // 其他情况只需要按顺序依次执行即可
      bool need_notify = executable_queue.empty() || executable_queue.top().delay() > delay;
      executable_queue.push(DelayedExecutable(std::move(func), delay));
      lock.unlock();
      if (need_notify) {
        queue_condition.notify_one();
      }
    }
  }

  void shutdown(bool wait_for_complete = true) {
    ... // 与 LooperExecutor 完全相同
  }

  void join() {
    if (work_thread.joinable()) {
      work_thread.join();
    }
  }
};
```

通过对代码和注释的阅读，相信大家能够明白延时的实现其实是通过阻塞一个专门用于调度延时任务的线程来做到的。

相信有读者会有疑问：这不还是有阻塞吗？

没错，阻塞是免不了的。通常而言，我们也不会用一个线程去严格对应一个协程，当一个协程挂起时，执行这个协程的线程就会被空闲出来有机会去调度执行其他协程，进而让线程的利用率得到充分提升。如果有 10 个协程都需要执行延时，相较于阻塞这 10 个协程当前所在的 10 个线程而言，阻塞一个线程显然是更加经济的。

## 小试牛刀

我们又一次在文章的最后把要实现的功能做好，现在是收获的时刻了。

我们先来一个开胃菜。前面我们提到过，`Scheduler` 实际上是一个完整独立的功能模块，因此我们先写个简单的用例来测试一下它的功能：

```cpp
auto scheduler = Scheduler();

debug("start")
scheduler.execute([]() { debug("2"); }, 100);
scheduler.execute([]() { debug("1"); }, 50);
scheduler.execute([]() { debug("6"); }, 1000);
scheduler.execute([]() { debug("5"); }, 500);
scheduler.execute([]() { debug("3"); }, 200);
scheduler.execute([]() { debug("4"); }, 300);

scheduler.shutdown();
scheduler.join();
```

打印的数字是按照时间顺序排列的，但任务的添加却是乱序的。运行结果如下：

```
22:12:54.611 [Thread-16076] (main.cpp:12) main: start
22:12:54.673 [Thread-3252] (main.cpp:14) operator (): 1
22:12:54.721 [Thread-3252] (main.cpp:13) operator (): 2
22:12:54.815 [Thread-3252] (main.cpp:17) operator (): 3
22:12:54.924 [Thread-3252] (main.cpp:18) operator (): 4
22:12:55.113 [Thread-3252] (main.cpp:16) operator (): 5
22:12:55.618 [Thread-3252] (main.cpp:15) operator (): 6
```
可以看到 1-6 的顺序是可以保证的，前面的时间信息也可以看到延时能力基本上是符合预期的。

接下来，我们把前面用了好几次的 `Task` 的 demo 拿出来，加上延时，顺便也验证一下 `AsyncExecutor` 和 `NewThreadExecutor` 的效果：

```cpp
Task<int, AsyncExecutor> simple_task2() {
  debug("task 2 start ...");
  using namespace std::chrono_literals;
  co_await 1s;
  debug("task 2 returns after 1s.");
  co_return 2;
}

Task<int, NewThreadExecutor> simple_task3() {
  debug("in task 3 start ...");
  using namespace std::chrono_literals;
  co_await 2s;
  debug("task 3 returns after 2s.");
  co_return 3;
}

Task<int, LooperExecutor> simple_task() {
  debug("task start ...");
  using namespace std::chrono_literals;
  co_await 100ms;
  debug("after 100ms ...");
  auto result2 = co_await simple_task2();
  debug("returns from task2: ", result2);

  co_await 500ms;
  debug("after 500ms ...");
  auto result3 = co_await simple_task3();
  debug("returns from task3: ", result3);
  co_return 1 + result2 + result3;
}

void main() {
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
}
```

运行结果如下：

```
22:14:49.531 [Thread-15596] (main.cpp:41) simple_task: task start ...
22:14:49.641 [Thread-15596] (main.cpp:44) simple_task: after 100ms ...
22:14:49.643 [Thread-26892] (main.cpp:25) simple_task2: task 2 start ...
22:14:50.652 [Thread-26892] (main.cpp:28) simple_task2: task 2 returns after 1s.
22:14:50.653 [Thread-15596] (main.cpp:46) simple_task: returns from task2:  2
22:14:51.156 [Thread-15596] (main.cpp:49) simple_task: after 500ms ...
22:14:51.158 [Thread-16816] (main.cpp:33) simple_task3: in task 3 start ...
22:14:53.165 [Thread-26756] (main.cpp:36) simple_task3: task 3 returns after 2s.
22:14:53.166 [Thread-15596] (main.cpp:51) simple_task: returns from task3:  3
22:14:53.166 [Thread-15596] (main.cpp:58) operator (): simple task end:  6
22:14:53.167 [Thread-11256] (main.cpp:64) test_tasks: simple task end from get:  6
```

我们把所有的 `sleep_for` 都替换成了本文实现的无阻塞的 sleep，运行效果上来看确实可以按照要求实现延时执行。

另外，由于这里的 `co_await 1s` 这样的操作都是挂起点，因此恢复时也会用协程的调度器去调度。可以看到，`simple_task2` 的两行日志的线程都是 `26892`，这大概是因为 `std::async` 背后是一个线程池，两次调度都调度到了同一个线程上，当然这个完全取决于 `std::async` 的实现。而 `simple_task3` 的两行日志就分别运行在 `16816` 和 `26756`，因为它的调度器是 `NewThreadExecutor`，每次都会新起一个线程来实现调度。

## 小结

本文结合前面的 `Task` 的内容进一步给出了无阻塞式的 sleep 实现。通过本文的探讨，相信大家族在感慨 C++ 协程的设计真的是如此的灵活的同时，也进一步深入了解了 C++ 协程的用法。