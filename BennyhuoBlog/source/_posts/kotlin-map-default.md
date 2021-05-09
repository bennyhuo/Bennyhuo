---
title:  Kotlin 为 Map 提供的那些默认值相关的扩展，你用过吗？ 
keywords: Kotlin Map 
date: 2020/06/09
description: 
tags: 
    - kotlin
    - map 
---

> Map 的 Value 类型是一个可空类型，Kotlin 早就想好了怎么帮你优雅地面对它。 



<!-- more -->




### 1. getOrElse

这个比较简单，我们先来看下它的定义：

```kotlin
inline fun <K, V> Map<K, V>.getOrElse(
  key: K, 
  defaultValue: () -> V
): V = get(key) ?: defaultValue()
```

如果没有元素 key，那么就返回默认值，默认值通过对参数中的 defaultValue 进行求值得到。当然，如果不需要默认值，那么这个求值过程也是不会发生的。

这种情况比较适合空值的语义与默认值相同的情况，例如我用 Map 中的值做为某种配置：

```kotlin
val config = HashMap<String, Boolean>()
val isEnabled = config.getOrElse("isEnabled", { false })
```

### 2. getOrPut

需要注意的是，getOrElse 的调用过程中 Map 没有被修改，即默认值并没有真正成为 Map 的元素。如果我们有下面的需求，那就要考虑使用 getOrPut 了：

我们有一个事件回调接口，不同事件用 eventId 来区分：

```kotlin
interface OnEventListener {
    fun onEvent(eventId: String, data: String)
}
```

我们需要提供对事件回调注册的能力：

```kotlin
val eventListeners = HashMap<String, ArrayList<OnEventListener>>()

fun addOnEventListener(eventId: String, listener: OnEventListener) {
    ...
}
```

添加 listener 的思路也很简单，先看看 eventListeners 当中有没有对应的 eventId 的事件回调 list，如果有，直接添加；如果没有，先构造一个 list 实例，然后再添加。所以最为朴素的实现就是下面这样：

```kotlin
fun addOnEventListener(eventId: String, listener: OnEventListener) {
    var listenerList = eventListeners[eventId]
    if (listenerList == null) {
        listenerList = ArrayList()
        eventListeners[eventId] = listenerList
    }
    listenerList.add(listener)
}
```

但这个也太不 Kotlin 了。

好在我们有 getOrPut，它提供了在 Map 中不存在对应的 Key 时返回默认值并将默认值添加到 Map 中的能力，它的实现非常直接：

```kotlin
inline fun <K, V> MutableMap<K, V>.getOrPut(
  key: K, defaultValue: () -> V
): V {
    val value = get(key)
    return if (value == null) {
        val answer = defaultValue()
        put(key, answer)
        answer
    } else {
        value
    }
}
```

既然如此，我们就可以简化 addOnEventListener 的实现了：

```kotlin
fun addOnEventListener(eventId: String, listener: OnEventListener) {
    eventListeners.getOrPut(eventId, defaultCreator).add(listener)
}
```

### 3. 隐式默认值

除了在获取时才能确定的默认值以外，还有一个在 Map 定义的时候就可以指定的方式，即：

```kotlin
val config = HashMap<String, Boolean>().withDefault { false }
```

这个也被称为隐式默认值，它的效果与 getOrElse 一致，在获取某一个不存在的 Key 时，直接返回默认值表达式的求值结果，在上面的例子当中就是 `{ false }` 的求值结果了。

不过如果大家用过这个功能的话，应该一开始都会感到比较疑惑，例如：

```kotlin
val isEnabled = config["isEnabled"] // null
```

用于此时我们的 config 只是一个空 Map，因此不存在 `isEnabled` 这个 Key，按照我们的直觉，这时应该触发默认值的求值过程并返回 false 对吧？但实际上不是这样的，标准库 API 的设计者为了确保对应的实现复合 Map 的接口定义，在我们调用 Map 接口的方法时，行为与普通的 Map 保持一致，因此 `config["isEnabled"]` 或者说等价的 `config.get("isEnabled")` 调用并不会触发默认值的求值。

那我想要获得默认值要怎么做呢？

调用另外的一个扩展方法：

```kotlin
val isEnabled = config.getValue("isEnabled") // false
```

### 4. 默认值的提供方式

前面提到的三种方式中，默认值都是通过一个函数提供的，这样做有什么好处呢？

其实如果 Map 的 Value 类型是不可变的数据类型，那么直接使用一个默认值即可，例如 Boolean、String 这样的基本类型。但对于可变的类型，例如前面例子中的 ArrayList，提供统一的默认值显然是行不通的，对象被不同的 Key 共享必然会造成逻辑的混乱。

还有一个原因，函数可以共享，只需要创建一个统一的对象，每次使用的时候复用即可，默认值本身并不总是需要，自然也并不总是需要创建出来，因此这里采用延迟计算还可以减少对象创建的成本。

### 5. 小结

好啦，这一篇文章没有什么有难度的地方，源码大家一看就明白，使用时只要注意其中的细节即可。


---


C 语言是所有程序员应当认真掌握的基础语言，不管你是 Java 还是 Python 开发者，欢迎大家关注我的新课 《C 语言系统精讲》：

**扫描二维码或者点击链接[《C 语言系统精讲》](https://coding.imooc.com/class/463.html)即可进入课程**

![](https://kotlinblog-1251218094.costj.myqcloud.com/9e300468-a645-433d-ae41-60b3eaa97f5a/media/program_in_c.png)


--- 

Kotlin 协程对大多数初学者来讲都是一个噩梦，即便是有经验的开发者，对于协程的理解也仍然是懵懵懂懂。如果大家有同样的问题，不妨阅读一下我的新书《深入理解 Kotlin 协程》，彻底搞懂 Kotlin 协程最难的知识点：

**扫描二维码或者点击链接[《深入理解 Kotlin 协程》](https://item.jd.com/12898592.html)购买本书**

![](https://kotlinblog-1251218094.costj.myqcloud.com/9e300468-a645-433d-ae41-60b3eaa97f5a/media/understanding_kotlin_coroutines.png)

---

如果大家想要快速上手 Kotlin 或者想要全面深入地学习 Kotlin 的相关知识，可以关注我基于 Kotlin 1.3.50 全新制作的入门课程：

**扫描二维码或者点击链接[《Kotlin 入门到精通》](https://coding.imooc.com/class/398.html)即可进入课程**

![](https://kotlinblog-1251218094.costj.myqcloud.com/40b0da7d-0147-44b3-9d08-5755dbf33b0b/media/exported_qrcode_image_256.png)

---

Android 工程师也可以关注下《破解Android高级面试》，这门课涉及内容均非浅尝辄止，除知识点讲解外更注重培养高级工程师意识：

**扫描二维码或者点击链接[《破解Android高级面试》](https://s.imooc.com/SBS30PR)即可进入课程**

![](https://kotlinblog-1251218094.costj.myqcloud.com/9ab6e571-684b-4108-9600-a9e3981e7aca/media/15520936284634.jpg)

