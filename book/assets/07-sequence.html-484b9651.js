import{_ as e,X as t,Y as o,Z as n,a0 as s,$ as p,a1 as c,D as l}from"./framework-98842e7a.js";const i={},u=c(`<h1 id="_7-序列生成器篇" tabindex="-1"><a class="header-anchor" href="#_7-序列生成器篇" aria-hidden="true">#</a> 7. 序列生成器篇</h1><blockquote><p>说出来你可能不信，Kotlin 1.1 协程还在吃奶的时候，Sequence 就已经正式推出了，然而，Sequence 生成器的实现居然有协程的功劳。</p></blockquote><h2 id="_1-认识-sequence" tabindex="-1"><a class="header-anchor" href="#_1-认识-sequence" aria-hidden="true">#</a> 1. 认识 Sequence</h2><p>在 Kotlin 当中，Sequence 这个概念确切的说是“懒序列”，产生懒序列的方式可以有多种，下面我们介绍一种由基于协程实现的序列生成器。需要注意的是，这个功能内置于 Kotlin 标准库当中，不需要额外添加依赖。</p><p>下面我们给出一个斐波那契数列生成的例子：</p><div class="language-kotlin line-numbers-mode" data-ext="kt"><pre class="language-kotlin"><code> <span class="token keyword">val</span> fibonacci <span class="token operator">=</span> sequence <span class="token punctuation">{</span>
    <span class="token function">yield</span><span class="token punctuation">(</span><span class="token number">1L</span><span class="token punctuation">)</span> <span class="token comment">// first Fibonacci number</span>
    <span class="token keyword">var</span> cur <span class="token operator">=</span> <span class="token number">1L</span>
    <span class="token keyword">var</span> next <span class="token operator">=</span> <span class="token number">1L</span>
    <span class="token keyword">while</span> <span class="token punctuation">(</span><span class="token boolean">true</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
        <span class="token function">yield</span><span class="token punctuation">(</span>next<span class="token punctuation">)</span> <span class="token comment">// next Fibonacci number</span>
        <span class="token keyword">val</span> tmp <span class="token operator">=</span> cur <span class="token operator">+</span> next
        cur <span class="token operator">=</span> next
        next <span class="token operator">=</span> tmp
    <span class="token punctuation">}</span>
<span class="token punctuation">}</span>

fibonacci<span class="token punctuation">.</span><span class="token function">take</span><span class="token punctuation">(</span><span class="token number">5</span><span class="token punctuation">)</span><span class="token punctuation">.</span><span class="token function">forEach</span><span class="token punctuation">(</span><span class="token operator">::</span>log<span class="token punctuation">)</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>这个 <code>sequence</code> 实际上也是启动了一个协程，<code>yield</code> 则是一个挂起点，每次调用时先将参数保存起来作为生成的序列迭代器的下一个值，之后返回 <code>COROUTINE_SUSPENDED</code>，这样协程就不再继续执行，而是等待下一次 <code>resume</code> 或者 <code>resumeWithException</code> 的调用，而实际上，这下一次的调用就在生成的序列的迭代器的 <code>next()</code> 调用时执行。如此一来，外部在遍历序列时，每次需要读取新值时，协程内部就会执行到下一次 <code>yield</code> 调用。</p><p>程序运行输出的结果如下：</p><div class="language-text line-numbers-mode" data-ext="text"><pre class="language-text"><code>10:44:34:071 [main] 1
10:44:34:071 [main] 1
10:44:34:071 [main] 2
10:44:34:071 [main] 3
10:44:34:071 [main] 5
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>除了使用 <code>yield(T)</code> 生成序列的下一个元素以外，我们还可以用 <code>yieldAll()</code> 来生成多个元素：</p><div class="language-kotlin line-numbers-mode" data-ext="kt"><pre class="language-kotlin"><code><span class="token keyword">val</span> seq <span class="token operator">=</span> sequence <span class="token punctuation">{</span>
    <span class="token function">log</span><span class="token punctuation">(</span><span class="token string-literal singleline"><span class="token string">&quot;yield 1,2,3&quot;</span></span><span class="token punctuation">)</span>
    <span class="token function">yieldAll</span><span class="token punctuation">(</span><span class="token function">listOf</span><span class="token punctuation">(</span><span class="token number">1</span><span class="token punctuation">,</span> <span class="token number">2</span><span class="token punctuation">,</span> <span class="token number">3</span><span class="token punctuation">)</span><span class="token punctuation">)</span>
    <span class="token function">log</span><span class="token punctuation">(</span><span class="token string-literal singleline"><span class="token string">&quot;yield 4,5,6&quot;</span></span><span class="token punctuation">)</span>
    <span class="token function">yieldAll</span><span class="token punctuation">(</span><span class="token function">listOf</span><span class="token punctuation">(</span><span class="token number">4</span><span class="token punctuation">,</span> <span class="token number">5</span><span class="token punctuation">,</span> <span class="token number">6</span><span class="token punctuation">)</span><span class="token punctuation">)</span>
    <span class="token function">log</span><span class="token punctuation">(</span><span class="token string-literal singleline"><span class="token string">&quot;yield 7,8,9&quot;</span></span><span class="token punctuation">)</span>
    <span class="token function">yieldAll</span><span class="token punctuation">(</span><span class="token function">listOf</span><span class="token punctuation">(</span><span class="token number">7</span><span class="token punctuation">,</span> <span class="token number">8</span><span class="token punctuation">,</span> <span class="token number">9</span><span class="token punctuation">)</span><span class="token punctuation">)</span>
<span class="token punctuation">}</span>

seq<span class="token punctuation">.</span><span class="token function">take</span><span class="token punctuation">(</span><span class="token number">5</span><span class="token punctuation">)</span><span class="token punctuation">.</span><span class="token function">forEach</span><span class="token punctuation">(</span><span class="token operator">::</span>log<span class="token punctuation">)</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>从运行结果我们可以看到，在读取 4 的时候才会去执行到 <code>yieldAll(listOf(4, 5, 6))</code>，而由于 7 以后都没有被访问到，<code>yieldAll(listOf(7, 8, 9))</code> 并不会被执行，这就是所谓的“懒”。</p><div class="language-text line-numbers-mode" data-ext="text"><pre class="language-text"><code>10:44:34:029 [main] yield 1,2,3
10:44:34:060 [main] 1
10:44:34:060 [main] 2
10:44:34:060 [main] 3
10:44:34:061 [main] yield 4,5,6
10:44:34:061 [main] 4
10:44:34:066 [main] 5
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h2 id="_2-深入序列生成器" tabindex="-1"><a class="header-anchor" href="#_2-深入序列生成器" aria-hidden="true">#</a> 2. 深入序列生成器</h2><p>前面我们已经不止一次提到 <code>COROUTINE_SUSPENDED</code> 了，我们也很容易就知道 <code>yield</code> 和 <code>yieldAll</code> 都是 suspend 函数，既然能做到”懒“，那么必然在 <code>yield</code> 和 <code>yieldAll</code> 处是挂起的，因此它们的返回值一定是 <code>COROUTINE_SUSPENDED</code>，这一点我们在本文的开头就已经提到，下面我们来见识一下庐山真面目：</p><div class="language-kotlin line-numbers-mode" data-ext="kt"><pre class="language-kotlin"><code><span class="token keyword">override</span> <span class="token keyword">suspend</span> <span class="token keyword">fun</span> <span class="token function">yield</span><span class="token punctuation">(</span>value<span class="token operator">:</span> T<span class="token punctuation">)</span> <span class="token punctuation">{</span>
    nextValue <span class="token operator">=</span> value
    state <span class="token operator">=</span> State_Ready
    <span class="token keyword">return</span> suspendCoroutineUninterceptedOrReturn <span class="token punctuation">{</span> c <span class="token operator">-&gt;</span>
        nextStep <span class="token operator">=</span> c
        COROUTINE_SUSPENDED
    <span class="token punctuation">}</span>
<span class="token punctuation">}</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>这是 <code>yield</code> 的实现，我们看到了老朋友 <code>suspendCoroutineUninterceptedOrReturn</code>，还看到了 <code>COROUTINE_SUSPENDED</code>，那么挂起的问题就很好理解了。而 <code>yieldAll</code> 是如出一辙：</p><div class="language-kotlin line-numbers-mode" data-ext="kt"><pre class="language-kotlin"><code><span class="token keyword">override</span> <span class="token keyword">suspend</span> <span class="token keyword">fun</span> <span class="token function">yieldAll</span><span class="token punctuation">(</span>iterator<span class="token operator">:</span> Iterator<span class="token operator">&lt;</span>T<span class="token operator">&gt;</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
    <span class="token keyword">if</span> <span class="token punctuation">(</span><span class="token operator">!</span>iterator<span class="token punctuation">.</span><span class="token function">hasNext</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">)</span> <span class="token keyword">return</span>
    nextIterator <span class="token operator">=</span> iterator
    state <span class="token operator">=</span> State_ManyReady
    <span class="token keyword">return</span> suspendCoroutineUninterceptedOrReturn <span class="token punctuation">{</span> c <span class="token operator">-&gt;</span>
        nextStep <span class="token operator">=</span> c
        COROUTINE_SUSPENDED
    <span class="token punctuation">}</span>
<span class="token punctuation">}</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>唯一的不同在于 <code>state</code> 的值，一个流转到了 <code>State_Ready</code>，一个是 <code>State_ManyReady</code>，也倒是很好理解嘛。</p><p>那么现在就剩下一个问题了，既然有了挂起，那么什么时候执行 <code>resume</code> ？这个很容易想到，我们在迭代序列的时候呗，也就是序列迭代器的 <code>next()</code> 的时候，那么这事儿就好办了，找下序列的迭代器实现即可，这个类型我们也很容易找到，显然 <code>yield</code> 就是它的方法，我们来看看 <code>next</code> 方法的实现：</p><div class="language-kotlin line-numbers-mode" data-ext="kt"><pre class="language-kotlin"><code><span class="token keyword">override</span> <span class="token keyword">fun</span> <span class="token function">next</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token operator">:</span> T <span class="token punctuation">{</span>
    <span class="token keyword">when</span> <span class="token punctuation">(</span>state<span class="token punctuation">)</span> <span class="token punctuation">{</span>
        State_NotReady<span class="token punctuation">,</span> State_ManyNotReady <span class="token operator">-&gt;</span> <span class="token keyword">return</span> <span class="token function">nextNotReady</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token comment">// ①</span>
        State_ManyReady <span class="token operator">-&gt;</span> <span class="token punctuation">{</span> <span class="token comment">// ②</span>
            state <span class="token operator">=</span> State_ManyNotReady
            <span class="token keyword">return</span> nextIterator<span class="token operator">!!</span><span class="token punctuation">.</span><span class="token function">next</span><span class="token punctuation">(</span><span class="token punctuation">)</span>
        <span class="token punctuation">}</span>
        State_Ready <span class="token operator">-&gt;</span> <span class="token punctuation">{</span> <span class="token comment">// ③</span>
            state <span class="token operator">=</span> State_NotReady
            <span class="token keyword">val</span> result <span class="token operator">=</span> nextValue <span class="token keyword">as</span> T
            nextValue <span class="token operator">=</span> <span class="token keyword">null</span>
            <span class="token keyword">return</span> result
        <span class="token punctuation">}</span>
        <span class="token keyword">else</span> <span class="token operator">-&gt;</span> <span class="token keyword">throw</span> <span class="token function">exceptionalState</span><span class="token punctuation">(</span><span class="token punctuation">)</span>
    <span class="token punctuation">}</span>
<span class="token punctuation">}</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>我们来依次看下这三个条件：</p><ul><li>① 是下一个元素还没有准备好的情况，调用 <code>nextNotReady</code> 会首先调用 <code>hasNext</code> 检查是否有下一个元素，检查的过程其实就是调用 <code>Continuation.resume</code>，如果有元素，就会再次调用 <code>next</code>，否则就抛异常</li><li>② 表示我们调用了 <code>yieldAll</code>，一下子传入了很多元素，目前还没有读取完，因此需要继续从传入的这个元素集合当中去迭代</li><li>③ 表示我们调用了一次 <code>yield</code>，而这个元素的值就存在 <code>nextValue</code> 当中</li></ul><p><code>hasNext</code> 的实现也不是很复杂：</p><div class="language-kotlin line-numbers-mode" data-ext="kt"><pre class="language-kotlin"><code><span class="token keyword">override</span> <span class="token keyword">fun</span> <span class="token function">hasNext</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token operator">:</span> Boolean <span class="token punctuation">{</span>
    <span class="token keyword">while</span> <span class="token punctuation">(</span><span class="token boolean">true</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
        <span class="token keyword">when</span> <span class="token punctuation">(</span>state<span class="token punctuation">)</span> <span class="token punctuation">{</span>
            State_NotReady <span class="token operator">-&gt;</span> <span class="token punctuation">{</span><span class="token punctuation">}</span> <span class="token comment">// ①</span>
            State_ManyNotReady <span class="token operator">-&gt;</span> <span class="token comment">// ②</span>
                <span class="token keyword">if</span> <span class="token punctuation">(</span>nextIterator<span class="token operator">!!</span><span class="token punctuation">.</span><span class="token function">hasNext</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
                    state <span class="token operator">=</span> State_ManyReady
                    <span class="token keyword">return</span> <span class="token boolean">true</span>
                <span class="token punctuation">}</span> <span class="token keyword">else</span> <span class="token punctuation">{</span>
                    nextIterator <span class="token operator">=</span> <span class="token keyword">null</span>
                <span class="token punctuation">}</span>
            State_Done <span class="token operator">-&gt;</span> <span class="token keyword">return</span> <span class="token boolean">false</span> <span class="token comment">// ③</span>
            State_Ready<span class="token punctuation">,</span> State_ManyReady <span class="token operator">-&gt;</span> <span class="token keyword">return</span> <span class="token boolean">true</span> <span class="token comment">// ④</span>
            <span class="token keyword">else</span> <span class="token operator">-&gt;</span> <span class="token keyword">throw</span> <span class="token function">exceptionalState</span><span class="token punctuation">(</span><span class="token punctuation">)</span>
        <span class="token punctuation">}</span>

        state <span class="token operator">=</span> State_Failed
        <span class="token keyword">val</span> step <span class="token operator">=</span> nextStep<span class="token operator">!!</span>
        nextStep <span class="token operator">=</span> <span class="token keyword">null</span>
        step<span class="token punctuation">.</span><span class="token function">resume</span><span class="token punctuation">(</span>Unit<span class="token punctuation">)</span>
    <span class="token punctuation">}</span>
<span class="token punctuation">}</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>我们在通过 <code>next</code> 读取完一个元素之后，如果已经传入的元素已经没有剩余，状态会转为 <code>State_NotReady</code>，下一次取元素的时候就会在 <code>next</code> 中触发到 <code>hasNext</code> 的调用，① 处什么都没有干，因此会直接落到后面的 <code>step.resume()</code>，这样就会继续执行我们序列生成器的代码，直到遇到 <code>yield</code> 或者 <code>yieldAll</code>。</p><h2 id="_3-小结" tabindex="-1"><a class="header-anchor" href="#_3-小结" aria-hidden="true">#</a> 3. 小结</h2><p>序列生成器很好的利用了协程的状态机特性，将序列生成的过程从形式上整合到了一起，让程序更加紧凑，表现力更强。本节讨论的序列，某种意义上更像是生产 - 消费者模型中的生产者，而迭代序列的一方则像是消费者，其实在 kotlinx.coroutines 库中提供了更为强大的能力来实现生产 - 消费者模式，我们将在后面的文章当中展示给大家看。</p><p>协程的回调特性可以让我们在实践当中很好的替代传统回调的写法，同时它的状态机特性也可以让曾经的状态机实现获得新的写法，除了序列之外，也许还会有更多有趣的适用场景等待我们去发掘~</p><h2 id="关于作者" tabindex="-1"><a class="header-anchor" href="#关于作者" aria-hidden="true">#</a> 关于作者</h2><p><strong>霍丙乾 bennyhuo</strong>，Google 开发者专家（Kotlin 方向）；<strong>《深入理解 Kotlin 协程》</strong> 作者（机械工业出版社，2020.6）；<strong>《深入实践 Kotlin 元编程》</strong> 作者（机械工业出版社，2023.8）；前腾讯高级工程师，现就职于猿辅导</p>`,31),d=n("li",null,"GitHub：https://github.com/bennyhuo",-1),r=n("li",null,"博客：https://www.bennyhuo.com",-1),k={href:"https://space.bilibili.com/28615855",target:"_blank",rel:"noopener noreferrer"},v=n("strong",null,"霍丙乾 bennyhuo",-1),m=n("li",null,[s("微信公众号："),n("strong",null,"霍丙乾 bennyhuo")],-1);function b(y,h){const a=l("ExternalLinkIcon");return t(),o("div",null,[u,n("ul",null,[d,r,n("li",null,[s("bilibili："),n("a",k,[v,p(a)])]),m])])}const x=e(i,[["render",b],["__file","07-sequence.html.vue"]]);export{x as default};