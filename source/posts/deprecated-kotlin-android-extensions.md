# 要再见了吗，Kotlin Android Extension 

**Kotlin 1.4 KAE**

> 伴随了我们这么多年的 KAE，就这么要离开我们了？

== Kotlin|Android|News ==

> 本文假定大家了解 KAE（Kotlin Android Extensions）。

前几天看到邮件说 [Kotlin 1.4.20-M2](https://github.com/JetBrains/kotlin/releases/tag/v1.4.20-M2) 发布了，于是打开看了看更新，发现有个新的用于 Parcelize 的插件。要知道这个功能一直都是集成在 KAE 当中的，那 KAE 呢？

紧接着我们就可以看到一行：[Deprecate Kotlin Android Extensions compiler plugin](https://youtrack.jetbrains.com/issue/KT-42121)。

![](https://kotlinblog-1251218094.costj.myqcloud.com/9e300468-a645-433d-ae41-60b3eaa97f5a/media/2020-11-05-15-18-42.png)

说实话，直接废弃，我还是有些意外的。毕竟这个插件在早期为 Kotlin 攻城略地快速吸引 Android 开发者立下了汗马功劳，多年来虽然几乎没有功能更新，但直到现在仍然能够胜任绝大多数场景。

非要说废弃的理由，确实也能罗列几个出来。为了方便，我们把以 layout 当中 View 的 id 为名而合成的属性简称**合成的属性**。

## 销毁之后的空指针

KAE 是通过在字节码层面添加合成属性来解决 findViewById 的问题的，对于 Activity 和 Fragment 而言，合成的属性背后其实就是一个缓存，这个缓存会在 Activity 的 onDestroy、Fragment 的 onDestroyView 的时候清空。所以每次访问合成的属性，其实只有第一次是调用 findViewById，之后就是一个查缓存的过程。

这个设计很合理，不过也不免有些危险存在。主要是在 Fragment 当中，如果不小心在 onDestroyView 调用之后访问了这些合成的属性，就会抛一个空指针异常，因为此时缓存已经被清空，而 Fragment 的 View 也被置为 null 了。

```kotlin
...
import kotlinx.android.synthetic.main.activity_main.*

class MainFragment : Fragment() {
    ...

    override fun onDestroyView() {
        super.onDestroyView()

        textView.text = "Crash!"
    }
}
```

必须说明的一点是，这里抛空指针是合理的，毕竟 Fragment 的 View 的生命周期已经结束了，不过生产实践当中很多时候不是一句“合理”就能解决问题的，我们要的更多的是给老板减少损失。这里如果 textView 仍然可以访问，它不过是修改了一下文字而已，不会有其他副作用，但恰恰因为 KAE 这里严格的遵守了生命周期的变化清空了缓存，却又没有办法阻止开发者继续访问这个合成属性而导致空指针。对比而言，如果我们直接使用 findViewById，情况可能是下面这样：

```kotlin
lateinit var textView: TextView

override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
    super.onViewCreated(view, savedInstanceState)
    textView = view.findViewById(R.id.textView)
}

override fun onDestroyView() {
    super.onDestroyView()

    textView.text = "Nothing happened."
}
```

这样的代码虽然看上去不怎么高明，但它至少不会 Crash。

Kotlin 一向追求代码的安全性，而且希望在编译时就把代码运行时可能产生的问题尽可能地暴露出来。在很多场景下 Kotlin 确实做得很好，然而 KAE 并没有做到这一点。

就这个具体的问题而言，倒也很容易解决，现在 Android 当中已经有了足够多的生命周期管理工具，我们能够很好的避免在 Fragment 或者 Activity 的生命周期结束之后还要执行一些相关的操作。例如使用 ```lifecycleScope.launchWhenResumed{ ... }``` 就能很好的解决这个问题。

这么看来，这一点似乎不算是 KAE 本身的缺陷。难道是我们要求太高了？不，降低标准的事儿我们是绝不会做的，Kotlin 官方这么多年都没有解决这个问题，快出来挨打 （╬￣皿￣）＝○＃（￣＃）３￣） 。

## 张冠李戴

由于合成的属性只能从 Receiver 的类型上做限制，无法确定对应的 View、Activity、Fragment 当中是否真实存在这个合成的属性对应 id 的 View，因此也存在访问安全性上的隐患。

例如我当前的 Activity 的 layout 是 activity_main.xml，其中并未定义 id 为 textView 的 View，然而下面的写法却不会在编译时报错：

```kotlin
import kotlinx.android.synthetic.main.fragment_main.*

...

textView.text = "MainActivity"
```

编译时高高兴兴，运行时就要垂头丧气了，因为 findViewById 一定会返回 null，而合成的属性又不是可空类型。

这个问题从现有的 KAE 的思路上来看，确实不太好解决，不过从多年的实践来看，这也许都算不上是一个问题，至少我用了快 5 年 KAE，只有偶尔几次写错 id 以外，多数情况下不会出现此类问题。这个问题确实算是一个缺陷，但它的影响实在是有限。

## 冲突的 ID

还有一个问题就是命名空间的问题。合成的属性从导包的形式上来看，像是以 layout 的文件名加上固定的前缀合成的包下的顶级属性，一旦这个包被导入，当前的整个文件当中都可以使用 View、Activity、Fragment 来访问这些合成的属性，这就及其容易导致命名空间冲突的问题。

为了说明问题，我们创建两个完全相同的 layout，分别命名为 view_tips.xml 和 view_warning.xml，里面只是简单的包含一个 id 为 textView 的 TextView

```xml
<?xml version="1.0" encoding="utf-8"?>
<androidx.constraintlayout.widget.ConstraintLayout xmlns:android="http://schemas.android.com/apk/res/android"
  xmlns:app="http://schemas.android.com/apk/res-auto"
  android:layout_width="match_parent"
  android:layout_height="match_parent">

  <TextView
    android:id="@+id/textView"
    android:layout_width="wrap_content"
    android:layout_height="wrap_content"
    app:layout_constraintBottom_toBottomOf="parent"
    app:layout_constraintLeft_toLeftOf="parent"
    app:layout_constraintRight_toRightOf="parent"
    app:layout_constraintTop_toTopOf="parent" />
</androidx.constraintlayout.widget.ConstraintLayout>
```

然后在 Activity 或者 Fragment 当中加载这两个 layout：

```kotlin
val tipsView = View.inflate(view.context, R.layout.view_tips, null)
val warningView = View.inflate(view.context, R.layout.view_warning, null)

tipsView.textView.text = "Tips"
warningView.textView.text = "Warning"

... // 添加到对应的父 View 当中
```

那么这时候我们就要面临一个导包的问题，tipsView 和 warningView 访问的合成属性可能来自于以下两个包：

```kotlin
kotlinx.android.synthetic.main.view_tips.view.*
kotlinx.android.synthetic.main.view_warning.view.*
```

我们当然可以把二者一并导入，但问题在于二者即便如此，合成的属性在编译时静态绑定也只能绑定到一个包下面的合成属性下，这样的结果就是我们在 Android Studio 当中点击 warningView.textView 可能会跳转到 view_tips 这个 layout 当中。

![image-20201107095613833](https://kotlinblog-1251218094.costj.myqcloud.com/9e300468-a645-433d-ae41-60b3eaa97f5a/media/image-20201107095613833.png)

运行时会不会有问题呢？那倒不至于，因为你始终记住合成属性在运行时会替换成 findViewById 就可以了，只要 findViewById 不出问题，那合成属性自然也不存在问题。从生成的字节码来看，`warningView.textView` 其实就等价于 `warningView.findViewById(R.id.textView)`：

```asm
ALOAD 4
DUP
LDC "warningView"
GETSTATIC com/bennyhuo/helloandroid/R$id.textView : I
INVOKEVIRTUAL android/view/View.findViewById (I)Landroid/view/View;
CHECKCAST android/widget/TextView
```

所以这个问题本质上影响的是开发体验。出现冲突，一方面可能是类文件太大，包含的 UI 逻辑过多，导致引入过多的 layout，从而产生冲突；另一方面也可能是布局上拆分得太小，一个视图的逻辑类当中不得不引入大量的 layout 导致冲突。通过合理的设计 UI 相关的类，这个问题本身也可以很好的规避。

另外，如果语言本身支持把包名作为命名空间，在代码访问时直接予以限定，一样可以达到目的。按照现有的语法特性，如果合成的属性是在一个 object 当中定义：

```kotlin
object ViewTipsLayout {

  val View.textView: TextView
    get() = findViewById(R.id.textView)

}

object ViewWarningLayout {

  val View.textView: TextView
    get() = findViewById(R.id.textView)

}
```

那么使用的时候如果产生 id 冲突，就可以这样：

```kotlin
with(ViewTipsLayout) {
  tipsView.textView.text = "Tips"
}

with(ViewWarningLayout) {
  warningView.textView.text = "Warning"
}
```

当然，这只是我们的设想了。毕竟都要废弃了。

## 不支持 Compose

去年的时候 Anko 就被废弃了，这么想来，KAE 能苟活这么久大概是因为根本不怎么需要维护吧？在这里提 Anko 到不是为了嘲讽，Anko 虽然离开了我们，可 Anko 所倡导的 DSL 布局的精神却留了下来，也就是 Jetpack 当中仍然处于 Alpha 状态（怎么都是 Alpha，难道这么久了还不配有个 Beta 吗）的 Compose 了。

Anko Layout 不算成功，主要原因还是开发成本的问题。预览要等编译，编译又要很久，这简直了，谁用谁知道。隔壁家的 SwiftUI 就做得很好，说明鱼和熊掌还是可以兼得的，所以我看好 Compose，就看 Android 还能活几年，能不能等到那个时候了（哈哈哈，开玩笑）。

Kotlin 最近一直在推 KMM，大家都在猜 Kotlin 官方会不会搞一个 React Kotlin Native 或者 Klutter 出来，结果最近我们就看到 JetBrains 的 GitHub 下一个叫 [skiko](https://github.com/JetBrains/skiko) 的框架非常活跃，它是基于 Kotlin 多平台特性封装的 Skia 的 API（Flutter：喵喵喵？？）。还有一个就是 [compose-jb](https://github.com/JetBrains/compose-jb) 了，我粗略看了下，目前已经把 Compose 移植到了桌面上，支持了 Windows、Linux、macOS，也不知道 iOS 被安排了没有（真实司马昭之心啊）。所以 Compose 已经不再是 Android 的了，它是大家的。

对于 Compose 而言，KAE 一点儿用都没有，因为人家根本不需要做 View 绑定好不好。

> KAE：我这么优秀！
>
> Compose：你给我让开！

## 使用 ViewBinding 作为替代方案

那么问题来了，KAE 废弃之后会怎么样呢？按照链接当中的说明来看，废弃之后仍然可以使用，但会有一个警告；当然，出现问题官方也不会再修复了，更不会有新功能。

![](https://kotlinblog-1251218094.costj.myqcloud.com/9e300468-a645-433d-ae41-60b3eaa97f5a/media/2020-11-01-08-16-09.png)

Kotlin 官方建议开发者使用 Android 的 [View Binding](https://developer.android.com/topic/libraries/view-binding) 来解决此类场景的问题。客观的讲 View Binding 确实能解决前面提到的几个 KAE 存在的问题，但 View Binding 的写法上也会略显啰嗦：

```kotlin
private var _binding: ResultProfileBinding? = null
// This property is only valid between onCreateView and
// onDestroyView.
private val binding get() = _binding!!

override fun onCreateView(
    inflater: LayoutInflater,
    container: ViewGroup?,
    savedInstanceState: Bundle?
): View? {
    _binding = ResultProfileBinding.inflate(inflater, container, false)
    val view = binding.root
    return view
}

override fun onDestroyView() {
    super.onDestroyView()
    _binding = null
}
```

访问 View 时：

```kotlin
binding.name.text = viewModel.name
binding.button.setOnClickListener { viewModel.userClicked() }
```

相比之下，KAE 解决了 findViewById 的类型安全和访问繁琐的问题；而 View Binding 则在此基础上又解决了空安全的问题。

我看到在废弃 KAE 的讨论中，大家还是觉得废弃有些难以理解，毕竟之前你也没怎么管这个插件啊，这么多年了除了加了个 Parcelize 的功能以外，也没怎么着啊。不过历史的车轮总是在往前滚（(ノ｀Д)ノ）的嘛，Kotlin 官方这么急着废弃 KAE，也许就是要为 View Binding 让路，JetBrains 现在和 Google 穿一条裤子，谁知道他们是不是有什么对未来的美（si）好（xia）规（jiao）划（yi）呢？哈哈，玩笑啦。

其实 View Binding 除了写起来多了几行代码以外，别的倒也没什么大毛病。而写法复杂这个嘛，其实说来也简单，我们稍微封装一下不就行了么？

```kotlin
abstract class ViewBindingFragment<T: ViewBinding>: Fragment() {

    private var _binding: T? = null

    val binding: T
        get() = _binding!!

    abstract fun onCreateBinding(inflater: LayoutInflater,
                                 container: ViewGroup?,
                                 savedInstanceState: Bundle?): T
    abstract fun T.onViewCreated()

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return onCreateBinding(inflater, container, savedInstanceState).also {
            _binding = it
        }.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        binding.onViewCreated()
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
```

这样用的时候直接继承这个类就好了：

```kotlin
class MainFragment : ViewBindingFragment<FragmentMainBinding>() {

    override fun onCreateBinding(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): FragmentMainBinding {
        return FragmentMainBinding.inflate(inflater, container, false)
    }

    override fun FragmentMainBinding.onViewCreated() {
        textView.text = "MainFragment"
        textView.setOnClickListener {
            Toast.makeText(requireContext(), "Clicked.", Toast.LENGTH_SHORT).show()
        }
    }
}
```

这个也就是我随手那么一写，肯定算不上完美，但至少说明 View Binding 的写法一样可以做到很简洁。

## 小结

KAE 本质上就是通过编译期生成字节码的方式为 Activity、Fragment、View 提供了以 xml 布局中的 id 为名的合成属性，从而简化使用 findViewById 来实现 View 绑定的一个插件。

相比之下，KAE 比 findViewById 本身提供了更简便的 View 绑定方式，也保证了 View 的类型安全，但却无法保证 View 的空安全 —— 而这些问题都在 ViewBinding 当中得到了解决。

不管怎样，KAE 被废弃是没什么悬念了，它曾经一度填补了 Android 开发体验上的空缺，也曾经一度受到追捧和质疑，更曾是 Kotlin 早期吸引 Android 开发者的一把利器，现在终于完成了它自己的历史任务。

再见，KAE。