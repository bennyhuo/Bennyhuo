#  渡劫 C++ 协程（3）：序列生成器的泛化和函数式变换

**C++ Coroutines**

> 我们还可以对序列生成器产生的数据流做进一步的筛选和处理，而这一切都可以基于协程去实现。

==  C++|Coroutines ==

<cpp-coroutines>

## 序列生成器的泛化

我们已经有了一个 int 版本的 Generator，实际上我们也很容易把它泛化成模板类型，改动的地方不多，基本上把原 Generator 类型当中的 `int` 替换成模板参数 `T` 即可，如下：

```cpp
template<typename T>
struct Generator {

  class ExhaustedException : std::exception {};

  struct promise_type {
    T value;

    ... 

    std::suspend_always yield_value(T value) {
        ...
    }
    ...
  };

  ...

  T next() {
    ...
  }

  ...
};
```

这样原来生成斐波那契数列的函数也需要稍作调整：

```cpp
Generator<int> fibonacci() {
  ...
}
```

其实不过就是给 Generator 加了个模板参数而已。

## 



## 小结

本文围绕序列生成器这个经典的协程案例介绍了协程的销毁、co_await 运算符、await_transform 以及 yield_value 的用法。

说出来你可能不信，如果这篇文章你能够完全理解，那么相信你对 C++ 协程特性的了解已经比较全面了。

