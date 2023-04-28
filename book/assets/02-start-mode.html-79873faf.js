import{_ as e,W as t,X as o,Y as n,$ as s,Z as p,a0 as c,C as l}from"./framework-88b7ff58.js";const i={},u=c(`<h1 id="_2-协程启动篇" tabindex="-1"><a class="header-anchor" href="#_2-协程启动篇" aria-hidden="true">#</a> 2. 协程启动篇</h1><blockquote><p>现在你已经知道协程大概是怎么回事了，也应该想要自己尝试一把了吧。本文将为大家详细介绍协程的几种启动模式之间的不同，当然，我不打算现在就开始深入源码剖析原理，大家只需要记住这些规则就能很好的使用协程了。</p></blockquote><h2 id="_1-回想一下刚学-thread-的时候" tabindex="-1"><a class="header-anchor" href="#_1-回想一下刚学-thread-的时候" aria-hidden="true">#</a> 1. 回想一下刚学 Thread 的时候</h2><p>我相信现在接触 Kotlin 的开发者绝大多数都有 Java 基础，我们刚开始学习 Thread 的时候，一定都是这样干的：</p><div class="language-kotlin line-numbers-mode" data-ext="kt"><pre class="language-kotlin"><code><span class="token keyword">val</span> thread <span class="token operator">=</span> <span class="token keyword">object</span> <span class="token operator">:</span> <span class="token function">Thread</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">{</span>
    <span class="token keyword">override</span> <span class="token keyword">fun</span> <span class="token function">run</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
        <span class="token keyword">super</span><span class="token punctuation">.</span><span class="token function">run</span><span class="token punctuation">(</span><span class="token punctuation">)</span>
        <span class="token comment">//do what you want to do.</span>
    <span class="token punctuation">}</span>
<span class="token punctuation">}</span>
thread<span class="token punctuation">.</span><span class="token function">start</span><span class="token punctuation">(</span><span class="token punctuation">)</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>肯定有人忘了调用 <code>start</code>，还特别纳闷为啥我开的线程不启动呢。说实话，这个线程的 <code>start</code> 的设计其实是很奇怪的，不过我理解设计者们，毕竟当年还有 <code>stop</code> 可以用，结果他们很快发现设计 <code>stop</code> 就是一个错误，因为不安全而在 JDK 1.1 就废弃，称得上是最短命的 API 了吧。</p><blockquote><p>既然 <code>stop</code> 是错误，那么总是让初学者丢掉的 <code>start</code> 是不是也是一个错误呢？</p></blockquote><p>哈，有点儿跑题了。我们今天主要说 Kotlin。Kotlin 的设计者就很有想法，他们为线程提供了一个便捷的方法：</p><div class="language-kotlin line-numbers-mode" data-ext="kt"><pre class="language-kotlin"><code><span class="token keyword">val</span> myThread <span class="token operator">=</span> thread <span class="token punctuation">{</span>
    <span class="token comment">//do what you want</span>
<span class="token punctuation">}</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>这个 <code>thread</code> 方法有个参数 <code>start</code> 默认为 <code>true</code>，换句话说，这样创造出来的线程默认就是启动的，除非你实在不想让它马上投入工作：</p><div class="language-kotlin line-numbers-mode" data-ext="kt"><pre class="language-kotlin"><code><span class="token keyword">val</span> myThread <span class="token operator">=</span> <span class="token function">thread</span><span class="token punctuation">(</span>start <span class="token operator">=</span> <span class="token boolean">false</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
    <span class="token comment">//do what you want</span>
<span class="token punctuation">}</span>
<span class="token comment">//later on ...</span>
myThread<span class="token punctuation">.</span><span class="token function">start</span><span class="token punctuation">(</span><span class="token punctuation">)</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>这样看上去自然多了。接口设计就应该让默认值满足 80% 的需求嘛。</p><h2 id="_2-再来看看协程的启动" tabindex="-1"><a class="header-anchor" href="#_2-再来看看协程的启动" aria-hidden="true">#</a> 2. 再来看看协程的启动</h2><p>说了这么多线程，原因嘛，毕竟大家对它是最熟悉的。协程的 API 设计其实也与之一脉相承，我们来看一段最简单的启动协程的方式：</p><div class="language-kotlin line-numbers-mode" data-ext="kt"><pre class="language-kotlin"><code>GlobalScope<span class="token punctuation">.</span><span class="token function">launch</span> <span class="token punctuation">{</span>
    <span class="token comment">//do what you want</span>
<span class="token punctuation">}</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>那么这段代码会怎么执行呢？我们说过，启动协程需要三样东西，分别是 <strong>上下文</strong>、<strong>启动模式</strong>、<strong>协程体</strong>，<strong>协程体</strong> 就好比 <code>Thread.run</code> 当中的代码，自不必说。</p><p>本文将为大家详细介绍 <strong>启动模式</strong>。在 Kotlin 协程当中，启动模式是一个枚举：</p><div class="language-kotlin line-numbers-mode" data-ext="kt"><pre class="language-kotlin"><code><span class="token keyword">public</span> <span class="token keyword">enum</span> <span class="token keyword">class</span> CoroutineStart <span class="token punctuation">{</span>
    DEFAULT<span class="token punctuation">,</span>
    LAZY<span class="token punctuation">,</span>
    <span class="token annotation builtin">@ExperimentalCoroutinesApi</span>
    ATOMIC<span class="token punctuation">,</span>
    <span class="token annotation builtin">@ExperimentalCoroutinesApi</span>
    UNDISPATCHED<span class="token punctuation">;</span>
<span class="token punctuation">}</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><table><thead><tr><th>模式</th><th>功能</th></tr></thead><tbody><tr><td>DEFAULT</td><td>立即执行协程体</td></tr><tr><td>ATOMIC</td><td>立即执行协程体，但在开始运行之前无法取消</td></tr><tr><td>UNDISPATCHED</td><td>立即在当前线程执行协程体，直到第一个 suspend 调用</td></tr><tr><td>LAZY</td><td>只有在需要的情况下运行</td></tr></tbody></table><h3 id="_2-1-default" tabindex="-1"><a class="header-anchor" href="#_2-1-default" aria-hidden="true">#</a> 2.1 DEFAULT</h3><p>四个启动模式当中我们最常用的其实是 <code>DEFAULT</code> 和 <code>LAZY</code>。</p><p><code>DEFAULT</code> 是饿汉式启动，<code>launch</code> 调用后，会立即进入待调度状态，一旦调度器 OK 就可以开始执行。我们来看个简单的例子：</p><div class="language-kotlin line-numbers-mode" data-ext="kt"><pre class="language-kotlin"><code><span class="token keyword">suspend</span> <span class="token keyword">fun</span> <span class="token function">main</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
    <span class="token function">log</span><span class="token punctuation">(</span><span class="token number">1</span><span class="token punctuation">)</span>
    <span class="token keyword">val</span> job <span class="token operator">=</span> GlobalScope<span class="token punctuation">.</span><span class="token function">launch</span> <span class="token punctuation">{</span>
        <span class="token function">log</span><span class="token punctuation">(</span><span class="token number">2</span><span class="token punctuation">)</span>
    <span class="token punctuation">}</span>
    <span class="token function">log</span><span class="token punctuation">(</span><span class="token number">3</span><span class="token punctuation">)</span>
    job<span class="token punctuation">.</span><span class="token function">join</span><span class="token punctuation">(</span><span class="token punctuation">)</span>
    <span class="token function">log</span><span class="token punctuation">(</span><span class="token number">4</span><span class="token punctuation">)</span>
<span class="token punctuation">}</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><blockquote><p>说明： main 函数 支持 suspend 是从 Kotlin 1.3 开始的。另外，main 函数省略参数也是 Kotlin 1.3 的特性。后面的示例没有特别说明都是直接运行在 suspend main 函数当中。</p></blockquote><p>这段程序采用默认的启动模式，由于我们也没有指定调度器，因此调度器也是默认的，在 JVM 上，默认调度器的实现与其他语言的实现类似，它在后台专门会有一些线程处理异步任务，所以上述程序的运行结果可能是：</p><div class="language-kotlin line-numbers-mode" data-ext="kt"><pre class="language-kotlin"><code><span class="token number">19</span><span class="token operator">:</span><span class="token number">51</span><span class="token operator">:</span><span class="token number">08</span><span class="token operator">:</span><span class="token number">160</span> <span class="token punctuation">[</span>main<span class="token punctuation">]</span> <span class="token number">1</span>
<span class="token number">19</span><span class="token operator">:</span><span class="token number">51</span><span class="token operator">:</span><span class="token number">08</span><span class="token operator">:</span><span class="token number">603</span> <span class="token punctuation">[</span>main<span class="token punctuation">]</span> <span class="token number">3</span>
<span class="token number">19</span><span class="token operator">:</span><span class="token number">51</span><span class="token operator">:</span><span class="token number">08</span><span class="token operator">:</span><span class="token number">606</span> <span class="token punctuation">[</span>DefaultDispatcher<span class="token operator">-</span>worker<span class="token operator">-</span><span class="token number">1</span><span class="token punctuation">]</span> <span class="token number">2</span>
<span class="token number">19</span><span class="token operator">:</span><span class="token number">51</span><span class="token operator">:</span><span class="token number">08</span><span class="token operator">:</span><span class="token number">624</span> <span class="token punctuation">[</span>main<span class="token punctuation">]</span> <span class="token number">4</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>也可能是：</p><div class="language-kotlin line-numbers-mode" data-ext="kt"><pre class="language-kotlin"><code><span class="token number">20</span><span class="token operator">:</span><span class="token number">19</span><span class="token operator">:</span><span class="token number">06</span><span class="token operator">:</span><span class="token number">367</span> <span class="token punctuation">[</span>main<span class="token punctuation">]</span> <span class="token number">1</span>
<span class="token number">20</span><span class="token operator">:</span><span class="token number">19</span><span class="token operator">:</span><span class="token number">06</span><span class="token operator">:</span><span class="token number">541</span> <span class="token punctuation">[</span>DefaultDispatcher<span class="token operator">-</span>worker<span class="token operator">-</span><span class="token number">1</span><span class="token punctuation">]</span> <span class="token number">2</span>
<span class="token number">20</span><span class="token operator">:</span><span class="token number">19</span><span class="token operator">:</span><span class="token number">06</span><span class="token operator">:</span><span class="token number">550</span> <span class="token punctuation">[</span>main<span class="token punctuation">]</span> <span class="token number">3</span>
<span class="token number">20</span><span class="token operator">:</span><span class="token number">19</span><span class="token operator">:</span><span class="token number">06</span><span class="token operator">:</span><span class="token number">551</span> <span class="token punctuation">[</span>main<span class="token punctuation">]</span> <span class="token number">4</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>这取决于 CPU 对于当前线程与后台线程的调度顺序，不过不要担心，很快你就会发现这个例子当中 2 和 3 的输出顺序其实并没有那么重要。</p><blockquote><p>JVM 上默认调度器的实现也许你已经猜到，没错，就是开了一个线程池，但区区几个线程足以调度成千上万个协程，而且每一个协程都有自己的调用栈，这与纯粹的开线程池去执行异步任务有本质的区别。</p><p>当然，我们说 Kotlin 是一门跨平台的语言，因此上述代码还可以运行在 JavaScript 环境中，例如 Nodejs。在 Nodejs 中，Kotlin 协程的默认调度器则并没有实现线程的切换，输出结果也会略有不同，这样似乎更符合 JavaScript 的执行逻辑。</p><p>更多调度器的话题，我们后续还会进一步讨论。</p></blockquote><h3 id="_2-2-lazy" tabindex="-1"><a class="header-anchor" href="#_2-2-lazy" aria-hidden="true">#</a> 2.2 LAZY</h3><p><code>LAZY</code> 是懒汉式启动，<code>launch</code> 后并不会有任何调度行为，协程体也自然不会进入执行状态，直到我们需要它执行的时候。这其实就有点儿费解了，什么叫我们需要它执行的时候呢？就是需要它的运行结果的时候， <code>launch</code> 调用后会返回一个 <code>Job</code> 实例，对于这种情况，我们可以：</p><ul><li>调用 <code>Job.start</code>，主动触发协程的调度执行</li><li>调用 <code>Job.join</code>，隐式的触发协程的调度执行</li></ul><p>所以这个所谓的”需要“，其实是一个很有趣的措辞，后面你还会看到我们也可以通过 <code>await</code> 来表达对 <code>Deferred</code> 的需要。这个行为与 <code>Thread.join</code> 不一样，后者如果没有启动的话，调用 <code>join</code> 不会有任何作用。</p><div class="language-kotlin line-numbers-mode" data-ext="kt"><pre class="language-kotlin"><code><span class="token function">log</span><span class="token punctuation">(</span><span class="token number">1</span><span class="token punctuation">)</span>
<span class="token keyword">val</span> job <span class="token operator">=</span> GlobalScope<span class="token punctuation">.</span><span class="token function">launch</span><span class="token punctuation">(</span>start <span class="token operator">=</span> CoroutineStart<span class="token punctuation">.</span>LAZY<span class="token punctuation">)</span> <span class="token punctuation">{</span>
    <span class="token function">log</span><span class="token punctuation">(</span><span class="token number">2</span><span class="token punctuation">)</span>
<span class="token punctuation">}</span>
<span class="token function">log</span><span class="token punctuation">(</span><span class="token number">3</span><span class="token punctuation">)</span>
job<span class="token punctuation">.</span><span class="token function">start</span><span class="token punctuation">(</span><span class="token punctuation">)</span>
<span class="token function">log</span><span class="token punctuation">(</span><span class="token number">4</span><span class="token punctuation">)</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>基于此，对于上面的示例，输出的结果可能是：</p><div class="language-text line-numbers-mode" data-ext="text"><pre class="language-text"><code>14:56:28:374 [main] 1
14:56:28:493 [main] 3
14:56:28:511 [main] 4
14:56:28:516 [DefaultDispatcher-worker-1] 2
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>当然如果你运气够好，也可能出现 2 比 4 在前面的情况。而对于 <code>join</code>，</p><div class="language-kotlin line-numbers-mode" data-ext="kt"><pre class="language-kotlin"><code><span class="token operator">..</span><span class="token punctuation">.</span>
<span class="token function">log</span><span class="token punctuation">(</span><span class="token number">3</span><span class="token punctuation">)</span>
job<span class="token punctuation">.</span><span class="token function">join</span><span class="token punctuation">(</span><span class="token punctuation">)</span>
<span class="token function">log</span><span class="token punctuation">(</span><span class="token number">4</span><span class="token punctuation">)</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>因为要等待协程执行完毕，因此输出的结果一定是：</p><div class="language-text line-numbers-mode" data-ext="text"><pre class="language-text"><code>14:47:45:963 [main] 1
14:47:46:054 [main] 3
14:47:46:069 [DefaultDispatcher-worker-1] 2
14:47:46:090 [main] 4
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="_2-3-atomic" tabindex="-1"><a class="header-anchor" href="#_2-3-atomic" aria-hidden="true">#</a> 2.3 ATOMIC</h3><p><code>ATOMIC</code> 只有涉及 cancel 的时候才有意义，cancel 本身也是一个值得详细讨论的话题，在这里我们就简单认为 cancel 后协程会被取消掉，也就是不再执行了。那么调用 cancel 的时机不同，结果也是有差异的，例如协程调度之前、开始调度但尚未执行、已经开始执行、执行完毕等等。</p><p>为了搞清楚它与 <code>DEFAULT</code> 的区别，我们来看一段例子：</p><div class="language-kotlin line-numbers-mode" data-ext="kt"><pre class="language-kotlin"><code><span class="token function">log</span><span class="token punctuation">(</span><span class="token number">1</span><span class="token punctuation">)</span>
<span class="token keyword">val</span> job <span class="token operator">=</span> GlobalScope<span class="token punctuation">.</span><span class="token function">launch</span><span class="token punctuation">(</span>start <span class="token operator">=</span> CoroutineStart<span class="token punctuation">.</span>ATOMIC<span class="token punctuation">)</span> <span class="token punctuation">{</span>
    <span class="token function">log</span><span class="token punctuation">(</span><span class="token number">2</span><span class="token punctuation">)</span>
<span class="token punctuation">}</span>
job<span class="token punctuation">.</span><span class="token function">cancel</span><span class="token punctuation">(</span><span class="token punctuation">)</span>
<span class="token function">log</span><span class="token punctuation">(</span><span class="token number">3</span><span class="token punctuation">)</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>我们创建了协程后立即 cancel，但由于是 <code>ATOMIC</code> 模式，因此协程一定会被调度，因此 1、2、3 一定都会输出，只是 2 和 3 的顺序就难说了。</p><div class="language-text line-numbers-mode" data-ext="text"><pre class="language-text"><code>20:42:42:783 [main] 1
20:42:42:879 [main] 3
20:42:42:879 [DefaultDispatcher-worker-1] 2
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>对应的，如果是 <code>DEFAULT</code> 模式，在第一次调度该协程时如果 cancel 就已经调用，那么协程就会直接被 cancel 而不会有任何调用，当然也有可能协程开始时尚未被 cancel，那么它就可以正常启动了。所以前面的例子如果改用 <code>DEFAULT</code> 模式，那么 2 有可能会输出，也可能不会。</p><p>需要注意的是，cancel 调用一定会将该 job 的状态置为 cancelling，只不过<code>ATOMIC</code> 模式的协程在启动时无视了这一状态。为了证明这一点，我们可以让例子稍微复杂一些：</p><div class="language-kotlin line-numbers-mode" data-ext="kt"><pre class="language-kotlin"><code><span class="token function">log</span><span class="token punctuation">(</span><span class="token number">1</span><span class="token punctuation">)</span>
<span class="token keyword">val</span> job <span class="token operator">=</span> GlobalScope<span class="token punctuation">.</span><span class="token function">launch</span><span class="token punctuation">(</span>start <span class="token operator">=</span> CoroutineStart<span class="token punctuation">.</span>ATOMIC<span class="token punctuation">)</span> <span class="token punctuation">{</span>
    <span class="token function">log</span><span class="token punctuation">(</span><span class="token number">2</span><span class="token punctuation">)</span>
    <span class="token function">delay</span><span class="token punctuation">(</span><span class="token number">1000</span><span class="token punctuation">)</span>
    <span class="token function">log</span><span class="token punctuation">(</span><span class="token number">3</span><span class="token punctuation">)</span>
<span class="token punctuation">}</span>
job<span class="token punctuation">.</span><span class="token function">cancel</span><span class="token punctuation">(</span><span class="token punctuation">)</span>
<span class="token function">log</span><span class="token punctuation">(</span><span class="token number">4</span><span class="token punctuation">)</span>
job<span class="token punctuation">.</span><span class="token function">join</span><span class="token punctuation">(</span><span class="token punctuation">)</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>我们在 2 和 3 之间加了一个 <code>delay</code>，<code>delay</code> 会使得协程体的执行被挂起，1000ms 之后再次调度后面的部分，因此 3 会在 2 执行之后 1000ms 时输出。对于 <code>ATOMIC</code> 模式，我们已经讨论过它一定会被启动，实际上在遇到第一个挂起点之前，它的执行是不会停止的，而 <code>delay</code> 是一个 suspend 函数，这时我们的协程迎来了自己的第一个挂起点，恰好 <code>delay</code> 是支持 cancel 的，因此后面的 3 将不会被打印。</p><blockquote><p>我们使用线程的时候，想要让线程里面的任务停止执行也会面临类似的问题，但遗憾的是线程中看上去与 cancel 相近的 stop 接口已经被废弃，因为存在一些安全的问题。不过随着我们不断地深入探讨，你就会发现协程的 cancel 某种意义上更像线程的 interrupt。</p></blockquote><h3 id="_2-4-undispatched" tabindex="-1"><a class="header-anchor" href="#_2-4-undispatched" aria-hidden="true">#</a> 2.4 UNDISPATCHED</h3><p>有了前面的基础，<code>UNDISPATCHED</code> 就很容易理解了。协程在这种模式下会直接开始在当前线程下执行，直到第一个挂起点，这听起来有点儿像前面的 <code>ATOMIC</code>，不同之处在于 <code>UNDISPATCHED</code> 不经过任何调度器即开始执行协程体。当然遇到挂起点之后的执行就取决于挂起点本身的逻辑以及上下文当中的调度器了。</p><div class="language-kotlin line-numbers-mode" data-ext="kt"><pre class="language-kotlin"><code><span class="token function">log</span><span class="token punctuation">(</span><span class="token number">1</span><span class="token punctuation">)</span>
<span class="token keyword">val</span> job <span class="token operator">=</span> GlobalScope<span class="token punctuation">.</span><span class="token function">launch</span><span class="token punctuation">(</span>start <span class="token operator">=</span> CoroutineStart<span class="token punctuation">.</span>UNDISPATCHED<span class="token punctuation">)</span> <span class="token punctuation">{</span>
    <span class="token function">log</span><span class="token punctuation">(</span><span class="token number">2</span><span class="token punctuation">)</span>
    <span class="token function">delay</span><span class="token punctuation">(</span><span class="token number">100</span><span class="token punctuation">)</span>
    <span class="token function">log</span><span class="token punctuation">(</span><span class="token number">3</span><span class="token punctuation">)</span>
<span class="token punctuation">}</span>
<span class="token function">log</span><span class="token punctuation">(</span><span class="token number">4</span><span class="token punctuation">)</span>
job<span class="token punctuation">.</span><span class="token function">join</span><span class="token punctuation">(</span><span class="token punctuation">)</span>
<span class="token function">log</span><span class="token punctuation">(</span><span class="token number">5</span><span class="token punctuation">)</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>我们还是以这样一个例子来认识下 <code>UNDISPATCHED</code> 模式，按照我们前面的讨论，协程启动后会立即在当前线程执行，因此 1、2 会连续在同一线程中执行，<code>delay</code> 是挂起点，因此 3 会等 100ms 后再次调度，这时候 4 执行，<code>join</code> 要求等待协程执行完，因此等 3 输出后再执行 5。以下是运行结果：</p><div class="language-text line-numbers-mode" data-ext="text"><pre class="language-text"><code>22:00:31:693 [main] 1
22:00:31:782 [main @coroutine#1] 2
22:00:31:800 [main] 4
22:00:31:914 [DefaultDispatcher-worker-1 @coroutine#1] 3
22:00:31:916 [DefaultDispatcher-worker-1 @coroutine#1] 5
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><blockquote><p>方括号当中是线程名，我们发现协程执行时会修改线程名来让自己显得颇有存在感。运行结果看上去还有一个细节可能会让人困惑，<code>join</code> 之后的 5 的线程与 3 一样，这是为什么？我们在前面提到我们的示例都运行在 suspend main 函数当中，所以 suspend main 函数会帮我们直接启动一个协程，而我们示例的协程都是它的子协程，所以这里 5 的调度取决于这个最外层的协程的调度规则了。关于协程的调度，我们后面再聊。</p></blockquote><h2 id="_3-小结" tabindex="-1"><a class="header-anchor" href="#_3-小结" aria-hidden="true">#</a> 3. 小结</h2><p>本文通过一些例子来给大家逐步揭开协程的面纱。相信大家读完对于协程的执行机制有了一个大概的认识，同时对于协程的调度这个话题想必也非常好奇或者感到困惑，这是正常的——因为我们还没有讲嘛，放心，调度器的内容已经安排了 : )。</p><h2 id="附录" tabindex="-1"><a class="header-anchor" href="#附录" aria-hidden="true">#</a> 附录</h2><p><code>log</code> 函数的定义：</p><div class="language-kotlin line-numbers-mode" data-ext="kt"><pre class="language-kotlin"><code><span class="token keyword">val</span> dateFormat <span class="token operator">=</span> <span class="token function">SimpleDateFormat</span><span class="token punctuation">(</span><span class="token string-literal singleline"><span class="token string">&quot;HH:mm:ss:SSS&quot;</span></span><span class="token punctuation">)</span>

<span class="token keyword">val</span> now <span class="token operator">=</span> <span class="token punctuation">{</span>
    dateFormat<span class="token punctuation">.</span><span class="token function">format</span><span class="token punctuation">(</span><span class="token function">Date</span><span class="token punctuation">(</span>System<span class="token punctuation">.</span><span class="token function">currentTimeMillis</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">)</span>
<span class="token punctuation">}</span>

<span class="token keyword">fun</span> <span class="token function">log</span><span class="token punctuation">(</span>msg<span class="token operator">:</span> Any<span class="token operator">?</span><span class="token punctuation">)</span> <span class="token operator">=</span> <span class="token function">println</span><span class="token punctuation">(</span><span class="token string-literal singleline"><span class="token string">&quot;</span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">\${</span><span class="token expression"><span class="token function">now</span><span class="token punctuation">(</span><span class="token punctuation">)</span></span><span class="token interpolation-punctuation punctuation">}</span></span><span class="token string"> [</span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">\${</span><span class="token expression">Thread<span class="token punctuation">.</span><span class="token function">currentThread</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">.</span>name</span><span class="token interpolation-punctuation punctuation">}</span></span><span class="token string">] </span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">$</span><span class="token expression">msg</span></span><span class="token string">&quot;</span></span><span class="token punctuation">)</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h2 id="关于作者" tabindex="-1"><a class="header-anchor" href="#关于作者" aria-hidden="true">#</a> 关于作者</h2><p><strong>霍丙乾 bennyhuo</strong>，Google 开发者专家（Kotlin 方向）；<strong>《深入理解 Kotlin 协程》</strong> 作者（机械工业出版社，2020.6）；<strong>《深入实践 Kotlin 元编程》</strong> 作者（机械工业出版社，预计 2023 Q3）；前腾讯高级工程师，现就职于猿辅导</p>`,65),d=n("li",null,"GitHub：https://github.com/bennyhuo",-1),r=n("li",null,"博客：https://www.bennyhuo.com",-1),k={href:"https://space.bilibili.com/28615855",target:"_blank",rel:"noopener noreferrer"},v=n("strong",null,"霍丙乾 bennyhuo",-1),m=n("li",null,[s("微信公众号："),n("strong",null,"霍丙乾 bennyhuo")],-1);function b(h,g){const a=l("ExternalLinkIcon");return t(),o("div",null,[u,n("ul",null,[d,r,n("li",null,[s("bilibili："),n("a",k,[v,p(a)])]),m])])}const x=e(i,[["render",b],["__file","02-start-mode.html.vue"]]);export{x as default};