
## JEP 406: Pattern Matching for switch (Preview)

这是一个预览特性。

前面我们提到过 Java 16 引入了一个对于 instanceof 的模式匹配：

```java
// Old code
if (o instanceof String) {
    String s = (String)o;
    ... use s ...
}

// New code
if (o instanceof String s) {
    ... use s ...
}
```

这个其实从效果上类似于 Kotlin 的智能类型转换：

```kotlin
if (o is String) {
    // now `o` is smart casted to String 
    println(o.length())
}
```

不过，模式匹配可以做的事情更多。

Java 17 引入了一个 preview 的特性，可以通过 switch 语句来实现类似的类型模式匹配：

```java
static String formatterPatternSwitch(Object o) {
    return switch (o) {
        case Integer i -> String.format("int %d", i);
        case Long l    -> String.format("long %d", l);
        case Double d  -> String.format("double %f", d);
        case String s  -> String.format("String %s", s);
        default        -> o.toString();
    };
}
```

对于每一个 case 语句，我们都可以使用类型模式匹配，如果 o 的类型是 Integer，那么它就可以匹配到第一个 case 分支，并且在这个分支内部可以用新变量 i 来替代 o。

请注意，switch 语句在 Java 14 正式支持了表达式，有些朋友可能对这个语法不是很熟悉， 每一个 case  语句后面的 `->` 都是一个表达式，并且不会落到下一个 case 分支，所以大家也不会在这里看到 break。

![](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates/74379640.jpg)

模式匹配在 Java 的近亲 Scala 上得到了广泛的运用，当然 Scala 的模式匹配要复杂得多，下面是我从 Scala 官网摘的例子：

```scala
abstract class Notification
case class Email(sender: String, title: String, body: String) extends Notification
case class SMS(caller: String, message: String) extends Notification
case class VoiceRecording(contactName: String, link: String) extends Notification

def showNotification(notification: Notification): String = {
  notification match {
    case Email(sender, title, _) => s"You got an email from $sender with title: $title"
    case SMS(number, message) => s"You got an SMS from $number! Message: $message"
    case VoiceRecording(name, link) => s"You received a Voice Recording from $name! Click the link to hear it: $link"
  }
}
```

case class 类似于 Java 当中的 record，或者 Kotlin 当中的 data class，我们看到下面的 match 语句当中，`case Email(sender, tit le, _)` 语句可以直接对待匹配的对象做解构。此外，还可以添加模式守卫（Pattern Guard），例如：

```scala
def showImportantNotification(notification: Notification, importantPeopleInfo: Seq[String]): String = {
  notification match {
    case Email(sender, _, _) if importantPeopleInfo.contains(sender) => "You got an email from special someone!"
    case SMS(number, _) if importantPeopleInfo.contains(number) => "You got an SMS from special someone!"
    case other => showNotification(other) // nothing special, delegate to our original showNotification function
  }
}
```

注意每一条 case 后面的 if，在匹配的时候，也需要命中 if 后面的表达式。

![](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates/74376397.png)

Java 在后续的发展过程当中也许也存在添加这样的语法的可能性。

Kotlin 在演进的过程中曾经也一度想要把 when 表达式做成模式匹配，不过可能是后面觉得模式匹配的实用价值不高（???），就没有继续做下去。

![](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates/7436CC1A.gif)

稍微提一下，如果想要体验预览特性，需要为 Java 编译器和 Java 运行时添加 `--enable-preview` 参数。

## 小结

Java 17 更新的内容还是不少的，这一篇我们先介绍这么多，剩下的下一篇再介绍。