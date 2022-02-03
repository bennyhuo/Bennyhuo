# 闲话 Swift 协程（6）：Task 的异常

**Swift Swift5.5**

> 如果 Task 出现了未捕获的异常，结果会怎样呢？

==  Swift|Coroutines|async await ==

## Task 的异常




## 小结

本文简单讨论了一下 Task 和 TaskGroup 的异常传播。这个设计非常符合直觉，异常作为结果返回而不是副作用直接抛出，更容易让我们对 Task 的执行产生深刻的认识。