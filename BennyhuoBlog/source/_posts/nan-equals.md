---
title: == 与 equals 居然结果不一样！
date: 2019/03/23
tags:
  - Kotlin
---

### == 与 equals 意见不一致的情况

Kotlin 当中 == 和 equals 是等价的，所以所有用 equals 的地方都可以用 == 来替换。

一般情况下这种说法是没问题的，连 IDE 也都会提示你：

![](https://kotlinblog-1251218094.costj.myqcloud.com/1827dcb6-e1e0-4271-ba1c-622fad1448bb/post/media/15532962022762.jpg)

要不要换呢？这个就看哪种更有表现力了对不，对于这种情况，换了也就换了~但事情总是有例外，例如：

![](https://kotlinblog-1251218094.costj.myqcloud.com/1827dcb6-e1e0-4271-ba1c-622fad1448bb/post/media/15532964071854.jpg)

这回居然不提示我了！所以这里面一定有鬼！

```kotlin
println(equals)
println(equals2)
```

你们猜猜结果如何？

![](https://kotlinblog-1251218094.costj.myqcloud.com/1827dcb6-e1e0-4271-ba1c-622fad1448bb/post/media/15532964821915.jpg)
我去，说好的 == 等价于 equals 呢？

完了完了，这下说不好了。。扎心了老铁。。官方文档还能不能信啊。。。

<!--more-->

以上运行结果是 kotlin.jvm 的，那么我们试试 kotlin.js，结果一样。Kotlin Native 说，他们俩的立场并不能代码我的，但我的结果与他们一样。。。所以这个不是 bug 呵。大家意见这么一致，是不是也想告诉我们点儿什么呢？

>NaN = Not a Number

NaN 说了，我可是一翻脸不认人的主，我翻脸了连我自己都不认！额这，，么尴尬么。

### Jvm 的为什么

下面我们来剖析下在 Java 虚拟机上 == 和 equals 遇到 NaN 时都发生了什么吧。从字节码上来看，

== 映射成了 Java 虚拟机的指令，也就是 Java 代码中的 ==，按照规定，NaN 是不等于任何数值包括自己的，也就是说这个指令在任何值与 NaN 作比较时都会返回 false。字节码如下图所示：

![](https://kotlinblog-1251218094.costj.myqcloud.com/1827dcb6-e1e0-4271-ba1c-622fad1448bb/post/media/15532971508271.jpg)

而 equals 则映射成了 Java Float 的 equals 方法调用，我们来看下这个方法的实现：
    
```java
public boolean equals(Object obj) {
    return (obj instanceof Float)
           && (floatToIntBits(((Float)obj).value) == floatToIntBits(value));
}
```
    
关于 `floatToIntBits` 的结果，主要返回浮点型的二进制表示，对于 NaN，那就是 0x7fc00000 了，这个是 IEEE 754 的规定。所以 equals 的执行 在 Java 虚拟机上就成了一个整数的比较，那么很显然会返回 true 了。

### JavaScript 的为什么

在 Js Target 上，我们很容易的就可以看到编译后的 JavaScript：

```javascript
var equals_0 = kotlin_js_internal_FloatCompanionObject.NaN === kotlin_js_internal_FloatCompanionObject.NaN;
var equals2 = equals(kotlin_js_internal_FloatCompanionObject.NaN, kotlin_js_internal_FloatCompanionObject.NaN);
```

而 `kotlin_js_internal_FloatCompanionObject.NaN` 又等价于 `Number.NaN`，因此上面的代码其实就是：

```js
var equals_0 = Number.NaN === Number.NaN;
var equals2 = equals(Number.NaN, Number.NaN);
```

对于第一行，JavaScript 与 Java 一样，规定 NaN 与自己不相等，所以返回 false，我们来看下第二行的 equals 函数的实现：

```js
  Kotlin.equals = function (obj1, obj2) {
    if (obj1 == null) {
      return obj2 == null;
    }
    if (obj2 == null) {
      return false;
    }
    if (obj1 !== obj1) {
      return obj2 !== obj2;
    }
    if (typeof obj1 === 'object' && typeof obj1.equals === 'function') {
      return obj1.equals(obj2);
    }
    if (typeof obj1 === 'number' && typeof obj2 === 'number') {
      return obj1 === obj2 && (obj1 !== 0 || 1 / obj1 === 1 / obj2);
    }
    return obj1 === obj2;
  };
```

![](https://kotlinblog-1251218094.costj.myqcloud.com/1827dcb6-e1e0-4271-ba1c-622fad1448bb/post/media/15532983608746.jpg)

这一句其实就是为 NaN 量身定做的，如果 obj1 跟自己不相等，那么一定是 NaN，就剩下的就看 obj2 是不是 NaN了。

### 其他情况的讨论

对于 NaN 在 == 与 equals 上表现出的不一致的情况，也是与平台相关的，而且 NaN 这个家伙本身的定义就是“六亲不认”，因此也讨论它的值的相等性是很无聊的一件事——除了看下 Kotlin 在各平台上的编译结果外。

实际上对于基本类型，Kotlin 的 == 和  equals 确实会做出不同的编译映射处理，但这样的处理在除了 NaN 外的所有场景下结果都是一致的，因此这二者可以认为除了 NaN 之外的所有情形下都是等价的。


---

* Bennyhuo 所在的组招 Android 暑期实习生，有机会转正哦~
* 腾讯地图数据业务，坐标 **北京中关村**
* 有兴趣的小伙伴可以发简历到 bennyhuo@kotliner.cn 哈~

--- 

另外，想要找到好 Offer、想要实现技术进阶的迷茫中的 Android 工程师们，推荐大家关注下我的新课《破解Android高级面试》，这门课已经更新完毕，涉及内容均非浅尝辄止，目前已经有200+同学在学习，你还在等什么(*≧∪≦)：

**扫描二维码或者点击链接[《破解Android高级面试》](https://s.imooc.com/SBS30PR)即可进入课程啦！**

![](https://kotlinblog-1251218094.costj.myqcloud.com/9ab6e571-684b-4108-9600-a9e3981e7aca/media/15520936284634.jpg)





