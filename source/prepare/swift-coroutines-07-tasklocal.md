# 闲话 Swift 协程（7）：TaskLocal

**Swift Swift5.5**

> 如果我想要定义一个变量，它的值只在 Task 内部共享，怎么做到呢？

==  Swift|Coroutines|async await ==

## 什么是 TaskLocal

TaskLocal 就是 Task 私有的变量，不同的 Task 对于这个变量的访问或得到不同的结果。

## 小结

本文我们详细介绍了 Swift 协程当中对于 actor 的实现细节，包括属性隔离的运用、对 Sendable 协议的支持以及调度器的介绍。至此，读者已经接触到了 Swift 协程当中绝大多数的特性。