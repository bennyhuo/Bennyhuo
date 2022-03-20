---
title:  渡劫 C++ 协程（3）：序列生成器的泛化和函数式变换 
keywords: C++ Coroutines 
date: 2022/03/14 16:03:21
description: 
tags: 
    - c++
    - coroutines 
---

> 我们还可以对序列生成器产生的数据流做进一步的筛选和处理，而这一切都可以基于协程去实现。 



<!-- more -->

- [渡劫 C++ 协程（0）：前言](https://www.bennyhuo.com/2022/03/06/cpp-coroutines-README/)
- [渡劫 C++ 协程（1）：C++ 协程概览](https://www.bennyhuo.com/2022/03/09/cpp-coroutines-01-intro/)
- [渡劫 C++ 协程（2）：实现一个序列生成器](https://www.bennyhuo.com/2022/03/11/cpp-coroutines-02-generator/)
- [渡劫 C++ 协程（3）：序列生成器的泛化和函数式变换](https://www.bennyhuo.com/2022/03/14/cpp-coroutines-03-functional/)
- [渡劫 C++ 协程（4）：通用异步任务 Task](https://www.bennyhuo.com/2022/03/19/cpp-coroutines-04-task/)
- [渡劫 C++ 协程（5）：协程的调度器](https://www.bennyhuo.com/2022/03/20/cpp-coroutines-05-dispatcher/)
- [渡劫 C++ 协程（6）：基于协程的挂起实现无阻塞的 sleep](https://www.bennyhuo.com/2022/03/20/cpp-coroutines-06-sleep/)



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

不过，如果这对花括号也不用写的话，那就完美了。想要做到这一点，我们需要用到 C++ 17 的折叠表达式（fold expression）的特性，实现如下：

```cpp
template<typename T>
struct Generator {
  ...

  template<typename ...TArgs>
  Generator static from(TArgs ...args) {
    (co_yield args, ...);
  }
}
```

注意这里的模板参数包（template parameters pack）不能用递归的方式去调用 from，因为那样的话我们会得到非常多的 Generator 对象。

用法如下：

```cpp
auto generator = Generator<int>::from(1, 2, 3, 4);
```

这下看上去完美多了。

## 实现 map 和 flat_map

熟悉函数式编程的读者可能已经意识到了，我们定义的 Generator 实际上已经非常接近 Monad 的定义了。那我们是不是可以给它实现 map 和 flat_map 呢？

### 实现 map

map 就是将 Generator 当中的 T 映射成一个新的类型 U，得到一个新的 `Generator<U>`。下面我们给出第一个版本的 map 实现：

```cpp
template<typename T>
struct Generator {
  ...

  template<typename U>
  Generator<U> map(std::function<U(T)> f) {
    // 判断 this 当中是否有下一个元素
    while (has_next()) {
      // 使用 next 读取下一个元素
      // 通过 f 将其变换成 U 类型的值，再使用 co_yield 传出
      co_yield f(next());
    }
  }  
}
```

参数 `std::function<U(T)>` 当中的模板参数 `U(T)` 是个模板构造器，放到这里就表示这个函数的参数类型为 `T`，返回值类型为 `U`。

接下来我们给出用法：

```cpp
// fibonacci 是上一篇文章当中定义的函数，返回 Generator<int>
Generator<std::string> generator_str = fibonacci().map<std::string>([](int i) {
  return std::to_string(i);
});
```

通过 map 函数，我们将 `Generator<int>` 转换成了 `Generator<std::string>`，外部使用 `generator_str` 就会得到字符串。

当然，这个实现有个小小的缺陷，那就是 map 函数的模板参数 U 必须显式提供，如上例中的 `<std::string>`，这是因为我们在定义 map 时用到了模板构造器，这使得类型推断变得复杂。

为了解决这个问题，我们就要用到模板的一些高级特性了，下面给出第二个版本的 map 实现：


```cpp
template<typename T>
struct Generator {
  ...

  template<typename F>
  Generator<std::invoke_result_t<F, T>> map(F f) {
    while (has_next()) {
      co_yield f(next());
    }
  }
}
```

注意，这里我们直接用模板参数 `F` 来表示转换函数 f 的类型。map 本身的定义要求 `F` 的参数类型是 `T`，然后通过 `std::invoke_result_t<F, T>` 类获取 `F` 的返回值类型。

这样我们在使用时就不需要显式的传入模板参数了：

```cpp
Generator<std::string> generator_str = fibonacci().map([](int i) {
  return std::to_string(i);
});
```

### 实现 flat_map

在给出实现之前，我们需要先简单了解一下 flat_map 的概念。

前面提到的 map 是元素到元素的映射，而 flap_map 是元素到 Generator 的映射，然后将这些映射之后的 Generator 再展开（flat），组合成一个新的 Generator。这意味如果一个 Generator 会传出 5 个值，那么这 5 个值每一个值都会映射成一个新的 Generator，，得到的这 5 个 Generator 又会整合成一个新的 Generator。

由此可知，map 不会使得新 Generator 的值的个数发生变化，flat_map 会。

下面我们给出 flat_map 的实现：


```cpp
template<typename T>
struct Generator {
  ...

  template<typename F>
  // 返回值类型就是 F 的返回值类型
  std::invoke_result_t<F, T> flat_map(F f) {
    while (has_next()) {
      // 值映射成新的 Generator
      auto generator = f(next());
      // 将新的 Generator 展开
      while (generator.has_next()) {
        co_yield generator.next();
      }
    }
  }
}
```

为了加深大家的理解，我们给出一个小例子：

```cpp
Generator<int>::from(1, 2, 3, 4)
    // 返回值类型必须显式写出来，表明这个函数是个协程
    .flat_map([](auto i) -> Generator<int> {
      for (int j = 0; j < i; ++j) {
        // 在协程当中，我们可以使用 co_yield 传值出来
        co_yield j; 
      }
    })
    .for_each([](auto i) {
      if (i == 0) {
        std::cout << std::endl;
      }
      std::cout << "* ";
    });
```

这个例子的运行输出如下：

```
*
* *
* * *
* * * *
```

我们来稍微做下拆解。

1. `Generator<int>::from(1, 2, 3, 4)` 得到的是序列 `1 2 3 4`
2. flat_map 之后，得到 `0 0 1 0 1 2 0 1 2 3`

由于我们在 0 的位置做了换行，因此得到的输出就是 * 组成的三角形了。

## 其他有趣的函数

### 遍历所有值的 for_each

序列的最终使用，往往就是遍历：

```cpp
template<typename T>
struct Generator {
  ...

  template<typename F>
  void for_each(F f) {
    while (has_next()) {
      f(next());
    }
  }
}
```

### 折叠值的 fold 

Generator 会生成很多值，如果我们需要对这些值做一些整体的处理，并最终得到一个值，那么我们就需要折叠函数 fold：

```cpp
template<typename T>
struct Generator {
  ...

  template<typename R, typename F>
  R fold(R initial, F f) {
    R acc = initial;
    while (has_next()) {
      acc = f(acc, next());
    }
    return acc;
  }
}
```

它需要一个初始值，函数 f 接收两个参数，分别是 acc 和序列生成器当前迭代的元素，每次经过 f 做运算得到的结果会作为下次迭代的 acc 传入，直到最后 acc 作为 fold 的返回值返回。

我们可以很方便地使用 fold 求和或者求取阶乘，例如：

```cpp
// result: 720
auto result = Generator<int>::from(1, 2, 3, 4, 5, 6)
  .fold(1, [](auto acc, auto i){ 
    return acc * i;  // 计算阶乘
  });
```

### 求和函数 sum

求和本身可以用前面的 fold 来实现，当然我们也可以直接给出 sum 函数的定义：

```cpp
template<typename T>
struct Generator {
  ...

  T sum() {
    T sum = 0;
    while (has_next()) {
      sum += next();
    }
    return sum;
  }
}
```

用例：

```cpp
// result: 21
auto result = Generator<double>::from(1.0, 2.0, 3.0, 4, 5, 6.0f).sum();
```

### 过滤部分值的 filter

你几乎可以在任何看到 map/flat_map 的场合看到 filter，毕竟有些值我们根本不需要。

想要实现这个过滤，只需要一个条件判断，下面我们给出 fitler 的实现：

```cpp
template<typename T>
struct Generator {
  ...

  template<typename F>
  Generator filter(F f) {
    while (has_next()) {
      T value = next();
      if (f(value)) {
        co_yield value;
      }
    }
  }
}
```

### 截取前 n 个值的 take(n)

序列生成器往往与**懒序列**同时出现，因为**懒序列**之所以**懒**，往往是因为它的长度可能很长（甚至无限，例如斐波那契数列），一次性将所有的值加载出来会比较影响性能。

对于这种很长的懒序列，我们最终能用到的值可能并不多，因此我们需要一个函数 `take(n)` 对序列的前 `n` 个做截取。

它的实现也是显而易见的：

```cpp
template<typename T>
struct Generator {
  ...

  Generator take(int n) {
    int i = 0;
    while (i++ < n && has_next()) {
      co_yield next();
    }
  }  
}
```

### 截取到指定条件的 take_while

take_while 的实现就好像是 filter 与 take(n) 的一个结合：

```cpp
template<typename T>
struct Generator {
  ...

  template<typename F>
  Generator take_while(F f) {
    while (has_next()) {
      T value = next();
      if (f(value)) {
        co_yield value;
      } else {
        break;
      }
    }
  }
}
```

例如我们想要截取小于 100 的所有斐波那契数列：

```cpp
fibonacci().take_while([](auto i){
  return i < 100;
}).for_each([](auto i){
  std::cout << i << " ";
});
```

就会得到：

```
0 1 1 2 3 5 8 13 21 34 55 89
```

## 函数的调用时机

前面给出了这么多函数的实现，目的主要是为了~~凑字数~~让大家充分理解 C++ 协程的妙处。为了进一步确认大家对于前面例子的理解程度，我们再给出一个例子，请大家思考这当中的每一个 lambda 分别调用几次，以及输出什么：

```cpp
Generator<int>::from(1, 2, 3, 4, 5, 6, 7, 8, 9, 10)
    .filter([](auto i) {
      std::cout << "filter: " << i << std::endl;
      return i % 2 == 0;
    })
    .map([](auto i) {
      std::cout << "map: " << i << std::endl;
      return i * 3;
    })
    .flat_map([](auto i) -> Generator<int> {
      std::cout << "flat_map: " << i << std::endl;
      for (int j = 0; j < i; ++j) {
        co_yield j;
      }
    }).take(3)
    .for_each([](auto i) {
      std::cout << "for_each: " << i << std::endl;
    });
```

大家在分析的时候，请牢记 Generator 生成的序列是懒序列，只要最终访问到的时候才会生成。

这意味着中间的 map 其中根本不会主动消费 Generator，flat_map 也不会，filter 也不会，take 也不会。只有 for_each 调用的时候，才会真正需要知道 Generator 当中都有什么。

输出的结果如下：

```
filter: 1
filter: 2
map: 2
flat_map: 6
for_each: 0
for_each: 1
for_each: 2
```

> **提示**：大家可以返回去再看一下我们给出的函数的实现，找一下哪些当中用到了 `co_yield`，哪些没有用到，以及这两类函数有什么区别。

## 小结

本文我们对前文当中的序列生成器做了泛化，使它能够支持任意类型的序列生成。此外，我们也针对序列生成器添加了一系列的函数式的支持，以帮助读者进一步深入理解协程的工作机制。

---

## 关于作者

**霍丙乾 bennyhuo**，Kotlin 布道师，Google 认证 Kotlin 开发专家（Kotlin GDE）；**《深入理解 Kotlin 协程》** 作者（机械工业出版社，2020.6）；前腾讯高级工程师，现就职于猿辅导

* GitHub：https://github.com/bennyhuo
* 博客：https://www.bennyhuo.com
* bilibili：[**bennyhuo不是算命的**](https://space.bilibili.com/28615855)
* 微信公众号：**bennyhuo**
