#  渡劫 C++ 协程（1）：C++ 协程概览

**C++ Coroutines**

> C++ 20 当中正式对协程做出了初步的支持，尽管这些 API 并不是很友好。

==  C++|Coroutines ==

<cpp-coroutines>

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

为了方便灵活扩展，协程体执行的第一步是调用 `co_await promise.initial_suspend()`，`initial_suspend` 的返回值就是一个等待对象（awaiter），如果返回值满足挂起的条件，则协程体在最一开始就立即挂起。