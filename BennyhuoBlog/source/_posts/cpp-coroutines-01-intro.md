---
title:  渡劫 C++ 协程（1）：C++ 协程概览 
keywords: C++ Coroutines 
date: 2022/03/09 23:03:56
description: 
tags: 
    - c++
    - coroutines 
---

> C++ 20 当中正式对协程做出了初步的支持，尽管这些 API 并不是很友好。 



<!-- more -->

- [渡劫 C++ 协程（0）：前言](https://www.bennyhuo.com/2022/03/06/cpp-coroutines-README/)
- [渡劫 C++ 协程（1）：C++ 协程概览](https://www.bennyhuo.com/2022/03/09/cpp-coroutines-01-intro/)
- [渡劫 C++ 协程（2）：实现一个序列生成器](https://www.bennyhuo.com/2022/03/11/cpp-coroutines-02-generator/)
- [渡劫 C++ 协程（3）：序列生成器的泛化和函数式变换](https://www.bennyhuo.com/2022/03/14/cpp-coroutines-03-functional/)



## 什么是协程

协程就是一段可以**挂起（suspend）**和**恢复（resume）**的程序，一般而言，就是一个支持**挂起**和**恢复**的函数。

这么说比较抽象，我们下面看一个例子：

```cpp
void Fun() {
  std::cout << 1 << std::endl;
  std::cout << 2 << std::endl;
  std::cout << 3 << std::endl;
  std::cout << 4 << std::endl;
}
```

Fun 是一个非常普通的函数，大家对它的直观印象是什么呢？

* 它有四行代码
* 这四行代码一行一行依次执行
* 这四行代码连续执行

作为一个合格的程序员，我们的眼睛就是编译器，我们的脑子就是运行时。相信大家在看完这个函数的定义之后脑子里面已经不自主的把它运行过了：这个函数一旦开始，就无法暂停。

如果一个函数能够暂停，那它就可以被认为是我们开头提到的协程。所以**挂起**你就可以理解成暂停，**恢复**你就理解成从暂停的地方继续执行。

下面我们给出一段 C++ 协程的不完整的例子：

```cpp
Result Coroutine() {
  std::cout << 1 << std::endl;
  co_await std::suspend_always{};
  std::cout << 2 << std::endl;
  std::cout << 3 << std::endl;
  co_await std::suspend_always{};
  std::cout << 4 << std::endl;
};
```

Result 的定义我们后面再谈论，大家只需要知道 Result 是按照协程的规则定义的类型，在 C++ 当中，一个函数的返回值类型如果是符合协程的规则的类型，那么这个函数就是一个协程。

请大家留意一下这个函数体当中的 `co_await std::suspend_always{};`，其中 `co_await` 是个关键字，它的出现，通常来说就会使得当前函数（协程）的执行被挂起。也就是说我们在控制台看到输出 1 以后，很可能过了很久才看到 2，这个“很久”也一般不是因为当前执行的线程被阻塞了，而是当前函数（协程）执行的位置被存起来，在将来某个时间点又读取出来继续执行的。

## 协程的状态

很多读者在初次接触到协程这个概念的时候，总是会想得太过于复杂，以至于觉得**挂起**和**恢复**充满了神秘色彩而无法理解。这确实大可不必，你只要能理解听歌的时候可以暂停继续，能理解下载的时候可以断点续传，那你就必然可以理解协程的**挂起**和**恢复**。

那么问题来了，在我们现有的语言特性框架下，如何实现所谓的**挂起**和**恢复**呢？

我们以音频文件的播放为例，我们将其与协程的执行做对比，例如整个音频文件对比协程的函数体（即**协程体**），完整的对比见下表：

|音频|协程|
| --- | --- |
|音频文件|协程体|
|音频播放|协程执行|
|播放暂停|执行挂起|
|播放恢复|执行恢复|
|播放异常|执行异常|
|播放完成|协程返回|

音频暂停的时候需要记录音频暂停的位置，同时之前正在播放的音频也不会销毁（即便销毁重建，也要能够完全恢复原样）。

类似地，协程挂起时，我们需要记录函数执行的位置，C++ 协程会在开始执行时的第一步就使用 `operator new` 来开辟一块内存来存放这些信息，这块内存或者说这个对象又被称为**协程的状态（coroutine state）**。

协程的状态不仅会被用于存放挂起时的位置（后称为**挂起点**），也会在协程开始执行时存入协程体的参数值。例如：

```cpp
Result Coroutine(int start_value) {
  std::cout << start_value << std::endl;
  co_await std::suspend_always{};
  std::cout << start_value + 1 << std::endl;
};
```

这里的 `start_value` 就会被存入协程的状态当中。

需要注意的是，如果参数是值类型，他们的值或被移动或被复制（取决于类型自身的复制构造和移动构造的定义）到协程的状态当中；如果是引用、指针类型，那么存入协程的状态的值将会是引用或指针本身，而不是其指向的对象，这时候需要开发者自行保证协程在挂起后续恢复执行时参数引用或者指针指向的对象仍然存活。

与创建相对应，在协程执行完成或者被外部主动销毁之后，协程的状态也随之被销毁释放。

看到这里，大家也不必紧张，协程的状态的创建和销毁都是编译器帮我们处理好的，不需要我们显式的处理。

## 协程的挂起

协程的挂起是协程的灵魂。C++ 通过 `co_await` 表达式来处理协程的挂起，表达式的操作对象则为**等待体（awaiter）**。

等待体需要实现三个函数，这三个函数在挂起和恢复时分别调用。

### await_ready

```cpp
bool await_ready();
```

await_ready 返回 bool 类型，如果返回 true，则表示已经就绪，无需挂起；否则表示需要挂起。

标准库当中提供了两个非常简单直接的等待体，`struct suspend_always` 表示总是挂起，`struct suspend_never` 表示总是不挂起。不难想到，这二者的功能主要就是依赖 await_ready 函数的返回值：

```cpp
struct suspend_never {
    constexpr bool await_ready() const noexcept {
        return true;  // 返回 true，总是不挂起
    }
    ...
};

struct suspend_always {
    constexpr bool await_ready() const noexcept {
        return false; // 返回 false，总是挂起
    }

    ...
};
```

### await_suspend

await_ready 返回 false 时，协程就挂起了。这时候协程的局部变量和挂起点都会被存入协程的状态当中，await_suspend 被调用到。

```cpp
??? await_suspend(std::coroutine_handle<> coroutine_handle);
```

参数 coroutine_handle 用来表示当前协程，我们可以在稍后合适的时机通过调用 resume 来恢复执行当前协程：

```cpp
coroutine_handle.resume();
```

注意到 await_suspend 函数的返回值类型我们没有明确给出，因为它有以下几种选项：

* 返回 void 类型或者返回 true，表示当前协程挂起之后将执行权还给当初调用或者恢复当前协程的函数。
* 返回 false，则恢复执行当前协程。注意此时不同于 await_ready 返回 false 的情形，此时协程已经挂起，await_suspend 返回 false 相当于挂起又立即恢复。
* 返回其他协程的 coroutine_handle 对象，这时候返回的 coroutine_handle 对应的协程被恢复执行。
* 抛出异常，此时当前协程恢复执行，并在当前协程当中抛出异常。

可见，await_suspend 支持的情况非常多，也相对复杂。实际上这也是 C++ 协程当中最为核心的函数之一了。

### await_resume

协程恢复执行之后，等待体的 await_resume 函数被调用。

```cpp
??? await_resume()；
```

同样地，await_resume 的返回值类型也是不限定的，返回值将作为 `co_await` 表达式的返回值。

### 示例

了解了以上内容以后，我们可以自己定义一个非常简单的等待体：

```cpp
struct Awaiter {
  int value;

  bool await_ready() {
    // 协程挂起
    return false;
  }

  void await_suspend(std::coroutine_handle<> coroutine_handle) {
    // 切换线程
    std::async([=](){
      using namespace std::chrono_literals;
      // sleep 1s
      std::this_thread::sleep_for(1s); 
      // 恢复协程
      coroutine_handle.resume();
    });
  }

  int await_resume() {
    // value 将作为 co_await 表达式的值
    return value;
  }
};
```

```cpp
Result Coroutine() {
  std::cout << 1 << std::endl;
  std::cout << co_await Awaiter{.value = 1000} << std::endl;
  std::cout << 2 << std::endl; // 1 秒之后再执行
};
```

程序运行结果如下：

```
1
1000
2
```

其中 "1000" 在 "1" 输出 1 秒之后输出。

> **说明**：co_await 后面的对象也可以不是等待体，这类情况需要定义其他的函数和运算符来转换成等待体。这个我们后面再讨论。

## 协程的返回值类型

我们前面提到，区别一个函数是不是协程，是通过它的返回值类型来判断的。如果它的返回值类型满足协程的规则，那这个函数就会**被编译成**协程。

那么，这个**协程的规则**是什么呢？规则就是返回值类型能够实例化下面的模板类型 `_Coroutine_traits`：

```cpp
template <class _Ret, class = void>
struct _Coroutine_traits {};

template <class _Ret>
struct _Coroutine_traits<_Ret, void_t<typename _Ret::promise_type>> {
    using promise_type = typename _Ret::promise_type;
};

template <class _Ret, class...>
struct coroutine_traits : _Coroutine_traits<_Ret> {};
```

简单来说，就是返回值类型 `_Ret` 能够找到一个类型 `_Ret::promise_type` 与之相匹配。这个 `promise_type` 既可以是直接定义在 `_Ret` 当中的类型，也可以通过 `using` 指向已经存在的其他外部类型。

此时，我们就可以给出 `Result` 的部分实现了：

```cpp
struct Result {
  struct promise_type {
    ...
  };
};
```

## 协程返回值对象的构建

我们再看一下协程的示例：

```cpp
Result Coroutine(int start_value) {
  std::cout << start_value << std::endl;
  co_await std::suspend_always{};
  std::cout << start_value + 1 << std::endl;
};
```

这时你已经了解 C++ 当中如何界定一个协程。不过你可能会产生一个新的问题，返回值是从哪儿来的？协程体当中并没有给出 Result 对象创建的代码。

实际上，Result 对象的创建是由 promise_type 负责的，我们需要定义一个 `get_return_object` 函数来处理对 Result 对象的创建：

```cpp
struct Result {
  struct promise_type {

    Result get_return_object() {
      // 创建 Result 对象
      return {};
    }

    ...
  };
};
```

不同于一般的函数，协程的返回值并不是在返回之前才创建，而是在协程的状态创建出来之后马上就创建的。也就是说，协程的状态被创建出来之后，会立即构造 `promise_type` 对象，进而调用 `get_return_object` 来创建返回值对象。

`promise_type` 类型的构造函数参数列表如果与协程的参数列表一致，那么构造 `promise_type` 时就会调用这个构造函数。否则，就通过默认无参构造函数来构造 `promise_type`。

## 协程体的执行

在协程的返回值被创建之后，协程体就要被执行了。

### initial_suspend 

为了方便灵活扩展，协程体执行的第一步是调用 `co_await promise.initial_suspend()`，`initial_suspend` 的返回值就是一个等待对象（awaiter），如果返回值满足挂起的条件，则协程体在最一开始就立即挂起。这个点实际上非常重要，我们可以通过控制 initial_suspend 返回的等待体来实现协程的执行调度。有关调度的内容我们后面会专门探讨。

### 协程体的执行

接下来执行协程体。

协程体当中会存在 co_await、co_yield、co_return 三种协程特有的调用，其中

* co_await 我们前面已经介绍过，用来将协程挂起。
* co_yield 则是 co_await 的一个马甲，用于传值给协程的调用者或恢复者或被恢复者，我们后面会专门用一篇文章给出例子介绍它的用法。
* co_return 则用来返回一个值或者从协程体返回。

#### 协程体的返回值

对于返回一个值的情况，需要在 promise_type 当中定义一个函数

```cpp
??? return_value();
```

例如：

```cpp
struct Result {
  struct promise_type {

    void return_value(int value) {
      ...
    }

    ...

  };
};
```

此时，我们的 Coroutine 函数就需要使用 co_return 来返回一个整数了：

```cpp
Result Coroutine() {
  ...
  co_return 1000;
};
```

1000 会作为参数传入，即 return_value 函数的参数 value 的值为 1000。

这时候读者可能会疑惑，这个值好像没什么用啊？大家别急，这个值可以存到 promise_type 对象当中，外部的调用者可以获取到。

#### 协程体返回 void

除了返回值的情况以外，C++ 协程当然也支持返回 void。只不过 promise_type 要定义的函数就不再是 return_value 了，而是 return_void 了：

```cpp
struct Result {
  struct promise_type {
    
    void return_void() {
      ...
    }

    ...
  };
};
```

这时，协程内部就可以通过 co_return 来退出协程体了：

```cpp
Result Coroutine() {
  ...
  co_return;
};
```

#### 协程体抛出异常

协程体除了正常返回以外，也可以抛出异常。异常实际上也是一种结果的类型，因此处理方式也与返回结果相似。我们只需要在 promise_type 当中定义一个函数，在异常抛出时这个函数就会被调用到：

```cpp
struct Result {
  struct promise_type {
    
    void unhandled_exception() {
      exception_ = std::current_exception(); // 获取当前异常
    }

    ...
  };
};
```

### final_suspend 

当协程执行完成或者抛出异常之后会先清理局部变量，接着调用 final_suspend 来方便开发者自行处理其他资源的销毁逻辑。final_suspend 也可以返回一个等待体使得当前协程挂起，但之后当前协程应当通过 coroutine_handle 的 destroy 函数来直接销毁，而不是 resume。

## 小结

本文我们介绍了一些 C++ 协程的各种概念和约定，看似介绍了非常多的内容，但因为示例较少又感觉什么都没介绍。大家不要着急，C++ 协程的概念基本上就这么多，剩下的文章我们都将基于一个或多个具体的场景展开来介绍如何运用 C++ 协程来解决问题。

---

## 关于作者

**霍丙乾 bennyhuo**，Kotlin 布道师，Google 认证 Kotlin 开发专家（Kotlin GDE）；**《深入理解 Kotlin 协程》** 作者（机械工业出版社，2020.6）；前腾讯高级工程师，现就职于猿辅导

* GitHub：https://github.com/bennyhuo
* 博客：https://www.bennyhuo.com
* bilibili：[**bennyhuo不是算命的**](https://space.bilibili.com/28615855)
* 微信公众号：**bennyhuo**
