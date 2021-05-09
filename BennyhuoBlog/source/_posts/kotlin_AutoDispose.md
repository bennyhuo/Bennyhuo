---
title: Kotlin 协程版的 AutoDispose
date: 2019/01/07
tags:
  - Kotlin
  - Coroutine
  - Android
---

大家一定用过 RxJava，也一定知道用 RxJava 发了个任务，任务还没结束页面就被关闭了，如果任务迟迟不回来，页面就会被泄露；如果任务后面回来了，执行回调更新 UI 的时候也会大概率空指针。

因此大家一定会用到 Uber 的开源框架 [AutoDispose](https://github.com/uber/AutoDispose)。

<!--more-->

什么？你说你没用？好吧，那就没用吧。。我是不会介绍它的。⊙﹏⊙|||。怎么可能。(～￣▽￣)～。。它其实就是利用 `View` 的 `OnAttachStateChangeListener` ，当 `View` 被拿下的时候，我们就取消所有之前用 RxJava 发出去的请求。

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

好了，我最近在想我们用协程其实也会有这样的问题呀：

```kotlin
button.onClick {
    try {
        val req = Request()
        val resp = async { sendRequest(req) }.await()
        updateUI(resp)
    } catch (e: Exception) {
        e.printStackTrace()
    }
}
```

如果 `await` 返回结果之前我们就退出了当前的 `Activity` 那么，后面 `updateUI` 就要凉凉。这就尴尬了。不过问题不大，照猫画虎谁不会，我们也可以搞一个 `onClickAutoDisposable` 嘛。

```kotlin
fun View.onClickAutoDisposable (
        context: CoroutineContext = Dispatchers.Main,
        handler: suspend CoroutineScope.(v: android.view.View?) -> Unit
) {
    setOnClickListener { v ->
        GlobalScope.launch(context, CoroutineStart.DEFAULT) {
            handler(v)
        }.asAutoDisposable(v)
    }
}
```

第一步，不要脸的先抄 Anko 的 `onClick`，不同之处在于我们改了个名 XD。啊，还有我们加了个 `.asAutoDisposable(v)`，大家就假装有这个方法吧。。。

> (╬￣皿￣)=○ 假装个头啊，假装就完成功能的话还要程序员干什么。。让产品假装一下不就行了。。

OK OK，咱们下面来实现它。。想想，`GlobalScope.launch` 其实返回的是一个 `Job`，所以嘛，我们给 `Job` 搞一个扩展方法不就得了。

```kotlin
fun Job.asAutoDisposable(view: View) = AutoDisposableJob(view, this)
```

第二步，我们再偷偷的创建一个类，叫 `AutoDisposableJob`，抄一下前面的 `Listener`：

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
当 `button` 这个对象从 window 上撤下来的时候，我们的协程就会收到 cancel 的指令。




