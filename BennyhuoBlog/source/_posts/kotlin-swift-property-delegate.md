---
title:  Kotlin 的 Property Delegate 与 Swift 的 Property Wrapper  
keywords: Kotlin Swift Property 
date: 2020/05/08
description: 
tags: 
    - kotlin
    - swift
    - property 
---

> Swift 的属性代理，见识一下 



<!-- more -->




> Swift：我不是我没有别瞎说。

本文我们来聊聊二者的属性代理的设计和使用。通过对比，我们能够更加清楚的认识到属性代理的设计意图，以及其优势和不足，此外我们还能够了解更多属性代理这一语法特性的使用场景。

## Kotlin 的属性代理（Property Delegate）

我们先来简单回顾下 Kotlin 的属性代理的一些基础知识和应用场景。

### 简化存储的读写

Kotlin 的属性代理算是大多数开发者在学习过程中会遇到的一个小难点。这其实让我一直都感到比较意外，因为属性代理本身应该是一个很自然的需求，例如我们经常在 Android 当中会读写 SharedPreference，一个 Key 对应于一个 Value，读写的过程高度相似且繁琐：

```kotlin
[Kotlin]

// write
val prefs = context.getSharedPreferences(prefName, Context.MODE_PRIVATE)
prefs.putString(key, value)
prefs.apply()

// read
val value = prefs.getString(key, defaultValue)
```

这当中还经常需要定义一堆常量作为 key 的值，无论从代码编写的舒适度上还是从代码的编写效率上来看都不是最理想的状态。

实际上，如果我们把 SharedPreference 看成是类似内存一样的存储空间，那么为什么我们不能像读写内存中的变量那样轻松自在呢？于是乎我们通过属性代理将 SharedPreference 的读写操作做一下封装，实现了使用对变量的读写方式来读写 SharedPreference 的效果：

```kotlin
[Kotlin]

var loginName by pref(context, default = "")

// save "bennyhuo" as key "loginName"
loginName = "bennyhuo" 

// load key "loginName" from SharedPreferences
val currentLoginName = loginName 
```

请大家注意，`pref` 是一个函数，它有一个泛型参数可以通过第二个函数参数的类型推导出来。对 `loginName` 的读写等同于对 SharedPreferences 中的 "loginName" 这个 key 的读写，这个操作是不是非常方便？想要实现这样的功能也不需要太多的逻辑，我们以 `String` 为例给出实现：

```kotlin
[Kotlin]

class Preference<T>(val context: Context, val name: String, 
        val default: T, val prefName: String = "default") : ReadWriteProperty<Any?, T> {

    val prefs by lazy { context.getSharedPreferences(prefName, Context.MODE_PRIVATE) }

    override fun getValue(thisRef: Any?, property: KProperty<*>): T {
        return findPreference(findProperName(property), default)
    }

    override fun setValue(thisRef: Any?, property: KProperty<*>, value: T) {
        putPreference(findProperName(property), value)
    }

    private fun findProperName(property: KProperty<*>) = if(name.isEmpty()) property.name else name

    private fun <U> findPreference(name: String, default: U): U = with(prefs) {
        val res: Any = when (default) {
            is String -> getString(name, default)
            ...
        }

        res as U
    }

    private fun <U> putPreference(name: String, value: U) = with(prefs.edit()) {
        when (value) {
            is String -> putString(name, value)
            ...
        }.apply()
    }
}
```

其他数据类型的支持大家可以根据需要自行扩展。

属性代理的本质就是 `getValue` 和 `setValue` 这两个方法，这里的代码实现了 `ReadWriteProperty` 这个接口，不过这不是必须的，我们当然也可以改成下面的样子：

```kotlin
[Kotlin]

class Preference<T>(...) {

    ...

    operator fun getValue(thisRef: Any?, property: KProperty<*>): T {
        return findPreference(findProperName(property), default)
    }

    operator fun setValue(thisRef: Any?, property: KProperty<*>, value: T) {
        putPreference(findProperName(property), value)
    }

    ...
}
```

原来 `getValue` 和 `setValue` 还是运算符方法，其实这里我们甚至可以把它们定义成扩展方法，只要方法的类型符合要求就可以。

既然如此，那我们是不是还可以对 Java 的 `Properties` 文件提供类似的支持呢？当然。我们同样可以通过被代理的属性名来查询对应 key 在 `Properties` 文件中的值，这个逻辑与 SharedPreferences 如出一辙，大家有兴趣可以参考这里：[AbsProperties.kt](https://github.com/enbandari/QCloudImageUploaderForMarkDown/blob/master/src/main/kotlin/com/bennyhuo/qcloud/prop/AbsProperties.kt)。

官网在介绍属性代理的时候还给出了 Map 作为属性代理的用法：

```kotlin
[Kotlin]

class User(val map: Map<String, Any?>) {
    val name : String by map
    val age  : Int    by map
}
```

我在很早的时候还专门写过一篇文章来介绍这个用法：[用 Map 为你的属性做代理](https://mp.weixin.qq.com/s?__biz=MzIzMTYzOTYzNA==&mid=2247484018&idx=1&sn=170499992c0f29d9304eeddc4379f34e&chksm=e8a05d4fdfd7d459d7e75fa987eda85b39d43ce9b2ea5c8d2b8c884efc7b0431ae39b3c9c22f&token=397611765&lang=zh_CN#rd)。其实 `Map` 也是一种存储的方式，这与前面提到的 SharedPreferences 又有什么区别呢？

这样的例子我们还能列举很多，如数据库读写、文件读写甚至网络读写等等。

### 控制属性的生命周期

标准库中也提供了 Lazy、Observable 这样的属性代理实现，它们与前面的简化存储的写法不同，二者分别代表了控制、监听属性的读写的使用场景。Lazy 的例子想必大家已经见过很多了，我们可以通过 Lazy 代理属性的初始化逻辑，确保只有在第一次访问时才会对属性进行初始化：

```kotlin
[Kotlin]

val textView by lazy { rootView.findViewById(R.id.text) }
```

我们对属性进行延迟初始化的理由总是会有很多，例如初始化可能比较耗时，依赖的其他成员尚未初始化等等。

我们再来看个例子。

Kotlin 当中的变量类型分为可空和不可空，定义时必须明确其类型，例如下面例子中的 image：

```kotlin
[Kotlin]

class MainActivity: Activity {
    lateinit var image: Bitmap
    
    override fun onStart(){
        super.onStart()
        image = Bitmap.create(...)
    }
    
    override fun onStop(){
        super.onStop()
        image.recycle()
        image = null // Error!!
    }
}
```

`image` 在定义时如果定义为 `Bitmap?`，那么在不需要的时候自然是可以置为 `null` 的，只不过用的时候每次都需要判空，感觉就很让人难受。而如果定义成 `Bitmap`，用的时候倒是省事儿了，可是最后我们又无法将其置为 `null`。怎么办？

有人说你这个是伪需求，不置为 `null` 也不会有内存泄露。不过，`Activity` 经常在 `onStop` 调用之后还会存续一段时间才会被销毁，对应的 `Bitmap` 对象也要晚一段时间才能被释放，不置为 `null` 似乎并不是一个最优的选择。不管怎样，如果我们就是想要把这个 `Bitmap` 对象（或者其他什么对象）置为空，又想不影响开发体验，似乎是不可行的。

但如果我们用属性代理来控制对象的内部逻辑呢：

```kotlin
[Kotlin]

class MainActivity: Activity {
    var image by releasableNotNull<Bitmap>()
    
    override fun onStart(){
        super.onStart()
        image = Bitmap.create(...)
    }
    
    override fun onStop(){
        super.onStop()
        image.recycle()
        // release the Bitmap instance.
        ::image.release() 
    }
}
```

我们通过 `releasableNotNull` 函数来创建这样一个属性代理，这个属性代理的工作就是提供一个真正的属性存储，可读可写可释放，它的实现并不复杂：

```kotlin
[Kotlin]

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

fun <R> KProperty0<R>.release() {
    isAccessible = true
    return (getDelegate() as? ReleasableNotNull<*>)?.release()
        ?: throw IllegalAccessException("Delegate is null or is not an instance of ReleasableNotNull.")
}
```

我们通过对属性代理类 `ReleasableNotNull` 实现了对真正存储值的 `value` 的代理，前面对 `image` 的访问实际上就是对 `value` 的访问，而 `value` 的类型又是可空的，因此我们实现了既可将属性置为 `null` 又可将属性 `image` 声明为不可空的 `Bitmap` 类型的需求。

这个小功能已经开源并上传到 jcenter，大家可以通过配置依赖 `com.bennyhuo.kotlin:releasable-nonnull-vars:1.1.0` 来使用它，也可以直接到我的 GitHub 上查看它的源码：[ReleasableVar](https://github.com/enbandari/ReleasableVar)，源码当中我也给出了不依赖 Kotlin 反射的实现方法。

> 例子当中的 `KProperty0<R>.release` 扩展方法实际上是为被代理的属性的引用添加了一个扩展，其中使用反射可以获取到代理对象，这样我们就可以使用 `::image.release()` 来实现对 image 背后的值的置空。请大家留意我们获取属性代理对象的方式，这在 Kotlin 当中需要用到反射；后面我们会看到， Swift 则直接提供了更好的语法来支持这样的功能。

### 代理其他类属性或者方法

前面的例子都比较直观，我们再给大家看一个更复杂的用法。

假设我们现在有这么一类，它有一些方法和属性：

```kotlin
[Kotlin]

class Wrapped(var x: Boolean) {
    val z = 10L
    fun setY(y: Int) {
        ...
    }

    fun getY() = 12
}
```

这个类的实例会被包在另一个类当中：

```kotlin
[Kotlin]

class Wrapper {
    private val wrapped: Wrapped = Wrapped(false)

    var x: Boolean = ...
    var y: Int = ...
    val z: Long = ...
}
```

我们在 `Wrapper` 类当中还想把 `Wrapped` 类的一些成员暴露给外部调用者，可能的实现就像这样：

```kotlin
[Kotlin]

class Wrapper {
    private val wrapped: Wrapped = Wrapped(false)

    var x: Boolean
        get() = wrapped.x
        set(value) { wrapped.x = value }

    ...
}
```

这样的写法并不是很简洁，我们可以通过属性代理实现这样的写法：

```kotlin
[Kotlin]

class Wrapper {
    private val wrapped: Wrapped = Wrapped(false)

    var x by wrapped::x.delegator()
    ...
}
```

属性代理本质上就是 `setValue` 和 `getValue`，所以代理 getter 和 setter `也是顺理成章。delegator` 函数是 `x` 的属性引用的扩展成员，定义也不复杂：

```kotlin
[Kotlin]

fun <T> KProperty0<T>.delegator(initializedValue: T? = null)
    : ReadWriteProperty<Any, T>
        = ObjectPropertyDelegate0(
            propertyRef = this as PropertyReference, 
            initializedValue = initializedValue
        )

internal class ObjectPropertyDelegate0<T>(
        val getter: (() -> T), 
        val setter: ((T) -> Unit)? = null, 
        initializedValue: T? = null) : ReadWriteProperty<Any, T> {

    constructor(
        propertyRef: PropertyReference, 
        initializedValue: T? = null
        ): this(
            (propertyRef as KProperty0<T>)::get, 
            if (propertyRef is KMutableProperty0<*>) (propertyRef as KMutableProperty0<T>)::set else null, initializedValue
        )

    init {
        initializedValue?.let { setter?.invoke(it) }
    }

    override operator fun getValue(thisRef: Any, property: KProperty<*>): T {
        return getter.invoke()
    }

    override operator fun setValue(thisRef: Any, property: KProperty<*>, value: T) {
        setter?.invoke(value)
    }
}
```

这有点儿像请求转发一样，对 `Wrapper` 的属性 `x` 的读写直接转发给了 `Wrapped` 的属性 `x` 。既然我们把属性拆解开看做是 getter 和 setter，那么所有符合此类特征的函数也是可以被代理的，因此对于 `Wrapped` 的 `getY` 也可以代理成一个只读属性，`setY` 也可以单独代理成一个可变属性：

```kotlin
[Kotlin]

class Wrapper {
    private val wrapped: Wrapped = Wrapped(false)

    var y by wrapped::setY.delegator(defaultValue = 0)
    val yGetter by wrapped::getY.delegator()
    ...
}
```

对于 `getY` 的代理比较容易理解。对于 `setY` 的代理就有些奇怪了，属性 `y` 只代理了 `wrapped::setY`，那读取 `y` 的值时从哪儿获取呢？这其实也不难做到，我们可以通过属性代理提供一个 backingfield 来保存这个值就可以了。其实对于 setter 的代理的场景还真有，例如对于 Android 中某些 `View` 的属性只有 setter 的方法，没有对应的 getter，如果我想要做一个属性动画，那么这样的属性代理就会比较有帮助。

当然，类似的扩展我们还可以做很多，甚至支持 lazy：

```kotlin
[Kotlin]

class MainActivity: Activity() {

    val name by delegateLazyOf(TextView::getText, TextView::setText) { textView }

}
```

我们前面的例子当中 `wrapped` 从一开始就被初始化了，而这个例子当中 `textView` 需要等到 `Activity` 的 `onCreate` 调用之后才会初始化，因此 `lazy` 就显得非常必要了。具体实现就不一一列举了，有兴趣的朋友可以参考我的 GitHub 项目：[ObjectPropertyDelegate](https://github.com/enbandari/ObjectPropertyDelegate)，大家也可以通过引入 `com.bennyhuo.kotlin:delegates:1.0` 来直接使用它。

需要补充说明的一点是，根据 Kotlin 官方最新发布的博客来看，从 Kotlin 1.4-M2 开始会直接支持使用属性代理其他属性，例如：

```kotlin
[Kotlin]

class MyClass {
   var newName: Int = 0
   @Deprecated("Use 'newName' instead", ReplaceWith("newName"))
   var oldName: Int by this::newName
}
```

这实际上与我们前面使用属性代理其他属性问题的处理上如出一辙。其实这个写法只不过是为 `KProperty0<R>` 实现了 `getValue` 和 `setValue` 扩展，我们在 Kotlin 1.4 以前的版本自己就可以实现这样的效果，只需要添加以下扩展即可：

```kotlin
[Kotlin]

operator fun <R> KProperty0<R>.getValue(thisRef: Any, property: KProperty<*>): R {
    return get()
}

operator fun <R> KMutableProperty0<R>.setValue(thisRef: Any, property: KProperty<*>, value: R) {
    set(value)
}
```

这个用法实际上也进一步说明了 Kotlin 对属性代理类本身没有类型要求的好处，如果强制属性代理类实现某一个接口的话，那这个效果就只能通过修改 `KProperty0` 的继承结果来实现了。当然，官方给出的这个例子还直接展示了这个特性的一个使用场景，即属性重命名。

## Swift 的属性包装器（Property Wrapper）

Swift 的属性包装器其实就是属性代理，最早推出这个特性的时候实际上也叫做 Property Delegate，但设计者们觉得 Property Wrapper 更贴切它的实际用法和含义，加上 Delegate 这个词在 Swift 当中（或者说更早的 Objective-C 当中）已经有了非常确切的含义，因此改成了Property Wrapper。这个名字看上去确实比属性代理表达出来的意图更加明显。

大家也可以参考 [Swift 的属性包装器的设计文档](https://github.com/apple/swift-evolution/blob/master/proposals/0258-property-wrappers.md#user-defaults)，文档中详细列出了一些使用场景和方法，以及一些设计细节，这其中绝大多数的使用场景我们也可以通过 Kotlin 的属性代理在 Kotlin 当中实现。

这个特性在 Swift 5 才推出，可以说是非常晚了。说来也有趣，在它的设计文档中还特意 "diss" 了 Kotlin 的属性代理的语法设计：单独为了属性代理搞了一个 by 关键字实在是有些重，在其他场景下也不太好复用，于是 Swift 的属性包装器采用了与 Java/Kotlin 的注解类似的长相的设计。

### 代理 UserDefaults

`UserDefaults` 是苹果家族的平台上通用的类似于 SharedPreferences 的配置存储，也是 key-value 的形式进行读写，我们可以使用属性包装器来进行代理：

```swift
[Swift]

@propertyWrapper
struct UserDefault<T> {
    let key: String
    let defaultValue: T

    var wrappedValue: T {
        get {
            return UserDefaults.standard.object(forKey: key) as? T ?? defaultValue
        }
        set {
            UserDefaults.standard.set(newValue, forKey: key)
        }
    }
}
```

通过 `@PropertyWrapper` 将 `UserDefault` 声明为一个属性包装器，我们很自然想到要提供 getter 和 setter 的实现，Swift 通过 `wrappedValue` 这个计算属性来做到这一点，这样对于被包装的属性的访问其实就转发到对 `wrappedValue` 的访问上。用法也很直接：

```swift
[Swift]

enum GlobalSettings {
    @UserDefault(key: "FOO_FEATURE_ENABLED", defaultValue: false)
    static var isFooFeatureEnabled: Bool

    @UserDefault(key: "BAR_FEATURE_ENABLED", defaultValue: false)
    static var isBarFeatureEnabled: Bool
}
```

这个例子就是设计文档中的例子，大家可以在 Swift 5.2 当中运行测试。

稍微提一句，在 Swift 中，struct 是值类型，class 是引用类型，对于属性包装器来讲，二者都是可以的，用哪个取决于具体需求。

除了语法形式的不同之外，从功能上，Swift 的属性包装器的 wrappedValue 相当于 Kotlin 的属性代理的 `getValue` 和 `setValue` 的实现，不同之处在于 Kotlin 在 `getValue` 和 `setValue` 中提供了 `KProperty` 这个参数，我们可以通过它来获取对应属性的一些元信息，最常用的就是 name，所以我们在前面使用 Kotlin 代理 SharedPreferences 的例子当中完全可以不用主动传入 key 的值。

相比之下，Kotlin 的属性代理的语法更加自由，我们可以轻松地模拟 Swift 的写法来实现属性代理，主要以下是 Kotlin 代码：

```kotlin
[Kotlin]

interface PropertyWrapper<Value> {

    var wrappedValue: Value

    operator fun getValue(thisRef: Any?, property: KProperty<*>): Value = wrappedValue

    operator fun setValue(thisRef: Any?, property: KProperty<*>, value: Value) {
        wrappedValue = value
    }
}
```

按照这个思路，实现具体的属性代理，只需要实现这个接口并覆写即可：

```kotlin
[Kotlin]

class ObservableDelegate<Value>(
    initializedValue: Value,
    val changedListener: (previous: Value, current: Value) -> Unit
) : PropertyWrapper<Value> {
    override var wrappedValue: Value = initializedValue
        set(value) {
            val previous = field
            field = value
            changedListener(previous, value)
        }
}
```

用法没有什么特殊之处：

```kotlin
[Kotlin]

var state: Int by ObservableDelegate(0) { previous, current ->
    println("changed $previous -> $current")
}
state = 2 // changed 0 -> 2
state = 3 // changed 2 -> 3
state = 4 // changed 3 -> 4
```

### 属性包装器的 projectedValue

我是在学 Swift UI 的时候才开始接触到 Swift 的属性包装器的。Swift UI 就是使用 Swift 代码直接布局的写法，这种写法现在比较流行，例如 Flutter 的 Dart， Android 上之前的 Kotlin Anko 以及现在的 Compose。

我们来看一个简单的例子：

```swift
[Swift]

struct TestView: View {
    
    @State var isEnabled: Bool
    
    var body: some View {
        Toggle(isOn: $isEnabled) {
            isEnabled ? Text("Click to disable").foregroundColor(.red)
                : Text("Click to enable").foregroundColor(.green)
        }.padding()
    }
}
```

`body` 是布局的 View，里面只有一个控件就是一个开关 `Toggle`，它需要与 `isEnabled` 这个属性绑定，UI 的效果如下：

![](https://kotlinblog-1251218094.costj.myqcloud.com/9e300468-a645-433d-ae41-60b3eaa97f5a/media/2020-05-02-18-34-23.png)

**<center>isEnabled 为 false 时的 UI</center>**

![](https://kotlinblog-1251218094.costj.myqcloud.com/9e300468-a645-433d-ae41-60b3eaa97f5a/media/2020-05-02-18-34-42.png)

**<center>isEnabled 为 true 时的 UI</center>**

`isEnabled` 这个属性被 `State` 这个属性包装器包装，`State` 为它提供了一个 `projectedValue` 的属性，这个 `projectedValue` 可以通过 **`$` + 属性名** 来获取，也就是说作为 `Toggle` 的参数 `isOn` 的 `$isEnabled` 实际上就是 `isEnabled` 这个属性的包装器提供的 `projectValue`。

这个 `projectedValue` 实际上也是一个属性包装器，它的类型是 `Binding<Bool>`，`Binding` 这个属性包装器的作用比较直接，类似于我们前面介绍 Kotlin 的属性代理时提到的 `wrapped::x.delegator()`，它的作用就是提供了属性的 getter 和 setter，这样我们将 `Binding<Bool>` 对象传给 `Toggle` 的时候，它就可以在其中方便的修改 `isEnabled` 这个属性了。

`State` 当然还提供了与 View 的刷新机制相关的逻辑，它实现了 `DynamicProperty` 协议，可以在属性被修改时调用 `update` 方法来刷新 UI。

下面我们给出 `State` 的声明，具体实现没有开源，但可以想到的是在 `wrappedValue` 的 setter 调用时一定会触发 `DynamicProperty` 协议的 `update` 方法的调用，`projectedValue` 则是返回一个包装了被 `State` 包装的属性的 getter 和 setter 的对象：

```swift
[Swift]

@frozen @propertyWrapper public struct State<Value> : DynamicProperty {

    /// Initialize with the provided initial value.
    public init(wrappedValue value: Value)

    /// Initialize with the provided initial value.
    public init(initialValue value: Value)

    /// The current state value.
    public var wrappedValue: Value { get nonmutating set }

    /// Produces the binding referencing this state value
    public var projectedValue: Binding<Value> { get }
}
```

下面我们考虑下 Kotlin 当中是否存在对应的特性。

对于 `Binding` 的使用场景，Kotlin 当中大可不必这么大费周章，因为 Kotlin 的属性引用可以很方便的允许我们传递一个属性的 setter 和 getter，例如：

```kotlin
[Kotlin]

class View {
    var isEnabled: Boolean = false
}

// get property reference
val view = View()
val isEnabledRef = view::isEnabled

// operate on property reference
isEnabledRef.set(true)
println(isEnabledRef.get())
```

也就是说，Swift UI 当中的 `Binding` 在当中可以使用 Kotlin 的属性引用来替代，以上代码也不需要额外引入 Kotlin 反射。

但可以确定的是，Kotlin 当中没有 `projectedValue` 这样的特性，即便我们在前面模拟 Swift 声明的 `PropertyWrapper` 接口中添加这样的属性，我们也没有直接的类似于 `$isEnabled` 这样的语法来获取它。不仅如此，在 Kotlin 当中想要获取属性代理对象本身也不是一件轻松的事情，而在 Swift 当中我们可以使用 `projectedValue` 直接返回自身（也可以返回别的，例如 `State` 中就没有返回自己，而是返回了 `Binding`）：

```swift
[Swift]

@propertyWrapper
struct UserDefault<T> {
    let key: String
    let defaultValue: T

    var wrappedValue: T {
        ...
    }

    var projectedValue: UserDefault<T> {
        get { self }
    }
}

enum GlobalSettings {
    @UserDefault(key: "FOO_FEATURE_ENABLED", defaultValue: false)
    static var isFooFeatureEnabled: Bool

    @UserDefault(key: "BAR_FEATURE_ENABLED", defaultValue: false)
    static var isBarFeatureEnabled: Bool
}

// false
print(GlobalSettings.isBarFeatureEnabled) 

// UserDefault<Bool>(key: "BAR_FEATURE_ENABLED", defaultValue: false)
print(GlobalSettings.$isBarFeatureEnabled) 

// false
print(GlobalSettings.$isBarFeatureEnabled.wrappedValue) 

// UserDefault<Bool>(key: "BAR_FEATURE_ENABLED", defaultValue: false)
print(GlobalSettings.$isBarFeatureEnabled.projectedValue) 
```

实际上如果是在被包装的属性所在的类内部，我们还可以直接拿到包装属性的实例：

```swift
[Swift]

enum GlobalSettings {
    ...

    @UserDefault(key: "BAR_FEATURE_ENABLED", defaultValue: false)
    static var isBarFeatureEnabled: Bool

    static func getIsBarFeatureEnabledWrapper() -> UserDefault<Bool> {
        _isBarFeatureEnabled
    }
}
```

访问 `_isBarFeatureEnabled` 得到的就是包装 `isBarFeatureEnabled` 的实例。

而这在 Kotlin 当中我们就只能通过反射来做到这一点了。不知道大家是否注意到我们用 Kotlin 属性代理实现的 ReleasableVar 这个组件中用到了 Kotlin 反射方法 `getDelegate` 来获取属性代理对象，即便我们可以接受使用反射这个前提，但它返回的类型 `Any?` 也同样不如 Swift 当中可以通过 `$` 直接获取 `projectedValue` 以及通过 `_` 获取属性包装器实例来的直接和安全。更何况 `getDelegate` 这个反射方法目前只能在 JVM 上使用，无法实现多平台。

```kotlin
[Kotlin]

public actual interface KProperty0<out R> : KProperty<R>, () -> R {

    /**
     * Returns the value of the delegate if this is a delegated property, or `null` if this property is not delegated.
     */
    @SinceKotlin("1.1")
    public fun getDelegate(): Any?

    ...
}

```

当然，我们在 Kotlin 当中可以直接把属性代理对象先定义出来，就像下面这样：

```kotlin
[Kotlin]
val delegate = ObservableDelegate(0) { previous, current ->
    println("changed $previous -> $current")
}

var state by delegate
```

但这个写法又显得 `delegate` 与 `state` 的联系没有那么紧密，因此 Swift 的属性包装器在 `projectedValue` 的设计上为开发者提供了更大的发挥空间。

Kotlin 的规划和提议方面也暂时没有看到有类似的设计，如果我们想要在 Kotlin 当中也实现类似于 `projectedValue` 的功能，也许可以借助一下 Kotlin 编译器插件来完成。

## 小结

属性代理或者属性包装器本质上提供了把读写操作简化成对变量的读写的可能性，能够提供更大程度上的抽象，简化程序的代码重复度。

Kotlin 的属性代理的语法结构没有类型上的强制约束，只要实现 `getValue` 和 `setValue` 这两个方法即可用作属性代理的对象，没有实现接口的限制可以为已有的类型提供更多的扩展可能性；不过，获取一个属性的代理对象的方式不是特别友好，一方面需要使用到反射，另一方面获取到的类型是 `Any?`，没有静态类型的约束。

相比之下 Swift 的属性包装器提供了类似的能力，也通过提供 projectedValue 可以衍生出更多灵活的用法。


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

