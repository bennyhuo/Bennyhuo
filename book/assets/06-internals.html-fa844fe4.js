import{_ as t,W as p,X as c,Y as n,$ as a,Z as e,a0 as o,C as l}from"./framework-88b7ff58.js";const i={},u=o(`<h1 id="_6-制裁-我自己私有的-api-你们怎么随便一个人都想用" tabindex="-1"><a class="header-anchor" href="#_6-制裁-我自己私有的-api-你们怎么随便一个人都想用" aria-hidden="true">#</a> 6. 制裁！我自己私有的 API 你们怎么随便一个人都想用？</h1><blockquote><p>说实话，我们总是用人家 JDK 的内部 API，是不是有点儿欺负人。</p></blockquote><p>今天我们来聊聊 <strong>JEP 403: Strongly Encapsulate JDK Internals</strong>。这一条对于使用 JDK 内部 API 的应用场景来讲会比较受影响。</p><p>JDK 的动作还是很慢的，它给开发者提供了相当长的过渡期。从 Java 9 引入模块化开始，JDK 对于其内部的 API 的访问限制就已经明确开始落地，只是当时我们可以通过配置启动参数 --illegal-access 来继续使用 JDK 的内部 API，其中 Java 9 - Java 15 这个参数默认 permit，Java 16 默认 deny。</p><p><img src="https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates-06-internals/0B223765.jpg" alt=""></p><p>不过，现在不可以了。在 Java 17 当中使用 --illegal-access 将会得到以下警告，并且没有任何效果：</p><div class="language-text line-numbers-mode" data-ext="text"><pre class="language-text"><code>Java HotSpot(TM) 64-Bit Server VM warning: Ignoring option --illegal-access=permit; support was removed in 17.0
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div></div></div><p>按照提案的说明，被严格限制的这些内部 API 包括：</p><ul><li>java.* 包下面的部分非 public 类、方法、属性，例如 Classloader 当中的 defineClass 等等。</li><li>sun.* 下的所有类及其成员都是内部 API。</li><li>绝大多数 com.sun.* 、 jdk.* 、org.* 包下面的类及其成员也是内部 API。</li></ul><p>举个例子：</p><div class="language-java line-numbers-mode" data-ext="java"><pre class="language-java"><code><span class="token keyword">package</span> <span class="token namespace">com<span class="token punctuation">.</span>sun<span class="token punctuation">.</span>beans</span><span class="token punctuation">;</span>

<span class="token punctuation">.</span><span class="token punctuation">.</span><span class="token punctuation">.</span>
<span class="token keyword">public</span> <span class="token keyword">final</span> <span class="token keyword">class</span> <span class="token class-name">WeakCache</span><span class="token generics"><span class="token punctuation">&lt;</span><span class="token class-name">K</span><span class="token punctuation">,</span> <span class="token class-name">V</span><span class="token punctuation">&gt;</span></span> <span class="token punctuation">{</span>
    <span class="token keyword">private</span> <span class="token keyword">final</span> <span class="token class-name">Map</span><span class="token generics"><span class="token punctuation">&lt;</span><span class="token class-name">K</span><span class="token punctuation">,</span> <span class="token class-name">Reference</span><span class="token punctuation">&lt;</span><span class="token class-name">V</span><span class="token punctuation">&gt;</span><span class="token punctuation">&gt;</span></span> map <span class="token operator">=</span> <span class="token keyword">new</span> <span class="token class-name">WeakHashMap</span><span class="token generics"><span class="token punctuation">&lt;</span><span class="token class-name">K</span><span class="token punctuation">,</span> <span class="token class-name">Reference</span><span class="token punctuation">&lt;</span><span class="token class-name">V</span><span class="token punctuation">&gt;</span><span class="token punctuation">&gt;</span></span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

    <span class="token keyword">public</span> <span class="token class-name">V</span> <span class="token function">get</span><span class="token punctuation">(</span><span class="token class-name">K</span> key<span class="token punctuation">)</span> <span class="token punctuation">{</span> <span class="token punctuation">.</span><span class="token punctuation">.</span><span class="token punctuation">.</span> <span class="token punctuation">}</span>

    <span class="token keyword">public</span> <span class="token keyword">void</span> <span class="token function">put</span><span class="token punctuation">(</span><span class="token class-name">K</span> key<span class="token punctuation">,</span> <span class="token class-name">V</span> value<span class="token punctuation">)</span> <span class="token punctuation">{</span> <span class="token punctuation">.</span><span class="token punctuation">.</span><span class="token punctuation">.</span> <span class="token punctuation">}</span>
	<span class="token punctuation">.</span><span class="token punctuation">.</span><span class="token punctuation">.</span>
<span class="token punctuation">}</span>

</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>在 java.desktop 模块下有这么一个类，非常简单，就是对 WeakHashMap 做了个包装。我想要用一下它，我该怎么办呢？</p><p>复制一份到我的工程里面。</p><p><img src="https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates/738DD603.png" alt=""></p><p>不是，不是。。。优秀的程序员不应该 CV 代码。。。所以我直接使用它。</p><p><img src="https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates/image-20210921083515465.png" alt=""></p><p>啊，不行。那我可以反射呀~ 我可真是个小机灵鬼。这波反射下来真是无人能敌。</p><div class="language-java line-numbers-mode" data-ext="java"><pre class="language-java"><code><span class="token keyword">try</span> <span class="token punctuation">{</span>
    <span class="token keyword">var</span> weakCacheClass <span class="token operator">=</span> <span class="token class-name">Class</span><span class="token punctuation">.</span><span class="token function">forName</span><span class="token punctuation">(</span><span class="token string">&quot;com.sun.beans.WeakCache&quot;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token keyword">var</span> weakCache <span class="token operator">=</span> weakCacheClass<span class="token punctuation">.</span><span class="token function">getDeclaredConstructor</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">.</span><span class="token function">newInstance</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token keyword">var</span> putMethod <span class="token operator">=</span> weakCacheClass<span class="token punctuation">.</span><span class="token function">getDeclaredMethod</span><span class="token punctuation">(</span><span class="token string">&quot;put&quot;</span><span class="token punctuation">,</span> <span class="token class-name">Object</span><span class="token punctuation">.</span><span class="token keyword">class</span><span class="token punctuation">,</span> <span class="token class-name">Object</span><span class="token punctuation">.</span><span class="token keyword">class</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token keyword">var</span> getMethod <span class="token operator">=</span> weakCacheClass<span class="token punctuation">.</span><span class="token function">getDeclaredMethod</span><span class="token punctuation">(</span><span class="token string">&quot;get&quot;</span><span class="token punctuation">,</span> <span class="token class-name">Object</span><span class="token punctuation">.</span><span class="token keyword">class</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    putMethod<span class="token punctuation">.</span><span class="token function">invoke</span><span class="token punctuation">(</span>weakCache<span class="token punctuation">,</span> <span class="token string">&quot;name&quot;</span><span class="token punctuation">,</span> <span class="token string">&quot;bennyhuo&quot;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token class-name">System</span><span class="token punctuation">.</span>out<span class="token punctuation">.</span><span class="token function">println</span><span class="token punctuation">(</span>getMethod<span class="token punctuation">.</span><span class="token function">invoke</span><span class="token punctuation">(</span>weakCache<span class="token punctuation">,</span> <span class="token string">&quot;name&quot;</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">}</span> <span class="token keyword">catch</span> <span class="token punctuation">(</span><span class="token class-name">Exception</span> e<span class="token punctuation">)</span> <span class="token punctuation">{</span>
    e<span class="token punctuation">.</span><span class="token function">printStackTrace</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">}</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p><img src="https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates/7352D343.gif" alt=""></p><p>满怀欣喜的运行它。。。</p><div class="language-java line-numbers-mode" data-ext="java"><pre class="language-java"><code><span class="token class-name"><span class="token namespace">java<span class="token punctuation">.</span>lang<span class="token punctuation">.</span></span>IllegalAccessException</span><span class="token operator">:</span> <span class="token keyword">class</span> <span class="token class-name"><span class="token namespace">com<span class="token punctuation">.</span>bennyhuo<span class="token punctuation">.</span>java17<span class="token punctuation">.</span></span>ReflectionsInternal</span> cannot access <span class="token keyword">class</span> <span class="token class-name"><span class="token namespace">com<span class="token punctuation">.</span>sun<span class="token punctuation">.</span>beans<span class="token punctuation">.</span></span>WeakCache</span> <span class="token punctuation">(</span>in <span class="token keyword">module</span> <span class="token namespace">java<span class="token punctuation">.</span>desktop</span><span class="token punctuation">)</span> because <span class="token keyword">module</span> <span class="token namespace">java<span class="token punctuation">.</span>desktop</span> does not export com<span class="token punctuation">.</span>sun<span class="token punctuation">.</span>beans <span class="token keyword">to</span> <span class="token namespace">unnamed</span> <span class="token keyword">module</span> <span class="token annotation punctuation">@776ec8df</span>
	at java<span class="token punctuation">.</span>base<span class="token operator">/</span><span class="token class-name"><span class="token namespace">jdk<span class="token punctuation">.</span>internal<span class="token punctuation">.</span>reflect<span class="token punctuation">.</span></span>Reflection</span><span class="token punctuation">.</span><span class="token function">newIllegalAccessException</span><span class="token punctuation">(</span><span class="token class-name">Reflection</span><span class="token punctuation">.</span>java<span class="token operator">:</span><span class="token number">392</span><span class="token punctuation">)</span>
	at java<span class="token punctuation">.</span>base<span class="token operator">/</span><span class="token class-name"><span class="token namespace">java<span class="token punctuation">.</span>lang<span class="token punctuation">.</span>reflect<span class="token punctuation">.</span></span>AccessibleObject</span><span class="token punctuation">.</span><span class="token function">checkAccess</span><span class="token punctuation">(</span><span class="token class-name">AccessibleObject</span><span class="token punctuation">.</span>java<span class="token operator">:</span><span class="token number">674</span><span class="token punctuation">)</span>
	at java<span class="token punctuation">.</span>base<span class="token operator">/</span><span class="token class-name"><span class="token namespace">java<span class="token punctuation">.</span>lang<span class="token punctuation">.</span>reflect<span class="token punctuation">.</span></span>Constructor</span><span class="token punctuation">.</span><span class="token function">newInstanceWithCaller</span><span class="token punctuation">(</span><span class="token class-name">Constructor</span><span class="token punctuation">.</span>java<span class="token operator">:</span><span class="token number">489</span><span class="token punctuation">)</span>
	at java<span class="token punctuation">.</span>base<span class="token operator">/</span><span class="token class-name"><span class="token namespace">java<span class="token punctuation">.</span>lang<span class="token punctuation">.</span>reflect<span class="token punctuation">.</span></span>Constructor</span><span class="token punctuation">.</span><span class="token function">newInstance</span><span class="token punctuation">(</span><span class="token class-name">Constructor</span><span class="token punctuation">.</span>java<span class="token operator">:</span><span class="token number">480</span><span class="token punctuation">)</span>
	at <span class="token class-name"><span class="token namespace">com<span class="token punctuation">.</span>bennyhuo<span class="token punctuation">.</span>java17<span class="token punctuation">.</span></span>ReflectionsInternal</span><span class="token punctuation">.</span><span class="token function">useWeakCache</span><span class="token punctuation">(</span><span class="token class-name">ReflectionsInternal</span><span class="token punctuation">.</span>java<span class="token operator">:</span><span class="token number">16</span><span class="token punctuation">)</span>
	at <span class="token class-name"><span class="token namespace">com<span class="token punctuation">.</span>bennyhuo<span class="token punctuation">.</span>java17<span class="token punctuation">.</span></span>ReflectionsInternal</span><span class="token punctuation">.</span><span class="token function">main</span><span class="token punctuation">(</span><span class="token class-name">ReflectionsInternal</span><span class="token punctuation">.</span>java<span class="token operator">:</span><span class="token number">10</span><span class="token punctuation">)</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>en？？？这让我想起了 Android P，你看这个字母 P，它的发音充满了挑衅，它的形状还有点儿像官方在嘲笑我们</p><p><img src="https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates/73940E6B.gif" alt=""></p><p>现在 Java 17 也玩这个啊，反射都不行了啊这。。</p><p>Java 16 我们可以通过在运行时加入 <code>--illegal-access=permit</code> 来运行，虽然会有一堆警告：</p><div class="language-text line-numbers-mode" data-ext="text"><pre class="language-text"><code># java --illegal-access=permit com.bennyhuo.java17.ReflectionsInternal

Java HotSpot(TM) 64-Bit Server VM warning: Option --illegal-access is deprecated and will be removed in a future release.
WARNING: An illegal reflective access operation has occurred
WARNING: Illegal reflective access by com.bennyhuo.java17.ReflectionsInternal (file:/mnt/c/Users/benny/WorkSpace/Mario/SourceCode/Java17UpdatesDemo/src/) to constructor com.sun.beans.WeakCache()
WARNING: Please consider reporting this to the maintainers of com.bennyhuo.java17.ReflectionsInternal
WARNING: Use --illegal-access=warn to enable warnings of further illegal reflective access operations
WARNING: All illegal access operations will be denied in a future release
bennyhuo
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>不过正如我们前面所说，Java 17 当中这个参数无效了：</p><div class="language-text line-numbers-mode" data-ext="text"><pre class="language-text"><code># java --illegal-access=permit com.bennyhuo.java17.ReflectionsInternal

Java HotSpot(TM) 64-Bit Server VM warning: Ignoring option --illegal-access=permit; support was removed in 17.0
java.lang.IllegalAccessException: class com.bennyhuo.java17.ReflectionsInternal cannot access class com.sun.beans.WeakCache (in module java.desktop) because module java.desktop does not export com.sun.beans to unnamed module @372f7a8
d
        at java.base/jdk.internal.reflect.Reflection.newIllegalAccessException(Reflection.java:392)
        at java.base/java.lang.reflect.AccessibleObject.checkAccess(AccessibleObject.java:674)
        at java.base/java.lang.reflect.Constructor.newInstanceWithCaller(Constructor.java:489)
        at java.base/java.lang.reflect.Constructor.newInstance(Constructor.java:480)
        at com.bennyhuo.java17.ReflectionsInternal.useWeakCache(ReflectionsInternal.java:16)
        at com.bennyhuo.java17.ReflectionsInternal.main(ReflectionsInternal.java:10)
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>这就是上帝在关门的时候（Java 9），顺便也提醒我们窗户也马上要关上了，还不赶紧滚出去？然后上帝又花了三年把窗户也关上了（Java 17）。不过，它总算是还留了一个通气孔。。。</p><p><img src="https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates-06-internals/0B24BC5A.png" alt=""></p><p>Java 17 当中 --add-opens 仍然有效，通过开启它可以让我们的程序在运行时通过反射访问指定的类：</p><div class="language-text line-numbers-mode" data-ext="text"><pre class="language-text"><code>--add-opens java.desktop/com.sun.beans=ALL-UNNAMED
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div></div></div><p>所以，上面的代码想要运行，只能：</p><div class="language-text line-numbers-mode" data-ext="text"><pre class="language-text"><code># java --add-opens java.desktop/com.sun.beans=ALL-UNNAMED com.bennyhuo.java17.ReflectionsInternal

bennyhuo
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>所以这波限制是要来真的，赶快跑吧！</p><p><img src="https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates/739B92AC.jpg" alt=""></p>`,36),r={href:"https://cr.openjdk.java.net/~mr/jigsaw/jdk8-packages-strongly-encapsulated",target:"_blank",rel:"noopener noreferrer"},k=n("p",null,"顺便说一句，著名的 Unsafe 类不在这一波制裁的名单以内，可能是 Unsafe 应用太广泛了吧，而且 Java 官方也没有找到合适的替代品来满足需求，就先放着了（Unsafe 我们在后面访问堆外内存的内容中还会有介绍）。",-1),d=n("p",null,"好啦，关于加强控制内部 API 的限制的更新，我们也就介绍这么多，对大家的影响嘛，应该也不大（只要不升级）。",-1),v=n("h2",{id:"关于作者",tabindex:"-1"},[n("a",{class:"header-anchor",href:"#关于作者","aria-hidden":"true"},"#"),a(" 关于作者")],-1),m=n("p",null,[n("strong",null,"霍丙乾 bennyhuo"),a("，Google 开发者专家（Kotlin 方向）；"),n("strong",null,"《深入理解 Kotlin 协程》"),a(" 作者（机械工业出版社，2020.6）；"),n("strong",null,"《深入实践 Kotlin 元编程》"),a(" 作者（机械工业出版社，预计 2023 Q3）；前腾讯高级工程师，现就职于猿辅导")],-1),b=n("li",null,"GitHub：https://github.com/bennyhuo",-1),g=n("li",null,"博客：https://www.bennyhuo.com",-1),f={href:"https://space.bilibili.com/28615855",target:"_blank",rel:"noopener noreferrer"},h=n("strong",null,"霍丙乾 bennyhuo",-1),j=n("li",null,[a("微信公众号："),n("strong",null,"霍丙乾 bennyhuo")],-1);function y(w,I){const s=l("ExternalLinkIcon");return p(),c("div",null,[u,n("p",null,[a("大家也可以参考 "),n("a",r,[a("受影响的 API 清单"),e(s)]),a(" 来规划自己的 JDK 升级。")]),k,d,v,m,n("ul",null,[b,g,n("li",null,[a("bilibili："),n("a",f,[h,e(s)])]),j])])}const x=t(i,[["render",y],["__file","06-internals.html.vue"]]);export{x as default};
