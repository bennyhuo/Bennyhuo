---
title: 新年 Flag 以及论坛的一个所谓“Kotlin 不完全兼容 Java”的问题
date: 2019/02/05
tags:
  - NewYear
  - Kotlin
  - Java
---


### 0. 新年立个 Flag

首先祝各位小伙伴在新的中国年里找到属于自己的奋斗方向，凝聚自己的奋斗方法，实现自己的奋斗目标。

每年春节 0 点之后都喜欢随便做点儿自己喜欢的事情。曾经有一年就是在这个时间憋出了一篇晦涩难懂的协程的文章，所以今年需要在 Kotlin 协程上多写点儿文章，也许也可以写点儿 lib，总之公众号在这一年的发力点，协程算一个，应该也不会局限于 Java 虚拟机。

我前一阵子写过几次用 Kotlin Native 作为 JNI 的底层实现的文章。Kotlin Native 尽管可能还不是很完美，但就像它的负责人说的，后面的版本就需要来偿还技术债了，毕竟它从诞生开始就面临了类似于我们国内任何一款互联网产品一样的境遇，它如果不够快，也许就赶不上这波节奏了。可能各方面体验还没有那么好，但它的全貌已经完全呈现在我们面前，所以我们要做的就是帮助它，把生态建立起来。所以今年公众号也会把 Kotlin Native 作为一个重点，也许年底我能鼓捣出一个让 KN 写 JNI 变得很方便的 wrapper 呢，希望我时间会比较充裕吧。

<!--more-->

一月份实在太忙了，在公司忙，回家还忙，在群里开玩笑说公众号都要长草了，这让我十分痛心。这种状态大约会持续到 2月底，3月份我一定会回归。

下面我们说我们今天的正题：

### 1. Kotlin 不能完全兼容 Java 吗？

有位大概是被队友坑了的小伙伴，在论坛发帖求助，原帖内容如下：

---

**原帖开始**

Kotlin 在设计时就考虑了 Java 互操作性。可以从 Kotlin 中自然地调用现存的 Java 代码 文档上这样说，
但是在实际使用上

```java
public class ApiException extends Exception {
    public int code;
    public String message;
    public String mmm;
    
    public ApiException(Throwable throwable, int code) {
        super(throwable);
        this.code = code;
    }
}
```

上面的ApiException 继承自 Exception ，Exception 继承Throwable ，Throwable 是有个 

```java
public String getMessage() {
    return detailMessage;
}
```

在kotlin中调用

```kotlin
var exception = ApiException(Throwable(),1)
exception.code //正常
exception.message //编译报错
```

错误信息如下：

>Overload resolution ambiguity. All these functions match. public final var message

java中调用

```java
new ApiException(Throwable(),1).message 完全正常
```

java 代码已经打包成jar，显示 kotlin 中是无法完全调用已经 实现好的java 代码？是否有解决方法，特别是对用打包好的不能改的java代码，无法调用是致命的。

**原帖结束**

---



看到这个问题，突然觉得以前大家写 Java 代码，得是有多乱，人家明明就已经有了 message，你再继承，再搞出一个来，到底是为什么呢。。。

题主说有可能是第三方 SDK 这样，没有办法修改源码，怎么办？

当然是去找到 SDK 的开发者当面 diss 啊。然后弃之不用 ：）

好啦，对于代码的坏味道，我们要犀利的抨击，不过解决办法还是可以提供一下的，例如帖子里面有个小伙伴说：

先用 Java 包装一下：

```java
class ExtApiException {
    public static String getMessage(ApiException a){
        return a.message;
    }
}
```

然后再在 Kotlin 里面这样调：

```kotlin
val a = ApiException()
val t = (a as Throwable).message
val r = ExtApiException.getMessage(a)

fun ApiException.realMessage() = ExtApiException.getMessage(this)
val i = a.realMessage()
```

这个小伙伴的思路就很不错，为什么一定要用 Kotlin 兼容这样的代码呢，让 Java 自己收拾自己的烂摊子呗。

### 2. 为什么 message 会和 getMessage 纠缠不清？

这个问题的根本原因在于 Kotlin 自己定义了一套 Throwable，换句话说 ApiException 在 Kotlin 看来，是继承自 kotlin.Throwable 的，它当中没有 getMessage 方法，对应的是 message 这个成员：

```kotlin
public open class Throwable public constructor(message: kotlin.String?, cause: kotlin.Throwable?) {
    ...
    public open val message: kotlin.String? 
}
```

这个与绝大多数合成属性的情况还不一样，如果是合成的属性，通常我们也可以直接访问对应的 get/set 方法。实际上我们自己定义的类如果不继承存在 Kotlin 到 Java 映射关系的类型，几乎不会遇到类似的问题。

### 3. 真的没有办法通过 Kotlin 实现访问吗？

Kotlin 在编译到 JVM 上时，会把 Throwable 映射成 java.lang.Throwable，所以我们可以尝试把 ApiException 强转成 java.lang.Throwable，这样你就可以调用 getMessage 了。

```kotlin
val exception = ApiException(Throwable("ThrowableMessage"),1)
println((exception as java.lang.Throwable).getMessage())
```

不过这时候我们仍然无法调用到 ApiException 的 message 成员（尽管这个设计很蠢。。。），不过没有关系，因为 ApiException 的 message 与kotlin.Throwable 的 message 类型不同，区别在于一个是 var 另一个是 val，以及一个是平台类型 String! 另一个是 String?，通过这两个区别，我们都可以用一些手段让编译器自动帮我们选择合适的成员，具体做法如下：

```kotlin
fun <R, T> property1(property: KProperty1<R, T>) = property
fun <R, T> mutableProperty1(property: KMutableProperty1<R, T>) = property

val ApiException.throwableMessage: String?
        get() = property1(Throwable::message).get(this)

var ApiException.apiMessage
    get() = mutableProperty1<ApiException, String>(ApiException::message).get(this)
    set(value) {
        mutableProperty1<ApiException, String>(ApiException::message).set(this, value)
    }
```

这样我们可以通过这两个成员是否可变来让编译器自动选择对应到相应的 property 当中。

当然我们也可以通过是否可空来区分，例如：

```kotlin
val ApiException.apiMessage2: String
    get() = property1<ApiException, String>(ApiException::message).get(this)
```
我们如果给 property1 的第二个泛型参数传入 `String` 而不是 `String?` 那么结果就是调用 ApiException 当中定义的 message，否则调用 Throwable 当中的 message。

这个访问的过程实际上也没有什么额外的开销，尽管看上去似乎用了反射，但根本不需要引入反射包，实际上也不会通过反射进行访问。以 apiMessage 为例，反编译的结果是：

```java
final class HelloKt$apiMessage$2 extends MutablePropertyReference1 {
   public static final KMutableProperty1 INSTANCE = new HelloKt$apiMessage$2();

   public String getName() {
      return "message";
   }

   public String getSignature() {
      return "getMessage()Ljava/lang/String;";
   }

   public KDeclarationContainer getOwner() {
      return Reflection.getOrCreateKotlinClass(ApiException.class);
   }

   @Nullable
   public Object get(@Nullable Object receiver) {
      return ((ApiException)receiver).message;
   }

   public void set(@Nullable Object receiver, @Nullable Object value) {
      ((ApiException)receiver).message = (String)value;
   }
}
```

我们可以看到它的 get 和 set 都是直接对相应的字段做处理，因此不会有任何开销。

### 4. 小结

这种情况，ApiException 不是 Kotlin 友好的类型，对于这样的类型，或者说类似的 Java 质量并不怎么好的代码，以及典型的 raw 类型的代码，建议用 Java 去访问，或者进行适当包装再交给 Kotlin 去调用。

当然，我最建议的是，如果有同事写了这样愚蠢的代码让你调用，离他远点儿，免得被带坏 ：）逃。。。


