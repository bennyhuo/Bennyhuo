---
title: Kotlin Native 写 Jni 第二弹：动态绑定 Native 方法
date: 2018/12/31
tags:
  - Kotlin
  - Kotlin-Native
---

上一篇文章我讲了用 `@CName` 这个神奇的注解，可以配置 Kotlin Native 函数在符号表中的名字，进而根据 Jni 静态绑定的规则来对应到 Java native 方法，但实际开发当中我们更喜欢用动态注册的方式，因为一方面不受名字的约束，不影响代码重构，函数名也相对美观，另一方面调用起来也相对高效，节省了静态绑定的查找过程。

<!-- more -->

如果大家习惯用 C 写动态绑定的代码，那么 Kotlin Native 写起来思路也是很简单的，只要依样画葫芦，就可以写出来，我们先给出代码：

```kotlin
@CName("JNI_OnLoad")
fun JNI_OnLoad(vm: CPointer<JavaVMVar>, preserved: COpaquePointer): jint {
    return memScoped {
        val envStorage = alloc<CPointerVar<JNIEnvVar>>()
        val vmValue = vm.pointed.pointed!!
        val result = vmValue.GetEnv!!(vm, envStorage.ptr.reinterpret(), JNI_VERSION_1_6)
        __android_log_print(ANDROID_LOG_INFO.toInt(), "Kn", "JNI_OnLoad")
        if(result == JNI_OK){
            val env = envStorage.pointed!!.pointed!!
            val jclass = env.FindClass!!(envStorage.value, "com/example/hellojni/HelloJni".cstr.ptr)

            val jniMethod = allocArray<JNINativeMethod>(1)
            jniMethod[0].fnPtr = staticCFunction(::sayHello2)
            jniMethod[0].name = "sayHello2".cstr.ptr
            jniMethod[0].signature = "()V".cstr.ptr
            env.RegisterNatives!!(envStorage.value, jclass, jniMethod, 1)

            __android_log_print(ANDROID_LOG_INFO.toInt(), "Kn", "register say hello2, %d, %d", sizeOf<CPointerVar<JNINativeMethod>>(), sizeOf<JNINativeMethod>())
        }
        JNI_VERSION_1_6
    }
}
```

思路很简单，就是先通过 `CName` 注解搞定 `JNI_OnLoad` 函数，让 Java  虚拟机能够在加载 so 库的时候找到这个入口函数，那么我们接下来就是纯调用 Jni 的 C 接口了。

再说下 `memScope` 这个东西，C 当中内存管理是人工不智能的，Kotlin Native 则有自己的内存管理机制，因此如果我们需要在 Kotlin Native 当中访问 C 接口，并且创建 C 变量，就需要通过 `memScope` 来提醒 Kotlin Native 这些变量需要来统一管理。

获取 JNIEnv 的指针时我们首先构造了一个指针的左值类型：

```kotlin
val envStorage = alloc<CPointerVar<JNIEnvVar>>()
```

这么说有些奇怪，总之在 C 的指针类型向 Kotlin Native 映射时，`CPointer` 的左值类型会映射成 `CPointerVar`，我现在对 Kotlin Native 与 C 的交互还没有仔细研究，就暂时不展开说了，等后面有机会再系统介绍 Kotlin Native 的细节。

接下来我们看这句：

```kotlin
val vmValue = vm.pointed.pointed!!
```

C 版本的定义 `JavaVM` 其实本身也是一个指针：

```c
typedef const struct JNIInvokeInterface* JavaVM;
```

因此两个 `pointed` 的调用相当于获取到了 `JNIInvokeInterface` 这个结构体，于是后面我们就可以用它持有的函数指针进行获取 `JNIEnv` 的操作了：

```kotlin
val result = vmValue.GetEnv!!(vm, envStorage.ptr.reinterpret(), JNI_VERSION_1_6)
```

再稍微提一个事儿，那就是这些类型从 C 的角度映射过来，空类型安全自然是无法保证的，因此我们会见到各种 `!!`  的使用，这样实际上对于开发来讲非常不友好。因此理想的状况是，我们用 Kotlin Native 对 C 接口进行封装，将这些底层的工作按照 Kotlin 的风格进行转换，这样我们使用起来就会容易得多——官方的 AndroidNativeActivity 的例子当中提供了 JniBridge 及一系列的类其实就是做了这样一件事儿，只不过还不算太完整。

接下来我们要实现动态绑定了：

```kotlin
val jclass = env.FindClass!!(envStorage.value, "com/example/hellojni/HelloJni".cstr.ptr)
val jniMethod = allocArray<JNINativeMethod>(1)
jniMethod[0].fnPtr = staticCFunction(::sayHello2)
jniMethod[0].name = "sayHello2".cstr.ptr
jniMethod[0].signature = "()V".cstr.ptr
env.RegisterNatives!!(envStorage.value, jclass, jniMethod, 1)
```

这里面也向大家展示了如何将 Kotlin 函数转为 C 的函数指针，总体来讲思路还是很简单的，毕竟我们只是照猫画虎。

问题也是很显然的，如果你也尝试这样做了，一定被这些映射过来的接口函数的签名给搞晕过：

```kotlin
public final var RegisterNatives: kotlinx.cinterop.CPointer<kotlinx.cinterop.CFunction<(kotlinx.cinterop.CPointer<platform.android.JNIEnvVar /* = kotlinx.cinterop.CPointerVarOf<platform.android.JNIEnv /* = kotlinx.cinterop.CPointer<platform.android.JNINativeInterface> */> */>?, platform.android.jclass? /* = kotlinx.cinterop.CPointer<out kotlinx.cinterop.CPointed>? */, kotlinx.cinterop.CPointer<platform.android.JNINativeMethod>?, platform.android.jint /* = kotlin.Int */) -> platform.android.jint /* = kotlin.Int */>>? /* compiled code */
```

这其实就是 `RegisterNatives` 这个函数指针的签名，它接受 JNIEnv 的值，jclass，以及一个 JNINativeMethod 结构体的数组和这个数组的长度作为参数，但我们点进去看源码或者看函数前面却需要看这么一大堆东西，直接晕菜。

这其实也是目前 Kotlin Native 比较麻烦的问题之一：开发体验。尽管 1.0-Beta 出来之后，相比过去要好了许多，但开发体验似乎仍然有待提高，这其实也会直接影响开发者的涌入。

简单来说，这篇文章没什么太大的技术含量，只是对上一篇文章的一个补充。

本文涉及源码参见：[hello-kni](https://github.com/enbandari/hello-kni)

