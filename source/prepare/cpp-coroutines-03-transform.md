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

## 创建 Generator 的便捷函数

现在我们知道，想要创建 Generator 就需要定义一个函数或者 Lambda。不过从输出的结果上看， Generator 实际上就是一个“懒”序列，因此我们当然可以通过一个数组就能创建出 Generator 了。

使用数组创建 Generator 的版本实现比较简单，我们直接给出代码：

```cpp
template<typename T>
struct Generator {
  ...

  Generator static from_array(T array[], int n) {
    for (int i = 0; i < n; ++i) {
      co_yield array[i];
    }
  }
}
```

注意到 C++ 的数组作为参数时相当于指针，需要传入长度 n。用法如下：

```cpp
int array[] = {1, 2, 3, 4};
auto generator = Generator<int>::from_array(array, 4);
```

显然，这个写法不能令人满意。

我们把数组改成 std::list 如何呢？

```cpp
template<typename T>
struct Generator {
  ...

  Generator static from_list(std::list<T> list) {
    for (auto t: list) {
      co_yield t;
    }
  }
}
```

相比数组，`std::list` 的版本少了一个长度参数，因为长度的信息被封装到 `std::list` 当中了。用法如下：

```cpp
auto generator = Generator<int>::from_list(std::list{1, 2, 3, 4});
```

这个虽然有进步，但缺点也很明显，因为每次都要创建一个 `std::list`，说得直接一点儿就是每次都要多写 `std::list` 这 9 个字符。

这时候我们就很自然地想到了初始化列表的版本：

```cpp
template<typename T>
struct Generator {
  ...

  Generator static from(std::initializer_list<T> args) {
    for (auto t: args) {
      co_yield t;
    }
  }
}
```

这次我们就可以有下面的用法了：

```cpp
auto generator = Generator<int>::from({1, 2, 3, 4});
```

不错，看上去需要写的内容少很多了。


## 小结

本文围绕序列生成器这个经典的协程案例介绍了协程的销毁、co_await 运算符、await_transform 以及 yield_value 的用法。

说出来你可能不信，如果这篇文章你能够完全理解，那么相信你对 C++ 协程特性的了解已经比较全面了。

