# Java 17 更新（9）：Unsafe 不 safe，我们来一套 safe 的 API 访问堆外内存

**Java Java17**

> 使用 Unsafe 直接访问堆外内存存在各种安全性问题，对于使用者的要求也比较高，不太适合在业务当中广泛使用。于是，Java 在新孵化的 API 当中提供了更安全的方案。

==  Java|Java17|direct memory ==

接下来，我们来聊聊访问外部资源的新 API，这些内容来自于 **JEP 412: Foreign Function & Memory API (Incubator)**。这个提案主要应对的场景就是调用 Java VM 以外的函数，即 Native 函数；访问 Java VM 以外的内存，即堆外内存（off-heap memory）。

这不就是要抢 JNI 的饭碗吗？

![](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates/764F4997.gif)

对，这个提案里面提到的堆外内存和代码访问都可以用 JNI 来做到，不过 JNI 不够好用，还够不安全。

Java 程序员不仅需要编写大量单调乏味的胶水代码（JNI 接口），还要去编写和调试自己本不熟悉（绝大多数也应该真的不熟悉）的 C、C++ 代码，更要命的是很多时候调试工具也没有那么好用。当然，这些都可以克服，不过 Java 和 C、C++ 的类型系统却有着本质的区别而无法直接互通，我们总是需要把传到 C、C++ 层的 Java 对象的数据用类似于反射的 API 取出来，构造新的 C、C++ 对象来使用，非常的麻烦。

我甚至在公司内见过有人用 C++ 基于 JNI 把 Java 层的常用类型都封装了一遍，你能想象在 C++ 代码当中使用 ArrayList 的情形吗？我当时一度觉得自己精神有些恍惚。

![](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates/7657EB7E.jpg)

这些年来 Java 官方在这方面也没有什么实质性的进展。JNI 难用就难用吧，总算还有得用，一些开源的框架例如 JNA、JNR、JavaCPP 基于 JNI 做了一些简化的工作，总算让 Java 与 Native 语言的调用没那么令人难受。

你可能以为这个提案的目的也是搞一个类似的框架，其实不然。Java 官方嘛，不搞就不搞，要搞就搞一套全新的方案，让开发者用着方便，程序性能更好（至少不比 JNI 更差），普适性更强，也更安全。

![](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates/765D0537.jpg)

稍微提一下，堆外内存访问的 API 从 Java 14 就开始孵化，到 Java 17 连续肝了四个版本了已经，仍然还是 incubator；访问外部函数的 API 则从 Java 16 开始孵化，到现在算是第二轮孵化了吧。如果大家要想在自己的程序里面体验这个能力，需要给编译器和虚拟机加参数：

```
--add-modules jdk.incubator.foreign --enable-native-access ALL-UNNAME
```

### 访问堆外内存

基于现在的方案，我们有三种方式能访问到堆外内存，分别是

* ByteBuffer（就是 allocateDirect），这个方式用起来相对安全，Java 程序员看起来其实似乎并没有直接操作堆外内存，但执行效率相对一般：

  ```java
  public static ByteBuffer allocateDirect(int capacity) {
      return new DirectByteBuffer(capacity);
  }
  ```

* 使用 Unsafe 的方法，这个方式经过了 JIT 优化效率较高，但非常不安全，因为它实际上可以访问到任意位置的内存，例如：

  ```java
  Unsafe unsafe = ...;
  var handle = unsafe.allocateMemory(8); // 申请 8 字节内存
  
  unsafe.putDouble(handle, 1024); // 往该内存当中写入 1024 这个 double
  System.out.println(unsafe.getDouble(handle)); // 从该内存当中读取一个 double 出来
  
  unsafe.freeMemory(handle); // 释放这块内存
  ```

* 使用 JNI，通过 C/C++ 直接操作堆外内存。

不管哪种方式，对于 Java 程序员来讲，它们都不是特别友好。

接下来我们看一下新的内存访问方案，它主要包括以下几方面：

#### 堆外内存分配

我们可以通过 MemorySegment 来做到这一点：

```java
MemorySegment segment = MemorySegment.allocateNative(100, ResourceScope.newImplicitScope());
```

尽管看上去跟前面的 Unsafe 类似，但请注意 ResourceScope 这个参数，我们会在后面介绍；另外对于堆外内存的访问也是受限制的，就像访问数组一样更加安全。

#### 堆外内存访问

在堆外内存开辟以后，我们通常需要按照某种变量的方式去访问它，例如想要以 int 的方式读写，那么就创建一个 VarHandle 即可：

```java
VarHandle intHandle = MemoryHandles.varHandle(int.class, ByteOrder.nativeOrder());
```

这里支持的类型就是基本类型，包括 byte、short、char、int、float、long、double。

```java
for (int i = 0; i < 25; i++) {
    intHandle.set(segment, /* offset */ i * 4, /* value to write */ i);
}
```

我们知道 Java 的 int 占 4 个字节，因此直接对前面开辟的内存 segment 进行读写操作即可。那如果我读写的范围越界会发生什么呢？

```java
intHandle.set(segment, 100 /* out of bounds!! */, 1000);
```

运行程序结果发现抛了个异常，这个异常就是 MemorySegment 抛出来的：

```
Exception in thread "main" java.lang.IndexOutOfBoundsException: Out of bound access on segment MemorySegment{ id=0x17366e0a limit: 100 }; new offset = 100; new length = 4
```

这样相比使用 Unsafe 访问内存的好处就在于受控制。这个感觉特别像我们从 C 时代转到 Java 时代是遇到的 C 指针和 Java 引用的对比一样，我们不妨再给大家看看 Unsafe 的例子，看看是不是如同操作 C 指针一样：

```java
var handle = unsafe.allocateMemory(16);

// 操作分配的内存之后的部分，实际上这部分内存完全不可预见
unsafe.putInt(handle + 16, 1000); 
// 读取非法内存，报不报错完全取决于实际的内存会不会错乱
System.out.println(unsafe.getInt(handle + 16)); 

unsafe.freeMemory(handle);
// 内存已经回收了，继续读
System.out.println(unsafe.getInt(handle)); 
```

这就是相比之下新方案更安全的地方。不仅如此，对于内存的回收，一旦忘记，就是内存泄漏；不仅如此，内存有没有回收我们其实完全无法通过  handle 来做出判断，如果已经回收，handle 不就是野指针了嘛。

![](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates/78650EAC.jpg)

另外，新 API 还提供了一套内存布局相关的 API：

![](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates/image-20210923070228075.png)

这套 API 的目的就是可以降低访问堆外内存时的代码复杂度，例如：

```java
SequenceLayout intArrayLayout = MemoryLayout.sequenceLayout(25, MemoryLayout.valueLayout(32, ByteOrder.nativeOrder()));
MemorySegment segment = MemorySegment.allocateNative(intArrayLayout, newImplicitScope());
VarHandle indexedElementHandle = intArrayLayout.varHandle(int.class, PathElement.sequenceElement());
for (int i = 0; i < intArrayLayout.elementCount().getAsLong(); i++) {
    indexedElementHandle.set(segment, (long) i, i);
}
```

这样我们在开辟内存空间的时候只需要通过 SequenceLayout 描述清楚我们需要什么样的内存（32bit，Native 字节序），多少个（25 个），然后用它去开辟空间，并完成读写。

* PaddingLayout 会在我们需要的数据后添加额外的内存空间，主要用于内存对齐。
* ValueLayout 用来映射基本的数值类型，例如 int、float 等等。
* GroupLayout 可以用来组合其他的 MemoryLayout，它有两种类型，分别是 STRUCT 和 UNION，熟悉 C 语言的小伙伴们一下就明白了，在调用 C 函数的时候它非常有用，可以用来映射 C 的结构体和联合体。

在调用 C 函数时，我们可以很方便地使用这些 MemoryLayout 映射到 C 类型。

#### 堆外内存的作用域

作用域这个东西实在是关键。

我们 Java 程序员最喜欢 Java 的一点就是内存管理很少让我们操心，因为内存都被虚拟机接管了，我们只需要使劲儿造内存，虚拟机就像个大管家一样默默的为我们付出。这极大的降低了程序员管理内存的成本，也极大的降低了程序员在内存操作上犯错误的可能，对比我之前写 C++ 的时候经常因为某个内存错误查半夜找不到头绪的情况，用 Java 写程序开发效率的提升真不是一点儿半点儿。

说起来前一段时间公司组织应届生培训，我负责讲 Kotlin 基础，跟 Swift 的讲师一起准备内容，他们一直强调一定要讲讲内存管理机制，如何避免内存泄漏。我一听，都不好意思说内存泄漏这事儿我要讲点儿啥了，跟他们比起来，我们的内存泄漏大多数情况就是内存回收的晚一点儿（容易导致突然开辟大块内存的时候 OOM），他们可是真的就不能回收了啊，我们这简直弱爆了。

![](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates/786BA6D8.gif)

所以要想让 Java 程序员用得舒服，那必须把堆外内存的管理也尽可能做到简单易用。为此，JDK 提供了资源作用域的概念，对应的类型就是 ResourceScope。这是一个密封接口，因此我们无法直接实现这个接口，但它有且仅有一个非密封的实现类 ResourceScopeImpl，JDK 还提供了三种具体的实现：

* GLOBAL：这实际上是一个匿名内部类对象，它是全局作用域，使用它开辟的堆外内存不会自动释放。
* ImplicitScopeImpl：我们在前面演示新 API 的使用时已经提到过，调用 `ResourceScope.newImplicitScope()` 返回的正是 ImplicitScopeImpl。这种类型的 Scope 不能被主动关闭，不过使用它开辟的内存会在持有内存的 MemorySegment 对象不再被持有时释放。这个逻辑在 CleanerImpl 当中通过 ReferenceQueue 配合 PhantomReference 来实现。
* SharedScope：最主要的能力就是提供了多线程共享访问的支持；是 ImplicitScopeImpl 的父类，二者的差别在于 SharedScope 可以被主动关闭，不过必须确保只能被关闭一次。
* ConfinedScope：单线程作用域，只能在所属的线程内访问，比较适合局部环境下的内存管理。

我们再看一个例子：

```java
try(var scope = ResourceScope.newConfinedScope()) {
    MemorySegment memorySegment = MemorySegment.allocateNative(100, scope);
    ...
}
```

这个例子当中我们使用 ConfinedScope 来开辟内存，由于这个 scope 在 try-resource 语句结束之后就会被关闭，因此其中开辟的内存也会在语句结束的时候理解回收。

