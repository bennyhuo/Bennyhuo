---
title:  Gradle 创建 Task 的写法不是 Groovy 的标准语法吧？ 
keywords: Gradle Groovy 
date: 2021/04/12
description: 
tags: 
    - gradle
    - groovy 
---

> 任务名居然是以标识符的形式写出来的，你们难道没有觉得奇怪吗？ 

<iframe class="bilibili"  src="//player.bilibili.com/player.html?aid=290197027&bvid=BV1ib4y1D74X&cid=325923583&page=1&high_quality=1" scrolling="no" border="0" frameborder="no" framespacing="0" allowfullscreen="true"> </iframe>

<!-- more -->




```gradle
task clean(type: Delete) {
    delete rootProject.buildDir
}
```

它定义了一个叫做 "clean" 的任务，这个任务的类型是 Delete。

其中 Delete 是一个类的名字，这是 Groovy 的语法，相当于 Delete.class。这个还好，至少人家语法上支持这样做。

后面的 { ... } 有 Kotlin 经验的小伙伴们自然也不会觉得陌生，这肯定是接收一个 Lambda （在 Groovy 当中就是 Closure）作为参数，里面的 `delete rootProject.buildDir` 则等价于 `delete(rootProject.buildDir)`，这也是 Groovy 的语法，在 Groovy 当中只要不引起歧义，函数的调用是可以去掉括号的，类似的例子有很多：

```gradle
dependencies {
    classpath 'com.android.tools.build:gradle:4.0.1'
    ...
}
```

这里的 classpath 也是如此。

这都很容易理解。那么问题来了，`task clean(...){ ... }` 这是个什么语法？我们定义一个名叫 "clean" 的任务，这个任务名不应该是一个字符串字面量吗，但现在按照 Groovy 的语法，它应该等价于 `task(clean(...){ ... })` ，这个 clean 看上去其实是个方法名，而不是一个常量。

如果大家跟我一样一开始就绞尽脑汁地去研究这个玩意究竟是什么 Groovy 语法，那你从一开始就错了。这个答案直到我们在翻阅 Gradle 源码的时候，看到有一个叫做 TaskDefinitionScriptTransformer 的类，这个类在 Gradle 脚本编译运行的第二个阶段时被调用，它和其他几个类似的 Transformer 一样，作用就是对源代码的语法树做了一些转换。

大家在 Gradle 源码当中找到这个类之后就会发现，注释已经写的非常清晰了，例如：

```java
if (args.getExpression(0) instanceof MapExpression && args.getExpression(1) instanceof VariableExpression) {
    // Matches: task <name-value-pairs>, <identifier>, <arg>?
    // Map to: task(<name-value-pairs>, '<identifier>', <arg>?)
    transformVariableExpression(call, 1);
} else if (args.getExpression(0) instanceof VariableExpression) {
    // Matches: task <identifier>, <arg>?
    transformVariableExpression(call, 0);
}
```

通过注释我们可以看到，task 实际上是被当做函数来调用的，我们也确实可以在 Project 当中找到它的定义：

![image-20210411072516707](https://kotlinblog-1251218094.costj.myqcloud.com/9e300468-a645-433d-ae41-60b3eaa97f5a/media/image-20210411072516707.png)

这个映射实际上就是给 identifier 加了个引号，变成字符串字面量。注意到 `transformVariableExpression(call, 1);` 的第二个参数 1 对应的就是 `<identifier>`，第二个分支里面的位置则是 0。

这个方法的实现也很显而易见：

```java
private void transformVariableExpression(MethodCallExpression call, int index) {
    ArgumentListExpression args = (ArgumentListExpression) call.getArguments();
    //拿到 identifier 对应的表达式
    VariableExpression arg = (VariableExpression) args.getExpression(index);
    if (!isDynamicVar(arg)) {
        return;
    }

    // Matches: task args?, <identifier>, args? or task(args?, <identifier>, args?)
    // Map to: task(args?, '<identifier>', args?)
    String taskName = arg.getText(); // 表达式的内容就是任务名
    call.setMethod(new ConstantExpression("task"));
    // 创建一个以任务名为内容的字符串字面量
    args.getExpressions().set(index, new ConstantExpression(taskName));
}
```

除了这个转换以外，还有很多其他的情况，现在我们的问题是文章一开始提到的 `task clean(...){ ... }`应当属于那种转换？属于嵌套方法调用的转换。前面我们已经分析到这个写法其实可以等价于 `task(clean(...){ ... })`，对应的转换在 `maybeTransformNestedMethodCall` 方法当中给出了实现，我们摘录一部分给大家了解一下：

```java
private boolean maybeTransformNestedMethodCall(MethodCallExpression nestedMethod, MethodCallExpression target) {
    ...
    // Matches: task <identifier> <arg-list> | task <string> <arg-list>
    // Map to: task("<identifier>", <arg-list>) | task(<string>, <arg-list>)
    Expression taskName = nestedMethod.getMethod();
    Expression mapArg = null;
    List<Expression> extraArgs = Collections.emptyList();

    if (nestedMethod.getArguments() instanceof TupleExpression) {
        TupleExpression nestedArgs = (TupleExpression) nestedMethod.getArguments();
        if (nestedArgs.getExpressions().size() == 2 && nestedArgs.getExpression(0) instanceof MapExpression && nestedArgs.getExpression(1) instanceof ClosureExpression) {
            // Matches: task <identifier>(<options-map>) <closure>
            mapArg = nestedArgs.getExpression(0);
            extraArgs = nestedArgs.getExpressions().subList(1, nestedArgs.getExpressions().size());
        } else {
            ...
        }
    }

    target.setMethod(new ConstantExpression("task"));
    ArgumentListExpression args = (ArgumentListExpression) target.getArguments();
    args.getExpressions().clear();
    // 如果有 map 参数，放到第一个
    if (mapArg != null) {
        args.addExpression(mapArg);
    }
    // 注意，taskName 被当做参数传入
    args.addExpression(taskName);
    // 剩下的参数
    for (Expression extraArg : extraArgs) {
        args.addExpression(extraArg);
    }
    return true;
}
```

mapArg 是否为 null，对应了 task 方法的两个重载版本：

```java
Task task(String name, Closure configureClosure);
Task task(Map<String, ?> args, String name, Closure configureClosure);
```

这么来看，文章开头提到的创建任务的写法，实际上相当于：

```gradle
task(type: Delete, "clean") {
    delete rootProject.buildDir
}
```

其他类似的 Transformer 大家可以自行分析。

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

