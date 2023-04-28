import{_ as t,W as e,X as p,Y as n,$ as s,Z as o,a0 as c,C as i}from"./framework-88b7ff58.js";const l={},u=c(`<h1 id="_2-将回调改写成-async-函数" tabindex="-1"><a class="header-anchor" href="#_2-将回调改写成-async-函数" aria-hidden="true">#</a> 2. 将回调改写成 async 函数</h1><blockquote><p>最理想的情况下，系统、第三方框架当中使用回调的 API 都最好在一夜之间改成 async 函数，显然这不太现实。</p></blockquote><p>我们前面已经简单介绍了 Swift 的协程，可以确认的一点是，如果你只是看了上一篇文章，那么你肯定还是不会用这一个特性。你一定还有一些疑问：</p><ul><li>异步函数是谁提供的？</li><li>我可以自己定义吗？</li><li>我该怎么正确地定义一个异步函数？</li></ul><p>异步函数谁都可以提供，不然它的应用范围就会大大受限制，因此我们既可以有机会使用到系统或者第三方框架提供的异步函数，也自然有机会自己去定义。那关键的问题就是如何定义异步函数了。</p><p>我们先随便定义一个函数：</p><div class="language-swift line-numbers-mode" data-ext="swift"><pre class="language-swift"><code><span class="token keyword">func</span> <span class="token function-definition function">hello</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">-&gt;</span> <span class="token class-name">Int</span><span class="token punctuation">{</span>
    <span class="token number">1</span>
<span class="token punctuation">}</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>这个函数返回了一个整数 1。接下来我们把它改造成异步函数，只需要加上 async 关键字：</p><div class="language-swift line-numbers-mode" data-ext="swift"><pre class="language-swift"><code><span class="token keyword">func</span> <span class="token function-definition function">hello</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token keyword">async</span> <span class="token operator">-&gt;</span> <span class="token class-name">Int</span><span class="token punctuation">{</span>
    <span class="token number">1</span>
<span class="token punctuation">}</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>那么，它现在真的是异步的吗？当然不是，它只是长得像罢了。</p><p>async 关键字并不会真正带来异步，那么异步的能力是谁提供的？这时候我们就要想想，过去我们见到的异步函数都是什么样的：</p><div class="language-swift line-numbers-mode" data-ext="swift"><pre class="language-swift"><code><span class="token keyword">func</span> <span class="token function-definition function">helloAsync</span><span class="token punctuation">(</span>onComplete<span class="token punctuation">:</span> <span class="token attribute atrule">@escaping</span> <span class="token punctuation">(</span><span class="token class-name">Int</span><span class="token punctuation">)</span> <span class="token operator">-&gt;</span> <span class="token class-name">Void</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
    <span class="token class-name">DispatchQueue</span><span class="token punctuation">.</span><span class="token function">global</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">.</span><span class="token keyword">async</span> <span class="token punctuation">{</span>
        <span class="token function">onComplete</span><span class="token punctuation">(</span><span class="token class-name">Int</span><span class="token punctuation">(</span><span class="token function">arc4random</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">)</span>
    <span class="token punctuation">}</span>
<span class="token punctuation">}</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>这是一个很简单的例子，我们在 helloAsync 当中通过 DispatchQueue 将代码逻辑调度到 global() 上，使得回调 onComplete 的调用脱离了 helloAsync 的调用栈。调用这个函数的样子就像这样：</p><div class="language-swift line-numbers-mode" data-ext="swift"><pre class="language-swift"><code>helloAsync <span class="token punctuation">{</span> result <span class="token keyword">in</span>
    <span class="token function">print</span><span class="token punctuation">(</span><span class="token string-literal"><span class="token string">&quot;Got result from callback: </span><span class="token interpolation-punctuation punctuation">\\(</span><span class="token interpolation">result</span><span class="token interpolation-punctuation punctuation">)</span><span class="token string">&quot;</span></span><span class="token punctuation">)</span>
<span class="token punctuation">}</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>这么看来，我们在异步函数当中都应该有这么个切换调用栈的过程，并且有个类似于回调的东西将结果能传递出去。那在 Swift 协程当中，谁来扮演这个角色呢？</p><p>这里就要稍微提一下 Swift 协程的设计原理了。它采用了一种叫做 Continuation Passing Style 的设计思路（熟悉 Kotlin 的朋友是不是觉得非常熟悉？），而这个所谓的Continuation 就充当了回调的作用。我们把 Swift 标准库当中提供的 Continuation 的定义给出来，大家简单了解一下它的形式即可：</p><div class="language-swift line-numbers-mode" data-ext="swift"><pre class="language-swift"><code><span class="token attribute atrule">@frozen</span> <span class="token keyword">public</span> <span class="token keyword">struct</span> <span class="token class-name">UnsafeContinuation</span><span class="token operator">&lt;</span><span class="token class-name">T</span><span class="token punctuation">,</span> <span class="token class-name">E</span><span class="token operator">&gt;</span> <span class="token keyword">where</span> <span class="token class-name">E</span> <span class="token punctuation">:</span> <span class="token class-name">Error</span> <span class="token punctuation">{</span>

    <span class="token keyword">public</span> <span class="token keyword">func</span> <span class="token function-definition function">resume</span><span class="token punctuation">(</span>returning value<span class="token punctuation">:</span> <span class="token class-name">T</span><span class="token punctuation">)</span> <span class="token keyword">where</span> <span class="token class-name">E</span> <span class="token operator">==</span> <span class="token class-name">Never</span>

    <span class="token keyword">public</span> <span class="token keyword">func</span> <span class="token function-definition function">resume</span><span class="token punctuation">(</span>returning value<span class="token punctuation">:</span> <span class="token class-name">T</span><span class="token punctuation">)</span>

    <span class="token keyword">public</span> <span class="token keyword">func</span> <span class="token function-definition function">resume</span><span class="token punctuation">(</span>throwing error<span class="token punctuation">:</span> <span class="token class-name">E</span><span class="token punctuation">)</span>
<span class="token punctuation">}</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>注意到它实际上有两种类型的函数，一种是 returning，一种是 throwing。也就是说，对于任何一段代码逻辑，其执行的结果都无非返回结果和抛出异常两种。Continuation 其实就是描述协程当中异步代码在挂起点的状态，而当程序需要恢复执行时，调用它对应的 resume 函数即可。</p><p>好了，现在我们知道有了 Continuation 这个东西了，相当于我们已经知道对于 Swift 的 async 函数而言，我们可以通过 Continuation 来传递异步结果。那么下一个问题就是如何获取这个 Continuation 的实例呢？Swift 标准库提供了相应的函数来做到这一点：</p><div class="language-swift line-numbers-mode" data-ext="swift"><pre class="language-swift"><code><span class="token keyword">public</span> <span class="token keyword">func</span> <span class="token function-definition function">withCheckedContinuation</span><span class="token operator">&lt;</span><span class="token class-name">T</span><span class="token operator">&gt;</span><span class="token punctuation">(</span>
    function<span class="token punctuation">:</span> <span class="token class-name">String</span> <span class="token operator">=</span> <span class="token literal constant">#function</span><span class="token punctuation">,</span> 
    <span class="token omit keyword">_</span> body<span class="token punctuation">:</span> <span class="token punctuation">(</span><span class="token class-name">CheckedContinuation</span><span class="token operator">&lt;</span><span class="token class-name">T</span><span class="token punctuation">,</span> <span class="token class-name">Never</span><span class="token operator">&gt;</span><span class="token punctuation">)</span> <span class="token operator">-&gt;</span> <span class="token class-name">Void</span>
<span class="token punctuation">)</span> <span class="token keyword">async</span> <span class="token operator">-&gt;</span> <span class="token class-name">T</span>

<span class="token keyword">public</span> <span class="token keyword">func</span> <span class="token function-definition function">withCheckedThrowingContinuation</span><span class="token operator">&lt;</span><span class="token class-name">T</span><span class="token operator">&gt;</span><span class="token punctuation">(</span>
    function<span class="token punctuation">:</span> <span class="token class-name">String</span> <span class="token operator">=</span> <span class="token literal constant">#function</span><span class="token punctuation">,</span> 
    <span class="token omit keyword">_</span> body<span class="token punctuation">:</span> <span class="token punctuation">(</span><span class="token class-name">CheckedContinuation</span><span class="token operator">&lt;</span><span class="token class-name">T</span><span class="token punctuation">,</span> <span class="token class-name">Error</span><span class="token operator">&gt;</span><span class="token punctuation">)</span> <span class="token operator">-&gt;</span> <span class="token class-name">Void</span>
<span class="token punctuation">)</span> <span class="token keyword">async</span> <span class="token keyword">throws</span> <span class="token operator">-&gt;</span> <span class="token class-name">T</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>如果我们的异步函数不会抛出异常，那就用 withCheckedContinuation 来获取 Continuation；如果会抛出异常，那就用 withCheckedThrowingContinuation。这么看来，改造前面的回调的方法就显而易见了：</p><div class="language-swift line-numbers-mode" data-ext="swift"><pre class="language-swift"><code><span class="token keyword">func</span> <span class="token function-definition function">helloAsync</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token keyword">async</span> <span class="token operator">-&gt;</span> <span class="token class-name">Int</span> <span class="token punctuation">{</span>
    <span class="token keyword">await</span> withCheckedContinuation <span class="token punctuation">{</span> continuation <span class="token keyword">in</span>
        <span class="token class-name">DispatchQueue</span><span class="token punctuation">.</span><span class="token function">global</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">.</span><span class="token keyword">async</span> <span class="token punctuation">{</span>
            continuation<span class="token punctuation">.</span><span class="token function">resume</span><span class="token punctuation">(</span>returning<span class="token punctuation">:</span> <span class="token class-name">Int</span><span class="token punctuation">(</span><span class="token function">arc4random</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">)</span>
        <span class="token punctuation">}</span>
    <span class="token punctuation">}</span>
<span class="token punctuation">}</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>如果需要抛出异常，那么：</p><div class="language-swift line-numbers-mode" data-ext="swift"><pre class="language-swift"><code><span class="token keyword">func</span> <span class="token function-definition function">helloAsyncThrows</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token keyword">async</span> <span class="token keyword">throws</span> <span class="token operator">-&gt;</span> <span class="token class-name">Int</span> <span class="token punctuation">{</span>
    <span class="token keyword">try</span> <span class="token keyword">await</span> withCheckedThrowingContinuation <span class="token punctuation">{</span> continuation <span class="token keyword">in</span>
        <span class="token class-name">DispatchQueue</span><span class="token punctuation">.</span><span class="token function">global</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">.</span><span class="token keyword">async</span> <span class="token punctuation">{</span>
            <span class="token keyword">do</span> <span class="token punctuation">{</span>
                <span class="token keyword">let</span> result <span class="token operator">=</span> <span class="token keyword">try</span> <span class="token function">doSomethingThrows</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token comment">// 可能抛异常</span>
                continuation<span class="token punctuation">.</span><span class="token function">resume</span><span class="token punctuation">(</span>returning<span class="token punctuation">:</span> result<span class="token punctuation">)</span>
            <span class="token punctuation">}</span> <span class="token keyword">catch</span> <span class="token punctuation">{</span>
                continuation<span class="token punctuation">.</span><span class="token function">resume</span><span class="token punctuation">(</span>throwing<span class="token punctuation">:</span> error<span class="token punctuation">)</span>
            <span class="token punctuation">}</span>
        <span class="token punctuation">}</span>
    <span class="token punctuation">}</span>
<span class="token punctuation">}</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>注意 Swift 要求对于标记为 throws 的函数需要使用 try 关键字来调用。</p><p>好了，现在我们已经学会如何将异步回调转成异步函数了，距离最终的目标又近了一步。下一篇文章当中我们将介绍如何从程序入口调用异步函数，试着把程序跑起来。</p><h2 id="关于作者" tabindex="-1"><a class="header-anchor" href="#关于作者" aria-hidden="true">#</a> 关于作者</h2><p><strong>霍丙乾 bennyhuo</strong>，Google 开发者专家（Kotlin 方向）；<strong>《深入理解 Kotlin 协程》</strong> 作者（机械工业出版社，2020.6）；<strong>《深入实践 Kotlin 元编程》</strong> 作者（机械工业出版社，预计 2023 Q3）；前腾讯高级工程师，现就职于猿辅导</p>`,28),r=n("li",null,"GitHub：https://github.com/bennyhuo",-1),k=n("li",null,"博客：https://www.bennyhuo.com",-1),d={href:"https://space.bilibili.com/28615855",target:"_blank",rel:"noopener noreferrer"},m=n("strong",null,"霍丙乾 bennyhuo",-1),v=n("li",null,[s("微信公众号："),n("strong",null,"霍丙乾 bennyhuo")],-1);function b(f,w){const a=i("ExternalLinkIcon");return e(),p("div",null,[u,n("ul",null,[r,k,n("li",null,[s("bilibili："),n("a",d,[m,o(a)])]),v])])}const h=t(l,[["render",b],["__file","02-wrap-callback.html.vue"]]);export{h as default};