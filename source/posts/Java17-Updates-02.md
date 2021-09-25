# Java 17 更新（2）：密封类终于转正，访问外部函数的 API 越搞越复杂？

**Java Java17**

> Java 17 更新了，我们将按照 JEP 提案的顺序依次为大家介绍这些更新的内容。

==  Java|Java17 ==


## JEP 409: Sealed Classes

密封类从 Java 15 开始预览，Java 16 又预览了一波，终于在 Java 17 转正了（实际上 Java 16 和 17 的密封类是一样的）。

Kotlin 从 1.0 开始就有密封类，并且对子类定义位置的限制从父类内部（Kotlin 1.0）到同一个文件（Kotlin 1.1）再到同一个包内（Kotlin 1.5），但实际使用上没有什么特别大的变化 —— 直到 Java 也支持密封类和密封接口，Kotlin 才也对密封接口做了支持。

从定义上来讲，二者的密封类、接口都是限制直接子类的定义，使得直接子类是可数的。例如：

```java
package com.example.geometry;

public abstract sealed class Shape 
    permits com.example.polar.Circle,
            com.example.quad.Rectangle,
            com.example.quad.simple.Square { ... }
```

注意，在 Java 当中，密封类的子类的定义也有一些限制，如果父类在具名模块当中，那么子类必须也定义该模块内部；否则，子类就必须定义在父类相同的包当中。如果子类比较小，可以直接定义在父类当中，此时 permits 就不用显式写出了：

```java
abstract sealed class Root { ... 
    static final class A extends Root { ... }
    static final class B extends Root { ... }
    static final class C extends Root { ... }
}
```

对于密封类的子类来讲，既可以声明为 final 来禁止被继承；也可以声明为 sealed 来使得该子类的直接子类可数；也可以声明为 non-sealed 来使得该子类的子类不受限制。因此我们说密封类可以确保其直接子类可数。例如：

```java
abstract sealed class Root {
    static final class A extends Root { }

    static sealed class B extends Root {
        static final class B1 extends B {}
        static final class B2 extends B {}
    }

    static non-sealed class C extends Root { }
}
```

有了密封类再配合前面提到的 switch 模式匹配，就很好用了：

```java
Root r = new Root.A();
var x = switch (r) {
    case Root.A a -> 1;
    case Root.B b -> 2;
    case Root.C c -> 3;
};
```

密封接口的支持也是类似的。

密封类实际上也是一个很有用的特性，我之前在介绍 Kotlin 的密封类的时候也已经提到过不少它的用法，这里就不展开了。

![](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates/746A07D3.gif)

## JEP 410: Remove the Experimental AOT and JIT Compiler

这里提到的 AOT（即 Ahead of time）编译器和 JIT（即 Just in time）编译器是基于 Java 代码开发出来的 Graal 编译器开发而来的，它们分别在 Java 9 和 Java 10 被引入 JDK 并开始试验，不过很少有人用它们。

我们知道 Java 代码编译之后生成虚拟机字节码，由虚拟机负责解释执行。由于字节码并不是机器码，因此笼统的说 Java 代码的执行效率并不如 C/C++ 这样的 Native 语言（当然实际情况要看具体场景，也跟虚拟机的优化有很大的关系）。既然 Native 的机器码执行效率更高，那么我们是不是可以直接把字节码编译成机器码，然后再去执行呢？听上去确实是一个好主意。

![](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates/747224F9.gif)

也就是 AOT 的由来了。移动端对于性能更加敏感，因而我们更多的时候听到 AOT 这个词是在对Android ART 和 Flutter 的 Dart 的说明文档当中。

JIT 则是在运行的时候对热点代码的实时编译。

这里要移除的其实就是基于 Graal 编译器实现的这俩个实验当中的编译器，理由呢，也很直接：没人用，还难以维护，投入产出比太低了。

![](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates/74783920.gif)

当然，这也不是说 Java 就不能编译成 Native 二进制可执行程序直接运行，因为我们还有 [GraalVM](https://www.graalvm.org/)，这家伙居然还支持 Node.js 和 Ruby：

 ![](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates/image-20210921125108617.png)

额，还有 Python、R 和 LLVM：

![](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates/image-20210921125151101.png)

还叫板 LLVM，有点儿东西哦~

## JEP 411: Deprecate the Security Manager for Removal

与 applet 类似，SecurityManager 也被标记为废弃且即将移除：

```java
@Deprecated(since="17", forRemoval=true)
public class SecurityManager { ... }
```

一般业务开发不太会用到这个东西，我们就不过多介绍了。

![](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates/7580BB3C.jpg)

##  JEP 412: Foreign Function & Memory API (Incubator)

这个提案主要应对的场景就是调用 Java VM 以外的函数，即 Native 函数；访问 Java VM 以外的内存，即堆外内存（off-heap memory）。

这不就是要抢 JNI 的饭碗吗？

![](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates/764F4997.gif)

对，这个提案里面提到的堆外内存和代码访问都可以用 JNI 来做到，不过 JNI 不够好用，还够不安全。

Java 程序员不仅需要编写大量单调乏味的胶水代码（JNI 接口），还要去编写和调试自己本不熟悉（绝大多数应该真的不熟悉）的 C、C++ 代码，更要命的是很多时候调试工具也没有那么好用。当然，这些都可以克服，不过 Java 和 C、C++ 的类型系统却有着本质的区别而无法直接互通，我们总是需要把传到 C、C++ 层的 Java 对象的数据用类似于反射的 API 取出来，构造新的 C、C++ 对象来使用，非常的麻烦。

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

### 调用外部函数

#### 调用自定义 C 函数

新 API 加载 Native 库的行为没有发生变化，还是使用 System::loadLibrary 和 System::load 来实现。

相比之前，JNI 需要提前通过声明 native 方法来实现与外部函数的绑定，新 API 则提供了直接在 Java 层通过函数符号来定位外部函数的能力：

```java
System.loadLibrary("libsimple");
SymbolLookup loaderLookup = SymbolLookup.loaderLookup();
MemoryAddress getCLangVersion = loaderLookup.lookup("GetCLangVersion").get();
```

对应的 C 函数如下：

```c
int GetCLangVersion() {
  return __STDC_VERSION__;
}
```

通过以上手段，我们直接获得了外部函数的地址，接下来我们就可以使用它们来完成调用：

```java
MethodHandle getClangVersionHandle = CLinker.getInstance().downcallHandle(
    getCLangVersion,
    MethodType.methodType(int.class),
    FunctionDescriptor.of(C_INT)
);
System.out.println(getClangVersionHandle.invoke());
```

运行程序的时候需要把编译好的 Native 库放到 java.library.path 指定的路径下，我把编译好的 libsimple.dll 放到了 lib/bin 目录下，所以：

```
-Djava.library.path=./lib/bin
```

运行结果：

```
201112
```

可以看出来，我的 C 编译器觉得自己的版本是 C11。

#### 调用系统 C 函数

如果是加载 C 标准库当中的函数，则应使用 CLinker::systemLookup，例如：

```java
MemoryAddress strlen = CLinker.systemLookup().lookup("strlen").get();
MethodHandle strlenHandle = CLinker.getInstance().downcallHandle(
    strlen,
    MethodType.methodType(int.class, MemoryAddress.class),
    FunctionDescriptor.of(C_INT, C_POINTER)
);

var string = CLinker.toCString("Hello World!!", ResourceScope.newImplicitScope());
System.out.println(strlenHandle.invoke(string.address()));
```

程序输出：

```
13
```

#### 结构体入参

对于比较复杂的场景，例如传入结构体：

```c
typedef struct Person {
  long long id;
  char name[10];
  int age;
} Person;

void DumpPerson(Person *person) {
  printf("Person%%%lld(id=%lld, name=%s, age=%d)\n",
         sizeof(Person),
         person->id,
         person->name,
         person->age);

  char *p = person;
  for (int i = 0; i < sizeof(Person); ++i) {
    printf("%d, ", *p++);
  }
  printf("\n");
}
```

这种情况我们首先需要在 Java 当中构造一个 Person 实例，然后把它的地址传给 DumpPerson，比较复杂：

```java
MemoryLayout personLayout = MemoryLayout.structLayout(
    C_LONG_LONG.withName("id"),
    MemoryLayout.sequenceLayout(10, C_CHAR).withName("name"),
    MemoryLayout.paddingLayout(16),
    C_INT.withName("age"));
```

首先我们定义好内存布局，每一个成员我们可以指定一个名字，这样在后面方便定位。注意，由于 Person 的 name 只占 10 个字节（我故意的你信吗），因此这里还有内存对齐问题，根据实际情况设置对应大小的 paddingLayout。

```java
MemorySegment person = MemorySegment.allocateNative(personLayout, newImplicitScope());
```

接下来我们用这个布局来开辟堆外内存。

下面就要初始化这个 Person 了：

```java
VarHandle idHandle = personLayout.varHandle(long.class, MemoryLayout.PathElement.groupElement("id"));
idHandle.set(person, 1000000);

var ageHandle = personLayout.varHandle(int.class, MemoryLayout.PathElement.groupElement("age"));
ageHandle.set(person, 30);
```

使用 id 和 name 分别定位到对应的字段，并初始化它们。这两个都比较简单。

接下来我们看下如何初始化一个 char[]。

方法1，逐个写入：

```java
 VarHandle nameHandle = personLayout.varHandle(
     byte.class,
     MemoryLayout.PathElement.groupElement("name"),
     MemoryLayout.PathElement.sequenceElement()
 );
byte[] bytes = "bennyhuo".getBytes();
for (int i = 0; i < bytes.length; i++) {
    nameHandle.set(person, i, bytes[i]);
}
nameHandle.set(person, bytes.length, (byte) 0);
```

注意我们获取 nameHandle 的方式，要先定位到 name 对应的布局，它实际上是个 sequenceLayout，所以要紧接着用 sequenceElement 来定位它。如果还有更深层次的嵌套，可以在 varHandle(...) 方法当中添加更多的参数来逐级定位。

然后就是循环赋值，一个字符一个字符写入，比较直接。不过，有个细节要注意，Java 的 char 是两个字节，C 的 char 是一个字节，因此这里要用 Java 的 byte 来写入。

方法2，直接复制 C 字符串：

```java
person.asSlice(personLayout.byteOffset(MemoryLayout.PathElement.groupElement("name")))
             .copyFrom(CLinker.toCString("bennyhuo", newImplicitScope()));

```

asSlice 可以通过内存偏移得到 name 这个字段的地址对应的 MemorySegment 对象，然后通过它的 copyFrom 把字符串直接全部复制过来。

两种方法各有优缺点。

接下来就是函数调用了，与前面几个例子基本一致：

```java
MemoryAddress dumpPerson = loaderLookup.lookup("DumpPerson").get();
MethodHandle dumpPersonHandle = CLinker.getInstance().downcallHandle(
    dumpPerson,
    MethodType.methodType(void.class, MemoryAddress.class),
    FunctionDescriptor.ofVoid(C_POINTER)
);

dumpPersonHandle.invoke(person.address());
```

结果：

```
Person%24(id=1000000, name=bennyhuo, age=30)
64, 66, 15, 0, 0, 0, 0, 0, 98, 101, 110, 110, 121, 104, 117, 111, 0, 0, 0, 0, 30, 0, 0, 0, 
```

我们把内存的每一个字节都打印出来，在 Java 层也可以打印这个值，这样方便我们调试：

```java
for (byte b : person.toByteArray()) {
    System.out.print(b + ", ");
}
System.out.println();
```

以上是单纯的 Java 调用 C 函数的情形。

#### 函数指针入参

很多时候我们需要在 C 代码当中调用 Java 方法，JNI 的做法就是反射，但这样会有些安全问题。 新 API 也提供了类似的手段，允许我们把 Java 方法像函数指针那样传给 C 函数，让 C 函数去调用。下面我们给一个非常简单的例子，重点就是如何传递 Java 方法给 C 函数：

```c
typedef void (*OnEach)(int element);

void ForEach(int array[], int length, OnEach on_each) {
  for (int i = 0; i < length; ++i) {
    on_each(array[i]);
  }
}
```

我们首先给出 C 函数的定义，它的功能实际上就是遍历一个数组，调用传入的函数 on_each。

Java 层想要调用这个函数，最关键的地方就是构造 on_each 这个函数指针：

```java
public static void onEach(int element) {
    System.out.println("onEach: " + element);
}
```

我们首先给出 Java 层的方法定义。

```java
MethodHandle onEachHandle = MethodHandles.lookup().findStatic(
    ForeignApis.class, "onEach",
    MethodType.methodType(void.class, int.class)
);
```

接着我们通过 MethodHandles 来定位这个方法，得到一个 MethodHandle 实例。

```java
MemoryAddress onEachHandleAddress = CLinker.getInstance().upcallStub(
    onEachHandle, FunctionDescriptor.ofVoid(C_INT), newImplicitScope()
);
```

再调用 CLinker 的 upcallStub 来得到它的地址。

```java
int[] originalArray = new int[]{1, 2, 3, 4, 5, 6, 7, 8, 9, 10};
MemorySegment array = MemorySegment.allocateNative(4 * 10, newImplicitScope());
array.copyFrom(MemorySegment.ofArray(originalArray));

MemoryAddress forEach = loaderLookup.lookup("ForEach").get();
MethodHandle forEachHandle = CLinker.getInstance().downcallHandle(
    forEach,
    MethodType.methodType(void.class, MemoryAddress.class, int.class, MemoryAddress.class),
    FunctionDescriptor.ofVoid(C_POINTER, C_INT, C_POINTER)
);
forEachHandle.invoke(array.address(), originalArray.length, onEachHandleAddress);
```

剩下的就是构造一个 int 数组，然后调用 ForEach 这个 C 函数了，这与前面调用其他 C 函数是一致的。

运行结果显而易见：

```
onEach: 1
onEach: 2
onEach: 3
onEach: 4
onEach: 5
onEach: 6
onEach: 7
onEach: 8
onEach: 9
onEach: 10
```

### 小结

Java 新提供的这套 API 确实比过去有了更丰富的能力。不过使用起来复杂度还是太高，将来即便正式发布，也需要一些工具来处理这些模板代码的生成（例如基于注解处理器的代码生成框架），以降低使用复杂度。

![](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates/88F4535C.gif)

安全性上确实可能有保证，比起我们直接使用 Unsafe 来讲应该是要更 Safe 一些的。但易用性上来讲，就目前的情况来讲，确实不敢恭维，我更愿意用 JNI。

算了，写什么垃圾 Java，直接写 C++ 不香吗？

![](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates/88F3D38D.gif)

## JEP 414: Vector API (Second Incubator)

之前在 Java 16 就已经开始孵化这个项目了。

刚开始看到这个 Vector API，我都懵了，Vector 不是不推荐用吗？后来看到提案的详细内容才明白过来，人家说的是矢量运算。

![](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates/8902C73F.jpg)

在过去，Java 确实每有提供很好的矢量运算的途径，这使得我们只能按照矢量运算的算法通过标量计算来达到目的。例如：

```java
static void scalarComputation(float[] a, float[] b, float[] c) {
    for (int i = 0; i < a.length; i++) {
        c[i] = (a[i] * a[i] + b[i] * b[i]) * -1.0f;
    }
}
```

这是提案当中给出的例子，a、b、c 是三个相同长度的数组，c 实际上是运算结果。

使用新的 Vector API实现如下：

```java
static final VectorSpecies<Float> SPECIES = FloatVector.SPECIES_PREFERRED;

static void vectorComputation(float[] a, float[] b, float[] c) {
    int i = 0;
    int upperBound = SPECIES.loopBound(a.length);
    for (; i < upperBound; i += SPECIES.length()) {
        // FloatVector va, vb, vc;
        var va = FloatVector.fromArray(SPECIES, a, i);
        var vb = FloatVector.fromArray(SPECIES, b, i);
        var vc = va.mul(va)
            .add(vb.mul(vb))
            .neg();
        vc.intoArray(c, i);
    }
    for (; i < a.length; i++) {
        c[i] = (a[i] * a[i] + b[i] * b[i]) * -1.0f;
    }
}
```

Vector API 的基本思想就是批量计算，例子当中的 SPECIES 其实是根据机器来选择合适的分批大小的一个变量。我们可以注意到，在计算时 i 每次增加 SPECIES.length()，这就是分批的大小了。当然，你也可以根据实际情况自己选择，例如调用下面的方法来根据矢量的 shape 来确定大小：

```java
static FloatSpecies species(VectorShape s) {
    Objects.requireNonNull(s);
    switch (s) {
        case S_64_BIT: return (FloatSpecies) SPECIES_64;
        case S_128_BIT: return (FloatSpecies) SPECIES_128;
        case S_256_BIT: return (FloatSpecies) SPECIES_256;
        case S_512_BIT: return (FloatSpecies) SPECIES_512;
        case S_Max_BIT: return (FloatSpecies) SPECIES_MAX;
        default: throw new IllegalArgumentException("Bad shape: " + s);
    }
}
```

对于 FloatVector 类型，这套 API 提供了诸如 add、mul 这样的方法来方便实现矢量计算，用起来比较方便。

理论上来讲，这套 API 也是可以带来性能上的提升的，但我使用相同的数据调用上述矢量和标量的方法，在提前完成类加载的条件下，粗略得出以下耗时：

```
scalar: 746000ns
vector: 2210400ns
```

可以看到新的 Vector API 居然更慢。不过这个也不能说明什么，毕竟实际的使用场景是复杂的，而且也跟 CPU 架构关系密切，我的机器是 AMD R9 5900HX，也许在 Intel 上有更好的表现呢（噗。。）。

对了，因为 Java 自身语法的限制，现在的 Vector API 大量用到了装箱和拆箱（这可能是性能消耗的大头），因此预期在 Valhalla 合入之后，基于值类型再做优化可能会得到大幅的性能提升。

不管怎么样，这套东西还在很早期的孵化阶段，API 好用就行，性能的事儿后面会解决的（反正我又不会用到)。



![](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates/893AABA9.jpg)

## JEP 415: Context-Specific Deserialization Filters

这一条是对于反序列化的更新。

Java 的序列化机制一向为人诟病，以至于 Effective Java 里面专门有几条讲 Java 序列化机制的，并且结论是“不要用它”。

![](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates/8941D48B.jpg)

这玩意你说咋还不废弃了呢。居然还在不断为了反序列化的安全性修修补补。

算了，我猜你们大概率用不到，不介绍了。

![](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates/8942EB6A.jpg)

好吧，还是介绍一下吧。故事还要追溯到 Java 9，当时为了解决反序列化的数据的安全性问题，Java 提供了反序列化的过滤器，允许在反序列化的时候对数据做检查，这个过滤器就是 ObjectInputFilter。

```java
public interface ObjectInputFilter {

    /**
     * @return  {@link Status#ALLOWED Status.ALLOWED} if accepted,
     *          {@link Status#REJECTED Status.REJECTED} if rejected,
     *          {@link Status#UNDECIDED Status.UNDECIDED} if undecided.
     */
    Status checkInput(FilterInfo filterInfo);
}
```

它最关键的方法就是这个 checkInput，返回值则是一个枚举。

在每一个 ObjectInputStream 实例被创建的时候都会创建一个过滤器与之对应：

**Java 16**：

```java
public ObjectInputStream(InputStream in) throws IOException {
    ...
    serialFilter = ObjectInputFilter.Config.getSerialFilter();
    ...
}
```

这个过滤器实际上是 JVM 全局的过滤器，可以通过系统属性 jdk.serialFilter 来配置，也可以通 ObjectInputFilter.Config#setSerialFilter 来设置。

在 ObjectInputStream 创建出来之后，我们也可以通过它的 setObjectInputFilter 来对这个实例单独设置自定义的过滤器。

以上的特性都是 Java 9 引入的，下面我们看看 Java 17 的更新：

**Java 17**

```java
public ObjectInputStream(InputStream in) throws IOException {
    ...
    serialFilter = Config.getSerialFilterFactorySingleton().apply(null, Config.getSerialFilter());
    ...
}
```

其实这段代码已经很明确的展示了改动之处，那就是 getSerialFilterFactorySingleton 返回的这个对象对原有的全局过滤器做了个变换。这个对象实际上是个 `BinaryOperator<ObjectInputFilter>`，实现这个 FilterFactory 就可以通过实现 apply 方法来完成对原有过滤器的修改：

```java
@Override
public ObjectInputFilter apply(ObjectInputFilter objectInputFilter, ObjectInputFilter objectInputFilter2) {
    return ...;
}
```

所以如果你乐意，你可以随机返回 objectInputFilter 或者返回 objectInputFilter2（草率。。。），也可以把它俩串联或者并联起来。换句话讲，我们除了可以通过设置全局过滤器，以及单独为每一个 ObjectInputStream 实例设置过滤器以外，还可以设置一个操纵过滤器的对象，这个对象可以根据上下文来判断具体返回什么样的过滤器。

接下来我们再看一下提案当中给出的例子（实际的 JDK API 与提案的例子有些调整，以下代码时调整之后的）：

```java
public class FilterInThread implements BinaryOperator<ObjectInputFilter> {

    private final ThreadLocal<ObjectInputFilter> filterThreadLocal = new ThreadLocal<>();

    public ObjectInputFilter apply(ObjectInputFilter curr, ObjectInputFilter next) {
        if (curr == null) {
            var filter = filterThreadLocal.get();
            if (filter != null) {
                filter = ObjectInputFilter.rejectUndecidedClass(filter);
            }
            if (next != null) {
                filter = ObjectInputFilter.merge(next, filter);
                filter = ObjectInputFilter.rejectUndecidedClass(filter);
            }
            return filter;
        } else {
            if (next != null) {
                next = ObjectInputFilter.merge(next, curr);
                next = ObjectInputFilter.rejectUndecidedClass(next);
                return next;
            }
            return curr;
        }
    }

    ...
}
```

这个例子其实不复杂，我最初看的时候反而被一堆注释给搞得晕头转向的。。。

它的逻辑简单来说就是 apply 的时候如果 curr 为 null，就从的 ThreadLocal 当中取出当前线程对应的过滤器与 next 进行合并，否则就用 curr 与 next 合并。但通过前面阅读代码，我已经知道 curr 在 ObjectInputStream 创建的时候一定传入的是 null（只有在后面调用 ObjectInputStream#setObjectInputFilter 的时候 curr 才会是之前已经创建的过滤器），因此这个 FilterInThread 就可以在 ObjectInputStream 创建的时候为它添加一个线程特有的过滤器，也就是上下文相关的过滤器了。

```java
public class FilterInThread implements BinaryOperator<ObjectInputFilter> {
    ...
    
    public void doWithSerialFilter(ObjectInputFilter filter, Runnable runnable) {
        var prevFilter = filterThreadLocal.get();
        try {
            filterThreadLocal.set(filter);
            runnable.run();
        } finally {
            filterThreadLocal.set(prevFilter);
        }
    }
}
```

实际上例子里面还提供了一个临时切换过滤器的方法，我们可以通过调用 doWithSerialFilter 来实现将 runnable 的 run 当中所有直接创建的 ObjectInputStream 都将应用传入的这个 filter 作为自己的上下文过滤器。

有意思吧。不过一点儿也不直接。挺简单的一个东西竟然能搞得这么别扭。。。

![](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates/00DC34EC.gif)

## 小结

讲到这儿，我们总算是把 Java 17 的主要更新介绍了一遍。除了这些大的更新以外，还有一些小的 Bugfix 和优化，我就不一一列举了。
