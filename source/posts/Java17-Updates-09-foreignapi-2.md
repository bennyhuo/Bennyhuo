# Java 17 更新（2）：密封类终于转正，访问外部函数的 API 越搞越复杂？

**Java Java17**

> Java 17 更新了，我们将按照 JEP 提案的顺序依次为大家介绍这些更新的内容。

==  Java|Java17 ==

我们书接上回，继续聊 Java 17 的更新。


##  JEP 412: Foreign Function & Memory API (Incubator)



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

