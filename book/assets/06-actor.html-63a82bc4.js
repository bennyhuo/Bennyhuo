import{_ as o,W as c,X as p,Y as n,$ as a,Z as t,a0 as e,C as l}from"./framework-88b7ff58.js";const i={},u=e(`<h1 id="_6-actor-和属性隔离" tabindex="-1"><a class="header-anchor" href="#_6-actor-和属性隔离" aria-hidden="true">#</a> 6. Actor 和属性隔离</h1><blockquote><p>异步函数大多数情况下会并发地执行在不同的线程，那么线程安全怎么来保证？</p></blockquote><h2 id="什么是-actor" tabindex="-1"><a class="header-anchor" href="#什么是-actor" aria-hidden="true">#</a> 什么是 actor</h2><p>Swift 为了解决线程安全的问题，引入了一个非常有用的概念叫做 actor。Actor 模型是计算机科学领域的一个用于并行计算的数学模型，其中 actor 是模型当中的基本计算单元。</p><p>在 Swift 当中，actor 包含 state、mailbox、executor 三个重要的组成部分，其中：</p><ul><li>state 就是 actor 当中存储的值，它是受到 actor 保护的，访问时会有一些限制以避免数据竞争（data race）。</li><li>mailbox 字面意思是邮箱的意思，在这里我们可以理解成一个消息队列。外部对于 actor 的可变状态的访问需要发送一个异步消息到 mailbox 当中，actor 的 executor 会串行地执行 mailbox 当中的消息以确保 state 是线程安全的。</li><li>executor，actor 的逻辑（包括状态修改、访问等）执行所在的执行器。</li></ul><p>下面我们给出一个简单的例子：</p><div class="language-swift line-numbers-mode" data-ext="swift"><pre class="language-swift"><code><span class="token keyword">actor</span> <span class="token class-name">BankAccount</span> <span class="token punctuation">{</span>
    <span class="token keyword">let</span> accountNumber<span class="token punctuation">:</span> <span class="token class-name">Int</span>
    <span class="token keyword">var</span> balance<span class="token punctuation">:</span> <span class="token class-name">Double</span>

    <span class="token keyword">init</span><span class="token punctuation">(</span>accountNumber<span class="token punctuation">:</span> <span class="token class-name">Int</span><span class="token punctuation">,</span> initialDeposit<span class="token punctuation">:</span> <span class="token class-name">Double</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
        <span class="token keyword">self</span><span class="token punctuation">.</span>accountNumber <span class="token operator">=</span> accountNumber
        <span class="token keyword">self</span><span class="token punctuation">.</span>balance <span class="token operator">=</span> initialDeposit
    <span class="token punctuation">}</span>
<span class="token punctuation">}</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div>`,8),r={href:"https://github.com/apple/swift-evolution/blob/main/proposals/0306-actors.md",target:"_blank",rel:"noopener noreferrer"},d=e(`<p>Actor 实际上也是引用类型，所以用起来也更像是确保了数据线程安全的 class，例如：</p><div class="language-swift line-numbers-mode" data-ext="swift"><pre class="language-swift"><code><span class="token keyword">let</span> account <span class="token operator">=</span> <span class="token class-name">BankAccount</span><span class="token punctuation">(</span>accountNumber<span class="token punctuation">:</span> <span class="token number">1234</span><span class="token punctuation">,</span> initialDeposit<span class="token punctuation">:</span> <span class="token number">1000</span><span class="token punctuation">)</span>
<span class="token keyword">let</span> account2 <span class="token operator">=</span> account
<span class="token function">print</span><span class="token punctuation">(</span>account <span class="token operator">===</span> account2<span class="token punctuation">)</span> <span class="token comment">// true</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>我们可以用类似于 class 的方式来构造 actor，并且创建多个变量指向同一个实例，以及使用 === 来判断是否指向同一个实例。程序运行时，我们也可以看到 account 和 account2 指向的地址是相同的：</p><p><img src="https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/2022-02-05-21-51-33.png" alt=""></p><h2 id="actor-的属性隔离" tabindex="-1"><a class="header-anchor" href="#actor-的属性隔离" aria-hidden="true">#</a> Actor 的属性隔离</h2><p>为了描述存钱这个行为，我们可能希望在外部修改 balance 的值，如果是 struct 或者 class，这个行为并不麻烦，但对于 actor 来讲，这个修改可能是不安全的，因此不被允许。</p><p>那怎么办？我们前面提到修改 actor 的状态需要发邮件，actor 会在收到邮件之后一个一个处理并异步返回给你结果（有没有一种给领导发邮件审批的感觉），这个叫做 actor-isolated（即属性隔离）。</p><p>所以我们打开 outlook 发个邮件？当然不是，开个小玩笑。Swift 的 actor 已经把”发邮件“这个操作设计得非常简洁了，简单说就是两点：</p><ol><li>actor 的可变状态只能在 actor 内部被修改（隔离嘛）</li><li>发邮件其实就是一个异步函数调用的过程</li></ol><p>所以我们需要给 BankAccount 定义一个存钱的函数来完成对 balance 的修改：</p><div class="language-swift line-numbers-mode" data-ext="swift"><pre class="language-swift"><code><span class="token keyword">extension</span> <span class="token class-name">BankAccount</span> <span class="token punctuation">{</span>
    <span class="token keyword">func</span> <span class="token function-definition function">deposit</span><span class="token punctuation">(</span>amount<span class="token punctuation">:</span> <span class="token class-name">Double</span><span class="token punctuation">)</span> <span class="token keyword">async</span> <span class="token punctuation">{</span>
        <span class="token function">assert</span><span class="token punctuation">(</span>amount <span class="token operator">&gt;=</span> <span class="token number">0</span><span class="token punctuation">)</span>
        balance <span class="token operator">=</span> balance <span class="token operator">+</span> amount
    <span class="token punctuation">}</span>
<span class="token punctuation">}</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>我们把它定义在扩展当中，接下来就可以愉快得存钱了：</p><div class="language-swift line-numbers-mode" data-ext="swift"><pre class="language-swift"><code><span class="token keyword">let</span> account <span class="token operator">=</span> <span class="token class-name">BankAccount</span><span class="token punctuation">(</span>accountNumber<span class="token punctuation">:</span> <span class="token number">1234</span><span class="token punctuation">,</span> initialDeposit<span class="token punctuation">:</span> <span class="token number">1000</span><span class="token punctuation">)</span>

<span class="token function">print</span><span class="token punctuation">(</span>account<span class="token punctuation">.</span>accountNumber<span class="token punctuation">)</span> <span class="token comment">// OK，不可变状态</span>
<span class="token function">print</span><span class="token punctuation">(</span><span class="token keyword">await</span> account<span class="token punctuation">.</span>balance<span class="token punctuation">)</span> <span class="token comment">// 可变状态的访问需要使用 await</span>

<span class="token keyword">await</span> account<span class="token punctuation">.</span><span class="token function">deposit</span><span class="token punctuation">(</span>amount<span class="token punctuation">:</span> <span class="token number">90</span><span class="token punctuation">)</span> <span class="token comment">// actor 的函数调用需要 await</span>
<span class="token function">print</span><span class="token punctuation">(</span><span class="token keyword">await</span> account<span class="token punctuation">.</span>balance<span class="token punctuation">)</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>这个例子当中有几个细节请大家留意：</p><ol><li>accountNumber 可以直接访问，因为它不可变。不可变就意味着不存在线程安全问题。</li><li>对可变的状态 balance 的访问以及对函数 deposit 的调用都是异步调用，需要用 await，因为这个访问实际上封装了发邮件的过程。</li></ol><p>接下来再给大家看一下转账的实现：</p><div class="language-swift line-numbers-mode" data-ext="swift"><pre class="language-swift"><code><span class="token keyword">extension</span> <span class="token class-name">BankAccount</span> <span class="token punctuation">{</span>
  <span class="token keyword">enum</span> <span class="token class-name">BankError</span><span class="token punctuation">:</span> <span class="token class-name">Error</span> <span class="token punctuation">{</span>
    <span class="token keyword">case</span> insufficientFunds
  <span class="token punctuation">}</span>

  <span class="token keyword">func</span> <span class="token function-definition function">transfer</span><span class="token punctuation">(</span>amount<span class="token punctuation">:</span> <span class="token class-name">Double</span><span class="token punctuation">,</span> to other<span class="token punctuation">:</span> <span class="token class-name">BankAccount</span><span class="token punctuation">)</span> <span class="token keyword">async</span> <span class="token keyword">throws</span> <span class="token punctuation">{</span>
    <span class="token function">assert</span><span class="token punctuation">(</span>amount <span class="token operator">&gt;</span> <span class="token number">0</span><span class="token punctuation">)</span>

    <span class="token keyword">if</span> amount <span class="token operator">&gt;</span> balance <span class="token punctuation">{</span>
      <span class="token keyword">throw</span> <span class="token class-name">BankError</span><span class="token punctuation">.</span>insufficientFunds
    <span class="token punctuation">}</span>

    balance <span class="token operator">=</span> balance <span class="token operator">-</span> amount
    
    <span class="token comment">// other.balance = other.balance + amount 错误示例</span>
    <span class="token keyword">await</span> other<span class="token punctuation">.</span><span class="token function">deposit</span><span class="token punctuation">(</span>amount<span class="token punctuation">:</span> amount<span class="token punctuation">)</span> <span class="token comment">// OK</span>
  <span class="token punctuation">}</span>
<span class="token punctuation">}</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>函数 transfer 是 BankAccount 自己的函数，修改自己 balance 的值自然没有什么问题。但修改 other 这个 BankAccount 实例的 balance 的值却是不行的，因为 tranfer 函数执行时实际上是 self 这个实例在处理自己的邮件，这里面如果偷偷修改了 other 的 balance 的值就可能导致 other 的状态出现问题（试想一下你处理自己的邮件的时候偷偷把领导的邮件给删了，看他发现了之后骂不骂你）。</p><p>这个例子告诉我们，actor 的状态只能在自己实例的函数内部修改，而不能跨实例修改。</p><h2 id="外部函数修改-actor-的状态" tabindex="-1"><a class="header-anchor" href="#外部函数修改-actor-的状态" aria-hidden="true">#</a> 外部函数修改 actor 的状态</h2><p>前面我们反复提到 actor 的状态只能在自己的函数内部修改，是因为 actor 的函数的调用是在对应的 executor 上安全地执行的。如果外部的函数也能够满足这个调用条件，那么理论上也是安全的。</p><p>Swift 提供了 actor-isolated paramters 这样的特性，字面意思即满足 actor 状态隔离的参数，如果我们在定义外部函数时将需要访问的 actor 类型的参数声明为 isolated，那么我们就可以在函数内部修改这个 actor 的状态了。</p><p>基于这一点，我们也可以把 deposit 函数定义成顶级函数：</p><div class="language-swift line-numbers-mode" data-ext="swift"><pre class="language-swift"><code><span class="token keyword">func</span> <span class="token function-definition function">deposit</span><span class="token punctuation">(</span>amount<span class="token punctuation">:</span> <span class="token class-name">Double</span><span class="token punctuation">,</span> to account<span class="token punctuation">:</span> <span class="token keyword">isolated</span> <span class="token class-name">BankAccount</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
    <span class="token function">assert</span><span class="token punctuation">(</span>amount <span class="token operator">&gt;=</span> <span class="token number">0</span><span class="token punctuation">)</span>
    account<span class="token punctuation">.</span>balance <span class="token operator">=</span> account<span class="token punctuation">.</span>balance <span class="token operator">+</span> amount
<span class="token punctuation">}</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>注意到参数 account 的类型被关键字 isolated 修饰，表明函数 deposit 的调用需要保证 account 的状态修改安全。不难想到，对于这个函数的调用，我们需要使用 await：</p><div class="language-swift line-numbers-mode" data-ext="swift"><pre class="language-swift"><code><span class="token keyword">await</span> <span class="token function">deposit</span><span class="token punctuation">(</span>amount<span class="token punctuation">:</span> <span class="token number">1000</span><span class="token punctuation">,</span> to<span class="token punctuation">:</span> account<span class="token punctuation">)</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div></div></div><p>显然，这里的 isolated 参数不能有多个（至少现在是这样），不然在实现起来会比较麻烦。</p><h2 id="声明不需要隔离的属性或函数" tabindex="-1"><a class="header-anchor" href="#声明不需要隔离的属性或函数" aria-hidden="true">#</a> 声明不需要隔离的属性或函数</h2><p>Actor 的属性默认都是需要被隔离保护的，但也有一些属性可能并不需要被保护，例如我们前面提到的不可变的状态。Swift 允许为 actor 声明不需要隔离的属性：</p><div class="language-swift line-numbers-mode" data-ext="swift"><pre class="language-swift"><code><span class="token keyword">extension</span> <span class="token class-name">BankAccount</span> <span class="token punctuation">:</span> <span class="token class-name">CustomStringConvertible</span> <span class="token punctuation">{</span>
    <span class="token keyword">nonisolated</span> <span class="token keyword">var</span> description<span class="token punctuation">:</span> <span class="token class-name">String</span> <span class="token punctuation">{</span>
        <span class="token string-literal"><span class="token string">&quot;Bank account #</span><span class="token interpolation-punctuation punctuation">\\(</span><span class="token interpolation">accountNumber</span><span class="token interpolation-punctuation punctuation">)</span><span class="token string">&quot;</span></span>
    <span class="token punctuation">}</span>
<span class="token punctuation">}</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>注意到 description 被声明为 nonisolated，这样对于它的访问就不会受到 balance 那么多的限制了。</p><p>nonisolated 同样可以用来修饰函数，但这样的函数就不能直接访问被隔离的状态了，只能像外部函数一样使用 await 来异步访问。</p><p>这个特性在 Actor 实现 Protocol 的时候也显得非常有用，例如：</p><div class="language-swift line-numbers-mode" data-ext="swift"><pre class="language-swift"><code><span class="token keyword">extension</span> <span class="token class-name">BankAccount</span> <span class="token punctuation">:</span> <span class="token class-name">Hashable</span> <span class="token punctuation">{</span>
    <span class="token keyword">static</span> <span class="token keyword">func</span> <span class="token operator">==</span><span class="token punctuation">(</span>lhs<span class="token punctuation">:</span> <span class="token class-name">BankAccount</span><span class="token punctuation">,</span> rhs<span class="token punctuation">:</span> <span class="token class-name">BankAccount</span><span class="token punctuation">)</span> <span class="token operator">-&gt;</span> <span class="token class-name">Bool</span> <span class="token punctuation">{</span>
        lhs<span class="token punctuation">.</span>accountNumber <span class="token operator">==</span> rhs<span class="token punctuation">.</span>accountNumber
    <span class="token punctuation">}</span>
    
    <span class="token keyword">nonisolated</span> <span class="token keyword">func</span> <span class="token function-definition function">hash</span><span class="token punctuation">(</span>into hasher<span class="token punctuation">:</span> <span class="token keyword">inout</span> <span class="token class-name">Hasher</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
        hasher<span class="token punctuation">.</span><span class="token function">combine</span><span class="token punctuation">(</span>accountNumber<span class="token punctuation">)</span>
    <span class="token punctuation">}</span>
    
    <span class="token keyword">nonisolated</span> <span class="token keyword">var</span> hashValue<span class="token punctuation">:</span> <span class="token class-name">Int</span> <span class="token punctuation">{</span>
        <span class="token keyword">get</span> <span class="token punctuation">{</span>
            accountNumber<span class="token punctuation">.</span>hashValue
        <span class="token punctuation">}</span>
    <span class="token punctuation">}</span>
<span class="token punctuation">}</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>如果不加 nonisolated，编译器会给出如下提示：</p><p><img src="https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/2022-02-05-22-39-08.png" alt=""></p><p>顺便提一句，在早期的提案当中，你可能会见到 @actorIndependent，它后来被重命名为 nonisolated，这样在语法上与 nonmutating 也更加一致。</p><h2 id="actor-与-sendable" tabindex="-1"><a class="header-anchor" href="#actor-与-sendable" aria-hidden="true">#</a> Actor 与 @Sendable</h2><p>在介绍协程的过程中，我们见过很多函数的闭包都被声明为 <code>@Sendable</code>，例如：</p><div class="language-swift line-numbers-mode" data-ext="swift"><pre class="language-swift"><code><span class="token keyword">public</span> <span class="token keyword">func</span> <span class="token function-definition function">withTaskCancellationHandler</span><span class="token operator">&lt;</span><span class="token class-name">T</span><span class="token operator">&gt;</span><span class="token punctuation">(</span>
    operation<span class="token punctuation">:</span> <span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token keyword">async</span> <span class="token keyword">throws</span> <span class="token operator">-&gt;</span> <span class="token class-name">T</span><span class="token punctuation">,</span> 
    onCancel handler<span class="token punctuation">:</span> <span class="token attribute atrule">@Sendable</span> <span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">-&gt;</span> <span class="token class-name">Void</span>
<span class="token punctuation">)</span> <span class="token keyword">async</span> <span class="token keyword">rethrows</span> <span class="token operator">-&gt;</span> <span class="token class-name">T</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div>`,40),k={href:"https://github.com/apple/swift-evolution/blob/main/proposals/0302-concurrent-value-and-concurrent-closures.md",target:"_blank",rel:"noopener noreferrer"},m=n("code",null,"Sendable",-1),b=e(`<p>Actor 天生就是线程安全的，因此也是符合 Sendable 协议的。实际上 Swift 的每一个 actor 类型都隐式地实现了一个叫做 <code>Actor</code> 的协议，而这个协议也正实现了 <code>Sendable</code> 协议。</p><p>我们看一下 <code>Actor</code> 的定义：</p><div class="language-swift line-numbers-mode" data-ext="swift"><pre class="language-swift"><code><span class="token keyword">public</span> <span class="token keyword">protocol</span> <span class="token class-name">Actor</span> <span class="token punctuation">:</span> <span class="token class-name">AnyObject</span><span class="token punctuation">,</span> <span class="token class-name">Sendable</span> <span class="token punctuation">{</span>
    <span class="token keyword">nonisolated</span> <span class="token keyword">var</span> unownedExecutor<span class="token punctuation">:</span> _Concurrency<span class="token punctuation">.</span><span class="token class-name">UnownedSerialExecutor</span> <span class="token punctuation">{</span> <span class="token keyword">get</span> <span class="token punctuation">}</span>
<span class="token punctuation">}</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>除了定义了调度器之外，它也继承了 Sendable 协议。因此如果大家遇到 @Sendable 闭包需要捕获变量的问题，不妨试一试使用 Actor 来做一层封装。</p><p>顺便提一句，actor 的调度器目前主要由编译器提供默认的实现。官方目前对于自定义调度器的途径还没有给出明确的支持，不过我们将在下一篇文章当中详细探索一下调度器的使用。</p><h2 id="小结" tabindex="-1"><a class="header-anchor" href="#小结" aria-hidden="true">#</a> 小结</h2><p>本文我们主要介绍了 Swift 协程当中的 actor 的基本用法，并重点对属性隔离做了详细介绍。</p><p>有关 actor 的调度器的内容，我们将在下一篇文章当中详细介绍。</p><h2 id="关于作者" tabindex="-1"><a class="header-anchor" href="#关于作者" aria-hidden="true">#</a> 关于作者</h2><p><strong>霍丙乾 bennyhuo</strong>，Google 开发者专家（Kotlin 方向）；<strong>《深入理解 Kotlin 协程》</strong> 作者（机械工业出版社，2020.6）；<strong>《深入实践 Kotlin 元编程》</strong> 作者（机械工业出版社，预计 2023 Q3）；前腾讯高级工程师，现就职于猿辅导</p>`,10),v=n("li",null,"GitHub：https://github.com/bennyhuo",-1),h=n("li",null,"博客：https://www.bennyhuo.com",-1),f={href:"https://space.bilibili.com/28615855",target:"_blank",rel:"noopener noreferrer"},w=n("strong",null,"霍丙乾 bennyhuo",-1),g=n("li",null,[a("微信公众号："),n("strong",null,"霍丙乾 bennyhuo")],-1);function y(_,x){const s=l("ExternalLinkIcon");return c(),p("div",null,[u,n("p",null,[a("我们定义了一个 actor 叫做 BankAccount（这个例子来自 Swift 的 "),n("a",r,[a("proposal"),t(s)]),a(")，不难看出 actor 在形式上与 class 很像，不仅如此，actor 也能像它们一样定义扩展，声明泛型，实现协议等等。")]),d,n("p",null,[a("其中 onCancel 就被声明为 "),n("a",k,[a("@Sendable"),t(s)]),a("，这表明只有实现了 "),m,a(" 协议的类型实例才能被这个闭包所捕获。")]),b,n("ul",null,[v,h,n("li",null,[a("bilibili："),n("a",f,[w,t(s)])]),g])])}const B=o(i,[["render",y],["__file","06-actor.html.vue"]]);export{B as default};
