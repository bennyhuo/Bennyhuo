#  渡劫 C++ 协程（2）：实现一个序列生成器

**C++ Coroutines**

> 序列生成器是一个非常经典的协程应用场景。

==  C++|Coroutines ==

<cpp-coroutines>

## 实现目标

现在我们已经了解了绝大部分 C++ 协程的特性，可以试着来实现一些小案例了。

简单的说，序列生成器通常的实现就是在一个协程内部通过某种方式向外部传一个值出去，并且将自己挂起，外部调用者则可以获取到这个值，并且在后续继续恢复执行序列生成器来获取下一个值。

显然，挂起和向外部传值的任务就需要通过 `co_await` 来完成了，外部获取值的任务就要通过协程的返回值来完成。

由此我们大致能想到最终程序的样子：

```cpp
Generator sequence() {
  int i = 0;
  while (true) {
    co_await i++;
  }
}

int main() {
  auto generator = sequence();
  for (int i = 0; i < 10; ++i) {
    std::cout << generator.next() << std::endl;
  }
}
```

注意到 generator 有个 next 函数，调用它时我们需要想办法让协程恢复执行，并将下一个值传出来。

好了，接下来我们就带着这两个问题去寻找解决办法，顺便把剩下的一点点 C++ 协程的知识补齐。

## 调用者获取值

截止到目前我们都没有真正尝试去调用过协程，现在是个很好的机会。我们观察一下 main 函数当中的这段代码：

```cpp
int main() {
  auto generator = sequence();
  for (int i = 0; i < 10; ++i) {
    std::cout << generator.next() << std::endl;
  }
}
```

`generator` 的类型就是我们即将实现的序列生成器类型 `Generator`，结合上一篇文章当中对于协程返回值类型的介绍，我们先大致给出它的定义：

```cpp
struct Generator {
  struct promise_type {
    
    // 开始执行时直接挂起等待外部调用 resume 获取下一个值
    std::suspend_always initial_suspend() { return {}; };

    // 执行结束后不需要挂起
    std::suspend_never final_suspend() noexcept { return {}; }

    // 为了简单，我们认为序列生成器当中不会抛出异常，这里不做任何处理
    void unhandled_exception() { }

    // 构造协程的返回值类型
    Generator get_return_object() {
      return Generator{};
    }

    // 没有返回值
    void return_void() { }
  };

  int next() {
    ???.resume();
    return ???;
  }
};
```

代码当中有两处我们标注为 ???，表示暂时还不知道怎么处理。

第一个是我们想要在 Generator 当中 resume 协程的话，需要拿到 coroutine_handle，这个要怎么做到呢？

这时候我希望大家一定要记住一点，promise_type 是连接协程内外的桥梁，想要拿到什么，找 promise_type 要。标准库提供了一个通过 promise_type 的对象的地址获取 coroutine_handle 的函数，它实际上是 coroutine_handle 的一个静态函数：

```cpp
template <class _Promise>
struct coroutine_handle {
    static coroutine_handle from_promise(_Promise& _Prom) noexcept {
      ...
    }

    ...
}
```

这样看来，我们只需要在 `get_return_object` 函数调用时，先获取 coroutine_handle，然后再传给即将构造出来的 Generator 即可，因此我们稍微修改一下前面的代码：

```cpp
struct Generator {
  struct promise_type {
    ...

    // 构造协程的返回值类型
    Generator get_return_object() {
      return Generator{ std::coroutine_handle<promise_type>::from_promise(*this) };
    }

    ...
  };

  std::coroutine_handle<promise_type> handle;

  int next() {
    handle.resume();
    return ???;
  }

};
```



## 小结

