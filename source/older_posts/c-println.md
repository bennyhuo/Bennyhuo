# C 语言版的 println？

**C 宏 泛型 println**

> Kotlin 当中的 println 非常好用，可是 C 当中我们常用的 printf 却总是需要格式化字符，并且需要手动提供换行符。

== C|macro| ==

我们在 Kotlin 当中想要输出一个变量，直接调用 println 即可：

```kotlin
val name = "bennyhuo"
println(name)

val age = 30
println(age)
```

不管什么变量类型，println 一律照单全收，是不是很方便？

而我们的 C 语言呢，想要打印个变量可就没那么轻松了，不仅如此，换行符都得我们手动输入，如果能同时打印出对应的代码文件和行号查问题就更方便了。

有没有什么办法解决这些问题呢？

## 问题一：自动换行

printf 是不会自动换行的，因此每次我们都需要在格式化字符串当中加一个 `\n`，例如：

```c
int age = 30;
printf("%d\n", age);
```

解决换行的问题很简单，我们只需要定义一个函数 printlnf，在打印了需要打印的内容之后跟一个换行符的输出即可：

```c
#include <stdio.h>
#include <stdarg.h>

void printlnf(const char* format, ...) {
    va_list args;
    va_start(args, format);
    vprintf(format, args);
    printf("\n");
    va_end(args);
}
```

这里打印换行符比较容易理解，不过对于变长参数的处理就有点儿晦涩了，至少不像我们在 Kotlin 当中可以直接拿到一个数组来处理变长参数。

在 C 当中，我们无法知道有多少个变长参数，通常支持变长参数的函数需要通过前面的固定的参数来携带这个信息，例如 printf 可以通过格式化字符串 format 当中的格式符来判定后面有多少个参数。好在我们在这个场景下只要能把 println 的变长参数透传给 printf 就行了（当然我们实际上是透传给了 vprintf），多少个其实我们可以不关心。按照 C 标准的提供的方法，我们可以使用 `va_list` 来承载变长参数的值，使用 `va_start` 和 `va_end` 来获取和清除变长参数，vprintf 实际上就是 printf 的一个变种，它可以直接接受 `va_list` 类型的参数做为后面需要被格式化的参数。

用法起来嘛，还是可以的：

```c
printlnf("%d", 5); // 5\n
```

不过实话这个函数定义并不是很美，看着太长了。

在 C 语言当中，还有一套强大的预处理机制，如果我们用宏来实现 printlnf，效果会怎样呢？（我似乎想到了 rust 的 println!）

```c
#define printlnf(format, ...) printf(format"\n", ##__VA_ARGS__)
```

额，用宏实现就这么简单？

首先我们注意一下 `format"\n"`，这个语法特别有意思，在 C 当中我们可以直接拼接字符串字面量：

```c
char *name = "benny""huo"; // 1
char *name = "bennyhuo"; // 2
```

1 和 2 是等价的，字面量连接在一起可以直接实现拼接的效果。那么我们定义的宏当中 format 如果是一个字符串字面量的话，自然就能实现拼接效果了：

```c
printlnf("Hello %s", "C");
```

经过编译器预处理之后展开宏得到：

```c
printf("Hello %s""\n", "C");
```

所以换行的问题就解决了。当然，宏的这个实现方案有个缺点，format 必须是字符串字面量，下面的用法是错误的：

```c
char *format = "Hello %s";
printlnf(format, "C"); // error!
```

因为宏展开以后得到：

```c
char *format = "Hello %s";
printf(format"\n", "C"); // error!
```

不管怎样，我们总是可以在一定的场景下通过上面的实现来解决为 printf 自动追加一个换行符的问题。

## 问题二：支持非字符串类型直接打印

C 毕竟不是面向对象的语言，我们也很难说有一个统一的办法把所有的结构体转成字符串（字符数组），因此我们的要求也不高，对于基本类型，可以实现类似下面的效果：

```c
println(30);
```

这要是在 C++ 当中，我们直接重载一下这个函数即可，但 C 语言不支持啊（实际上 C++ 的重载会用参数类型去修饰函数名来生成最终的函数符号），不过 C11 新增了一个特性 `_Generic`，可以支持泛型！

妈呀，C 语言居然也有泛型，惊喜不惊喜！让我们来看看它的用法：

```c
int value = _Generic(x,
        int: 2,
        double: 3,
        char * : 4
);
```

我们可以把它当做一个特殊的函数，第一个参数 x 是需要提取类型的变量，第二个参数则是一个类似于 switch case 的分支语句，如果 x 是 int 类型，那么返回值就是 2，如果是 double 类型，那么返回 3，等等。

不得不说，这语法中透露着年代感。但不管怎样，总算能用。

我们来试着考虑实现一个 println 的函数或者宏，不过很快我们就会发现函数是无法实现的，只能使用宏。为什么呢？因为这里的参数 x 的类型是需要在编译的时候确定的，如果我们试图实现 println 函数的话，那么参数的类型要怎么定义呢？

```c
void println(??? format, ...) {
  _Generic(format, ...);
  ...
}
```

假设将 format 定义为 `char*` 类型，那么泛型的判断豪无意义，因为 `_Generic` 永远会选择 `char*` 分支的返回值。

既然如此， format 就不能有类型咯。谁的参数可以没有（或者不能有）类型？宏呗。所以我们只好实现一个宏版本的 println 了：

```c
#define println(X) _Generic((X),  \
    int: printf("%d\n", X), \
    float: printf("%f\n", X), \
    char *: printf("%s\n", X), \
    double : printf("%0.4f\n", X) \
    )
```

这当中可以支持更多的类型，我们就举上面的几个为例。具体用法呢：

```c
println("Hello");
println(3);
println(0.3);
println(34.0f);
```

## 问题三：打印文件名和行号

C 当中提供了两个宏：

* `__FILE__`：展开之后就是文件的全路径（具体结果当然也跟编译器实现和参数有关系）。
* `__LINE__`：展开之后就是所在的源代码文件行的行号，是个整型。

有了这两个宏，那么实现这个功能也就不难做到了。

首先需要考虑的就是用函数实现还是用宏实现的问题。由于需要打印调用点的位置，而函数的实现会影响调用栈，因此这里使用只能宏来实现。宏调用会直接展开在调用处，因此行号和文件名都是正确的结果，实现方式也比较简单，我们给出 printlnf  的实现：

```c
#define printlnf(format, ...) printf("(%s:%d) "format"\n", __FILE__, __LINE__, ##__VA_ARGS__)
```

使用效果如下：

```c
printlnf("%d", 30);
```

输出结果：

```
(C:\Users\bennyhuo\WorkSpace\Demos\HelloCInClion\main.c:48) 30
```

如果大家使用 CLion 开发，可以直接点击输出的文件和行号跳转到对应的源码位置，方便吧。

## 小结

我们通过改造 printf，得到了两套实现，其中：

1. 在原有 printf 上增加换行，其他功能不变，得到 printlnf 函数和宏实现；
2. 支持直接打印常见类型，得到 println 的宏实现。

二者也都可以根据需要添加对文件名和行号的输出支持。
