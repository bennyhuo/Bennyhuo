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


## 小结


