# 10. 访问外部函数的新 API，JNI 要凉了？

> JNI 不安全还繁琐，所以 Java 搞了一套新的 API，结果把这事儿搞得更复杂了。。。 



我们书接上回，接着聊 **JEP 412: Foreign Function & Memory API (Incubator)** 当中访问外部函数的内容。

## 调用自定义 C 函数

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

运行程序的时候需要把编译好的 Native 库放到 java.library.path 指定的路径下，例如我把编译好的 libsimple.dll 放到了 lib/bin 目录下，所以：

```
-Djava.library.path=./lib/bin
```

运行结果：

```
201112
```

可以看出来，我的 C 编译器觉得自己的版本是 C11。

![img](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates-10-foreignapi-callfunction/2486C86A.gif)

## 调用系统 C 函数

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

![img](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates-10-foreignapi-callfunction/24876314.jpg)

## 结构体入参

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

这种情况我们首先需要在 Java 当中构造一个 Person 实例，然后把它的地址传给 DumpPerson，这个过程比较复杂，我们分步骤来介绍：

```java
MemoryLayout personLayout = MemoryLayout.structLayout(
    C_LONG_LONG.withName("id"),
    MemoryLayout.sequenceLayout(10, C_CHAR).withName("name"),
    MemoryLayout.paddingLayout(16),
    C_INT.withName("age"));
```

首先我们定义好内存布局，每一个成员我们可以指定一个名字，这样在后面方便定位。注意，由于 Person 的 name 只占 10 个字节（我说我是故意的你信吗），因此这里还有内存对齐问题，根据实际情况设置对应大小的 paddingLayout。

![img](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates-10-foreignapi-callfunction/24891F0C.png)

接下来我们用这个布局来开辟堆外内存：

```java
MemorySegment person = MemorySegment.allocateNative(personLayout, newImplicitScope());
```

下面就要初始化这个 Person 了：

```java
VarHandle idHandle = personLayout.varHandle(long.class, MemoryLayout.PathElement.groupElement("id"));
idHandle.set(person, 1000000);

var ageHandle = personLayout.varHandle(int.class, MemoryLayout.PathElement.groupElement("age"));
ageHandle.set(person, 30);
```

使用 id 和 name 分别定位到对应的字段，并初始化它们，这两个都比较简单。

接下来我们看下如何初始化一个 char[]。

方法1，逐个写入：

```java
 VarHandle nameHandle = personLayout.varHandle(
     byte.class,
     MemoryLayout.PathElement.groupElement("name"),
     MemoryLayout.PathElement.sequenceElement()
 );
```

注意我们获取 nameHandle 的方式，要先定位到 name 对应的布局，它实际上是个 sequenceLayout，所以要紧接着用 sequenceElement 来定位它。如果还有更深层次的嵌套，可以在 varHandle(...) 方法当中添加更多的参数来逐级定位。

```java
byte[] bytes = "bennyhuo".getBytes();
for (int i = 0; i < bytes.length; i++) {
    nameHandle.set(person, i, bytes[i]);
}
nameHandle.set(person, bytes.length, (byte) 0);
```

然后就是循环赋值，一个字符一个字符写入，比较直接。不过，有个细节要注意，Java 的 char 是两个字节，C 的 char 是一个字节，因此这里要用 Java 的 byte 来写入。

![img](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates-10-foreignapi-callfunction/248B4835.jpg)

方法2，直接复制 C 字符串：

```java
person.asSlice(personLayout.byteOffset(MemoryLayout.PathElement.groupElement("name")))
             .copyFrom(CLinker.toCString("bennyhuo", newImplicitScope()));
```

asSlice 可以通过内存偏移得到 name 这个字段的地址对应的 MemorySegment 对象，然后通过它的 copyFrom 把字符串直接全部复制过来。

两种方法各有优缺点。

![img](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates-10-foreignapi-callfunction/248B5B9E.jpg)

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

![img](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates-10-foreignapi-callfunction/248C0DE7.png)

## 函数指针入参

很多时候我们需要在 C 代码当中调用 Java 方法，JNI 的做法就是反射，但这样会有些安全问题。 新 API 也提供了类似的手段，允许我们把 Java 方法像函数指针那样传给 C 函数，让 C 函数去调用。

下面我们给出一个非常简单的例子，大家重点关注如何传递 Java 方法给 C 函数。

我们首先给出 C 函数的定义，它的功能实际上就是遍历一个数组，调用传入的函数 on_each。

```c
typedef void (*OnEach)(int element);

void ForEach(int array[], int length, OnEach on_each) {
  for (int i = 0; i < length; ++i) {
    on_each(array[i]);
  }
}
```

Java 层想要调用 ForEach 这个函数，最关键的地方就是构造 on_each 这个函数指针。接下来我们给出它的 Java 层的定义：

```java
public static void onEach(int element) {
    System.out.println("onEach: " + element);
}
```

然后把 onEach 转成函数指针，我们只需要通过 MethodHandles 来定位这个方法，得到一个 MethodHandle 实例：

```java
MethodHandle onEachHandle = MethodHandles.lookup().findStatic(
    ForeignApis.class, "onEach",
    MethodType.methodType(void.class, int.class)
);
```

接着获取这个函数的地址：

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

剩下的就是构造一个 int 数组，然后再调用 ForEach 这个 C 函数，这与前面调用其他 C 函数的方式是一致的。

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

![img](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates-10-foreignapi-callfunction/2490A30F.png)

## 小结

这篇文章我们介绍了一下 Java 新提供的这套访问外部函数的 API，相比之下它确实比过去有了更丰富的能力，不过用起来也并不轻松。将来即便正式发布，我个人觉得也需要一些工具来处理这些模板代码的生成（例如基于注解处理器的代码生成框架），以降低使用复杂度。

![](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates/88F4535C.gif)

就目前的情况来讲，其实我更愿意用 JNI，不安全怎么了，小心点儿不就行了嘛。算了，写什么垃圾 Java，直接写 C++ 不香吗？

![](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates/88F3D38D.gif)



---

## 关于作者

**霍丙乾 bennyhuo**，Kotlin 布道师，Google 认证 Kotlin 开发专家（Kotlin GDE）；**《深入理解 Kotlin 协程》** 作者（机械工业出版社，2020.6）；前腾讯高级工程师，现就职于猿辅导

* GitHub：https://github.com/bennyhuo
* 博客：https://www.bennyhuo.com
* bilibili：[**bennyhuo不是算命的**](https://space.bilibili.com/28615855)
* 微信公众号：**bennyhuo**