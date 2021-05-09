---
title: 用 Kotlin Native 写 Jni，以后写 Android 基本上要没有别的语言什么事儿了的节奏
date: 2018/12/17
tags:
  - Kotlin
  - Android
  - Kotlin-Native
---

我在之前写过一篇文章，讲如何用 Kotlin Native 编写 Native 代码通过 JNI 让 Java 调用。当时因为完全没有注意到 `CName` 这个神奇的东西的存在，所以那篇文章当中还是用 C wrapper 来做的调用。

后来，我发现根本不需要这么麻烦啊。

<!--more-->

我们知道 JNI 如果不通过动态注册的话，Java native 方法与 C 函数的映射关系其实就是一个固定的命名规则：

```
Java_包名_类名_方法名
```

换句话说，如果我们在 Java 中加载的 so 库的符号表里面有这么一个函数，它的名字按照标准的 C 函数命名修饰方法修饰，并且修饰之前符合上面的规则，那么 Java 的 native 方法就可以与之对应上。

那么假如我们有下面的 Java 类：

```java
public class HelloJni extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        ...
    }

    public native String  stringFromJNI();
    
    ...
}
```

那么我们只要保证 so 库当中存在一个函数名为 `Java_com_example_hellojni_HelloJni_stringFromJNI` 并且返回 `jstring` 函数就行，至于这个 so 库是由 C 还是 C++ 还是 golang，其实无所谓——自然，Kotlin Native也不在话下。

我们可以用 CLion 创建一个 Kotlin Native 的工程，在 gradle 当中配置为 Android 的动态链接库：

```gradle
...
kotlin {
    targets {
        fromPreset(presets.androidNativeArm32, 'HelloWorld') // ① 配置为 Android 的工程

        configure([HelloWorld]) {
            compilations.main.outputKinds 'DYNAMIC' // ② 配置为动态链接库
        }
    }
    ...
}
...
```

然后随便创建一个文件，写一个全局函数，并用 `CName` 进行标注如下：

```kotlin
import kotlinx.cinterop.*
import platform.android.*

@CName("Java_com_example_hellojni_HelloJni_stringFromJNI")
fun stringFromJNI(env: CPointer<JNIEnvVar>, thiz: jobject): jstring {
    memScoped {
        return env.pointed.pointed!!.NewStringUTF!!.invoke(env, "This is from Kotlin Native!!".cstr.ptr)!!
    }
}
```

我们注意到，实际上 Kotlin Native 已经帮我们把 jni.h 这个头文件的互调用配置搞定了，因此我们可以直接导入 `jstring` 这样的类型。

然后编译得到一个 so 库 libknlib.so（名字取决于我们的 gradle 工程名），我们可以把它放到我们的 Android 工程当中，在运行时加载它：

```java
static {
    System.loadLibrary("knlib");
}
```

这样运行时就可以调用 `stringFromJNI` 这个方法啦。

```java
TextView tv = (TextView)findViewById(R.id.hello_textview);
tv.setText(stringFromJNI());
```

接下来我再给大家看几个例子：

首先，在 Kotlin Native 当中使用 Android 的日志 Api 打印日志：

```kotlin
@CName("Java_com_example_hellojni_HelloJni_sayHello")
fun sayHello(){
    __android_log_print(ANDROID_LOG_INFO.toInt(), "Kn", "Hello %s", "Native")
}
```

其次，在 Kotlin Native 当中调用 Java 的方法：

```kotlin
@CName("Java_com_example_hellojni_HelloJni_callLoop")
fun callLoop(env: CPointer<JNIEnvVar>, thiz: jobject): jstring {
    memScoped {
        val jniEnvVal = env.pointed.pointed!!
        val jclass = jniEnvVal.GetObjectClass!!.invoke(env, thiz)
        val methodId = jniEnvVal.GetMethodID!!.invoke(env, jclass, "callFromNative".cstr.ptr, "()Ljava/lang/String;".cstr.ptr)
        return jniEnvVal.CallObjectMethodA!!.invoke(env, thiz, methodId, null) as jstring
    }
}
```

其中 `callFromNative` 的定义如下：
    
```java
public String callFromNative(){
    return "This is from Java!!";
}
```
    
由于 Kotlin Native 本身就是兼容 C 的，因此 C 能干的自然 Kotlin Native 也可以，这样一来我们其实可以使用 Kotlin 将 Android App 上到虚拟机下到 Native 的代码全部使用 Kotlin 来编写，真是不要太强大。

本文涉及源码参见：[hello-kni](https://github.com/enbandari/hello-kni)

---
转载请注明出处：微信公众号 Kotlin

![](https://kotlinblog-1251218094.costj.myqcloud.com/80f29e08-11ff-4c47-a6d1-6c4a4ae08ae8/arts/Kotlin.jpg)









