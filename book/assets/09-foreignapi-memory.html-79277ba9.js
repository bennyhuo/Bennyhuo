import{_ as e,X as t,Y as p,Z as n,a0 as a,$ as o,a1 as c,D as l}from"./framework-98842e7a.js";const i={},u=c(`<h1 id="_9-unsafe-不-safe-我们来一套-safe-的-api-访问堆外内存" tabindex="-1"><a class="header-anchor" href="#_9-unsafe-不-safe-我们来一套-safe-的-api-访问堆外内存" aria-hidden="true">#</a> 9. Unsafe 不 safe，我们来一套 safe 的 API 访问堆外内存</h1><blockquote><p>使用 Unsafe 直接访问堆外内存存在各种安全性问题，对于使用者的要求也比较高，不太适合在业务当中广泛使用。于是，Java 在新孵化的 API 当中提供了更安全的方案。</p></blockquote><h2 id="jep-412-foreign-function-memory-api-incubator" tabindex="-1"><a class="header-anchor" href="#jep-412-foreign-function-memory-api-incubator" aria-hidden="true">#</a> JEP 412: Foreign Function &amp; Memory API (Incubator)</h2><p>接下来，我们来聊聊访问外部资源的新 API，这些内容来自于 <strong>JEP 412: Foreign Function &amp; Memory API (Incubator)</strong>。这个提案主要应对的场景就是调用 Java VM 以外的函数，即 Native 函数；访问 Java VM 以外的内存，即堆外内存（off-heap memory）。</p><p>这不就是要抢 JNI 的饭碗吗？</p><p><img src="https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates/764F4997.gif" alt=""></p><p>对，这个提案里面提到的堆外内存和代码访问都可以用 JNI 来做到，不过 JNI 不够好用，还够不安全。</p><p>Java 程序员不仅需要编写大量单调乏味的胶水代码（JNI 接口），还要去编写和调试自己本不熟悉（多数 Java 程序员甚至根本不会）的 C、C++ 代码，更要命的是调试工具也没有那么好用。当然，这些都可以克服，只是 Java 和 C、C++ 的类型系统却有着本质的区别而无法直接互通，我们总是需要把传到 C、C++ 层的 Java 对象的数据用类似于反射的 API 取出来，构造新的 C、C++ 对象来使用，非常的麻烦。</p><p>说到这个问题，我甚至在公司内见过有人用 C++ 基于 JNI 把 Java 层的常用类型都封装了一遍，你能想象在 C++ 代码当中使用 ArrayList 的情形吗？我当时一度觉得自己精神有些恍惚。</p><p><img src="https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates/7657EB7E.jpg" alt=""></p><p>这些年来 Java 官方在这方面也没有什么实质性的进展。JNI 难用就难用吧，总算还有得用，一些开源的框架例如 JNA、JNR、JavaCPP 都是基于 JNI 做了一些简化的工作，让 Java 与 Native 语言的调用没那么令人难受。</p><p>你可能以为这个提案的目的也是搞一个类似的框架，其实不然。Java 官方嘛，不搞就不搞，要搞就搞一套全新的方案，让开发者用着方便，程序性能更好（至少不比 JNI 更差），普适性更强，也更安全 —— 至少，他们是这么想的。</p><p><img src="https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates/765D0537.jpg" alt=""></p><p>稍微提一下，堆外内存访问的 API 从 Java 14 就开始孵化，到 Java 17 连续肝了四个版本了已经，仍然还是 incubator；访问外部函数的 API 则从 Java 16 开始孵化，到现在算是第二轮孵化了吧。如果大家要想在自己的程序里面体验这个能力，需要给编译器和虚拟机加参数：</p><div class="language-text line-numbers-mode" data-ext="text"><pre class="language-text"><code>--add-modules jdk.incubator.foreign --enable-native-access ALL-UNNAME
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div></div></div><p>由于内容较多，本篇我们只介绍堆外内存的访问。外部函数访问的内容我们放到下一篇介绍。</p><h2 id="访问堆外内存" tabindex="-1"><a class="header-anchor" href="#访问堆外内存" aria-hidden="true">#</a> 访问堆外内存</h2><p>基于现在的方案，我们有三种方式能访问到堆外内存，分别是</p><ul><li><p>ByteBuffer（就是 allocateDirect），这个方式用起来相对安全，使用体验也与访问虚拟机堆内存一致，但执行效率相对一般：</p><div class="language-java line-numbers-mode" data-ext="java"><pre class="language-java"><code><span class="token keyword">public</span> <span class="token keyword">static</span> <span class="token class-name">ByteBuffer</span> <span class="token function">allocateDirect</span><span class="token punctuation">(</span><span class="token keyword">int</span> capacity<span class="token punctuation">)</span> <span class="token punctuation">{</span>
    <span class="token keyword">return</span> <span class="token keyword">new</span> <span class="token class-name">DirectByteBuffer</span><span class="token punctuation">(</span>capacity<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">}</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div></li><li><p>使用 Unsafe 的相关方法，这个方式在 JIT 优化之下效率较高，但非常不安全，因为它实际上可以访问到任意位置的内存，例如：</p><div class="language-java line-numbers-mode" data-ext="java"><pre class="language-java"><code><span class="token class-name">Unsafe</span> unsafe <span class="token operator">=</span> <span class="token punctuation">.</span><span class="token punctuation">.</span><span class="token punctuation">.</span><span class="token punctuation">;</span>
<span class="token keyword">var</span> handle <span class="token operator">=</span> unsafe<span class="token punctuation">.</span><span class="token function">allocateMemory</span><span class="token punctuation">(</span><span class="token number">8</span><span class="token punctuation">)</span><span class="token punctuation">;</span> <span class="token comment">// 申请 8 字节内存</span>

unsafe<span class="token punctuation">.</span><span class="token function">putDouble</span><span class="token punctuation">(</span>handle<span class="token punctuation">,</span> <span class="token number">1024</span><span class="token punctuation">)</span><span class="token punctuation">;</span> <span class="token comment">// 往该内存当中写入 1024 这个 double</span>
<span class="token class-name">System</span><span class="token punctuation">.</span>out<span class="token punctuation">.</span><span class="token function">println</span><span class="token punctuation">(</span>unsafe<span class="token punctuation">.</span><span class="token function">getDouble</span><span class="token punctuation">(</span>handle<span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span> <span class="token comment">// 从该内存当中读取一个 double 出来</span>

unsafe<span class="token punctuation">.</span><span class="token function">freeMemory</span><span class="token punctuation">(</span>handle<span class="token punctuation">)</span><span class="token punctuation">;</span> <span class="token comment">// 释放这块内存</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div></li><li><p>使用 JNI，通过 C/C++ 直接操作堆外内存。</p></li></ul><p>对于 Java 程序员来讲，效率较高的后两种方式都不是特别友好。</p><p>接下来我们看一下新的内存访问方案，它主要解决了分配、访问和作用域等几个问题。</p><h3 id="堆外内存分配" tabindex="-1"><a class="header-anchor" href="#堆外内存分配" aria-hidden="true">#</a> 堆外内存分配</h3><p>我们可以通过 MemorySegment 来做到这一点：</p><div class="language-java line-numbers-mode" data-ext="java"><pre class="language-java"><code><span class="token class-name">MemorySegment</span> segment <span class="token operator">=</span> <span class="token class-name">MemorySegment</span><span class="token punctuation">.</span><span class="token function">allocateNative</span><span class="token punctuation">(</span><span class="token number">100</span><span class="token punctuation">,</span> <span class="token class-name">ResourceScope</span><span class="token punctuation">.</span><span class="token function">newImplicitScope</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div></div></div><p>尽管看上去跟前面的 Unsafe 类似，但这里面有很多细节上的差异，因为它对于堆外内存的访问是受限制的，就像访问数组一样更加安全。另外请注意 ResourceScope 这个参数，它会控制分配的堆外内存的作用范围，这个我们会在后面介绍。</p><h3 id="堆外内存访问" tabindex="-1"><a class="header-anchor" href="#堆外内存访问" aria-hidden="true">#</a> 堆外内存访问</h3><p>在堆外内存开辟以后，我们通常需要按照某种变量的方式去访问它，例如想要以 int 的方式读写，那么就创建一个 VarHandle 即可：</p><div class="language-java line-numbers-mode" data-ext="java"><pre class="language-java"><code><span class="token class-name">VarHandle</span> intHandle <span class="token operator">=</span> <span class="token class-name">MemoryHandles</span><span class="token punctuation">.</span><span class="token function">varHandle</span><span class="token punctuation">(</span><span class="token keyword">int</span><span class="token punctuation">.</span><span class="token keyword">class</span><span class="token punctuation">,</span> <span class="token class-name">ByteOrder</span><span class="token punctuation">.</span><span class="token function">nativeOrder</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div></div></div><p>这里支持的类型就是基本类型，包括 byte、short、char、int、float、long、double。</p><div class="language-java line-numbers-mode" data-ext="java"><pre class="language-java"><code><span class="token keyword">for</span> <span class="token punctuation">(</span><span class="token keyword">int</span> i <span class="token operator">=</span> <span class="token number">0</span><span class="token punctuation">;</span> i <span class="token operator">&lt;</span> <span class="token number">25</span><span class="token punctuation">;</span> i<span class="token operator">++</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
    intHandle<span class="token punctuation">.</span><span class="token function">set</span><span class="token punctuation">(</span>segment<span class="token punctuation">,</span> <span class="token comment">/* offset */</span> i <span class="token operator">*</span> <span class="token number">4</span><span class="token punctuation">,</span> <span class="token comment">/* value to write */</span> i<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">}</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>我们知道 Java 的 int 占 4 个字节，因此直接对前面开辟的内存 segment 进行读写操作即可。那如果我读写的范围越界会发生什么呢？</p><div class="language-java line-numbers-mode" data-ext="java"><pre class="language-java"><code>intHandle<span class="token punctuation">.</span><span class="token function">set</span><span class="token punctuation">(</span>segment<span class="token punctuation">,</span> <span class="token number">100</span> <span class="token comment">/* out of bounds!! */</span><span class="token punctuation">,</span> <span class="token number">1000</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div></div></div><p>运行程序结果发现抛了个异常，这个异常就是 MemorySegment 抛出来的：</p><div class="language-text line-numbers-mode" data-ext="text"><pre class="language-text"><code>Exception in thread &quot;main&quot; java.lang.IndexOutOfBoundsException: Out of bound access on segment MemorySegment{ id=0x17366e0a limit: 100 }; new offset = 100; new length = 4
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div></div></div><p>这样相比使用 Unsafe 访问内存的好处就在于受控制。</p><p>使用 Unsafe 访问堆外内存就好像直接使用 C 指针操作内存一样。C 语言主张相信程序员，所以对于 C 程序员使用指针访问内存不加任何限制。可是在内存管理这个问题上，Java 程序员并不一定像 C 程序员那么可靠。</p><p><img src="https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates-09-foreignapi-memory/247072E2.jpg" alt="img"></p><p>我们不妨再给大家看看 Unsafe 的例子，看看是不是如同操作 C 指针一样：</p><div class="language-java line-numbers-mode" data-ext="java"><pre class="language-java"><code><span class="token keyword">var</span> handle <span class="token operator">=</span> unsafe<span class="token punctuation">.</span><span class="token function">allocateMemory</span><span class="token punctuation">(</span><span class="token number">16</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

<span class="token comment">// 操作分配的内存之后的部分，实际上这部分内存完全不可预见</span>
unsafe<span class="token punctuation">.</span><span class="token function">putInt</span><span class="token punctuation">(</span>handle <span class="token operator">+</span> <span class="token number">16</span><span class="token punctuation">,</span> <span class="token number">1000</span><span class="token punctuation">)</span><span class="token punctuation">;</span> 
<span class="token comment">// 读取非法内存</span>
<span class="token class-name">System</span><span class="token punctuation">.</span>out<span class="token punctuation">.</span><span class="token function">println</span><span class="token punctuation">(</span>unsafe<span class="token punctuation">.</span><span class="token function">getInt</span><span class="token punctuation">(</span>handle <span class="token operator">+</span> <span class="token number">16</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span> 

unsafe<span class="token punctuation">.</span><span class="token function">freeMemory</span><span class="token punctuation">(</span>handle<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token comment">// 内存已经回收了，仍然可以读</span>
<span class="token class-name">System</span><span class="token punctuation">.</span>out<span class="token punctuation">.</span><span class="token function">println</span><span class="token punctuation">(</span>unsafe<span class="token punctuation">.</span><span class="token function">getInt</span><span class="token punctuation">(</span>handle<span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span> 
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>这样我们就知道 Unsafe 是真的不 safe 啊。不仅如此，一旦忘了释放内存，就会造成内存泄漏。我们甚至无法通过 handle 来判断内存是否有效，对于已经回收的内存，handle 对象不就是野指针了嘛。</p><p><img src="https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates/78650EAC.jpg" alt=""></p><p>除了提升安全性以外，新 API 还提供了一套内存布局相关的 API：</p><p><img src="https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates/image-20210923070228075.png" alt=""></p><p>这套 API 可以降低堆外内存访问的代码复杂度，例如：</p><div class="language-java line-numbers-mode" data-ext="java"><pre class="language-java"><code><span class="token class-name">SequenceLayout</span> intArrayLayout <span class="token operator">=</span> <span class="token class-name">MemoryLayout</span><span class="token punctuation">.</span><span class="token function">sequenceLayout</span><span class="token punctuation">(</span><span class="token number">25</span><span class="token punctuation">,</span> <span class="token class-name">MemoryLayout</span><span class="token punctuation">.</span><span class="token function">valueLayout</span><span class="token punctuation">(</span><span class="token number">32</span><span class="token punctuation">,</span> <span class="token class-name">ByteOrder</span><span class="token punctuation">.</span><span class="token function">nativeOrder</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token class-name">MemorySegment</span> segment <span class="token operator">=</span> <span class="token class-name">MemorySegment</span><span class="token punctuation">.</span><span class="token function">allocateNative</span><span class="token punctuation">(</span>intArrayLayout<span class="token punctuation">,</span> <span class="token function">newImplicitScope</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token class-name">VarHandle</span> indexedElementHandle <span class="token operator">=</span> intArrayLayout<span class="token punctuation">.</span><span class="token function">varHandle</span><span class="token punctuation">(</span><span class="token keyword">int</span><span class="token punctuation">.</span><span class="token keyword">class</span><span class="token punctuation">,</span> <span class="token class-name">PathElement</span><span class="token punctuation">.</span><span class="token function">sequenceElement</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token keyword">for</span> <span class="token punctuation">(</span><span class="token keyword">int</span> i <span class="token operator">=</span> <span class="token number">0</span><span class="token punctuation">;</span> i <span class="token operator">&lt;</span> intArrayLayout<span class="token punctuation">.</span><span class="token function">elementCount</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">.</span><span class="token function">getAsLong</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span> i<span class="token operator">++</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
    indexedElementHandle<span class="token punctuation">.</span><span class="token function">set</span><span class="token punctuation">(</span>segment<span class="token punctuation">,</span> <span class="token punctuation">(</span><span class="token keyword">long</span><span class="token punctuation">)</span> i<span class="token punctuation">,</span> i<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">}</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>这样我们在开辟内存空间的时候只需要通过 SequenceLayout 描述清楚我们需要什么样的内存（32bit，Native 字节序），多少个（25 个），然后用它去开辟空间，并完成读写。</p><ul><li>PaddingLayout 会在我们需要的数据后添加额外的内存空间，主要用于内存对齐。</li><li>ValueLayout 用来映射基本的数值类型，例如 int、float 等等。</li><li>GroupLayout 可以用来组合其他的 MemoryLayout。它有两种类型，分别是 STRUCT 和 UNION。熟悉 C 语言的小伙伴们应该立刻就能明白，它在调用 C 函数的时非常有用，可以用来映射 C 的结构体和联合体。</li></ul><p>简单来说，在调用 C 函数时，我们可以很方便地使用这些 MemoryLayout 映射到 C 类型。</p><p><img src="https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates-09-foreignapi-memory/2476265B.png" alt="img"></p><h3 id="堆外内存的作用域" tabindex="-1"><a class="header-anchor" href="#堆外内存的作用域" aria-hidden="true">#</a> 堆外内存的作用域</h3><p>作用域这个东西实在是关键。</p><p>Java 的一大优点就是内存垃圾回收机制。内存都被虚拟机接管了，我们只需要考虑如何使用内存即可，虚拟机就像个大管家一样默默的为我们付出。这极大的降低了程序员管理内存的成本，也极大的降低了程序员在内存操作上犯错误的可能，对比我之前写 C++ 的时候经常因为某个内存错误查到半夜找不到头绪的情况，用 Java 写程序时开发效率的提升真不是一点儿半点儿。</p><p><img src="https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates/786BA6D8.gif" alt=""></p><p>要想让 Java 程序员用得舒服，那必须把堆外内存的管理也尽可能做到简单易用。为此，JDK 引入了资源作用域的概念，对应的类型就是 ResourceScope。这是一个密封接口，它有且仅有一个非密封的实现类 ResourceScopeImpl，JDK 还为这个实现类提供了三种具体的实现：</p><ul><li>GLOBAL：这实际上是一个匿名内部类对象，它是全局作用域，使用它开辟的堆外内存不会自动释放。</li><li>ImplicitScopeImpl：我们在前面演示新 API 的使用时已经提到过，调用 <code>ResourceScope.newImplicitScope()</code> 返回的正是 ImplicitScopeImpl。这种类型的 Scope 不能被主动关闭，不过使用它开辟的内存会在持有内存的 MemorySegment 对象不再被持有时释放。这个逻辑在 CleanerImpl 当中通过 ReferenceQueue 配合 PhantomReference 来实现。</li><li>SharedScope：最主要的能力就是提供了多线程共享访问的支持；是 ImplicitScopeImpl 的父类，二者的差别在于 SharedScope 可以被主动关闭，不过必须确保只能被关闭一次。</li><li>ConfinedScope：单线程作用域，只能在所属的线程内访问，比较适合局部环境下的内存管理。</li></ul><p>我们再来看一个例子：</p><div class="language-java line-numbers-mode" data-ext="java"><pre class="language-java"><code><span class="token keyword">try</span><span class="token punctuation">(</span><span class="token keyword">var</span> scope <span class="token operator">=</span> <span class="token class-name">ResourceScope</span><span class="token punctuation">.</span><span class="token function">newConfinedScope</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
    <span class="token class-name">MemorySegment</span> memorySegment <span class="token operator">=</span> <span class="token class-name">MemorySegment</span><span class="token punctuation">.</span><span class="token function">allocateNative</span><span class="token punctuation">(</span><span class="token number">100</span><span class="token punctuation">,</span> scope<span class="token punctuation">)</span><span class="token punctuation">;</span>
    <span class="token punctuation">.</span><span class="token punctuation">.</span><span class="token punctuation">.</span>
<span class="token punctuation">}</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>这个例子当中我们使用 ConfinedScope 来开辟内存，由于这个 scope 在 try-resource 语句结束之后就会被关闭，因此其中开辟的内存也会在语句结束的时候理解回收。</p><h2 id="小结" tabindex="-1"><a class="header-anchor" href="#小结" aria-hidden="true">#</a> 小结</h2><p>Java 17 为访问堆外内存提供了一套较为完成的 API，试图简化 Java 代码操作堆外内存的难度。从实际的使用体验来看，安全性确实可以得到一定程度上的保障，不过易用性嘛，倒是保持了 Java 的传统，这个我们在下一篇文章当中还会提及。</p><h2 id="关于作者" tabindex="-1"><a class="header-anchor" href="#关于作者" aria-hidden="true">#</a> 关于作者</h2><p><strong>霍丙乾 bennyhuo</strong>，Google 开发者专家（Kotlin 方向）；<strong>《深入理解 Kotlin 协程》</strong> 作者（机械工业出版社，2020.6）；<strong>《深入实践 Kotlin 元编程》</strong> 作者（机械工业出版社，2023.8）；移动客户端工程师，先后就职于腾讯地图、猿辅导、腾讯视频。</p>`,62),d=n("li",null,"GitHub：https://github.com/bennyhuo",-1),r=n("li",null,"博客：https://www.bennyhuo.com",-1),k={href:"https://space.bilibili.com/28615855",target:"_blank",rel:"noopener noreferrer"},m=n("strong",null,"霍丙乾 bennyhuo",-1),v=n("li",null,[a("微信公众号："),n("strong",null,"霍丙乾 bennyhuo")],-1);function b(f,g){const s=l("ExternalLinkIcon");return t(),p("div",null,[u,n("ul",null,[d,r,n("li",null,[a("bilibili："),n("a",k,[m,o(s)])]),v])])}const y=e(i,[["render",b],["__file","09-foreignapi-memory.html.vue"]]);export{y as default};
