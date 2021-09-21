# 破解 Kotlin 协程(8) - Android 篇 

**Kotlin 协程 Android Anko**

> Android 上面使用协程来替代回调或者 RxJava 实际上是一件非常轻松的事儿，我们甚至可以在更大的范围内结合 UI 的生命周期做控制协程的执行状态~

==  Kotlin|Coroutine|Android ==

本文涉及的 MainScope 以及 AutoDispose 源码：[kotlin-coroutines-android](https://github.com/enbandari/kotlin-coroutines-android)

## 1. 配置依赖

我们曾经提到过，如果在 Android 上做开发，那么我们需要引入

```gradle
implementation 'org.jetbrains.kotlinx:kotlinx-coroutines-android:$kotlin_coroutine_version'
```  

这个框架里面包含了 Android 专属的 `Dispatcher`，我们可以通过 `Dispatchers.Main` 来拿到这个实例；也包含了 `MainScope`，用于与 Android 作用域相结合。

~~Anko 也提供了一些比较方便的方法，例如 `onClick` 等等，如果需要，也可以引入它的依赖：~~（Anko 已经停止维护）

```gradle
//提供 onClick 类似的便捷的 listener，接收 suspend Lambda 表达式
implementation "org.jetbrains.anko:anko-sdk27-coroutines:$anko_version"
//提供 bg 、asReference，未跟进 kotlin 1.3 的正式版协程，不过代码比较简单，如果需要可以自己改造
implementation "org.jetbrains.anko:anko-coroutines:$anko_version"
```

简单来说：

* kotlinx-coroutines-android 这个框架是必选项，主要提供了专属调度器
* ~~anko-sdk27-coroutines 是可选项，提供了一些 UI 组件更为简洁的扩展，例如 onClick，但它也有自己的问题，我们后面详细探讨~~
* ~~anko-coroutines 仅供参考，未跟进 1.3 正式版协程，因此在 1.3 之后的版本中尽量不要使用，提供的两个方法都比较简单，如果需要，可自行改造使用。~~

协程的原理和用法我们已经探讨了很多了，关于 Android 上面的协程使用，我们就只给出几点实践的建议。

## 2. UI 生命周期作用域

Android 开发经常想到的一点就是让发出去的请求能够在当前 UI 或者 Activity 退出或者销毁的时候能够自动取消，我们在用 RxJava 的时候也有过各种各样的方案来解决这个问题。

### 2.1 使用 MainScope

协程有一个很天然的特性能刚够支持这一点，那就是作用域。官方也提供了 `MainScope` 这个函数，我们具体看下它的使用方法：

```kotlin
val mainScope = MainScope()
launchButton.setOnClickListener {
    mainScope.launch {
        log(1)
        textView.text = async(Dispatchers.IO) {
            log(2)
            delay(1000)
            log(3)
            "Hello1111"
        }.await()
        log(4)
    }
}
```

我们发现它其实与其他的 `CoroutineScope` 用起来没什么不一样的地方，通过同一个叫 `mainScope` 的实例启动的协程，都会遵循它的作用域定义，那么 `MainScope` 的定义时怎样的呢？

```kotlin
public fun MainScope(): CoroutineScope = ContextScope(SupervisorJob() + Dispatchers.Main)
```

原来就是 `SupervisorJob` 整合了 `Dispatchers.Main` 而已，它的异常传播是自上而下的，这一点与 `supervisorScope` 的行为一致，此外，作用域内的调度是基于 Android 主线程的调度器的，因此作用域内除非明确声明调度器，协程体都调度在主线程执行。因此上述示例的运行结果如下：

```
2019-04-29 06:51:00.657 D: [main] 1
2019-04-29 06:51:00.659 D: [DefaultDispatcher-worker-1] 2
2019-04-29 06:51:01.662 D: [DefaultDispatcher-worker-2] 3
2019-04-29 06:51:01.664 D: [main] 4
```

如果我们在触发前面的操作之后立即在其他位置触发作用域的取消，那么该作用域内的协程将不再继续执行：

```kotlin
val mainScope = MainScope()

launchButton.setOnClickListener {
    mainScope.launch {
        ...
    }
}

cancelButton.setOnClickListener {
    mainScope.cancel()
    log("MainScope is cancelled.")
}
```

如果我们快速依次点击上面的两个按钮，结果就显而易见了：

```
2019-04-29 07:12:20.625 D: [main] 1
2019-04-29 07:12:20.629 D: [DefaultDispatcher-worker-2] 2
2019-04-29 07:12:21.046 D: [main] MainScope is cancelled.
```

### 2.2 构造带有作用域的抽象 Activity

尽管我们前面体验了 `MainScope` 发现它可以很方便的控制所有它范围内的协程的取消，以及能够无缝将异步任务切回主线程，这都是我们想要的特性，不过写法上还是不够美观。

官方推荐我们定义一个抽象的 `Activity`，例如：

```kotlin
abstract class ScopedActivity: Activity(), CoroutineScope by MainScope(){
    override fun onDestroy() {
        super.onDestroy()
        cancel()
    }
}
```

这样在 `Activity` 退出的时候，对应的作用域就会被取消，所有在该 `Activity` 中发起的请求都会被取消掉。使用时，只需要继承这个抽象类即可：

```kotlin
class CoroutineActivity : ScopedActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_coroutine)
        launchButton.setOnClickListener {
            launch { // 直接调用 ScopedActivity 也就是 MainScope 的方法
                ...
            }
        }
    }
    
    suspend fun anotherOps() = coroutineScope {
        ...
    }
}
```

除了在当前 `Activity` 内部获得 `MainScope` 的能力外，还可以将这个 Scope 实例传递给其他需要的模块，例如 `Presenter` 通常也需要与 `Activity` 保持同样的生命周期，因此必要时也可以将该作用域传递过去：

```kotlin
class CoroutinePresenter(private val scope: CoroutineScope): CoroutineScope by scope{
    fun getUserData(){
        launch { ... }
    }
}
```

多数情况下，`Presenter` 的方法也会被 `Activity` 直接调用，因此也可以将 `Presenter` 的方法生命成 `suspend` 方法，然后用 `coroutineScope` 嵌套作用域，这样 `MainScope` 被取消后，嵌套的子作用域一样也会被取消，进而达到取消全部子协程的目的：

```kotlin
class CoroutinePresenter {
    suspend fun getUserData() = coroutineScope {
        launch { ... }
    }
}
```

### 2.3 更友好地为 Activity 提供作用域

抽象类很多时候会打破我们的继承体系，这对于开发体验的伤害还是很大的，因此我们是不是可以考虑构造一个接口，只要 `Activity` 实现这个接口就可以拥有作用域以及自动取消的能力呢？

首先我们定义一个接口：

```kotlin
interface ScopedActivity {
    val scope: CoroutineScope
}
```

我们有一个朴实的愿望就是希望实现这个接口就可以自动获得作用域，不过问题来了，这个 `scope` 成员要怎么实现呢？留给接口实现方的话显然不是很理想，自己实现吧，又碍于自己是个接口，因此我们只能这样处理：

```kotlin
interface MainScoped {
    companion object {
        internal val scopeMap = IdentityHashMap<MainScoped, MainScope>()
    }
    val mainScope: CoroutineScope
        get() = scopeMap[this as Activity]!!
}
```

接下来的事情就是在合适的实际去创建和取消对应的作用域了，我们接着定义两个方法：

```kotlin
interface MainScoped {
    ...
    fun createScope(){
        //或者改为 lazy 实现，即用到时再创建
        val activity = this as Activity
        scopeMap[activity] ?: MainScope().also { scopeMap[activity] = it }
    }

    fun destroyScope(){
        scopeMap.remove(this as Activity)?.cancel()
    }
}
```

因为我们需要 `Activity` 去实现这个接口，因此直接强转即可，当然如果考虑健壮性，可以做一些异常处理，这里作为示例仅提供核心实现。

接下来就是考虑在哪儿完成创建和取消呢？显然这件事儿用 `Application.ActivityLifecycleCallbacks` 最合适不过了：

```kotlin
class ActivityLifecycleCallbackImpl: Application.ActivityLifecycleCallbacks {
    ...
    override fun onActivityCreated(activity: Activity, savedInstanceState: Bundle?) {
        (activity as? MainScoped)?.createScope()
    }

    override fun onActivityDestroyed(activity: Activity) {
        (activity as? MainScoped)?.destroyScope()
    }
}
```

剩下的就是在 `Application` 里面注册一下这个监听了，这个大家都会，我就不给出代码了。

我们看下如何使用：

```kotlin
class CoroutineActivity : Activity(), MainScoped {
    override fun onCreate(savedInstanceState: Bundle?) {
        ...
        launchButton.setOnClickListener {            
            scope.launch {
                ...
            }
        }
    }
}
```

我们也可以增加一些有用的方法来简化这个操作：

```kotlin
interface MainScoped {
    ...
    fun <T> withScope(block: CoroutineScope.() -> T) = with(scope, block)
}
```

这样在 `Activity` 当中还可以这样写：

```kotlin
withScope {
    launch { ... }
}   
```

> 注意，示例当中用到了 `IdentityHashMap`，这表明对于 scope 的读写是非线程安全的，因此不要在其他线程试图去获取它的值，除非你引入第三方或者自己实现一个 `IdentityConcurrentHashMap`，即便如此，从设计上 `scope` 也不太应该在其他线程访问。

按照这个思路，我提供了一套更加完善的方案，不仅支持 `Activity` 还支持 support-fragment 版本在 25.1.0 以上的版本的 `Fragment`，并且类似于 Anko 提供了一些有用的基于 `MainScope` 的 listener 扩展，引入这个框架即可使用：

```gradle
api 'com.bennyhuo.kotlin:coroutines-android-mainscope:1.0'
```

### 2.4 Androidx 的协程支持

Android 官方对于协程的支持也是非常积极的。

KTX 为 Jetpack 的 Lifecycle 相关的组件都提供了已经绑定了生命周期的作用域供我们直接使用，添加 Lifecycle 相应的基础组件之后，再添加以下组件即可：

```kotlin
implementation "androidx.lifecycle:lifecycle-runtime-ktx:$ktx_version"
```

`lifecycle-runtime-ktx` 提供了 `LifecycleCoroutineScope` 类以及其获得方式，例如我们可以直接在 `MainActivity` 中使用 `lifecycleScope` 来获取这个实例：

```kotlin
class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        button.setOnClickListener {
            lifecycleScope.launch {
                ...// 执行协程体
            }
        }
    }
}
```

这当然是因为 `MainActivity` 的父类实现了 `LifecycleOwner` 这个接口，而 `lifecycleScope` 则正是它的扩展成员。

如果想要在 `ViewModel` 当中使用作用域，我们需要再添加以下依赖：

```kotlin
implementation "androidx.lifecycle:lifecycle-viewmodel-ktx:$ktx_version"
```

使用方法类似：

```kotlin
class MainViewModel : ViewModel() {
    fun fetchData() {
        viewModelScope.launch {
            ... // 执行协程体
        }
    }
}
```

`ViewModel` 的作用域会在它的 `clear` 函数调用时取消。

## 3. 谨慎使用 GlobalScope

### 3.1 GlobalScope 存在什么问题

我们之前做例子经常使用 `GlobalScope`，但 `GlobalScope` 不会继承外部作用域，因此大家使用时一定要注意，如果在使用了绑定生命周期的 `MainScope` 之后，内部再使用  `GlobalScope`  启动协程，意味着 `MainScope` 就不会起到应有的作用。

这里需要小心的是如果使用了一些没有依赖作用域的构造器，那么一定要小心。例如 Anko 当中的 `onClick` 扩展：

```kotlin
fun View.onClick(
        context: CoroutineContext = Dispatchers.Main,
        handler: suspend CoroutineScope.(v: View) -> Unit
) {
    setOnClickListener { v ->
        GlobalScope.launch(context, CoroutineStart.DEFAULT) {
            handler(v)
        }
    }
}
```

也许我们也就是图个方便，毕竟 `onClick` 写起来可比 `setOnClickListener` 要少很多字符，同时名称上看也更加有事件机制的味道，但隐藏的风险就是通过 `onClick` 启动的协程并不会随着 `Activity` 的销毁而被取消，其中的风险需要自己思考清楚。

当然，Anko 会这么做的根本原因在于 `OnClickListener` 根本拿不到有生命周期加持的作用域。不用 `GlobalScope` 就无法启动协程，怎么办？结合我们前面给出的例子，其实这个事儿完全有别的解法：

```kotlin
interface MainScoped {
    ...
    fun View.onClickSuspend(handler: suspend CoroutineScope.(v: View) -> Unit) {
        setOnClickListener { v ->
            scope.launch {   handler(v)   }
        }
    }
}
```

我们在前面定义的 `MainScoped` 接口中，可以通过 `scope` 拿到有生命周期加持的 `MainScope` 实例，那么直接用它启动协程来运行 `OnClickListener` 问题不就解决了嘛。所以这里的关键点在于如何拿到作用域。

这样的 listener 我已经为大家在框架中定义好啦，请参见 2.3。

当然，如果项目已经集成了 AndroidX，还是更加推荐大家直接使用官方的作用域扩展。另外需要注意的是，Anko 已经停止维护，不再建议使用了。

### 3.2 协程版 AutoDisposable

当然除了直接使用一个合适的作用域来启动协程之外，我们还有别的办法来确保协程及时被取消。

大家一定用过 RxJava，也一定知道用 RxJava 发了个任务，任务还没结束页面就被关闭了，如果任务迟迟不回来，页面就会被泄露；如果任务后面回来了，执行回调更新 UI 的时候也会大概率空指针。

因此大家一定会用到 Uber 的开源框架 [AutoDispose](https://github.com/uber/AutoDispose)。它其实就是利用 `View` 的 `OnAttachStateChangeListener` ，当 `View` 被拿下的时候，我们就取消所有之前用 RxJava 发出去的请求。

```java
  static final class Listener extends MainThreadDisposable implements View.OnAttachStateChangeListener {
    private final View view;
    private final CompletableObserver observer;

    Listener(View view, CompletableObserver observer) {
      this.view = view;
      this.observer = observer;
    }

    @Override public void onViewAttachedToWindow(View v) { }

    @Override public void onViewDetachedFromWindow(View v) {
      if (!isDisposed()) {
      //看到没看到没看到没？
        observer.onComplete();
      }
    }

    @Override protected void onDispose() {
      view.removeOnAttachStateChangeListener(this);
    }
  }
```

考虑到前面提到的 Anko 扩展 `onClick` 无法取消协程的问题，我们也可以搞一个 `onClickAutoDisposable`。

```kotlin
fun View.onClickAutoDisposable (
        context: CoroutineContext = Dispatchers.Main,
        handler: suspend CoroutineScope.(v: View) -> Unit
) {
    setOnClickListener { v ->
        GlobalScope.launch(context, CoroutineStart.DEFAULT) {
            handler(v)
        }.asAutoDisposable(v)
    }
}
```

我们知道 `launch` 会启动一个 `Job`，因此我们可以通过 `asAutoDisposable` 来将其转换成支持自动取消的类型：

```kotlin
fun Job.asAutoDisposable(view: View) = AutoDisposableJob(view, this)
```

那么 `AutoDisposableJob` 的实现只要参考 AutoDisposable 的实现依样画葫芦就好了 ：

```kotlin
class AutoDisposableJob(private val view: View, private val wrapped: Job)
    //我们实现了 Job 这个接口，但没有直接实现它的方法，而是用 wrapped 这个成员去代理这个接口
     : Job by wrapped, OnAttachStateChangeListener {
    override fun onViewAttachedToWindow(v: View?) = Unit

    override fun onViewDetachedFromWindow(v: View?) {
        //当 View 被移除的时候，取消协程
        cancel()
        view.removeOnAttachStateChangeListener(this)
    }

    private fun isViewAttached() =
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT && view.isAttachedToWindow || view.windowToken != null

    init {
        if(isViewAttached()) {
            view.addOnAttachStateChangeListener(this)
        } else {
            cancel()
        }

        //协程执行完毕时要及时移除 listener 免得造成泄露
        invokeOnCompletion() {
            view.removeOnAttachStateChangeListener(this)
        }
    }
}
```

这样的话，我们就可以使用这个扩展了：

```kotlin
button.onClickAutoDisposable{
    try {
        val req = Request()
        val resp = async { sendRequest(req) }.await()
        updateUI(resp)
    } catch (e: Exception) {
        e.printStackTrace()
    }
}
```
当 `button` 这个对象从 window 上撤下来的时候，我们的协程就会收到 cancel 的指令，尽管这种情况下协程的执行不会跟随 `Activity` 的 `onDestroy` 而取消，但它与 `View` 的点击事件紧密结合，即便 `Activity` 没有被销毁，`View` 本身被移除时也会直接将监听中的协程取消掉。


如果大家想要用这个扩展，我已经帮大家放到 jcenter 啦，直接使用：

```gradle
api "com.bennyhuo.kotlin:coroutines-android-autodisposable:1.0"
```

添加到依赖当中即可使用。


## 4. 合理使用调度器

在 Android 上使用协程，更多的就是简化异步逻辑的写法，使用场景更多与 RxJava 类似。在使用 RxJava 的时候，我就发现有不少开发者仅仅用到了它的切线程的功能，而且由于本身 RxJava 切线程 API 简单易用，还会造成很多无脑线程切换的操作，这样实际上是不好的。那么使用协程就更要注意这个问题了，因为协程切换线程的方式被 RxJava 更简洁，更透明，本来这是好事情，就怕被滥用。

比较推荐的写法是，绝大多数 UI 逻辑在 UI 线程中处理，即使在 UI 中用 `Dispatchers.Main` 来启动协程，如果涉及到一些 io 操作，使用 `async` 将其调度到 `Dispatchers.IO` 上，结果返回时协程会帮我们切回到主线程——这非常类似 Nodejs 这样的单线程的工作模式。

对于一些 UI 不相关的逻辑，例如批量离线数据下载任务，通常默认的调度器就足够使用了。

## 5. 小结

这一篇文章，主要是基于我们前面讲了的理论知识，进一步往 Android 的具体实战角度迁移，相比其他类型的应用，Android 作为 UI 程序最大的特点就是异步要协调好 UI 的生命周期，协程也不例外。一旦我们把协程的作用域规则以及协程与 UI 生命周期的关系熟稔于心，那么相信大家使用协程时一定会得心应手的。




