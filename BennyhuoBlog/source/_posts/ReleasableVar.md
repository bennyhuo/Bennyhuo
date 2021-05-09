---
title: ReleasableVar，可以为空的 Kotlin 非空类型 var
date: 2018/11/26
tags:
  - Kotlin
  - PropertyDelegate
---

# 0. 题外话：Hadi 的插件

上周的 JetBrains 开发者大会，Hadi 的两个插件比较亮眼，这里有小伙伴如果没有听到最后一场，可能不知道它们是啥，它们分别是：

* Nyan Process Bar
* Presentation Assistant

也有同学问我ppt的，上周一的文章末尾有提供哈~

好了下面我们言归正传~

# 1. 描述下需求

前不久跟群里小伙伴讨论的时候，发现他们有一个需求，那就是在一个变量使用完之后要将其置为 `null`，但是呢，又不愿意将它声明为可空类型，这个需求实在是。。大概就像这样吧：

```kotlin
class MainActivity: Activity {
    lateinit var image: Bitmap
    
    override fun onStart(){
        super.onStart()
        image = Bitmap.create(...)
    }
    
    override fun onStop(){
        super.onStop()
        image.recycle()
        image = null // You cannot do that!!
    }
}
```

<!--more-->

你想着 Activity 的 `onStop` 调用了之后到被回收还得等一会儿呢，甚至 `onDestroy` 都会过一会儿才会被执行到，所以 `image` 可能会在内存被持有一段时间。所以幸好我们可以通过 `recycle` 方法先告诉 `Bitmap` 该释放内存了，不然的话我们只能等着 `Activity` 回收的时候 `image` 引用的对象才可以回收。

不可空类型能够置为 `null` 看上去是个合理的需求，只要我确定在这之后不再使用就好了。好吧，既然合理，我们就想想办法。

# 2. 解决办法

想来想去，这个只能官方提供一个方法了，就像 `lateinitVar::isInitialized` 一样，提供一个 `lateinitVar::release()` 然后把 backingfield 的值给清空了不就好了吗？

这么看来不用官方了，我们自己似乎也可以搞定，写个属性代理即可：

```kotlin
fun <T : Any> releasableNotNull() = ReleasableNotNull<T>()

class ReleasableNotNull<T : Any> : ReadWriteProperty<Any, T> {

    private var value: T? = null

    override fun setValue(thisRef: Any, property: KProperty<*>, value: T) {
        this.value = value
    }

    override fun getValue(thisRef: Any, property: KProperty<*>): T {
        return value ?: throw IllegalStateException("Not Initialized or released already.")
    }

    fun isInitialized() = value != null

    fun release() {
        value = null
    }
}
```

然后用的时候也很简单：

```kotlin
class Foo {
    var bar by releasableNotNull<String>()
    
    ...
}
```

额，可是怎么才能调用到属性代理对象的方法呢？调用不到的话岂不是白折腾。。

```kotlin
fun <R> KProperty0<R>.release() {
    isAccessible = true
    (getDelegate() as? ReleasableNotNull<*>)?.release()
        ?: throw IllegalAccessException("Delegate is null or is not an instance of ReleasableNotNull.")
}
```
我们用反射其实可以很轻松的拿到代理对象的，那么这个故事就快要讲完了——不仅如此，我们还可以仿造 `lateinit` 定义一个判断是否初始化的方法：

```kotlin
val <R> KProperty0<R>.isInitialized: Boolean
    get() {
        isAccessible = true
        return (getDelegate() as? ReleasableNotNull<*>)?.isInitialized()
            ?: throw IllegalAccessException("Delegate is null or is not an instance of ReleasableNotNull.")
    }
```

# 3. 干掉反射

然后就有人说，我靠你居然用反射！你作弊！。。。。其实如果用反射，最好的办法是用 Java 反射直接设置为 `null`，但这个神不知鬼不觉的，你敢用么。算了算了，咱不用反射了好吧。

其实我们只需要对被代理的属性所在对象与属性代理对象进行绑定，我们就很轻易的通过 `KProperty0` 的 `receiver` 拿到属性代理对象了，所以我们需要的只是一个`WeakHashMap`，当然，这里雀神也提示我说小心对象的相等判断问题，因为这里我们希望每一个对象引用都是不同的，所以我从网上扒了一个 `WeakIdentityMap` 的集合，对应于有弱引用功能的 `IdentityHashMap`：

```kotlin
internal lateinit var releasableRefs: WeakIdentityMap<Any, MutableMap<String, ReleasableNotNull<*>>>
```

那么我们只需要在前面的 `setValue` 当中绑定他们：

```kotlin
class ReleasableNotNull<T : Any> : ReadWriteProperty<Any, T> {

    private var value: T? = null

    override fun setValue(thisRef: Any, property: KProperty<*>, value: T) {
        if (this.value == null) {
            var map = releasableRefs[thisRef]
            if(map == null){
                map = HashMap()
                releasableRefs[thisRef] = map
            }
            map[property.name] = this
        }
        this.value = value
    }
    
    ...
```

Map 里面又是一个 Map，这意思是说一个对象里面可能有多个成员被代理。接着改写我们的扩展方法：

```kotlin
val <R> KProperty0<R>.isInitialized: Boolean
    get() {
        return (this as? CallableReference)?.let {
            releasableRefs[it.boundReceiver]?.get(this.name)?.isInitialized()
        } ?: false
    }

fun <R> KProperty0<R>.release() {
    (this as? CallableReference)?.let {
        releasableRefs[it.boundReceiver]?.get(this.name)?.release()
    }
}
```

# 4. 怎么用？

啊，我忘了一件最重要的事儿，也许有小伙伴还不知道 `KProperty0` 是啥，它其实就是一个顶级变量或者已经绑定完 `receiver` 的变量，例如：

```kotlin
var varInPackage = "Hello"

class Foo {
    var bar = "World"
}
```
这两个属性我们通过下面的属性引用得到的就是 `KProperty0` 的实例：

```kotlin
::varInPackage

Foo()::bar
```

换句话说，我们开头给出的那个 `image` 的例子就可以这样写了：

```kotlin
class MainActivity: Activity {
    var image by releasableNotNull<Bitmap>()
    
    ...
    
    override fun onDestroy(){
        super.onDestroy()
        image.recycle()
        ::image.release() // You simply make the backing value null, thus making the gc of this Bitmap instance possible. 
    }
}
```

# 5. 你想直接用？

我已经把这东西扔到 jCenter了~

```
compile "com.bennyhuo.kotlin:releasable-nonnull-vars:1.1.0"
```

完整的源码其实也就那么前面那么几行，有兴趣也可以来我的 Github 给我点个 star：

https://github.com/enbandari/ReleasableVar

