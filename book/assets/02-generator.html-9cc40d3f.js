import{_ as o,X as c,Y as l,$ as a,Z as n,a0 as s,a1 as i,D as p}from"./framework-98842e7a.js";const u={},d=n("h1",{id:"_2-实现一个序列生成器",tabindex:"-1"},[n("a",{class:"header-anchor",href:"#_2-实现一个序列生成器","aria-hidden":"true"},"#"),s(" 2. 实现一个序列生成器")],-1),r=n("blockquote",null,[n("p",null,"序列生成器是一个非常经典的协程应用场景。")],-1),k=i(`<h2 id="实现目标" tabindex="-1"><a class="header-anchor" href="#实现目标" aria-hidden="true">#</a> 实现目标</h2><p>现在我们已经了解了绝大部分 C++ 协程的特性，可以试着来实现一些小案例了。</p><p>简单的说，序列生成器通常的实现就是在一个协程内部通过某种方式向外部传一个值出去，并且将自己挂起，外部调用者则可以获取到这个值，并且在后续继续恢复执行序列生成器来获取下一个值。</p><p>显然，挂起和向外部传值的任务就需要通过 <code>co_await</code> 来完成了，外部获取值的任务就要通过协程的返回值来完成。</p><p>由此我们大致能想到最终程序的样子：</p><div class="language-cpp line-numbers-mode" data-ext="cpp"><pre class="language-cpp"><code>Generator <span class="token function">sequence</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
  <span class="token keyword">int</span> i <span class="token operator">=</span> <span class="token number">0</span><span class="token punctuation">;</span>
  <span class="token keyword">while</span> <span class="token punctuation">(</span><span class="token boolean">true</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
    <span class="token keyword">co_await</span> i<span class="token operator">++</span><span class="token punctuation">;</span>
  <span class="token punctuation">}</span>
<span class="token punctuation">}</span>

<span class="token keyword">int</span> <span class="token function">main</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
  <span class="token keyword">auto</span> generator <span class="token operator">=</span> <span class="token function">sequence</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token keyword">for</span> <span class="token punctuation">(</span><span class="token keyword">int</span> i <span class="token operator">=</span> <span class="token number">0</span><span class="token punctuation">;</span> i <span class="token operator">&lt;</span> <span class="token number">10</span><span class="token punctuation">;</span> <span class="token operator">++</span>i<span class="token punctuation">)</span> <span class="token punctuation">{</span>
    std<span class="token double-colon punctuation">::</span>cout <span class="token operator">&lt;&lt;</span> generator<span class="token punctuation">.</span><span class="token function">next</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">&lt;&lt;</span> std<span class="token double-colon punctuation">::</span>endl<span class="token punctuation">;</span>
  <span class="token punctuation">}</span>
<span class="token punctuation">}</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>注意到 generator 有个 next 函数，调用它时我们需要想办法让协程恢复执行，并将下一个值传出来。</p><p>好了，接下来我们就带着这两个问题去寻找解决办法，顺便把剩下的一点点 C++ 协程的知识补齐。</p><h2 id="调用者获取值" tabindex="-1"><a class="header-anchor" href="#调用者获取值" aria-hidden="true">#</a> 调用者获取值</h2><p>截止到目前我们都没有真正尝试去调用过协程，现在是个很好的机会。我们观察一下 main 函数当中的这段代码：</p><div class="language-cpp line-numbers-mode" data-ext="cpp"><pre class="language-cpp"><code><span class="token keyword">int</span> <span class="token function">main</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
  <span class="token keyword">auto</span> generator <span class="token operator">=</span> <span class="token function">sequence</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token keyword">for</span> <span class="token punctuation">(</span><span class="token keyword">int</span> i <span class="token operator">=</span> <span class="token number">0</span><span class="token punctuation">;</span> i <span class="token operator">&lt;</span> <span class="token number">10</span><span class="token punctuation">;</span> <span class="token operator">++</span>i<span class="token punctuation">)</span> <span class="token punctuation">{</span>
    std<span class="token double-colon punctuation">::</span>cout <span class="token operator">&lt;&lt;</span> generator<span class="token punctuation">.</span><span class="token function">next</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">&lt;&lt;</span> std<span class="token double-colon punctuation">::</span>endl<span class="token punctuation">;</span>
  <span class="token punctuation">}</span>
<span class="token punctuation">}</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p><code>generator</code> 的类型就是我们即将实现的序列生成器类型 <code>Generator</code>，结合上一篇文章当中对于协程返回值类型的介绍，我们先大致给出它的定义：</p><div class="language-cpp line-numbers-mode" data-ext="cpp"><pre class="language-cpp"><code><span class="token keyword">struct</span> <span class="token class-name">Generator</span> <span class="token punctuation">{</span>
  <span class="token keyword">struct</span> <span class="token class-name">promise_type</span> <span class="token punctuation">{</span>
    
    <span class="token comment">// 开始执行时不挂起，执行到第一个挂起点</span>
    std<span class="token double-colon punctuation">::</span>suspend_never <span class="token function">initial_suspend</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span> <span class="token keyword">return</span> <span class="token punctuation">{</span><span class="token punctuation">}</span><span class="token punctuation">;</span> <span class="token punctuation">}</span><span class="token punctuation">;</span>

    <span class="token comment">// 执行结束后不需要挂起</span>
    std<span class="token double-colon punctuation">::</span>suspend_never <span class="token function">final_suspend</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token keyword">noexcept</span> <span class="token punctuation">{</span> <span class="token keyword">return</span> <span class="token punctuation">{</span><span class="token punctuation">}</span><span class="token punctuation">;</span> <span class="token punctuation">}</span>

    <span class="token comment">// 为了简单，我们认为序列生成器当中不会抛出异常，这里不做任何处理</span>
    <span class="token keyword">void</span> <span class="token function">unhandled_exception</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span> <span class="token punctuation">}</span>

    <span class="token comment">// 构造协程的返回值类型</span>
    Generator <span class="token function">get_return_object</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
      <span class="token keyword">return</span> Generator<span class="token punctuation">{</span><span class="token punctuation">}</span><span class="token punctuation">;</span>
    <span class="token punctuation">}</span>

    <span class="token comment">// 没有返回值</span>
    <span class="token keyword">void</span> <span class="token function">return_void</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span> <span class="token punctuation">}</span>
  <span class="token punctuation">}</span><span class="token punctuation">;</span>

  <span class="token keyword">int</span> <span class="token function">next</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
    <span class="token operator">?</span><span class="token operator">?</span><span class="token operator">?</span><span class="token punctuation">.</span><span class="token function">resume</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token keyword">return</span> <span class="token operator">?</span><span class="token operator">?</span><span class="token operator">?</span><span class="token punctuation">;</span>
  <span class="token punctuation">}</span>
<span class="token punctuation">}</span><span class="token punctuation">;</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>代码当中有两处我们标注为 ???，表示暂时还不知道怎么处理。</p><p>第一个是我们想要在 Generator 当中 resume 协程的话，需要拿到 coroutine_handle，这个要怎么做到呢？</p><p>这时候我希望大家一定要记住一点，promise_type 是连接协程内外的桥梁，想要拿到什么，找 promise_type 要。标准库提供了一个通过 promise_type 的对象的地址获取 coroutine_handle 的函数，它实际上是 coroutine_handle 的一个静态函数：</p><div class="language-cpp line-numbers-mode" data-ext="cpp"><pre class="language-cpp"><code><span class="token keyword">template</span> <span class="token operator">&lt;</span><span class="token keyword">class</span> <span class="token class-name">_Promise</span><span class="token operator">&gt;</span>
<span class="token keyword">struct</span> <span class="token class-name">coroutine_handle</span> <span class="token punctuation">{</span>
    <span class="token keyword">static</span> coroutine_handle <span class="token function">from_promise</span><span class="token punctuation">(</span>_Promise<span class="token operator">&amp;</span> _Prom<span class="token punctuation">)</span> <span class="token keyword">noexcept</span> <span class="token punctuation">{</span>
      <span class="token punctuation">.</span><span class="token punctuation">.</span><span class="token punctuation">.</span>
    <span class="token punctuation">}</span>

    <span class="token punctuation">.</span><span class="token punctuation">.</span><span class="token punctuation">.</span>
<span class="token punctuation">}</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>这样看来，我们只需要在 <code>get_return_object</code> 函数调用时，先获取 coroutine_handle，然后再传给即将构造出来的 Generator 即可，因此我们稍微修改一下前面的代码：</p><div class="language-cpp line-numbers-mode" data-ext="cpp"><pre class="language-cpp"><code><span class="token keyword">struct</span> <span class="token class-name">Generator</span> <span class="token punctuation">{</span>
  <span class="token keyword">struct</span> <span class="token class-name">promise_type</span> <span class="token punctuation">{</span>
    <span class="token punctuation">.</span><span class="token punctuation">.</span><span class="token punctuation">.</span>

    <span class="token comment">// 构造协程的返回值类型</span>
    Generator <span class="token function">get_return_object</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
      <span class="token keyword">return</span> Generator<span class="token punctuation">{</span> std<span class="token double-colon punctuation">::</span><span class="token class-name">coroutine_handle</span><span class="token operator">&lt;</span>promise_type<span class="token operator">&gt;</span><span class="token double-colon punctuation">::</span><span class="token function">from_promise</span><span class="token punctuation">(</span><span class="token operator">*</span><span class="token keyword">this</span><span class="token punctuation">)</span> <span class="token punctuation">}</span><span class="token punctuation">;</span>
    <span class="token punctuation">}</span>

    <span class="token punctuation">.</span><span class="token punctuation">.</span><span class="token punctuation">.</span>
  <span class="token punctuation">}</span><span class="token punctuation">;</span>

  std<span class="token double-colon punctuation">::</span>coroutine_handle<span class="token operator">&lt;</span>promise_type<span class="token operator">&gt;</span> handle<span class="token punctuation">;</span>

  <span class="token keyword">int</span> <span class="token function">next</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
    handle<span class="token punctuation">.</span><span class="token function">resume</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token keyword">return</span> <span class="token operator">?</span><span class="token operator">?</span><span class="token operator">?</span><span class="token punctuation">;</span>
  <span class="token punctuation">}</span>

<span class="token punctuation">}</span><span class="token punctuation">;</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>接下来就是如何获取协程内部传出来的值的问题了。同样，本着有事儿找 promise_type 的原则，我们可以直接给它定义一个 value 成员：</p><div class="language-cpp line-numbers-mode" data-ext="cpp"><pre class="language-cpp"><code><span class="token keyword">struct</span> <span class="token class-name">Generator</span> <span class="token punctuation">{</span>
  <span class="token keyword">struct</span> <span class="token class-name">promise_type</span> <span class="token punctuation">{</span>
    <span class="token keyword">int</span> value<span class="token punctuation">;</span>

    <span class="token punctuation">.</span><span class="token punctuation">.</span><span class="token punctuation">.</span>
  <span class="token punctuation">}</span><span class="token punctuation">;</span>

  std<span class="token double-colon punctuation">::</span>coroutine_handle<span class="token operator">&lt;</span>promise_type<span class="token operator">&gt;</span> handle<span class="token punctuation">;</span>

  <span class="token keyword">int</span> <span class="token function">next</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
    handle<span class="token punctuation">.</span><span class="token function">resume</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token comment">// 通过 handle 获取 promise，然后再取到 value</span>
    <span class="token keyword">return</span> handle<span class="token punctuation">.</span><span class="token function">promise</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">.</span>value<span class="token punctuation">;</span>
  <span class="token punctuation">}</span>
<span class="token punctuation">}</span><span class="token punctuation">;</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h2 id="协程内部挂起并传值" tabindex="-1"><a class="header-anchor" href="#协程内部挂起并传值" aria-hidden="true">#</a> 协程内部挂起并传值</h2><p>现在的问题就是如何从协程内部传值给 promise_type 了。</p><p>我们再来观察一下最终实现的效果：</p><div class="language-cpp line-numbers-mode" data-ext="cpp"><pre class="language-cpp"><code>Generator <span class="token function">sequence</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
  <span class="token keyword">int</span> i <span class="token operator">=</span> <span class="token number">0</span><span class="token punctuation">;</span>
  <span class="token keyword">while</span> <span class="token punctuation">(</span><span class="token boolean">true</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
    <span class="token keyword">co_await</span> i<span class="token operator">++</span><span class="token punctuation">;</span>
  <span class="token punctuation">}</span>
<span class="token punctuation">}</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>特别需要注意的是 <code>co_await i++;</code> 这一句，我们发现 <code>co_await</code> 后面的是一个整型值，而不是我们在前面的文章当中提到的满足等待体（awaiter）条件的类型，这种情况下该怎么办呢？</p><p>实际上，对于 <code>co_await &lt;expr&gt;</code> 表达式当中 <code>expr</code> 的处理，C++ 有一套完善的流程：</p><ol><li>如果 promise_type 当中定义了 await_transform 函数，那么先通过 <code>promise.await_transform(expr)</code> 来对 expr 做一次转换，得到的对象称为 awaitable；否则 awaitable 就是 expr 本身。</li><li>接下来使用 awaitable 对象来获取等待体（awaiter）。如果 awaitable 对象有 <code>operator co_await</code> 运算符重载，那么等待体就是 <code>operator co_await(awaitable)</code>，否则等待体就是 awaitable 对象本身。</li></ol><p>听上去，我们要么给 promise_type 实现一个 <code>await_tranform(int)</code> 函数，要么就为整型实现一个 <code>operator co_await</code> 的运算符重载，二者选一个就可以了。</p><h3 id="方案-1-实现-operator-co-await" tabindex="-1"><a class="header-anchor" href="#方案-1-实现-operator-co-await" aria-hidden="true">#</a> 方案 1：实现 operator co_await</h3><p>这个方案就是给 int 定义 operator co_await 的重载：</p><div class="language-cpp line-numbers-mode" data-ext="cpp"><pre class="language-cpp"><code><span class="token keyword">auto</span> <span class="token keyword">operator</span> <span class="token keyword">co_await</span><span class="token punctuation">(</span><span class="token keyword">int</span> value<span class="token punctuation">)</span> <span class="token punctuation">{</span>
  <span class="token keyword">struct</span> <span class="token class-name">IntAwaiter</span> <span class="token punctuation">{</span>
    <span class="token keyword">int</span> value<span class="token punctuation">;</span>

    <span class="token keyword">bool</span> <span class="token function">await_ready</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token keyword">const</span> <span class="token keyword">noexcept</span> <span class="token punctuation">{</span>
      <span class="token keyword">return</span> <span class="token boolean">false</span><span class="token punctuation">;</span>
    <span class="token punctuation">}</span>
    <span class="token keyword">void</span> <span class="token function">await_suspend</span><span class="token punctuation">(</span>std<span class="token double-colon punctuation">::</span>coroutine_handle<span class="token operator">&lt;</span>Generator<span class="token double-colon punctuation">::</span>promise_type<span class="token operator">&gt;</span> handle<span class="token punctuation">)</span> <span class="token keyword">const</span> <span class="token punctuation">{</span>
      handle<span class="token punctuation">.</span><span class="token function">promise</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">.</span>value <span class="token operator">=</span> value<span class="token punctuation">;</span>
    <span class="token punctuation">}</span>
    <span class="token keyword">void</span> <span class="token function">await_resume</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>  <span class="token punctuation">}</span>
  <span class="token punctuation">}</span><span class="token punctuation">;</span>
  <span class="token keyword">return</span> IntAwaiter<span class="token punctuation">{</span><span class="token punctuation">.</span>value <span class="token operator">=</span> value<span class="token punctuation">}</span><span class="token punctuation">;</span>
<span class="token punctuation">}</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>当然，这个方案对于我们这个特定的场景下是行不通的，因为在 C++ 当中我们是无法给基本类型定义运算符重载的。</p><p>不过，如果我们遇到的情况不是基本类型，那么运算符重载的思路就可以行得通。<code>operator co_await</code> 的重载我们将会在后面给出例子。</p><h3 id="方案-2-await-transform" tabindex="-1"><a class="header-anchor" href="#方案-2-await-transform" aria-hidden="true">#</a> 方案 2：await_transform</h3><p>运算符重载行不通，那就只能通过 await_tranform 来做转换了。</p><p>代码比较简单：</p><div class="language-cpp line-numbers-mode" data-ext="cpp"><pre class="language-cpp"><code><span class="token keyword">struct</span> <span class="token class-name">Generator</span> <span class="token punctuation">{</span>
  <span class="token keyword">struct</span> <span class="token class-name">promise_type</span> <span class="token punctuation">{</span>
    <span class="token keyword">int</span> value<span class="token punctuation">;</span>

    <span class="token comment">// 传值的同时要挂起，值存入 value 当中</span>
    std<span class="token double-colon punctuation">::</span>suspend_always <span class="token function">await_transform</span><span class="token punctuation">(</span><span class="token keyword">int</span> value<span class="token punctuation">)</span> <span class="token punctuation">{</span>
      <span class="token keyword">this</span><span class="token operator">-&gt;</span>value <span class="token operator">=</span> value<span class="token punctuation">;</span>
      <span class="token keyword">return</span> <span class="token punctuation">{</span><span class="token punctuation">}</span><span class="token punctuation">;</span>
    <span class="token punctuation">}</span>

    <span class="token punctuation">.</span><span class="token punctuation">.</span><span class="token punctuation">.</span>
  <span class="token punctuation">}</span><span class="token punctuation">;</span>

  std<span class="token double-colon punctuation">::</span>coroutine_handle<span class="token operator">&lt;</span>promise_type<span class="token operator">&gt;</span> handle<span class="token punctuation">;</span>

  <span class="token keyword">int</span> <span class="token function">next</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
    handle<span class="token punctuation">.</span><span class="token function">resume</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

  <span class="token comment">// 外部调用者或者恢复者可以通过读取 value</span>
    <span class="token keyword">return</span> handle<span class="token punctuation">.</span><span class="token function">promise</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">.</span>value<span class="token punctuation">;</span>
  <span class="token punctuation">}</span>
<span class="token punctuation">}</span><span class="token punctuation">;</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>定义了 <code>await_transform</code> 函数之后，<code>co_await expr</code> 就相当于 <code>co_await promise.await_transform(expr)</code> 了。</p><p>至此，我们的例子就可以运行了：</p><div class="language-cpp line-numbers-mode" data-ext="cpp"><pre class="language-cpp"><code>Generator <span class="token function">sequence</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
  <span class="token keyword">int</span> i <span class="token operator">=</span> <span class="token number">0</span><span class="token punctuation">;</span>
  <span class="token keyword">while</span> <span class="token punctuation">(</span><span class="token boolean">true</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
    <span class="token keyword">co_await</span> i<span class="token operator">++</span><span class="token punctuation">;</span>
  <span class="token punctuation">}</span>
<span class="token punctuation">}</span>

<span class="token keyword">int</span> <span class="token function">main</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
  <span class="token keyword">auto</span> gen <span class="token operator">=</span> <span class="token function">sequence</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token keyword">for</span> <span class="token punctuation">(</span><span class="token keyword">int</span> i <span class="token operator">=</span> <span class="token number">0</span><span class="token punctuation">;</span> i <span class="token operator">&lt;</span> <span class="token number">5</span><span class="token punctuation">;</span> <span class="token operator">++</span>i<span class="token punctuation">)</span> <span class="token punctuation">{</span>
    std<span class="token double-colon punctuation">::</span>cout <span class="token operator">&lt;&lt;</span> gen<span class="token punctuation">.</span><span class="token function">next</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">&lt;&lt;</span> std<span class="token double-colon punctuation">::</span>endl<span class="token punctuation">;</span>
  <span class="token punctuation">}</span>
<span class="token punctuation">}</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>运行结果如下：</p><div class="language-text line-numbers-mode" data-ext="text"><pre class="language-text"><code>0
1
2
3
4
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h2 id="协程的销毁" tabindex="-1"><a class="header-anchor" href="#协程的销毁" aria-hidden="true">#</a> 协程的销毁</h2><p>虽然我们的协程已经能够正常工作，但它仍然存在缺陷。</p><h3 id="问题-1-无法确定是否存在下一个元素" tabindex="-1"><a class="header-anchor" href="#问题-1-无法确定是否存在下一个元素" aria-hidden="true">#</a> 问题 1：无法确定是否存在下一个元素</h3><p>当外部调用者或者恢复者试图调用 <code>next</code> 来获取下一个元素的时候，它其实并不知道能不能真的得到一个结果。程序也可能抛出异常：</p><p>如下例：</p><div class="language-cpp line-numbers-mode" data-ext="cpp"><pre class="language-cpp"><code>Generator <span class="token function">sequence</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
  <span class="token keyword">int</span> i <span class="token operator">=</span> <span class="token number">0</span><span class="token punctuation">;</span>
  <span class="token comment">// 只传出 5 个值</span>
  <span class="token keyword">while</span> <span class="token punctuation">(</span>i <span class="token operator">&lt;</span> <span class="token number">5</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
    <span class="token keyword">co_await</span> i<span class="token operator">++</span><span class="token punctuation">;</span>
  <span class="token punctuation">}</span>
<span class="token punctuation">}</span>

<span class="token keyword">int</span> <span class="token function">main</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
  <span class="token keyword">auto</span> gen <span class="token operator">=</span> <span class="token function">sequence</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token keyword">for</span> <span class="token punctuation">(</span><span class="token keyword">int</span> i <span class="token operator">=</span> <span class="token number">0</span><span class="token punctuation">;</span> i <span class="token operator">&lt;</span> <span class="token number">15</span><span class="token punctuation">;</span> <span class="token operator">++</span>i<span class="token punctuation">)</span> <span class="token punctuation">{</span>
    <span class="token comment">// 试图读取 15 个值</span>
    std<span class="token double-colon punctuation">::</span>cout <span class="token operator">&lt;&lt;</span> gen<span class="token punctuation">.</span><span class="token function">next</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">&lt;&lt;</span> std<span class="token double-colon punctuation">::</span>endl<span class="token punctuation">;</span>
  <span class="token punctuation">}</span>
  <span class="token keyword">return</span> <span class="token number">0</span><span class="token punctuation">;</span>
<span class="token punctuation">}</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>程序的结果是什么呢？</p><div class="language-text line-numbers-mode" data-ext="text"><pre class="language-text"><code>0
1
2
3
4
4

Process finished with exit code 139 (interrupted by signal 11: SIGSEGV)
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>最后一个输出的 4 实际上是恰好遇到协程销毁之前的状态，此时 promise 当中的 value 值还是之前的 4。而当我们试图不断的去读取协程的值，程序就抛出 SIGSEGV 的错误。错误的原因你可能已经想到了，当协程体执行完之后，协程的状态就会被销毁，如果我们再访问协程的话，就相当于访问了一个野指针。</p><p>为了解决这个问题，我们需要增加一个 has_next 函数，用来判断是否还有新的值传出来，has_next 函数调用的时候有两种情况：</p><ol><li>已经有一个值传出来了，还没有被外部消费</li><li>还没有现成的值可以用，需要尝试恢复执行协程来看看还有没有下一个值传出来</li></ol><p>这里我们需要有一种有效的办法来判断 value 是不是有效的，单凭 value 本身我们其实是无法确定它的值是不是被消费了，因此我们需要加一个值来存储这个状态：</p><div class="language-cpp line-numbers-mode" data-ext="cpp"><pre class="language-cpp"><code><span class="token keyword">struct</span> <span class="token class-name">Generator</span> <span class="token punctuation">{</span>

  <span class="token comment">// 协程执行完成之后，外部读取值时抛出的异常</span>
  <span class="token keyword">class</span> <span class="token class-name">ExhaustedException</span><span class="token operator">:</span> <span class="token base-clause">std<span class="token double-colon punctuation">::</span><span class="token class-name">exception</span></span> <span class="token punctuation">{</span> <span class="token punctuation">}</span><span class="token punctuation">;</span>

  <span class="token keyword">struct</span> <span class="token class-name">promise_type</span> <span class="token punctuation">{</span>
    <span class="token keyword">int</span> value<span class="token punctuation">;</span>
    <span class="token keyword">bool</span> is_ready <span class="token operator">=</span> <span class="token boolean">false</span><span class="token punctuation">;</span>
    <span class="token punctuation">.</span><span class="token punctuation">.</span><span class="token punctuation">.</span>
  <span class="token punctuation">}</span>
  <span class="token punctuation">.</span><span class="token punctuation">.</span><span class="token punctuation">.</span>
<span class="token punctuation">}</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>我们定义一个成员 state 来记录协程执行的状态，状态的类型一共三种，只有 READY 的时候我们才能拿到值。</p><p>接下来改造 <code>next</code> 函数，同时增加 <code>has_next</code> 函数来描述协程是否仍然可以有值传出：</p><div class="language-cpp line-numbers-mode" data-ext="cpp"><pre class="language-cpp"><code><span class="token keyword">struct</span> <span class="token class-name">Generator</span> <span class="token punctuation">{</span>
  <span class="token punctuation">.</span><span class="token punctuation">.</span><span class="token punctuation">.</span>

  <span class="token keyword">bool</span> <span class="token function">has_next</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
    <span class="token comment">// 协程已经执行完成</span>
    <span class="token keyword">if</span> <span class="token punctuation">(</span><span class="token operator">!</span>handle <span class="token operator">||</span> handle<span class="token punctuation">.</span><span class="token function">done</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
      <span class="token keyword">return</span> <span class="token boolean">false</span><span class="token punctuation">;</span>
    <span class="token punctuation">}</span>

    <span class="token comment">// 协程还没有执行完成，并且下一个值还没有准备好</span>
    <span class="token keyword">if</span> <span class="token punctuation">(</span><span class="token operator">!</span>handle<span class="token punctuation">.</span><span class="token function">promise</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">.</span>is_ready<span class="token punctuation">)</span> <span class="token punctuation">{</span>
      handle<span class="token punctuation">.</span><span class="token function">resume</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">}</span>

    <span class="token keyword">if</span> <span class="token punctuation">(</span>handle<span class="token punctuation">.</span><span class="token function">done</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
      <span class="token comment">// 恢复执行之后协程执行完，这时候必然没有通过 co_await 传出值来</span>
      <span class="token keyword">return</span> <span class="token boolean">false</span><span class="token punctuation">;</span>
    <span class="token punctuation">}</span> <span class="token keyword">else</span> <span class="token punctuation">{</span>
      <span class="token keyword">return</span> <span class="token boolean">true</span><span class="token punctuation">;</span>
    <span class="token punctuation">}</span>
  <span class="token punctuation">}</span>

  <span class="token keyword">int</span> <span class="token function">next</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
    <span class="token keyword">if</span> <span class="token punctuation">(</span><span class="token function">has_next</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
      <span class="token comment">// 此时一定有值，is_ready 为 true </span>
      <span class="token comment">// 消费当前的值，重置 is_ready 为 false</span>
      handle<span class="token punctuation">.</span><span class="token function">promise</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">.</span>is_ready <span class="token operator">=</span> <span class="token boolean">false</span><span class="token punctuation">;</span>
      <span class="token keyword">return</span> handle<span class="token punctuation">.</span><span class="token function">promise</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">.</span>value<span class="token punctuation">;</span>
    <span class="token punctuation">}</span>
    <span class="token keyword">throw</span> <span class="token function">ExhaustedException</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">}</span>
<span class="token punctuation">}</span><span class="token punctuation">;</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>这样外部使用时就需要先通过 has_next 来判断是否有下一个值，然后再去读取了：</p><div class="language-cpp line-numbers-mode" data-ext="cpp"><pre class="language-cpp"><code><span class="token punctuation">.</span><span class="token punctuation">.</span><span class="token punctuation">.</span>

<span class="token keyword">int</span> <span class="token function">main</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
  <span class="token keyword">auto</span> generator <span class="token operator">=</span> <span class="token function">sequence</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token keyword">for</span> <span class="token punctuation">(</span><span class="token keyword">int</span> i <span class="token operator">=</span> <span class="token number">0</span><span class="token punctuation">;</span> i <span class="token operator">&lt;</span> <span class="token number">15</span><span class="token punctuation">;</span> <span class="token operator">++</span>i<span class="token punctuation">)</span> <span class="token punctuation">{</span>
    <span class="token keyword">if</span> <span class="token punctuation">(</span>generator<span class="token punctuation">.</span><span class="token function">has_next</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
      std<span class="token double-colon punctuation">::</span>cout <span class="token operator">&lt;&lt;</span> generator<span class="token punctuation">.</span><span class="token function">next</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">&lt;&lt;</span> std<span class="token double-colon punctuation">::</span>endl<span class="token punctuation">;</span>
    <span class="token punctuation">}</span> <span class="token keyword">else</span> <span class="token punctuation">{</span>
      <span class="token keyword">break</span><span class="token punctuation">;</span>
    <span class="token punctuation">}</span>
  <span class="token punctuation">}</span>
  <span class="token keyword">return</span> <span class="token number">0</span><span class="token punctuation">;</span>
<span class="token punctuation">}</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="问题-2-协程状态的销毁比-generator-对象的销毁更早" tabindex="-1"><a class="header-anchor" href="#问题-2-协程状态的销毁比-generator-对象的销毁更早" aria-hidden="true">#</a> 问题 2：协程状态的销毁比 Generator 对象的销毁更早</h3><p>我们前面提到过，协程的状态在协程体执行完之后就会销毁，除非协程挂起在 <code>final_suspend</code> 调用时。</p><p>我们的例子当中 <code>final_suspend</code> 返回了 <code>std::suspend_never</code>，因此协程的销毁时机其实比 Generator 更早：</p><div class="language-cpp line-numbers-mode" data-ext="cpp"><pre class="language-cpp"><code><span class="token keyword">auto</span> generator <span class="token operator">=</span> <span class="token function">sequence</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token keyword">for</span> <span class="token punctuation">(</span><span class="token keyword">int</span> i <span class="token operator">=</span> <span class="token number">0</span><span class="token punctuation">;</span> i <span class="token operator">&lt;</span> <span class="token number">15</span><span class="token punctuation">;</span> <span class="token operator">++</span>i<span class="token punctuation">)</span> <span class="token punctuation">{</span>
  <span class="token keyword">if</span> <span class="token punctuation">(</span>generator<span class="token punctuation">.</span><span class="token function">has_next</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
    std<span class="token double-colon punctuation">::</span>cout <span class="token operator">&lt;&lt;</span> generator<span class="token punctuation">.</span><span class="token function">next</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">&lt;&lt;</span> std<span class="token double-colon punctuation">::</span>endl<span class="token punctuation">;</span>
  <span class="token punctuation">}</span> <span class="token keyword">else</span> <span class="token punctuation">{</span>
    <span class="token comment">// 协程已经执行完，协程的状态已经销毁</span>
    <span class="token keyword">break</span><span class="token punctuation">;</span>
  <span class="token punctuation">}</span>
<span class="token punctuation">}</span>

<span class="token comment">// generator 对象在此仍然有效</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>这看上去似乎问题不大，因为我们在前面通过 <code>has_next</code> 的判断保证了读取值的安全性。</p><p>但实际上情况并非如此。我们在 <code>has_next</code> 当中调用了 <code>coroutine_handle::done</code> 来判断协程体是否执行完成，判断之前很可能协程已经销毁，<code>coroutine_handle</code> 这时候都已经是无效的了：</p><div class="language-cpp line-numbers-mode" data-ext="cpp"><pre class="language-cpp"><code><span class="token keyword">bool</span> <span class="token function">has_next</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
  <span class="token comment">// 如果协程已经执行完成，理论上协程的状态已经销毁，handle 指向的是一个无效的协程</span>
  <span class="token comment">// 如果 handle 本身已经无效，因此 done 函数的调用此时也是无效的</span>
  <span class="token keyword">if</span> <span class="token punctuation">(</span><span class="token operator">!</span>handle <span class="token operator">||</span> handle<span class="token punctuation">.</span><span class="token function">done</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
    <span class="token keyword">return</span> <span class="token boolean">false</span><span class="token punctuation">;</span>
  <span class="token punctuation">}</span>
  <span class="token punctuation">.</span><span class="token punctuation">.</span><span class="token punctuation">.</span>
<span class="token punctuation">}</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>因此为了让协程的状态的生成周期与 <code>Generator</code> 一致，我们必须将协程的销毁交给 <code>Generator</code> 来处理：</p><div class="language-cpp line-numbers-mode" data-ext="cpp"><pre class="language-cpp"><code><span class="token keyword">struct</span> <span class="token class-name">Generator</span> <span class="token punctuation">{</span>

  <span class="token keyword">class</span> <span class="token class-name">ExhaustedException</span><span class="token operator">:</span> <span class="token base-clause">std<span class="token double-colon punctuation">::</span><span class="token class-name">exception</span></span> <span class="token punctuation">{</span> <span class="token punctuation">}</span><span class="token punctuation">;</span>

  <span class="token keyword">struct</span> <span class="token class-name">promise_type</span> <span class="token punctuation">{</span>
    <span class="token punctuation">.</span><span class="token punctuation">.</span><span class="token punctuation">.</span>

    <span class="token comment">// 总是挂起，让 Generator 来销毁</span>
    std<span class="token double-colon punctuation">::</span>suspend_always <span class="token function">final_suspend</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token keyword">noexcept</span> <span class="token punctuation">{</span> <span class="token keyword">return</span> <span class="token punctuation">{</span><span class="token punctuation">}</span><span class="token punctuation">;</span> <span class="token punctuation">}</span>

    <span class="token punctuation">.</span><span class="token punctuation">.</span><span class="token punctuation">.</span>
  <span class="token punctuation">}</span><span class="token punctuation">;</span>

  <span class="token punctuation">.</span><span class="token punctuation">.</span><span class="token punctuation">.</span>

  <span class="token operator">~</span><span class="token function">Generator</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
    <span class="token comment">// 销毁协程</span>
    handle<span class="token punctuation">.</span><span class="token function">destroy</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">}</span>
<span class="token punctuation">}</span><span class="token punctuation">;</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="问题-3-复制对象导致协程被销毁" tabindex="-1"><a class="header-anchor" href="#问题-3-复制对象导致协程被销毁" aria-hidden="true">#</a> 问题 3：复制对象导致协程被销毁</h3><p>这个问题确切地说是<strong>问题 2</strong>的解决方案不完善引起的。</p><p>我们在 Generator 的析构函数当中销毁协程，这本身没有什么问题，但如果我们把 Generator 对象做一下复制，例如从一个函数当中返回，情况可能就会变得复杂。例如：</p><div class="language-cpp line-numbers-mode" data-ext="cpp"><pre class="language-cpp"><code>Generator <span class="token function">returns_generator</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
  <span class="token keyword">auto</span> g <span class="token operator">=</span> <span class="token function">sequence</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token keyword">if</span> <span class="token punctuation">(</span>g<span class="token punctuation">.</span><span class="token function">has_next</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
    std<span class="token double-colon punctuation">::</span>cout <span class="token operator">&lt;&lt;</span> g<span class="token punctuation">.</span><span class="token function">next</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">&lt;&lt;</span> std<span class="token double-colon punctuation">::</span>endl<span class="token punctuation">;</span>
  <span class="token punctuation">}</span>
  <span class="token keyword">return</span> g<span class="token punctuation">;</span>
<span class="token punctuation">}</span>

<span class="token keyword">int</span> <span class="token function">main</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
  <span class="token keyword">auto</span> generator <span class="token operator">=</span> <span class="token function">returns_generator</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token keyword">for</span> <span class="token punctuation">(</span><span class="token keyword">int</span> i <span class="token operator">=</span> <span class="token number">0</span><span class="token punctuation">;</span> i <span class="token operator">&lt;</span> <span class="token number">15</span><span class="token punctuation">;</span> <span class="token operator">++</span>i<span class="token punctuation">)</span> <span class="token punctuation">{</span>
    <span class="token keyword">if</span> <span class="token punctuation">(</span>generator<span class="token punctuation">.</span><span class="token function">has_next</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
      std<span class="token double-colon punctuation">::</span>cout <span class="token operator">&lt;&lt;</span> generator<span class="token punctuation">.</span><span class="token function">next</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">&lt;&lt;</span> std<span class="token double-colon punctuation">::</span>endl<span class="token punctuation">;</span>
    <span class="token punctuation">}</span> <span class="token keyword">else</span> <span class="token punctuation">{</span>
      <span class="token keyword">break</span><span class="token punctuation">;</span>
    <span class="token punctuation">}</span>
  <span class="token punctuation">}</span>
  <span class="token keyword">return</span> <span class="token number">0</span><span class="token punctuation">;</span>
<span class="token punctuation">}</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>这段代码乍一看似乎没什么问题，但由于我们把 <code>g</code> 当做返回值返回了，这时候 <code>g</code> 这个对象就发生了一次复制，然后临时对象被销毁。接下来的事儿大家就很容易想到了，运行结果如下：</p><div class="language-text line-numbers-mode" data-ext="text"><pre class="language-text"><code>0
-572662307

Process finished with exit code -1073741819 (0xC0000005)
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>为了解决这个问题，我们需要妥善地处理 Generator 的复制构造器：</p><div class="language-cpp line-numbers-mode" data-ext="cpp"><pre class="language-cpp"><code><span class="token keyword">struct</span> <span class="token class-name">Generator</span> <span class="token punctuation">{</span>
  <span class="token punctuation">.</span><span class="token punctuation">.</span><span class="token punctuation">.</span>

  <span class="token keyword">explicit</span> <span class="token function">Generator</span><span class="token punctuation">(</span>std<span class="token double-colon punctuation">::</span>coroutine_handle<span class="token operator">&lt;</span>promise_type<span class="token operator">&gt;</span> handle<span class="token punctuation">)</span> <span class="token keyword">noexcept</span>
      <span class="token operator">:</span> <span class="token function">handle</span><span class="token punctuation">(</span>handle<span class="token punctuation">)</span> <span class="token punctuation">{</span><span class="token punctuation">}</span>

  <span class="token function">Generator</span><span class="token punctuation">(</span>Generator <span class="token operator">&amp;&amp;</span>generator<span class="token punctuation">)</span> <span class="token keyword">noexcept</span>
      <span class="token operator">:</span> <span class="token function">handle</span><span class="token punctuation">(</span>std<span class="token double-colon punctuation">::</span><span class="token function">exchange</span><span class="token punctuation">(</span>generator<span class="token punctuation">.</span>handle<span class="token punctuation">,</span> <span class="token punctuation">{</span><span class="token punctuation">}</span><span class="token punctuation">)</span><span class="token punctuation">)</span> <span class="token punctuation">{</span><span class="token punctuation">}</span>

  <span class="token function">Generator</span><span class="token punctuation">(</span>Generator <span class="token operator">&amp;</span><span class="token punctuation">)</span> <span class="token operator">=</span> <span class="token keyword">delete</span><span class="token punctuation">;</span>
  Generator <span class="token operator">&amp;</span><span class="token keyword">operator</span><span class="token operator">=</span><span class="token punctuation">(</span>Generator <span class="token operator">&amp;</span><span class="token punctuation">)</span> <span class="token operator">=</span> <span class="token keyword">delete</span><span class="token punctuation">;</span>

  <span class="token operator">~</span><span class="token function">Generator</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
    <span class="token keyword">if</span> <span class="token punctuation">(</span>handle<span class="token punctuation">)</span> handle<span class="token punctuation">.</span><span class="token function">destroy</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">}</span>
<span class="token punctuation">}</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>我们只提供了右值复制构造器，对于左值复制构造器，我们直接删除掉以禁止使用。原因也很简单，对于每一个协程实例，都有且仅能有一个 Generator 实例与之对应，因此我们只支持移动对象，而不支持复制对象。</p><h2 id="使用-co-yield" tabindex="-1"><a class="header-anchor" href="#使用-co-yield" aria-hidden="true">#</a> 使用 co_yield</h2><p>序列生成器这个需求的实现其实有个更好的选择，那就是使用 <code>co_yield</code>。<code>co_yield</code> 就是专门为向外传值来设计的，如果大家对其他语言的协程有了解，也一定见到过各种 <code>yield</code> 的实现。</p><p>C++ 当中的 <code>co_yield expr</code> 等价于 <code>co_await promise.yield_value(expr)</code>，我们只需要将前面例子当中的 <code>await_transform</code> 函数替换成 <code>yield_value</code> 就可以使用 <code>co_yield</code> 来传值了：</p><div class="language-cpp line-numbers-mode" data-ext="cpp"><pre class="language-cpp"><code><span class="token keyword">struct</span> <span class="token class-name">Generator</span> <span class="token punctuation">{</span>

  <span class="token keyword">class</span> <span class="token class-name">ExhaustedException</span><span class="token operator">:</span> <span class="token base-clause">std<span class="token double-colon punctuation">::</span><span class="token class-name">exception</span></span> <span class="token punctuation">{</span> <span class="token punctuation">}</span><span class="token punctuation">;</span>

  <span class="token keyword">struct</span> <span class="token class-name">promise_type</span> <span class="token punctuation">{</span>
    <span class="token punctuation">.</span><span class="token punctuation">.</span><span class="token punctuation">.</span>

    <span class="token comment">// 将 await_transform 替换为 yield_value</span>
    std<span class="token double-colon punctuation">::</span>suspend_always <span class="token function">yield_value</span><span class="token punctuation">(</span><span class="token keyword">int</span> value<span class="token punctuation">)</span> <span class="token punctuation">{</span>
      <span class="token keyword">this</span><span class="token operator">-&gt;</span>value <span class="token operator">=</span> value<span class="token punctuation">;</span>
      is_ready <span class="token operator">=</span> <span class="token boolean">true</span><span class="token punctuation">;</span>
      <span class="token keyword">return</span> <span class="token punctuation">{</span><span class="token punctuation">}</span><span class="token punctuation">;</span>
    <span class="token punctuation">}</span>
    <span class="token punctuation">.</span><span class="token punctuation">.</span><span class="token punctuation">.</span>
  <span class="token punctuation">}</span><span class="token punctuation">;</span>
  <span class="token punctuation">.</span><span class="token punctuation">.</span><span class="token punctuation">.</span>
<span class="token punctuation">}</span><span class="token punctuation">;</span>

Generator <span class="token function">sequence</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
  <span class="token keyword">int</span> i <span class="token operator">=</span> <span class="token number">0</span><span class="token punctuation">;</span>
  <span class="token keyword">while</span> <span class="token punctuation">(</span>i <span class="token operator">&lt;</span> <span class="token number">5</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
    <span class="token comment">// 使用 co_yield 来替换 co_await</span>
    <span class="token keyword">co_yield</span> i<span class="token operator">++</span><span class="token punctuation">;</span>
  <span class="token punctuation">}</span>
<span class="token punctuation">}</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>可以看到改动点非常少，运行效果与前面的例子一致。</p><p>尽管可以实现相同的效果，但通常情况下我们使用 <code>co_await</code> 更多的关注点在挂起自己，等待别人上，而使用 <code>co_yield</code> 则是挂起自己传值出去。因此我们应该针对合适的场景做出合适的选择。</p><h2 id="使用序列生成器生成斐波那契数列" tabindex="-1"><a class="header-anchor" href="#使用序列生成器生成斐波那契数列" aria-hidden="true">#</a> 使用序列生成器生成斐波那契数列</h2><p>接下来我们要使用序列生成器来实现一个更有意义的例子，即斐波那契数列。</p><div class="language-cpp line-numbers-mode" data-ext="cpp"><pre class="language-cpp"><code>Generator <span class="token function">fibonacci</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
  <span class="token keyword">co_yield</span> <span class="token number">0</span><span class="token punctuation">;</span> <span class="token comment">// fib(0)</span>
  <span class="token keyword">co_yield</span> <span class="token number">1</span><span class="token punctuation">;</span> <span class="token comment">// fib(1)</span>

  <span class="token keyword">int</span> a <span class="token operator">=</span> <span class="token number">0</span><span class="token punctuation">;</span>
  <span class="token keyword">int</span> b <span class="token operator">=</span> <span class="token number">1</span><span class="token punctuation">;</span>
  <span class="token keyword">while</span><span class="token punctuation">(</span><span class="token boolean">true</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
    <span class="token keyword">co_yield</span> a <span class="token operator">+</span> b<span class="token punctuation">;</span> <span class="token comment">// fib(N), N &gt; 1</span>
    b <span class="token operator">=</span> a <span class="token operator">+</span> b<span class="token punctuation">;</span>
    a <span class="token operator">=</span> b <span class="token operator">-</span> a<span class="token punctuation">;</span>
  <span class="token punctuation">}</span>
<span class="token punctuation">}</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>我们看到这个实现非常的直接，完全不需要考虑 fib(N - 1) 和 fib(N - 2) 的存储问题。</p><p>如果没有协程，我们的实现可能是这样的：</p><div class="language-cpp line-numbers-mode" data-ext="cpp"><pre class="language-cpp"><code><span class="token keyword">class</span> <span class="token class-name">Fibonacci</span> <span class="token punctuation">{</span>
 <span class="token keyword">public</span><span class="token operator">:</span>
  <span class="token keyword">int</span> <span class="token function">next</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
    <span class="token comment">// 初值不符合整体的规律，需要单独处理</span>
    <span class="token keyword">if</span> <span class="token punctuation">(</span>a <span class="token operator">==</span> <span class="token operator">-</span><span class="token number">1</span><span class="token punctuation">)</span><span class="token punctuation">{</span>
      a <span class="token operator">=</span> <span class="token number">0</span><span class="token punctuation">;</span>
      b <span class="token operator">=</span> <span class="token number">1</span><span class="token punctuation">;</span>
      <span class="token keyword">return</span> <span class="token number">0</span><span class="token punctuation">;</span>
    <span class="token punctuation">}</span>

    <span class="token keyword">int</span> next <span class="token operator">=</span> b<span class="token punctuation">;</span>
    b <span class="token operator">=</span> a <span class="token operator">+</span> b<span class="token punctuation">;</span>
    a <span class="token operator">=</span> b <span class="token operator">-</span> a<span class="token punctuation">;</span>
    <span class="token keyword">return</span> next<span class="token punctuation">;</span>
  <span class="token punctuation">}</span>

 <span class="token keyword">private</span><span class="token operator">:</span>
  <span class="token keyword">int</span> a <span class="token operator">=</span> <span class="token operator">-</span><span class="token number">1</span><span class="token punctuation">;</span>
  <span class="token keyword">int</span> b <span class="token operator">=</span> <span class="token number">0</span><span class="token punctuation">;</span>
<span class="token punctuation">}</span><span class="token punctuation">;</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>使用时先构造一个 Fibonacci 对象，然后调用 next 函数来获取下一个值。对比之下，协程的实现带来的好处是显而易见的。</p><h2 id="小结" tabindex="-1"><a class="header-anchor" href="#小结" aria-hidden="true">#</a> 小结</h2><p>本文围绕序列生成器这个经典的协程案例介绍了协程的销毁、co_await 运算符、await_transform 以及 yield_value 的用法。</p><p>说出来你可能不信，如果这篇文章你能够完全理解，那么相信你对 C++ 协程特性的了解已经比较全面了。</p><h2 id="关于作者" tabindex="-1"><a class="header-anchor" href="#关于作者" aria-hidden="true">#</a> 关于作者</h2><p><strong>霍丙乾 bennyhuo</strong>，Google 开发者专家（Kotlin 方向）；<strong>《深入理解 Kotlin 协程》</strong> 作者（机械工业出版社，2020.6）；<strong>《深入实践 Kotlin 元编程》</strong> 作者（机械工业出版社，2023.8）；移动客户端工程师，先后就职于腾讯地图、猿辅导、腾讯视频。</p>`,97),v=n("li",null,"GitHub：https://github.com/bennyhuo",-1),m=n("li",null,"博客：https://www.bennyhuo.com",-1),b={href:"https://space.bilibili.com/28615855",target:"_blank",rel:"noopener noreferrer"},w=n("strong",null,"霍丙乾 bennyhuo",-1),y=n("li",null,[s("微信公众号："),n("strong",null,"霍丙乾 bennyhuo")],-1);function h(_,g){const e=p("BiliBili"),t=p("ExternalLinkIcon");return c(),l("div",null,[d,r,a(e,{bvid:"BV1ug411d7Xy"}),k,n("ul",null,[v,m,n("li",null,[s("bilibili："),n("a",b,[w,a(t)])]),y])])}const x=o(u,[["render",h],["__file","02-generator.html.vue"]]);export{x as default};
