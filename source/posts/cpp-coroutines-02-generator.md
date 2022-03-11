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

接下来就是如何获取协程内部传出来的值的问题了。同样，本着有事儿找 promise_type 的原则，我们可以直接给它定义一个 value 成员：

```cpp
struct Generator {
  struct promise_type {
    int value;

    ...
  };

  std::coroutine_handle<promise_type> handle;

  int next() {
    handle.resume();
    // 通过 handle 获取 promise，然后再取到 value
    return handle.promise().value;
  }
};
```

## 协程内部挂起并传值

现在的问题就是如何从协程内部传值给 promise_type 了。

我们再来观察一下最终实现的效果：

```cpp
Generator sequence() {
  int i = 0;
  while (true) {
    co_await i++;
  }
}
```

特别需要注意的是 `co_await i++;` 这一句，我们发现 `co_await` 后面的是一个整型值，而不是我们在前面的文章当中提到的满足等待体（awaiter）条件的类型，这种情况下该怎么办呢？

实际上，对于 `co_await <expr>` 表达式当中 `expr` 的处理，C++ 有一套完善的流程：

1. 如果 promise_type 当中定义了 await_transform 函数，那么先通过 `promise.await_transform(expr)` 来对 expr 做一次转换，得到的对象称为 awaitable；否则 awaitble 就是 expr 本身。
2. 接下来使用 awaitable 对象来获取等待体（awaiter）。如果 awaitable 对象有 `operator co_await` 运算符重载，那么等待体就是 `operator co_await(awaitable)`，否则等待体就是 awaitable 对象本身。

听上去，我们要么给 promise_type 实现一个 `await_tranform(int)` 函数，要么就为整型实现一个 `operator co_await` 的运算符重载，二者选一个就可以了。

### 方案 1：实现 operator co_await

这个方案就是给 int 定义 operator co_await 的重载：

```cpp
auto operator co_await(int value) {
  struct IntAwaiter {
    int value;

    bool await_ready() const noexcept {
      return false;
    }
    void await_suspend(std::coroutine_handle<Generator::promise_type> handle) const {
      handle.promise().value = value;
    }
    void await_resume() {  }
  };
  return IntAwaiter{.value = value};
}
```

当然，这个方案对于我们这个特定的场景下是行不通的，因为在 C++ 当中我们是无法给基本类型定义运算符重载的。

不过，如果我们遇到的情况不是基本类型，那么运算符重载的思路就可以行得通。`operator co_await` 的重载我们将会在后面给出例子。

### 方案 2：await_transform

运算符重载行不通，那就只能通过 await_tranform 来做转换了。

代码比较简单：

```cpp
struct Generator {
  struct promise_type {
    int value;

    // 传值的同时要挂起，值存入 value 当中
    std::suspend_always await_transform(int value) {
      this->value = value;
      return {};
    }

    ...
  };

  std::coroutine_handle<promise_type> handle;

  int next() {
    handle.resume();

  // 外部调用者或者恢复者可以通过读取 value
    return handle.promise().value;
  }
};
```

定义了 `await_transform` 函数之后，`co_await expr` 就相当于 `co_await promise.await_transform(expr)` 了。

至此，我们的例子就可以运行了：

```cpp
Generator sequence() {
  int i = 0;
  while (true) {
    co_await i++;
  }
}

int main() {
  auto gen = sequence();
  for (int i = 0; i < 5; ++i) {
    std::cout << gen.next() << std::endl;
  }
}
```

运行结果如下：

```
0
1
2
3
4
```

## 协程的销毁

虽然我们的协程已经能够正常工作，但它仍然存在缺陷。

### 问题 1：无法确定是否存在下一个元素

当外部调用者或者恢复者试图调用 `next` 来获取下一个元素的时候，它其实并不知道能不能真的得到一个结果。程序也可能抛出异常：

如下例：

```cpp
Generator sequence() {
  int i = 0;
  // 只传出 5 个值
  while (i < 5) {
    co_await i++;
  }
}

int main() {
  auto gen = sequence();
  for (int i = 0; i < 15; ++i) {
    // 试图读取 15 个值
    std::cout << gen.next() << std::endl;
  }
  return 0;
}
```

程序的结果是什么呢？

```
0
1
2
3
4
4

Process finished with exit code 139 (interrupted by signal 11: SIGSEGV)
```

最后一个输出的 4 实际上是恰好遇到协程销毁之前的状态，此时 promise 当中的 value 值还是之前的 4。而当我们试图不断的去读取协程的值，程序就抛出 SIGSEGV  的错误。错误的原因你可能已经想到了，当协程体执行完之后，协程的状态就会被销毁，如果我们再访问协程的话，就相当于访问了一个野指针。

为了解决这个问题，我们需要增加一个 has_next 函数，用来判断是否还有新的值传出来，has_next 函数调用的时候有两种情况：

1. 已经有一个值传出来了，还没有被外部消费
2. 还没有现成的值可以用，需要尝试恢复执行协程来看看还有没有下一个值传出来

这里我们需要有一种有效的办法来判断 value 是不是有效的，单凭 value 本身我们其实是无法确定它的值是不是被消费了，因此我们需要加一个值来存储这个状态：

```cpp
struct Generator {

  // 协程执行完成之后，外部读取值时抛出的异常
  class ExhaustedException: std::exception { };

  struct promise_type {
    int value;
    bool is_ready = false;
    ...
  }
  ...
}
```

我们定义一个成员 state 来记录协程执行的状态，状态的类型一共三种，只有 READY 的时候我们才能拿到值。

接下来改造 `next` 函数，同时增加 `has_next` 函数来描述协程是否仍然可以有值传出：

```cpp
struct Generator {
  ...

  bool has_next() {
    // 协程已经执行完成
    if (handle.done()) {
      return false;
    }

    // 协程还没有执行完成，并且下一个值还没有准备好
    if (!handle.promise().is_ready) {
      handle.resume();
    }

    if (handle.done()) {
      // 恢复执行之后协程执行完，这时候必然没有通过 co_await 传出值来
      return false;
    } else {
      return true;
    }
  }

  int next() {
    if (has_next()) {
      // 此时一定有值，is_ready 为 true 
      // 消费当前的值，重置 is_ready 为 false
      handle.promise().is_ready = false;
      return handle.promise().value;
    }
    throw ExhaustedException();
  }
};
```

这样外部使用时就需要先通过 has_next 来判断是否有下一个值，然后再去读取了：

```cpp
...

int main() {
  auto generator = sequence();
  for (int i = 0; i < 15; ++i) {
    if (generator.has_next()) {
      std::cout << generator.next() << std::endl;
    } else {
      break;
    }
  }
  return 0;
}
```

### 问题 2：协程状态的销毁比 Generator 对象的销毁更早

我们前面提到过，协程的状态在协程体执行完之后就会销毁，除非协程挂起在 `final_suspend` 调用时。

我们的例子当中 `final_suspend` 返回了 `std::suspend_never`，因此协程的销毁时机其实比 Generator 更早：

```cpp
auto generator = sequence();
for (int i = 0; i < 15; ++i) {
  if (generator.has_next()) {
    std::cout << generator.next() << std::endl;
  } else {
    // 协程已经执行完，协程的状态已经销毁
    break;
  }
}

// generator 对象在此仍然有效
```

这看上去似乎问题不大，因为我们在前面通过 `has_next` 的判断保证了读取值的安全性。

但实际上情况并非如此。我们在 `has_next` 当中调用了 `coroutine_handle::done` 来判断协程体是否执行完成，判断之前很可能协程已经销毁，`coroutine_handle` 这时候都已经是无效的了：

```cpp
bool has_next() {
  // 如果协程已经执行完成，理论上协程的状态已经销毁，handle 指向的是一个无效的协程
  // 如果 handle 本身已经无效，因此 done 函数的调用此时也是无效的
  if (handle.done()) {
    return false;
  }
  ...
}
```

因此为了让协程的状态的生成周期与 `Generator` 一致，我们必须将协程的销毁交给 `Generator` 来处理：

```cpp
struct Generator {

  class ExhaustedException: std::exception { };

  struct promise_type {
    ...

    // 总是挂起，让 Generator 来销毁
    std::suspend_always final_suspend() noexcept { return {}; }

    ...
  };

  ...

  ~Generator() {
    // 销毁协程
    handle.destroy();
  }
};
```

## 使用 co_yield

序列生成器这个需求的实现其实有个更好的选择，那就是使用 `co_yield`。`co_yield` 就是专门为向外传值来设计的，如果大家对其他语言的协程有了解，也一定见到过各种 `yield` 的实现。

C++ 当中的 `co_yield expr` 等价于 `co_await promise.yield_value(expr)`，我们只需要将前面例子当中的 `await_transform` 函数替换成 `yield_value` 就可以使用 `co_yield` 来传值了：

```cpp
struct Generator {

  class ExhaustedException: std::exception { };

  struct promise_type {
    ...

    // 将 await_transform 替换为 yield_value
    std::suspend_always yield_value(int value) {
      this->value = value;
      is_ready = true;
      return {};
    }
    ...
  };
  ...
};

Generator sequence() {
  int i = 0;
  while (i < 5) {
    // 使用 co_yield 来替换 co_await
    co_yield i++;
  }
}
```

可以看到改动点非常少，运行效果与前面的例子一致。

尽管可以实现相同的效果，但通常情况下我们使用 `co_await` 更多的关注点在挂起自己，等待别人上，而使用 `co_yield` 则是挂起自己传值出去。因此我们应该针对合适的场景做出合适的选择。

## 使用序列生成器生成斐波那契数列

接下来我们要使用序列生成器来实现一个更有意义的例子，即斐波那契数列。

```cpp
Generator fibonacci() {
  co_yield 0; // fib(0)
  co_yield 1; // fib(1)

  int a = 0;
  int b = 1;
  while(true) {
    co_yield a + b; // fib(N), N > 1
    b = a + b;
    a = b - a;
  }
}
```

我们看到这个实现非常的直接，完全不需要考虑 fib(N - 1) 和 fib(N - 2) 的存储问题。

如果没有协程，我们的实现可能是这样的：

```cpp
class Fibonacci {
 public:
  int next() {
    // 初值不符合整体的规律，需要单独处理
    if (a == -1){
      a = 0;
      b = 1;
      return 0;
    }

    int next = b;
    b = a + b;
    a = b - a;
    return next;
  }

 private:
  int a = -1;
  int b = 0;
};
```

使用时先构造一个 Fibonacci 对象，然后调用 next 函数来获取下一个值。对比之下，协程的实现带来的好处是显而易见的。

## 

## 小结

