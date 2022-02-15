---
title:  闲话 Swift 协程（8）：TaskLocal 
keywords: Swift Swift5.5 
date: 2022/02/12 21:02:24
description: 
tags: 
    - swift
    - coroutines
    - async await 
---

> 如果我想要定义一个变量，它的值只在 Task 内部共享，怎么做到呢？ 



<!-- more -->




## TaskLocal 值的定义和使用

TaskLocal 值就是 Task 私有的值，不同的 Task 对于这个变量的访问将得到不同的结果。

下面我们给出示例演示如何定义一个 TaskLocal 值：

```swift
class Logger {
    @TaskLocal
    static var tag: String = "default"
}
```

TaskLocal 值必须定义为静态的存储属性，并使用 TaskLocal 这个属性包装器（property wrapper）来包装。TaskLocal 值也受限于属性包装器的支持范围，不能定义为顶级属性。

变量 tag 的初始值为 `default`，属性包装器 TaskLocal 的构造器会接收这个值并存起来备用：

```swift
public final class TaskLocal<Value: Sendable>: Sendable, CustomStringConvertible {
  let defaultValue: Value

  public init(wrappedValue defaultValue: Value) {
    self.defaultValue = defaultValue
  }
  ..
}
```

了解属性包装器的读者应该也能想到初始值的定义还可以写：

```swift
class Logger {
    @TaskLocal(wrappedValue: "default")
    static var tag: String
}
```

通过观察 TaskLocal 的定义，我们也发现它对于被包装的类型是有要求的，即要实现 Sendable 协议。

>有关 Swift 属性包装器的介绍，可以参考我之前的一篇文章：[Kotlin 的 Property Delegate 与 Swift 的 Property Wrapper](https://www.bennyhuo.com/2020/05/08/kotlin-swift-property-delegate/)。

了解了定义之后，接下来看用法。

首先要写入值，我们只需要调用属性包装器的 withValue 函数，它的声明如下：

```swift
final public func withValue<R>(
    _ valueDuringOperation: Value, 
    operation: () async throws -> R, 
    file: String = #file, 
    line: UInt = #line
) async rethrows -> R
```

调用示例如下：

```swift
await Logger.$tag.withValue("MyTask") {
    await logWithTag("in my task")
}
```

其中 $tag 就是 tag 的属性包装器的 projectedValue，这个值正是 TaskLocal 这个属性包装器对象本身。

```swift
public final class TaskLocal<Value: Sendable>: Sendable, CustomStringConvertible {
    ...
    public var projectedValue: TaskLocal<Value> {
        get {
        self
        }
        set {
            ...
        }
    }
    ...
}
```

withValue 有两个参数，一个是要绑定给 tag 的值，即 `MyTask`；另一个就是一个闭包，这个绑定的值只有在这个闭包当中有效，一旦闭包执行结束，tag 绑定的值的生命周期也就结束了。

接下来我们尝试去读取它：

```swift
func logWithTag(_ message: Any) async {
    print("(\(Logger.tag)): \(message)")
}
```

读取的方式就显得普通而又枯燥了。写法非常直接，不过大家要明白，这个读的行为实际上是通过 TaskLocal 属性包装器完成的。

作为对比，我们给出一个稍微完整的例子：

```swift
await Logger.$tag.withValue("MyTask") {
    await logWithTag("in withValue")
}

await logWithTag("out of withValue")
```

运行结果如下：

```swift
(MyTask): in withValue
(default): out of withValue
```

## Task 对于 TaskLocal 的继承

上一篇文章当中我们通过示例演示了 `init` 和 `detach` 构造的 Task 实例对 actor 上下文的继承，这次我们给大家再演示一下对 TaskLocal 的继承，以进一步加深大家的理解：

```swift
await Logger.$tag.withValue("MyTask") {
    await Task {
        await logWithTag("Task.init")
    }.value

    await Task.detached {
        await logWithTag("Task.detached")
    }.value
}
```

这个例子相比之前的调度器的例子就更显得普通而又枯燥了，程序输出如下：

```swift
(MyTask): Task.init
(default): Task.detached
```
可以看到，通过 `detached` 创建的 Task 实例可谓是“六亲不认”，不仅不继承 actor 的上下文，也对 TaskLocal 不管不顾。另外不难想到的是，Swift 并没有提供修改外部 TaskLocal 值的 API，因此外部的 TaskLocal 值只能被继承，不能被修改。

## 深入探查 TaskLocal 的存储方式

TaskLocal 值虽然看起来就是个静态存储属性，但它的值实际上是存储在 Task 相关的内存当中的。它的读写性能自然也与它的存储方式有关，因此为了确保能够正确合理的使用 TaskLocal，我们有必要了解一下它究竟是如何存储的。

```swift
public final class TaskLocal<Value: Sendable>: Sendable, CustomStringConvertible {
  ..

  // 每一个变量唯一，用于查找值的 key
  var key: Builtin.RawPointer {
    unsafeBitCast(self, to: Builtin.RawPointer.self)
  }

  // 读取 TaskLocal 值的值时调用该函数
  // 通过 _taskLocalValueGet 到 Task 实例当中查找对应的值
  // 如果没有找到，则返回 defaultValue，即初始值
  public func get() -> Value {
    guard let rawValue = _taskLocalValueGet(key: key) else {
      return self.defaultValue
    }

    let storagePtr =
        rawValue.bindMemory(to: Value.self, capacity: 1)
    return UnsafeMutablePointer<Value>(mutating: storagePtr).pointee
  }

  @discardableResult
  public func withValue<R>(_ valueDuringOperation: Value, operation: () async throws -> R,
                           file: String = #file, line: UInt = #line) async rethrows -> R {
    _checkIllegalTaskLocalBindingWithinWithTaskGroup(file: file, line: line)

    // 写入值
    _taskLocalValuePush(key: key, value: valueDuringOperation)
    defer { 
        // 确保在 withValue 退出的时候将值释放掉
        _taskLocalValuePop() 
    }

    return try await operation()
  }

  ...
}
```

这时候我们注意到有几个关键的函数，它们的定义如下：

```swift
@_silgen_name("swift_task_localValuePush")
func _taskLocalValuePush<Value>(
  key: Builtin.RawPointer/*: Key*/,
  value: __owned Value
) // where Key: TaskLocal

@_silgen_name("swift_task_localValuePop")
func _taskLocalValuePop()

@_silgen_name("swift_task_localValueGet")
func _taskLocalValueGet(
  key: Builtin.RawPointer/*Key*/
) -> UnsafeMutableRawPointer? // where Key: TaskLocal
```

通过 _silgen_name 的值，我们可以找到他们在 C++ 当中的定义，以 `_taskLocalValueGet` 为例，我们给出 `swift_task_localValueGet` 的代码：

```cpp
SWIFT_CC(swift)
static OpaqueValue* swift_task_localValueGetImpl(const HeapObject *key) {
  if (AsyncTask *task = swift_task_getCurrent()) {
    // 从当前 Task 的本地存储当中读取值，AsyncTask 实际上就是 C++ 层当中 Task 对应的类型
    return task->localValueGet(key);
  }
  ...
}
```

`AsyncTask::localValueGet` 本质上调用的就是 `TaskLocal::Storage::getValue(AsyncTask *,const HeapObject *)`，我们同样可以找到它的实现：

```cpp
OpaqueValue* TaskLocal::Storage::getValue(AsyncTask *task,
                                          const HeapObject *key) {
  assert(key && "TaskLocal key must not be null.");

  auto item = head;
  // 遍历以 head 为头节点的链表
  while (item) {
    // 比较 key，直到找到对应的值
    if (item->key == key) {
      return item->getStoragePtr();
    }

    item = item->getNext();
  }

  return nullptr;
}
```

可见，查找过程其实就是链表的遍历查找，时间复杂度为 O(n)。

我们再稍微观察一下插入和删除的代码：

```cpp
void TaskLocal::Storage::pushValue(AsyncTask *task,
                                   const HeapObject *key,
                                   /* +1 */ OpaqueValue *value,
                                   const Metadata *valueType) {
  auto item = Item::createLink(task, key, valueType);
  valueType->vw_initializeWithTake(item->getStoragePtr(), value);
  head = item;
}

bool TaskLocal::Storage::popValue(AsyncTask *task) {
  auto old = head;
  head = head->getNext();
  old->destroy(task);
  return head != nullptr;
}
```

不难发现这实际上就是一个采用头插法的单链表。为什么选择这样的设计呢？

显然，绝大多数情况下 TaskLocal 值的数量都不会很多，同时插入的值只在 withValue 函数范围内有效也使得绝大多数查找的值都排在链表前面，因此线性查找的效率并不会存在性能问题。

而链表的结构也使得增删节点非常容易，使用头插法使得 withValue 函数退出时释放销毁对应的值也变得非常容易，时间复杂度只需要 O(1)。

另外，使用单链表来存储 TaskLocal 值还有一个好处，那就是变量遮蔽，例如：

```swift
await Logger.$tag.withValue("Task1") {
    await logWithTag("1")
    await Logger.$tag.withValue("Task2") {
        await logWithTag("2")
        await Logger.$tag.withValue("Task3") {
            await logWithTag("3")
        }
        await logWithTag("22")
    }
    await logWithTag("11")
}
```

运行结果如下：

```swift
(Task1): 1
(Task2): 2
(Task3): 3
(Task2): 22
(Task1): 11
```

简单总结一下，TaskLocal 值是存在链表当中的，我们在使用过程中应当避免使用过多的 TaskLocal 值，也应该适当地减少对 TaskLocal 值的访问次数，以避免性能上最坏的情况出现。

## 小结

本文我们对 TaskLocal 值的使用和实现机制做了剖析。

---

### 关于作者

**霍丙乾 bennyhuo**，Kotlin 布道师，Google 认证 Kotlin 开发专家（Kotlin GDE）；**《深入理解 Kotlin 协程》** 作者（机械工业出版社，2020.6）；前腾讯高级工程师，现就职于猿辅导

* GitHub：https://github.com/bennyhuo
* 博客：https://www.bennyhuo.com
* bilibili：[**bennyhuo不是算命的**](https://space.bilibili.com/28615855)
* 微信公众号：**bennyhuo**
