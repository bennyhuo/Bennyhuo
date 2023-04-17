import{_ as c,W as l,X as i,Z as a,Y as n,$ as s,a0 as t,C as p}from"./framework-88b7ff58.js";const u={},r=n("h1",{id:"_7-用于协程之间消息传递的-channel",tabindex:"-1"},[n("a",{class:"header-anchor",href:"#_7-用于协程之间消息传递的-channel","aria-hidden":"true"},"#"),s(" 7. 用于协程之间消息传递的 Channel")],-1),d=n("blockquote",null,[n("p",null,"之前我们主要关注的是协程与外部调用者的交互，这次我们也关注一下对等的协程之间的通信。")],-1),k=t(`<h2 id="实现目标" tabindex="-1"><a class="header-anchor" href="#实现目标" aria-hidden="true">#</a> 实现目标</h2><h3 id="go-routine-的-channel" tabindex="-1"><a class="header-anchor" href="#go-routine-的-channel" aria-hidden="true">#</a> Go routine 的 Channel</h3><p>Go routine 当中有一个重要的特性就是 Channel。我们可以向 Channel 当中写数据，也可以从中读数据。例如：</p><div class="language-go line-numbers-mode" data-ext="go"><pre class="language-go"><code><span class="token comment">// 创建 Channel 实例</span>
channel <span class="token operator">:=</span> <span class="token function">make</span><span class="token punctuation">(</span><span class="token keyword">chan</span> <span class="token builtin">int</span><span class="token punctuation">)</span> 
<span class="token comment">// 创建只读 Channel 引用</span>
<span class="token keyword">var</span> readChannel <span class="token operator">&lt;-</span><span class="token keyword">chan</span> <span class="token builtin">int</span> <span class="token operator">=</span> channel
<span class="token comment">// 创建只写 Channel 引用</span>
<span class="token keyword">var</span> writeChannel <span class="token keyword">chan</span><span class="token operator">&lt;-</span> <span class="token builtin">int</span> <span class="token operator">=</span> channel

<span class="token comment">// </span>
<span class="token keyword">go</span> <span class="token keyword">func</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span> 
  fmt<span class="token punctuation">.</span><span class="token function">Println</span><span class="token punctuation">(</span><span class="token string">&quot;wait for read&quot;</span><span class="token punctuation">)</span>
  <span class="token comment">// 遍历 Channel</span>
  <span class="token keyword">for</span> <span class="token boolean">true</span> <span class="token punctuation">{</span>
    <span class="token comment">// 读取 Channel，值存入 i，状态存入 ok 当中</span>
    i<span class="token punctuation">,</span> ok <span class="token operator">:=</span> <span class="token operator">&lt;-</span>readChannel
    <span class="token keyword">if</span> ok <span class="token punctuation">{</span>
      fmt<span class="token punctuation">.</span><span class="token function">Println</span><span class="token punctuation">(</span><span class="token string">&quot;read&quot;</span><span class="token punctuation">,</span> i<span class="token punctuation">)</span>
    <span class="token punctuation">}</span> <span class="token keyword">else</span> <span class="token punctuation">{</span>
      <span class="token comment">// Channel 被关闭时，ok 为 false</span>
      <span class="token keyword">break</span>
    <span class="token punctuation">}</span>
  <span class="token punctuation">}</span>
  fmt<span class="token punctuation">.</span><span class="token function">Println</span><span class="token punctuation">(</span><span class="token string">&quot;read end&quot;</span><span class="token punctuation">)</span>
<span class="token punctuation">}</span><span class="token punctuation">(</span><span class="token punctuation">)</span>


<span class="token comment">// writer</span>
<span class="token keyword">go</span> <span class="token keyword">func</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
  <span class="token keyword">for</span> i <span class="token operator">:=</span> <span class="token number">0</span><span class="token punctuation">;</span> i <span class="token operator">&lt;</span> <span class="token number">3</span><span class="token punctuation">;</span> i<span class="token operator">++</span><span class="token punctuation">{</span>
    fmt<span class="token punctuation">.</span><span class="token function">Println</span><span class="token punctuation">(</span><span class="token string">&quot;write&quot;</span><span class="token punctuation">,</span> i<span class="token punctuation">)</span>
    <span class="token comment">// 向 Channel 当中写数据</span>
    writeChannel <span class="token operator">&lt;-</span> i
    time<span class="token punctuation">.</span><span class="token function">Sleep</span><span class="token punctuation">(</span>time<span class="token punctuation">.</span>Second<span class="token punctuation">)</span>
  <span class="token punctuation">}</span>
  <span class="token function">close</span><span class="token punctuation">(</span>writeChannel<span class="token punctuation">)</span>
<span class="token punctuation">}</span><span class="token punctuation">(</span><span class="token punctuation">)</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div>`,4),v={href:"https://item.jd.com/12898592.html",target:"_blank",rel:"noopener noreferrer"},m=t(`<div class="language-text line-numbers-mode" data-ext="text"><pre class="language-text"><code>wait for read
write 0
read 0
write 1
read 1
write 2
read 2
read end
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>Go 当中的 Channel 默认是没有 buffer 的，我们也可以通过 <code>make chan</code> 在初始化 Channel 的时候指定 buffer。在 buffer 已满的情况下，写入者会先挂起等待读取者后再恢复执行，反之亦然。等待的过程中，所处的协程会挂起，执行调度的线程自然也会被释放用于调度其他逻辑。</p><h3 id="c-协程的-channel-实现设计" tabindex="-1"><a class="header-anchor" href="#c-协程的-channel-实现设计" aria-hidden="true">#</a> C++ 协程的 Channel 实现设计</h3><p>Kotlin 协程当中也有 Channel，与 Go 的不同之处在于 Kotlin 的 Channel 其实是基于协程最基本的 API 在框架层面实现的，并非语言原生提供的能力。C++ 的协程显然也可以采用这个思路，实际上整个这一系列 C++ 协程的文章都是在介绍如何使用 C++ 20 标准当中提供的基本的协程 API 在构建更复杂的框架支持。</p><p>我们来看一下我们最终的 Channel 的用例：</p><div class="language-cpp line-numbers-mode" data-ext="cpp"><pre class="language-cpp"><code>Task<span class="token operator">&lt;</span><span class="token keyword">void</span><span class="token punctuation">,</span> LooperExecutor<span class="token operator">&gt;</span> <span class="token function">Producer</span><span class="token punctuation">(</span>Channel<span class="token operator">&lt;</span><span class="token keyword">int</span><span class="token operator">&gt;</span> <span class="token operator">&amp;</span>channel<span class="token punctuation">)</span> <span class="token punctuation">{</span>
  <span class="token keyword">int</span> i <span class="token operator">=</span> <span class="token number">0</span><span class="token punctuation">;</span>
  <span class="token keyword">while</span> <span class="token punctuation">(</span>i <span class="token operator">&lt;</span> <span class="token number">10</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
    <span class="token comment">// 写入时调用 write 函数</span>
    <span class="token keyword">co_await</span> channel<span class="token punctuation">.</span><span class="token function">write</span><span class="token punctuation">(</span>i<span class="token operator">++</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token comment">// 或者使用 &lt;&lt; 运算符</span>
    <span class="token keyword">co_await</span> <span class="token punctuation">(</span>channel <span class="token operator">&lt;&lt;</span> i<span class="token operator">++</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">}</span>

  <span class="token comment">// 支持关闭</span>
  channel<span class="token punctuation">.</span><span class="token function">close</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">}</span>

Task<span class="token operator">&lt;</span><span class="token keyword">void</span><span class="token punctuation">,</span> LooperExecutor<span class="token operator">&gt;</span> <span class="token function">Consumer</span><span class="token punctuation">(</span>Channel<span class="token operator">&lt;</span><span class="token keyword">int</span><span class="token operator">&gt;</span> <span class="token operator">&amp;</span>channel<span class="token punctuation">)</span> <span class="token punctuation">{</span>
  <span class="token keyword">while</span> <span class="token punctuation">(</span>channel<span class="token punctuation">.</span><span class="token function">is_active</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
    <span class="token keyword">try</span> <span class="token punctuation">{</span>
      <span class="token comment">// 读取时使用 read 函数，表达式的值就是读取的值</span>
      <span class="token keyword">auto</span> received <span class="token operator">=</span> <span class="token keyword">co_await</span> channel<span class="token punctuation">.</span><span class="token function">read</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
      
      <span class="token keyword">int</span> received<span class="token punctuation">;</span>
      <span class="token comment">// 或者使用 &gt;&gt; 运算符将读取的值写入变量当中</span>
      <span class="token keyword">co_await</span> <span class="token punctuation">(</span>channel <span class="token operator">&gt;&gt;</span> received<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">}</span> <span class="token keyword">catch</span> <span class="token punctuation">(</span>std<span class="token double-colon punctuation">::</span>exception <span class="token operator">&amp;</span>e<span class="token punctuation">)</span> <span class="token punctuation">{</span>
      <span class="token comment">// 捕获 Channel 关闭时抛出的异常</span>
      <span class="token function">debug</span><span class="token punctuation">(</span><span class="token string">&quot;exception: &quot;</span><span class="token punctuation">,</span> e<span class="token punctuation">.</span><span class="token function">what</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">}</span>
  <span class="token punctuation">}</span>
<span class="token punctuation">}</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>我们的 Channel 也可以在构造的时候传入 buffer 的大小，默认没有 buffer。</p><h2 id="co-await-表达式的支持" tabindex="-1"><a class="header-anchor" href="#co-await-表达式的支持" aria-hidden="true">#</a> co_await 表达式的支持</h2><p>想要支持 <code>co_await</code> 表达式，只需要为 Channel 读写函数返回的 Awaiter 类型添加相应的 <code>await_transform</code> 函数。我们姑且认为 <code>read</code> 和 <code>write</code> 两个函数的返回值类型 <code>ReaderAwaiter</code> 和 <code>WriterAwaiter</code>，接下来就添加一个非常简单的 <code>await_transform</code> 的支持：</p><div class="language-cpp line-numbers-mode" data-ext="cpp"><pre class="language-cpp"><code><span class="token comment">// 对于 void 的实例化版本也是一样的</span>
<span class="token keyword">template</span><span class="token operator">&lt;</span><span class="token keyword">typename</span> <span class="token class-name">ResultType</span><span class="token punctuation">,</span> <span class="token keyword">typename</span> <span class="token class-name">Executor</span><span class="token operator">&gt;</span>
<span class="token keyword">struct</span> <span class="token class-name">TaskPromise</span> <span class="token punctuation">{</span>
  <span class="token punctuation">.</span><span class="token punctuation">.</span><span class="token punctuation">.</span>

  <span class="token keyword">template</span><span class="token operator">&lt;</span><span class="token keyword">typename</span> <span class="token class-name">_ValueType</span><span class="token operator">&gt;</span>
  <span class="token keyword">auto</span> <span class="token function">await_transform</span><span class="token punctuation">(</span>ReaderAwaiter<span class="token operator">&lt;</span>_ValueType<span class="token operator">&gt;</span> reader_awaiter<span class="token punctuation">)</span> <span class="token punctuation">{</span>
    reader_awaiter<span class="token punctuation">.</span>executor <span class="token operator">=</span> <span class="token operator">&amp;</span>executor<span class="token punctuation">;</span>
    <span class="token keyword">return</span> reader_awaiter<span class="token punctuation">;</span>
  <span class="token punctuation">}</span>

  <span class="token keyword">template</span><span class="token operator">&lt;</span><span class="token keyword">typename</span> <span class="token class-name">_ValueType</span><span class="token operator">&gt;</span>
  <span class="token keyword">auto</span> <span class="token function">await_transform</span><span class="token punctuation">(</span>WriterAwaiter<span class="token operator">&lt;</span>_ValueType<span class="token operator">&gt;</span> writer_awaiter<span class="token punctuation">)</span> <span class="token punctuation">{</span>
    writer_awaiter<span class="token punctuation">.</span>executor <span class="token operator">=</span> <span class="token operator">&amp;</span>executor<span class="token punctuation">;</span>
    <span class="token keyword">return</span> writer_awaiter<span class="token punctuation">;</span>
  <span class="token punctuation">}</span>

  <span class="token punctuation">.</span><span class="token punctuation">.</span><span class="token punctuation">.</span>
<span class="token punctuation">}</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>由于 <code>Channel</code> 的 buffer 和对 <code>Channel</code> 的读写本身会决定协程是否挂起或恢复，因此这些逻辑我们都将在 <code>Channel</code> 当中给出，<code>TaskPromise</code> 能做的就是把调度器传过去，当协程恢复时使用。</p><h2 id="awaiter-的实现" tabindex="-1"><a class="header-anchor" href="#awaiter-的实现" aria-hidden="true">#</a> Awaiter 的实现</h2><p>Awaiter 负责在挂起时将自己存入 <code>Channel</code>，并且在需要时恢复协程。因此除了前面看到需要在恢复执行协程时的调度器之外，Awaiter 还需要持有 <code>Channel</code>、需要读写的值。</p><p>下面是 <code>WriterAwaiter</code> 的实现：</p><div class="language-cpp line-numbers-mode" data-ext="cpp"><pre class="language-cpp"><code><span class="token keyword">template</span><span class="token operator">&lt;</span><span class="token keyword">typename</span> <span class="token class-name">ValueType</span><span class="token operator">&gt;</span>
<span class="token keyword">struct</span> <span class="token class-name">WriterAwaiter</span> <span class="token punctuation">{</span>
  Channel<span class="token operator">&lt;</span>ValueType<span class="token operator">&gt;</span> <span class="token operator">*</span>channel<span class="token punctuation">;</span>
  <span class="token comment">// 调度器不是必须的，如果没有，则直接在当前线程执行（等价于 NoopExecutor）</span>
  AbstractExecutor <span class="token operator">*</span>executor <span class="token operator">=</span> <span class="token keyword">nullptr</span><span class="token punctuation">;</span>
  <span class="token comment">// 写入 Channel 的值</span>
  ValueType _value<span class="token punctuation">;</span>
  std<span class="token double-colon punctuation">::</span>coroutine_handle<span class="token operator">&lt;</span><span class="token operator">&gt;</span> handle<span class="token punctuation">;</span>

  <span class="token function">WriterAwaiter</span><span class="token punctuation">(</span>Channel<span class="token operator">&lt;</span>ValueType<span class="token operator">&gt;</span> <span class="token operator">*</span>channel<span class="token punctuation">,</span> ValueType value<span class="token punctuation">)</span>
    <span class="token operator">:</span> <span class="token function">channel</span><span class="token punctuation">(</span>channel<span class="token punctuation">)</span><span class="token punctuation">,</span> <span class="token function">_value</span><span class="token punctuation">(</span>value<span class="token punctuation">)</span> <span class="token punctuation">{</span><span class="token punctuation">}</span>

  <span class="token keyword">bool</span> <span class="token function">await_ready</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
    <span class="token keyword">return</span> <span class="token boolean">false</span><span class="token punctuation">;</span>
  <span class="token punctuation">}</span>

  <span class="token keyword">auto</span> <span class="token function">await_suspend</span><span class="token punctuation">(</span>std<span class="token double-colon punctuation">::</span>coroutine_handle<span class="token operator">&lt;</span><span class="token operator">&gt;</span> coroutine_handle<span class="token punctuation">)</span> <span class="token punctuation">{</span>
    <span class="token comment">// 记录协程 handle，恢复时用</span>
    <span class="token keyword">this</span><span class="token operator">-&gt;</span>handle <span class="token operator">=</span> coroutine_handle<span class="token punctuation">;</span>
    <span class="token comment">// 将自身传给 Channel，Channel 内部会根据自身状态处理是否立即恢复或者挂起</span>
    channel<span class="token operator">-&gt;</span><span class="token function">try_push_writer</span><span class="token punctuation">(</span><span class="token keyword">this</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">}</span>

  <span class="token keyword">void</span> <span class="token function">await_resume</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
    <span class="token comment">// Channel 关闭时也会将挂起的读写协程恢复</span>
    <span class="token comment">// 要检查是否是关闭引起的恢复，如果是，check_closed 会抛出 Channel 关闭异常</span>
    channel<span class="token operator">-&gt;</span><span class="token function">check_closed</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">}</span>

  <span class="token comment">// Channel 当中恢复该协程时调用 resume 函数</span>
  <span class="token keyword">void</span> <span class="token function">resume</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
    <span class="token comment">// 我们将调度器调度的逻辑封装在这里</span>
    <span class="token keyword">if</span> <span class="token punctuation">(</span>executor<span class="token punctuation">)</span> <span class="token punctuation">{</span>
      executor<span class="token operator">-&gt;</span><span class="token function">execute</span><span class="token punctuation">(</span><span class="token punctuation">[</span><span class="token keyword">this</span><span class="token punctuation">]</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span> handle<span class="token punctuation">.</span><span class="token function">resume</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span> <span class="token punctuation">}</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">}</span> <span class="token keyword">else</span> <span class="token punctuation">{</span>
      handle<span class="token punctuation">.</span><span class="token function">resume</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">}</span>
  <span class="token punctuation">}</span>
<span class="token punctuation">}</span><span class="token punctuation">;</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>相对应的，还有 <code>ReaderAwaiter</code>，实现类似：</p><div class="language-cpp line-numbers-mode" data-ext="cpp"><pre class="language-cpp"><code><span class="token keyword">template</span><span class="token operator">&lt;</span><span class="token keyword">typename</span> <span class="token class-name">ValueType</span><span class="token operator">&gt;</span>
<span class="token keyword">struct</span> <span class="token class-name">ReaderAwaiter</span> <span class="token punctuation">{</span>
  Channel<span class="token operator">&lt;</span>ValueType<span class="token operator">&gt;</span> <span class="token operator">*</span>channel<span class="token punctuation">;</span>
  AbstractExecutor <span class="token operator">*</span>executor <span class="token operator">=</span> <span class="token keyword">nullptr</span><span class="token punctuation">;</span>
  ValueType _value<span class="token punctuation">;</span>
  <span class="token comment">// 用于 channel &gt;&gt; received; 这种情况</span>
  <span class="token comment">// 需要将变量的地址传入，协程恢复时写入变量内存</span>
  ValueType<span class="token operator">*</span> p_value <span class="token operator">=</span> <span class="token keyword">nullptr</span><span class="token punctuation">;</span>
  std<span class="token double-colon punctuation">::</span>coroutine_handle<span class="token operator">&lt;</span><span class="token operator">&gt;</span> handle<span class="token punctuation">;</span>

  <span class="token keyword">explicit</span> <span class="token function">ReaderAwaiter</span><span class="token punctuation">(</span>Channel<span class="token operator">&lt;</span>ValueType<span class="token operator">&gt;</span> <span class="token operator">*</span>channel<span class="token punctuation">)</span> <span class="token operator">:</span> <span class="token function">channel</span><span class="token punctuation">(</span>channel<span class="token punctuation">)</span> <span class="token punctuation">{</span><span class="token punctuation">}</span>

  <span class="token keyword">bool</span> <span class="token function">await_ready</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span> <span class="token keyword">return</span> <span class="token boolean">false</span><span class="token punctuation">;</span> <span class="token punctuation">}</span>

  <span class="token keyword">auto</span> <span class="token function">await_suspend</span><span class="token punctuation">(</span>std<span class="token double-colon punctuation">::</span>coroutine_handle<span class="token operator">&lt;</span><span class="token operator">&gt;</span> coroutine_handle<span class="token punctuation">)</span> <span class="token punctuation">{</span>
    <span class="token keyword">this</span><span class="token operator">-&gt;</span>handle <span class="token operator">=</span> coroutine_handle<span class="token punctuation">;</span>
    <span class="token comment">// 将自身传给 Channel，Channel 内部会根据自身状态处理是否立即恢复或者挂起</span>
    channel<span class="token operator">-&gt;</span><span class="token function">try_push_reader</span><span class="token punctuation">(</span><span class="token keyword">this</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">}</span>

  <span class="token keyword">int</span> <span class="token function">await_resume</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
    <span class="token comment">// Channel 关闭时也会将挂起的读写协程恢复</span>
    <span class="token comment">// 要检查是否是关闭引起的恢复，如果是，check_closed 会抛出 Channel 关闭异常</span>
    channel<span class="token operator">-&gt;</span><span class="token function">check_closed</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token keyword">return</span> _value<span class="token punctuation">;</span>
  <span class="token punctuation">}</span>

  <span class="token comment">// Channel 当中正常恢复读协程时调用 resume 函数</span>
  <span class="token keyword">void</span> <span class="token function">resume</span><span class="token punctuation">(</span>ValueType value<span class="token punctuation">)</span> <span class="token punctuation">{</span>
    <span class="token keyword">this</span><span class="token operator">-&gt;</span>_value <span class="token operator">=</span> value<span class="token punctuation">;</span>
    <span class="token keyword">if</span> <span class="token punctuation">(</span>p_value<span class="token punctuation">)</span> <span class="token punctuation">{</span>
      <span class="token operator">*</span>p_value <span class="token operator">=</span> value<span class="token punctuation">;</span>
    <span class="token punctuation">}</span>
    <span class="token function">resume</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">}</span>

  <span class="token comment">// Channel 关闭时调用 resume() 函数来恢复该协程</span>
  <span class="token comment">// 在 await_resume 当中，如果 Channel 关闭，会抛出 Channel 关闭异常</span>
  <span class="token keyword">void</span> <span class="token function">resume</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
    <span class="token keyword">if</span> <span class="token punctuation">(</span>executor<span class="token punctuation">)</span> <span class="token punctuation">{</span>
      executor<span class="token operator">-&gt;</span><span class="token function">execute</span><span class="token punctuation">(</span><span class="token punctuation">[</span><span class="token keyword">this</span><span class="token punctuation">]</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span> handle<span class="token punctuation">.</span><span class="token function">resume</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span> <span class="token punctuation">}</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">}</span> <span class="token keyword">else</span> <span class="token punctuation">{</span>
      handle<span class="token punctuation">.</span><span class="token function">resume</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">}</span>
  <span class="token punctuation">}</span>
<span class="token punctuation">}</span><span class="token punctuation">;</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>简单说来，Awaiter 的功能就是：</p><ol><li>负责用协程的调度器在需要时恢复协程</li><li>处理读写的值的传递</li></ol><h2 id="channel-的实现" tabindex="-1"><a class="header-anchor" href="#channel-的实现" aria-hidden="true">#</a> Channel 的实现</h2><p>接下来我们给出 <code>Channel</code> 当中根据 buffer 的情况来处理读写两端的挂起和恢复的逻辑。</p><h3 id="channel-的基本结构" tabindex="-1"><a class="header-anchor" href="#channel-的基本结构" aria-hidden="true">#</a> Channel 的基本结构</h3><p>我们先来看一下 <code>Channel</code> 的基本结构：</p><div class="language-cpp line-numbers-mode" data-ext="cpp"><pre class="language-cpp"><code><span class="token keyword">template</span><span class="token operator">&lt;</span><span class="token keyword">typename</span> <span class="token class-name">ValueType</span><span class="token operator">&gt;</span>
<span class="token keyword">struct</span> <span class="token class-name">Channel</span> <span class="token punctuation">{</span>
  <span class="token punctuation">.</span><span class="token punctuation">.</span><span class="token punctuation">.</span> 

  <span class="token keyword">struct</span> <span class="token class-name">ChannelClosedException</span> <span class="token operator">:</span> <span class="token base-clause">std<span class="token double-colon punctuation">::</span><span class="token class-name">exception</span></span> <span class="token punctuation">{</span>
    <span class="token keyword">const</span> <span class="token keyword">char</span> <span class="token operator">*</span><span class="token function">what</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token keyword">const</span> <span class="token keyword">noexcept</span> <span class="token keyword">override</span> <span class="token punctuation">{</span>
      <span class="token keyword">return</span> <span class="token string">&quot;Channel is closed.&quot;</span><span class="token punctuation">;</span>
    <span class="token punctuation">}</span>
  <span class="token punctuation">}</span><span class="token punctuation">;</span>

  <span class="token keyword">void</span> <span class="token function">check_closed</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
    <span class="token comment">// 如果已经关闭，则抛出异常</span>
    <span class="token keyword">if</span> <span class="token punctuation">(</span><span class="token operator">!</span>_is_active<span class="token punctuation">.</span><span class="token function">load</span><span class="token punctuation">(</span>std<span class="token double-colon punctuation">::</span>memory_order_relaxed<span class="token punctuation">)</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
      <span class="token keyword">throw</span> <span class="token function">ChannelClosedException</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">}</span>
  <span class="token punctuation">}</span>
 

  <span class="token keyword">explicit</span> <span class="token function">Channel</span><span class="token punctuation">(</span><span class="token keyword">int</span> capacity <span class="token operator">=</span> <span class="token number">0</span><span class="token punctuation">)</span> <span class="token operator">:</span> <span class="token function">buffer_capacity</span><span class="token punctuation">(</span>capacity<span class="token punctuation">)</span> <span class="token punctuation">{</span>
    _is_active<span class="token punctuation">.</span><span class="token function">store</span><span class="token punctuation">(</span><span class="token boolean">true</span><span class="token punctuation">,</span> std<span class="token double-colon punctuation">::</span>memory_order_relaxed<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">}</span>

  <span class="token comment">// true 表示 Channel 尚未关闭</span>
  <span class="token keyword">bool</span> <span class="token function">is_active</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
    <span class="token keyword">return</span> _is_active<span class="token punctuation">.</span><span class="token function">load</span><span class="token punctuation">(</span>std<span class="token double-colon punctuation">::</span>memory_order_relaxed<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">}</span>

  <span class="token comment">// 关闭 Channel</span>
  <span class="token keyword">void</span> <span class="token function">close</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
    <span class="token keyword">bool</span> expect <span class="token operator">=</span> <span class="token boolean">true</span><span class="token punctuation">;</span>
    <span class="token comment">// 判断如果已经关闭，则不再重复操作</span>
    <span class="token comment">// 比较 _is_active 为 true 时才会完成设置操作，并且返回 true</span>
    <span class="token keyword">if</span><span class="token punctuation">(</span>_is_active<span class="token punctuation">.</span><span class="token function">compare_exchange_strong</span><span class="token punctuation">(</span>expect<span class="token punctuation">,</span> <span class="token boolean">false</span><span class="token punctuation">,</span> std<span class="token double-colon punctuation">::</span>memory_order_relaxed<span class="token punctuation">)</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
      <span class="token comment">// 清理资源</span>
      <span class="token function">clean_up</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">}</span>
  <span class="token punctuation">}</span>

  <span class="token comment">// 不希望 Channel 被移动或者复制</span>
  <span class="token function">Channel</span><span class="token punctuation">(</span>Channel <span class="token operator">&amp;&amp;</span>channel<span class="token punctuation">)</span> <span class="token operator">=</span> <span class="token keyword">delete</span><span class="token punctuation">;</span>
  <span class="token function">Channel</span><span class="token punctuation">(</span>Channel <span class="token operator">&amp;</span><span class="token punctuation">)</span> <span class="token operator">=</span> <span class="token keyword">delete</span><span class="token punctuation">;</span>
  Channel <span class="token operator">&amp;</span><span class="token keyword">operator</span><span class="token operator">=</span><span class="token punctuation">(</span>Channel <span class="token operator">&amp;</span><span class="token punctuation">)</span> <span class="token operator">=</span> <span class="token keyword">delete</span><span class="token punctuation">;</span>

  <span class="token comment">// 销毁时关闭</span>
  <span class="token operator">~</span><span class="token function">Channel</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
    <span class="token function">close</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">}</span>

 <span class="token keyword">private</span><span class="token operator">:</span>
  <span class="token comment">// buffer 的容量</span>
  <span class="token keyword">int</span> buffer_capacity<span class="token punctuation">;</span>
  std<span class="token double-colon punctuation">::</span>queue<span class="token operator">&lt;</span>ValueType<span class="token operator">&gt;</span> buffer<span class="token punctuation">;</span>
  <span class="token comment">// buffer 已满时，新来的写入者需要挂起保存在这里等待恢复</span>
  std<span class="token double-colon punctuation">::</span>list<span class="token operator">&lt;</span>WriterAwaiter<span class="token operator">&lt;</span>ValueType<span class="token operator">&gt;</span> <span class="token operator">*</span><span class="token operator">&gt;</span> writer_list<span class="token punctuation">;</span>
  <span class="token comment">// buffer 为空时，新来的读取者需要挂起保存在这里等待恢复</span>
  std<span class="token double-colon punctuation">::</span>list<span class="token operator">&lt;</span>ReaderAwaiter<span class="token operator">&lt;</span>ValueType<span class="token operator">&gt;</span> <span class="token operator">*</span><span class="token operator">&gt;</span> reader_list<span class="token punctuation">;</span>
  <span class="token comment">// Channel 的状态标识</span>
  std<span class="token double-colon punctuation">::</span>atomic<span class="token operator">&lt;</span><span class="token keyword">bool</span><span class="token operator">&gt;</span> _is_active<span class="token punctuation">;</span>

  std<span class="token double-colon punctuation">::</span>mutex channel_lock<span class="token punctuation">;</span>
  std<span class="token double-colon punctuation">::</span>condition_variable channel_condition<span class="token punctuation">;</span>

  <span class="token keyword">void</span> <span class="token function">clean_up</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
    std<span class="token double-colon punctuation">::</span>lock_guard <span class="token function">lock</span><span class="token punctuation">(</span>channel_lock<span class="token punctuation">)</span><span class="token punctuation">;</span>

    <span class="token comment">// 需要对已经挂起等待的协程予以恢复执行</span>
    <span class="token keyword">for</span> <span class="token punctuation">(</span><span class="token keyword">auto</span> writer <span class="token operator">:</span> writer_list<span class="token punctuation">)</span> <span class="token punctuation">{</span>
      writer<span class="token operator">-&gt;</span><span class="token function">resume</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">}</span>
    writer_list<span class="token punctuation">.</span><span class="token function">clear</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

    <span class="token keyword">for</span> <span class="token punctuation">(</span><span class="token keyword">auto</span> reader <span class="token operator">:</span> reader_list<span class="token punctuation">)</span> <span class="token punctuation">{</span>
      reader<span class="token operator">-&gt;</span><span class="token function">resume</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">}</span>
    reader_list<span class="token punctuation">.</span><span class="token function">clear</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

    <span class="token comment">// 清空 buffer</span>
    <span class="token keyword">decltype</span><span class="token punctuation">(</span>buffer<span class="token punctuation">)</span> empty_buffer<span class="token punctuation">;</span>
    std<span class="token double-colon punctuation">::</span><span class="token function">swap</span><span class="token punctuation">(</span>buffer<span class="token punctuation">,</span> empty_buffer<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">}</span>
<span class="token punctuation">}</span><span class="token punctuation">;</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>通过了解 <code>Channel</code> 的基本结构，我们已经知道了 <code>Channel</code> 当中存了哪些信息。接下来我们就要填之前埋下的坑了：分别是在协程当中读写值用到的 <code>read</code> 和 <code>write</code> 函数，以及在挂起协程时 Awaiter 当中调用的 <code>try_push_writer</code> 和 <code>try_push_reader</code>。</p><h3 id="read-和-write" tabindex="-1"><a class="header-anchor" href="#read-和-write" aria-hidden="true">#</a> read 和 write</h3><p>这两个函数也没什么实质的功能，就是把 Awaiter 创建出来，然后填充信息再返回：</p><div class="language-cpp line-numbers-mode" data-ext="cpp"><pre class="language-cpp"><code><span class="token keyword">template</span><span class="token operator">&lt;</span><span class="token keyword">typename</span> <span class="token class-name">ValueType</span><span class="token operator">&gt;</span>
<span class="token keyword">struct</span> <span class="token class-name">Channel</span> <span class="token punctuation">{</span>
  <span class="token keyword">auto</span> <span class="token function">write</span><span class="token punctuation">(</span>ValueType value<span class="token punctuation">)</span> <span class="token punctuation">{</span>
    <span class="token function">check_closed</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token keyword">return</span> <span class="token generic-function"><span class="token function">WriterAwaiter</span><span class="token generic class-name"><span class="token operator">&lt;</span>ValueType<span class="token operator">&gt;</span></span></span><span class="token punctuation">(</span><span class="token keyword">this</span><span class="token punctuation">,</span> value<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">}</span>

  <span class="token keyword">auto</span> <span class="token keyword">operator</span><span class="token operator">&lt;&lt;</span><span class="token punctuation">(</span>ValueType value<span class="token punctuation">)</span> <span class="token punctuation">{</span>
    <span class="token keyword">return</span> <span class="token function">write</span><span class="token punctuation">(</span>value<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">}</span>

  <span class="token keyword">auto</span> <span class="token function">read</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
    <span class="token function">check_closed</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token keyword">return</span> <span class="token generic-function"><span class="token function">ReaderAwaiter</span><span class="token generic class-name"><span class="token operator">&lt;</span>ValueType<span class="token operator">&gt;</span></span></span><span class="token punctuation">(</span><span class="token keyword">this</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">}</span>

  <span class="token keyword">auto</span> <span class="token keyword">operator</span><span class="token operator">&gt;&gt;</span><span class="token punctuation">(</span>ValueType <span class="token operator">&amp;</span>value_ref<span class="token punctuation">)</span> <span class="token punctuation">{</span>
    <span class="token keyword">auto</span> awaiter <span class="token operator">=</span>  <span class="token function">read</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token comment">// 保存待赋值的变量的地址，方便后续写入</span>
    awaiter<span class="token punctuation">.</span>p_value <span class="token operator">=</span> <span class="token operator">&amp;</span>value_ref<span class="token punctuation">;</span>
    <span class="token keyword">return</span> awaiter<span class="token punctuation">;</span>
  <span class="token punctuation">}</span>

  <span class="token punctuation">.</span><span class="token punctuation">.</span><span class="token punctuation">.</span>
<span class="token punctuation">}</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>这当中除了 <code>operator&gt;&gt;</code> 的实现需要多保存一个变量的地址以外，大家只需要注意一下对于 <code>check_closed</code> 的调用即可，它的功能很简单：在 <code>Channel</code> 关闭之后调用它会抛出 <code>ChannelClosedException</code>。</p><h3 id="try-push-writer-和-try-push-reader" tabindex="-1"><a class="header-anchor" href="#try-push-writer-和-try-push-reader" aria-hidden="true">#</a> <code>try_push_writer</code> 和 <code>try_push_reader</code></h3><p>这是 <code>Channel</code> 当中最为核心的两个函数了，他们的功能正好相反。</p><p><code>try_push_writer</code> 调用时，意味着有一个新的写入者挂起准备写入值到 <code>Channel</code> 当中，这时候有以下几种情况：</p><ol><li><code>Channel</code> 当中有挂起的读取者，写入者直接将要写入的值传给读取者，恢复读取者，恢复写入者</li><li><code>Channel</code> 的 buffer 没满，写入者把值写入 buffer，然后立即恢复执行。</li><li><code>Channel</code> 的 buffer 已满，则写入者被存入挂起列表（writer_list）等待新的读取者读取时再恢复。</li></ol><p>了解了思路之后，它的实现就不难写出了，具体如下：</p><div class="language-cpp line-numbers-mode" data-ext="cpp"><pre class="language-cpp"><code><span class="token keyword">void</span> <span class="token function">try_push_writer</span><span class="token punctuation">(</span>WriterAwaiter<span class="token operator">&lt;</span>ValueType<span class="token operator">&gt;</span> <span class="token operator">*</span>writer_awaiter<span class="token punctuation">)</span> <span class="token punctuation">{</span>
  std<span class="token double-colon punctuation">::</span>unique_lock <span class="token function">lock</span><span class="token punctuation">(</span>channel_lock<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token function">check_closed</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token comment">// 检查有没有挂起的读取者，对应情况 1</span>
  <span class="token keyword">if</span> <span class="token punctuation">(</span><span class="token operator">!</span>reader_list<span class="token punctuation">.</span><span class="token function">empty</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
    <span class="token keyword">auto</span> reader <span class="token operator">=</span> reader_list<span class="token punctuation">.</span><span class="token function">front</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    reader_list<span class="token punctuation">.</span><span class="token function">pop_front</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    lock<span class="token punctuation">.</span><span class="token function">unlock</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

    reader<span class="token operator">-&gt;</span><span class="token function">resume</span><span class="token punctuation">(</span>writer_awaiter<span class="token operator">-&gt;</span>_value<span class="token punctuation">)</span><span class="token punctuation">;</span>
    writer_awaiter<span class="token operator">-&gt;</span><span class="token function">resume</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token keyword">return</span><span class="token punctuation">;</span>
  <span class="token punctuation">}</span>

  <span class="token comment">// buffer 未满，对应情况 2</span>
  <span class="token keyword">if</span> <span class="token punctuation">(</span>buffer<span class="token punctuation">.</span><span class="token function">size</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">&lt;</span> buffer_capacity<span class="token punctuation">)</span> <span class="token punctuation">{</span>
    buffer<span class="token punctuation">.</span><span class="token function">push</span><span class="token punctuation">(</span>writer_awaiter<span class="token operator">-&gt;</span>_value<span class="token punctuation">)</span><span class="token punctuation">;</span>
    lock<span class="token punctuation">.</span><span class="token function">unlock</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    writer_awaiter<span class="token operator">-&gt;</span><span class="token function">resume</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token keyword">return</span><span class="token punctuation">;</span>
  <span class="token punctuation">}</span>

  <span class="token comment">// buffer 已满，对应情况 3</span>
  writer_list<span class="token punctuation">.</span><span class="token function">push_back</span><span class="token punctuation">(</span>writer_awaiter<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">}</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>相对应的，<code>try_push_reader</code> 调用时，意味着有一个新的读取者挂起准备从 <code>Channel</code> 当中读取值，这时候有以下几种情况：</p><ol><li><code>Channel</code> 的 buffer 非空，读取者从 buffer 当中读取值，如果此时有挂起的写入者，需要去队头的写入者将值写入 buffer，然后立即恢复该写入者和当次的读取者。</li><li><code>Channel</code> 当中有挂起的写入者，写入者直接将要写入的值传给读取者，恢复读取者，恢复写入者</li><li><code>Channel</code> 的 buffer 为空，则读取者被存入挂起列表（reader_list）等待新的写入者写入时再恢复。</li></ol><p>接下来是具体的实现：</p><div class="language-cpp line-numbers-mode" data-ext="cpp"><pre class="language-cpp"><code><span class="token keyword">void</span> <span class="token function">try_push_reader</span><span class="token punctuation">(</span>ReaderAwaiter<span class="token operator">&lt;</span>ValueType<span class="token operator">&gt;</span> <span class="token operator">*</span>reader_awaiter<span class="token punctuation">)</span> <span class="token punctuation">{</span>
  std<span class="token double-colon punctuation">::</span>unique_lock <span class="token function">lock</span><span class="token punctuation">(</span>channel_lock<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token function">check_closed</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

  <span class="token comment">// buffer 非空，对应情况 1</span>
  <span class="token keyword">if</span> <span class="token punctuation">(</span><span class="token operator">!</span>buffer<span class="token punctuation">.</span><span class="token function">empty</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
    <span class="token keyword">auto</span> value <span class="token operator">=</span> buffer<span class="token punctuation">.</span><span class="token function">front</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    buffer<span class="token punctuation">.</span><span class="token function">pop</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

    <span class="token keyword">if</span> <span class="token punctuation">(</span><span class="token operator">!</span>writer_list<span class="token punctuation">.</span><span class="token function">empty</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
      <span class="token comment">// 有挂起的写入者要及时将其写入 buffer 并恢复执行</span>
      <span class="token keyword">auto</span> writer <span class="token operator">=</span> writer_list<span class="token punctuation">.</span><span class="token function">front</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
      writer_list<span class="token punctuation">.</span><span class="token function">pop_front</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
      buffer<span class="token punctuation">.</span><span class="token function">push</span><span class="token punctuation">(</span>writer<span class="token operator">-&gt;</span>_value<span class="token punctuation">)</span><span class="token punctuation">;</span>
      lock<span class="token punctuation">.</span><span class="token function">unlock</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

      writer<span class="token operator">-&gt;</span><span class="token function">resume</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">}</span> <span class="token keyword">else</span> <span class="token punctuation">{</span>
      lock<span class="token punctuation">.</span><span class="token function">unlock</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">}</span>

    reader_awaiter<span class="token operator">-&gt;</span><span class="token function">resume</span><span class="token punctuation">(</span>value<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token keyword">return</span><span class="token punctuation">;</span>
  <span class="token punctuation">}</span>

  <span class="token comment">// 有写入者挂起，对应情况 2</span>
  <span class="token keyword">if</span> <span class="token punctuation">(</span><span class="token operator">!</span>writer_list<span class="token punctuation">.</span><span class="token function">empty</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
    <span class="token keyword">auto</span> writer <span class="token operator">=</span> writer_list<span class="token punctuation">.</span><span class="token function">front</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    writer_list<span class="token punctuation">.</span><span class="token function">pop_front</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    lock<span class="token punctuation">.</span><span class="token function">unlock</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

    reader_awaiter<span class="token operator">-&gt;</span><span class="token function">resume</span><span class="token punctuation">(</span>writer<span class="token operator">-&gt;</span>_value<span class="token punctuation">)</span><span class="token punctuation">;</span>
    writer<span class="token operator">-&gt;</span><span class="token function">resume</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token keyword">return</span><span class="token punctuation">;</span>
  <span class="token punctuation">}</span>

  <span class="token comment">// buffer 为空，对应情况 3</span>
  reader_list<span class="token punctuation">.</span><span class="token function">push_back</span><span class="token punctuation">(</span>reader_awaiter<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">}</span>

</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>至此，我们已经完整给出 <code>Channel</code> 的实现。</p><blockquote><p><strong>说明</strong>：我们当然也可以在 <code>await_ready</code> 的时候提前做一次判断，如果命中第 1、2 两种情况可以直接让写入/读取协程不挂起继续执行，这样可以避免写入/读取者的无效挂起。为了方便介绍，本文就不再做相关优化了。</p></blockquote><h3 id="监听协程的提前销毁" tabindex="-1"><a class="header-anchor" href="#监听协程的提前销毁" aria-hidden="true">#</a> 监听协程的提前销毁</h3><p>截止目前，我们给出的 <code>Channel</code> 仍然有个小小的限制，即 <code>Channel</code> 对象必须在持有 <code>Channel</code> 实例的协程退出之前关闭。</p><p>这主要是因为我们在 <code>Channel</code> 当中持有了已经挂起的读写协程的 <code>Awaiter</code> 的指针，一旦协程销毁，这些 <code>Awaiter</code> 也会被销毁，<code>Channel</code> 在关闭时试图恢复这些读写协程时就会出现程序崩溃（访问了野指针）。</p><p>为了解决这个问题，我们需要在 <code>Awaiter</code> 销毁时主动将自己的指针从 <code>Channel</code> 当中移除。以 <code>ReaderAwaiter</code> 为例：</p><div class="language-cpp line-numbers-mode" data-ext="cpp"><pre class="language-cpp"><code><span class="token keyword">template</span><span class="token operator">&lt;</span><span class="token keyword">typename</span> <span class="token class-name">ValueType</span><span class="token operator">&gt;</span>
<span class="token keyword">struct</span> <span class="token class-name">ReaderAwaiter</span> <span class="token punctuation">{</span>
  <span class="token punctuation">.</span><span class="token punctuation">.</span><span class="token punctuation">.</span>

  <span class="token comment">// 实现移动构造函数，主要目的是将原对象的 channel 置为空</span>
  <span class="token function">ReaderAwaiter</span><span class="token punctuation">(</span>ReaderAwaiter <span class="token operator">&amp;&amp;</span>other<span class="token punctuation">)</span> <span class="token keyword">noexcept</span>
      <span class="token operator">:</span> <span class="token function">channel</span><span class="token punctuation">(</span>std<span class="token double-colon punctuation">::</span><span class="token function">exchange</span><span class="token punctuation">(</span>other<span class="token punctuation">.</span>channel<span class="token punctuation">,</span> <span class="token keyword">nullptr</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">,</span>
        <span class="token function">executor</span><span class="token punctuation">(</span>std<span class="token double-colon punctuation">::</span><span class="token function">exchange</span><span class="token punctuation">(</span>other<span class="token punctuation">.</span>executor<span class="token punctuation">,</span> <span class="token keyword">nullptr</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">,</span>
        <span class="token function">_value</span><span class="token punctuation">(</span>other<span class="token punctuation">.</span>_value<span class="token punctuation">)</span><span class="token punctuation">,</span>
        <span class="token function">p_value</span><span class="token punctuation">(</span>std<span class="token double-colon punctuation">::</span><span class="token function">exchange</span><span class="token punctuation">(</span>other<span class="token punctuation">.</span>p_value<span class="token punctuation">,</span> <span class="token keyword">nullptr</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">,</span>
        <span class="token function">handle</span><span class="token punctuation">(</span>other<span class="token punctuation">.</span>handle<span class="token punctuation">)</span> <span class="token punctuation">{</span><span class="token punctuation">}</span>

  <span class="token punctuation">.</span><span class="token punctuation">.</span><span class="token punctuation">.</span>

  <span class="token keyword">int</span> <span class="token function">await_resume</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
    channel<span class="token operator">-&gt;</span><span class="token function">check_closed</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token comment">// 协程恢复，channel 已经没用了</span>
    channel <span class="token operator">=</span> <span class="token keyword">nullptr</span><span class="token punctuation">;</span>
    <span class="token keyword">return</span> _value<span class="token punctuation">;</span>
  <span class="token punctuation">}</span>

  <span class="token punctuation">.</span><span class="token punctuation">.</span><span class="token punctuation">.</span>

  <span class="token operator">~</span><span class="token function">ReaderAwaiter</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
    <span class="token comment">// channel 不为空，说明协程提前被销毁了</span>
    <span class="token comment">// 调用 channel 的 remove_reader 将自己直接移除</span>
    <span class="token keyword">if</span> <span class="token punctuation">(</span>channel<span class="token punctuation">)</span> channel<span class="token operator">-&gt;</span><span class="token function">remove_reader</span><span class="token punctuation">(</span><span class="token keyword">this</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">}</span>
<span class="token punctuation">}</span><span class="token punctuation">;</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>我们在 <code>ReaderAwaiter</code> 的析构函数当中主动检查并移除了自己的指针，避免后续 <code>Channel</code> 对自身指针的无效访问。</p><p>对应的，<code>Channel</code> 当中也需要增加 <code>remove_reader</code> 函数：</p><div class="language-cpp line-numbers-mode" data-ext="cpp"><pre class="language-cpp"><code><span class="token keyword">template</span><span class="token operator">&lt;</span><span class="token keyword">typename</span> <span class="token class-name">ValueType</span><span class="token operator">&gt;</span>
<span class="token keyword">struct</span> <span class="token class-name">Channel</span> <span class="token punctuation">{</span>

  <span class="token punctuation">.</span><span class="token punctuation">.</span><span class="token punctuation">.</span>

  <span class="token keyword">void</span> <span class="token function">remove_reader</span><span class="token punctuation">(</span>ReaderAwaiter<span class="token operator">&lt;</span>ValueType<span class="token operator">&gt;</span> <span class="token operator">*</span>reader_awaiter<span class="token punctuation">)</span> <span class="token punctuation">{</span>
    <span class="token comment">// 并发环境，修改 reader_list 的操作都需要加锁</span>
    std<span class="token double-colon punctuation">::</span>lock_guard <span class="token function">lock</span><span class="token punctuation">(</span>channel_lock<span class="token punctuation">)</span><span class="token punctuation">;</span>
    reader_list<span class="token punctuation">.</span><span class="token function">remove</span><span class="token punctuation">(</span>reader_awaiter<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token punctuation">}</span>
<span class="token punctuation">}</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p><code>WriterAwaiter</code> 的修改类似，不再赘述。</p><p>这样修改之后，即使我们把正在等待读写 <code>Channel</code> 的协程提前结束销毁，也不会影响 <code>Channel</code> 的继续使用以及后续的正常关闭了。</p><h2 id="小试牛刀" tabindex="-1"><a class="header-anchor" href="#小试牛刀" aria-hidden="true">#</a> 小试牛刀</h2><p>我们终于又实现了一个新的玩具，现在我们来给它通电试试效果。</p><div class="language-cpp line-numbers-mode" data-ext="cpp"><pre class="language-cpp"><code><span class="token keyword">using</span> <span class="token keyword">namespace</span> std<span class="token double-colon punctuation">::</span>chrono_literals<span class="token punctuation">;</span>

Task<span class="token operator">&lt;</span><span class="token keyword">void</span><span class="token punctuation">,</span> LooperExecutor<span class="token operator">&gt;</span> <span class="token function">Producer</span><span class="token punctuation">(</span>Channel<span class="token operator">&lt;</span><span class="token keyword">int</span><span class="token operator">&gt;</span> <span class="token operator">&amp;</span>channel<span class="token punctuation">)</span> <span class="token punctuation">{</span>
  <span class="token keyword">int</span> i <span class="token operator">=</span> <span class="token number">0</span><span class="token punctuation">;</span>
  <span class="token keyword">while</span> <span class="token punctuation">(</span>i <span class="token operator">&lt;</span> <span class="token number">10</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
    <span class="token function">debug</span><span class="token punctuation">(</span><span class="token string">&quot;send: &quot;</span><span class="token punctuation">,</span> i<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token comment">// 或者使用 write 函数：co_await channel.write(i++);</span>
    <span class="token keyword">co_await</span> <span class="token punctuation">(</span>channel <span class="token operator">&lt;&lt;</span> i<span class="token operator">++</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token keyword">co_await</span> <span class="token number">300</span>ms<span class="token punctuation">;</span>
  <span class="token punctuation">}</span>

  channel<span class="token punctuation">.</span><span class="token function">close</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token function">debug</span><span class="token punctuation">(</span><span class="token string">&quot;close channel, exit.&quot;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">}</span>

Task<span class="token operator">&lt;</span><span class="token keyword">void</span><span class="token punctuation">,</span> LooperExecutor<span class="token operator">&gt;</span> <span class="token function">Consumer</span><span class="token punctuation">(</span>Channel<span class="token operator">&lt;</span><span class="token keyword">int</span><span class="token operator">&gt;</span> <span class="token operator">&amp;</span>channel<span class="token punctuation">)</span> <span class="token punctuation">{</span>
  <span class="token keyword">while</span> <span class="token punctuation">(</span>channel<span class="token punctuation">.</span><span class="token function">is_active</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
    <span class="token keyword">try</span> <span class="token punctuation">{</span>
      <span class="token comment">// 或者使用 read 函数：auto received = co_await channel.read();</span>
      <span class="token keyword">int</span> received<span class="token punctuation">;</span>
      <span class="token keyword">co_await</span> <span class="token punctuation">(</span>channel <span class="token operator">&gt;&gt;</span> received<span class="token punctuation">)</span><span class="token punctuation">;</span>
      <span class="token function">debug</span><span class="token punctuation">(</span><span class="token string">&quot;receive: &quot;</span><span class="token punctuation">,</span> received<span class="token punctuation">)</span><span class="token punctuation">;</span>
      <span class="token keyword">co_await</span> <span class="token number">2</span>s<span class="token punctuation">;</span>
    <span class="token punctuation">}</span> <span class="token keyword">catch</span> <span class="token punctuation">(</span>std<span class="token double-colon punctuation">::</span>exception <span class="token operator">&amp;</span>e<span class="token punctuation">)</span> <span class="token punctuation">{</span>
      <span class="token function">debug</span><span class="token punctuation">(</span><span class="token string">&quot;exception: &quot;</span><span class="token punctuation">,</span> e<span class="token punctuation">.</span><span class="token function">what</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">}</span>
  <span class="token punctuation">}</span>

  <span class="token function">debug</span><span class="token punctuation">(</span><span class="token string">&quot;exit.&quot;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">}</span>

Task<span class="token operator">&lt;</span><span class="token keyword">void</span><span class="token punctuation">,</span> LooperExecutor<span class="token operator">&gt;</span> <span class="token function">Consumer2</span><span class="token punctuation">(</span>Channel<span class="token operator">&lt;</span><span class="token keyword">int</span><span class="token operator">&gt;</span> <span class="token operator">&amp;</span>channel<span class="token punctuation">)</span> <span class="token punctuation">{</span>
  <span class="token keyword">while</span> <span class="token punctuation">(</span>channel<span class="token punctuation">.</span><span class="token function">is_active</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
    <span class="token keyword">try</span> <span class="token punctuation">{</span>
      <span class="token keyword">auto</span> received <span class="token operator">=</span> <span class="token keyword">co_await</span> channel<span class="token punctuation">.</span><span class="token function">read</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
      <span class="token function">debug</span><span class="token punctuation">(</span><span class="token string">&quot;receive2: &quot;</span><span class="token punctuation">,</span> received<span class="token punctuation">)</span><span class="token punctuation">;</span>
      <span class="token keyword">co_await</span> <span class="token number">3</span>s<span class="token punctuation">;</span>
    <span class="token punctuation">}</span> <span class="token keyword">catch</span> <span class="token punctuation">(</span>std<span class="token double-colon punctuation">::</span>exception <span class="token operator">&amp;</span>e<span class="token punctuation">)</span> <span class="token punctuation">{</span>
      <span class="token function">debug</span><span class="token punctuation">(</span><span class="token string">&quot;exception2: &quot;</span><span class="token punctuation">,</span> e<span class="token punctuation">.</span><span class="token function">what</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">}</span>
  <span class="token punctuation">}</span>

  <span class="token function">debug</span><span class="token punctuation">(</span><span class="token string">&quot;exit.&quot;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">}</span>

<span class="token keyword">int</span> <span class="token function">main</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
  <span class="token keyword">auto</span> channel <span class="token operator">=</span> <span class="token generic-function"><span class="token function">Channel</span><span class="token generic class-name"><span class="token operator">&lt;</span><span class="token keyword">int</span><span class="token operator">&gt;</span></span></span><span class="token punctuation">(</span><span class="token number">2</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token keyword">auto</span> producer <span class="token operator">=</span> <span class="token function">Producer</span><span class="token punctuation">(</span>channel<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token keyword">auto</span> consumer <span class="token operator">=</span> <span class="token function">Consumer</span><span class="token punctuation">(</span>channel<span class="token punctuation">)</span><span class="token punctuation">;</span>
  <span class="token keyword">auto</span> consumer2 <span class="token operator">=</span> <span class="token function">Consumer2</span><span class="token punctuation">(</span>channel<span class="token punctuation">)</span><span class="token punctuation">;</span>
 
  <span class="token comment">// 等待协程执行完成再退出</span>
  producer<span class="token punctuation">.</span><span class="token function">get_result</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  consumer<span class="token punctuation">.</span><span class="token function">get_result</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  consumer2<span class="token punctuation">.</span><span class="token function">get_result</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

  <span class="token keyword">return</span> <span class="token number">0</span><span class="token punctuation">;</span>
<span class="token punctuation">}</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>例子非常简单，我们用一个写入者两个接收者向 <code>Channel</code> 当中读写数据，为了让示例更加凌乱，我们还加了一点点延时，运行结果如下：</p><div class="language-text line-numbers-mode" data-ext="text"><pre class="language-text"><code>08:39:58.129 [Thread-26004] (main.cpp:15) Producer: send:  0
08:39:58.130 [Thread-27716] (main.cpp:31) Consumer: receive:  0
08:39:58.443 [Thread-26004] (main.cpp:15) Producer: send:  1
08:39:58.444 [Thread-17956] (main.cpp:45) Consumer2: receive2:  1
08:39:58.759 [Thread-26004] (main.cpp:15) Producer: send:  2
08:39:59.071 [Thread-26004] (main.cpp:15) Producer: send:  3
08:39:59.382 [Thread-26004] (main.cpp:15) Producer: send:  4
08:40:00.145 [Thread-27716] (main.cpp:31) Consumer: receive:  4
08:40:00.454 [Thread-26004] (main.cpp:15) Producer: send:  5
08:40:01.448 [Thread-17956] (main.cpp:45) Consumer2: receive2:  5
08:40:01.762 [Thread-26004] (main.cpp:15) Producer: send:  6
08:40:02.152 [Thread-27716] (main.cpp:31) Consumer: receive:  6
08:40:02.464 [Thread-26004] (main.cpp:15) Producer: send:  7
08:40:04.164 [Thread-27716] (main.cpp:31) Consumer: receive:  7
08:40:04.460 [Thread-17956] (main.cpp:45) Consumer2: receive2:  2
08:40:04.475 [Thread-26004] (main.cpp:15) Producer: send:  8
08:40:04.787 [Thread-26004] (main.cpp:15) Producer: send:  9
08:40:06.169 [Thread-27716] (main.cpp:31) Consumer: receive:  9
08:40:06.481 [Thread-26004] (main.cpp:22) Producer: close channel, exit.
08:40:07.464 [Thread-17956] (main.cpp:52) Consumer2: exit.
08:40:08.181 [Thread-27716] (main.cpp:38) Consumer: exit.
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>结果我就不分析了。</p><h2 id="小结" tabindex="-1"><a class="header-anchor" href="#小结" aria-hidden="true">#</a> 小结</h2><p>本文给出了 C++ 协程版的 <code>Channel</code> 的 demo 实现，这进一步证明了 C++ 协程的基础 API 的设计足够灵活，能够支撑非常复杂的需求场景。</p><h2 id="关于作者" tabindex="-1"><a class="header-anchor" href="#关于作者" aria-hidden="true">#</a> 关于作者</h2><p><strong>霍丙乾 bennyhuo</strong>，Google 开发者专家（Kotlin 方向）；<strong>《深入理解 Kotlin 协程》</strong> 作者（机械工业出版社，2020.6）；<strong>《深入实践 Kotlin 元编程》</strong> 作者（机械工业出版社，预计 2023 Q3）；前腾讯高级工程师，现就职于猿辅导</p>`,61),b=n("li",null,"GitHub：https://github.com/bennyhuo",-1),h=n("li",null,"博客：https://www.bennyhuo.com",-1),w={href:"https://space.bilibili.com/28615855",target:"_blank",rel:"noopener noreferrer"},f=n("strong",null,"霍丙乾 bennyhuo",-1),y=n("li",null,[s("微信公众号："),n("strong",null,"霍丙乾 bennyhuo")],-1);function _(g,C){const o=p("BiliBili"),e=p("ExternalLinkIcon");return l(),i("div",null,[r,d,a(o,{bvid:"BV1oA4y1R7jn"}),k,n("p",null,[s("这个例子是我写 "),n("a",v,[s("《深入理解 Kotlin 协程》"),a(e)]),s(" 这本书时用到过的一个非常简单的 Go routine 的例子，它的运行输出如下：")]),m,n("ul",null,[b,h,n("li",null,[s("bilibili："),n("a",w,[f,a(e)])]),y])])}const T=c(u,[["render",_],["__file","07-channel.html.vue"]]);export{T as default};
