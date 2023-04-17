import{_ as e,W as p,X as o,Y as n,$ as a,Z as t,a0 as c,C as l}from"./framework-88b7ff58.js";const i={},u=n("h1",{id:"_1-更快的-lts-节奏",tabindex:"-1"},[n("a",{class:"header-anchor",href:"#_1-更快的-lts-节奏","aria-hidden":"true"},"#"),a(" 1. 更快的 LTS 节奏")],-1),r=n("blockquote",null,[n("p",null,"2021 年 9月 23 日，Java 17 发布了，更新的内容还真不少，足足肝了我一星期才把这些内容整理完。")],-1),d=n("p",null,"朋友们大家好，我是 bennyhuo，今天我们来聊聊 Java 17 的更新。",-1),k=n("p",null,"Java 17 更新了，作为一个 10 年的 Java 程序员，还是有亿点点兴奋的，Kotlin 的群里面也是各种讨论 Java 的新特性。",-1),v={href:"https://github.com/luontola/retrolambda",target:"_blank",rel:"noopener noreferrer"},m=c(`<p><img src="https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates/image-20210920110824409.png" alt=""></p><p>现在的 Java 8 可能大概相当于那时候的 Java 6，在使用上已经非常普遍了，甚至已经有一点儿过时：就连 Android 最近也开始从最新的 Android Studio 版本开始把 Java 11 作为默认版本了。</p><p><img src="https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates-01/image-20210926071213288.png" alt="image-20210926071213288"></p><p>现在 Java 17 的发布，让 Java 11 成了 LTS 系列的次新版本，Java 8 离老破小的距离也越来越近了 —— 不仅如此，Java 官方还想要加快这个节奏，因为他们打算把 LTS 发布的节奏从三年缩短到两年。这么看来，下一个 LTS 将会是在 2023 年 9 月发布的 Java 21。</p><p>想当年，Java 的版本发布以前是何其佛系，版本号也是 1.x 这样一路走来，从 1.0 （1996 年） 发布到 1.5（2004年） 就花了近 10 年，然后又花了差不多 10 年到了 1.8（2014 年）。这其中从 1.5 开始启用了新的版本号命名方式，即 Java SE 5，Java SE 8 这样的叫法。直到现在，2021 年，不管 Java 有没有变化，Java 的版本号已经发生了质的飞跃。</p><p><img src="https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates/6F19CE1C.jpg" alt=""></p><p>从 2017 年 9 月发布 Java 9 开始，Java 进入每 6 个月一个版本的节奏。这对于开发者来讲是好事，喜欢尝鲜的开发者可以很快地在非 LTS 版本当中体验到 Java 的新特性。</p><p>做出这个改变的时间点是非常微妙的，因为 Kotlin 1.0 是 2016 年 2 月发布的，Google 在 2017 年 5 月官宣 Kotlin 为 Android 的一级开发语言（首选语言的宣布是在 2019 年的 IO 大会上）。</p><p><img src="https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates-01-intro/02EFAF65.jpg" alt="img"></p><p>后来我们就看到，Java 越来越像 Kotlin 了，Java 10 有了 var：</p><div class="language-java line-numbers-mode" data-ext="java"><pre class="language-java"><code><span class="token keyword">var</span> list <span class="token operator">=</span> <span class="token keyword">new</span> <span class="token class-name">ArrayList</span><span class="token generics"><span class="token punctuation">&lt;</span><span class="token class-name">String</span><span class="token punctuation">&gt;</span></span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span> <span class="token comment">// infers ArrayList&lt;String&gt;</span>
<span class="token keyword">var</span> stream <span class="token operator">=</span> list<span class="token punctuation">.</span><span class="token function">stream</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>         <span class="token comment">// infers Stream&lt;String&gt;</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div></div></div><p>Java 13 有了多行字符串字面量：</p><div class="language-java line-numbers-mode" data-ext="java"><pre class="language-java"><code><span class="token class-name">String</span> html <span class="token operator">=</span> <span class="token triple-quoted-string string">&quot;&quot;&quot;
              &lt;HTML lang=&quot;en&quot;&gt;
                  &lt;body&gt;
                      &lt;p&gt;Hello, world&lt;/p&gt;
                  &lt;/body&gt;
              &lt;/html&gt;
              &quot;&quot;&quot;</span><span class="token punctuation">;</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>Java 14 有了 switch 表达式（12 开始预览）：</p><div class="language-java line-numbers-mode" data-ext="java"><pre class="language-java"><code><span class="token keyword">int</span> ndays <span class="token operator">=</span> <span class="token keyword">switch</span><span class="token punctuation">(</span>month<span class="token punctuation">)</span> <span class="token punctuation">{</span>
    <span class="token keyword">case</span> <span class="token constant">JAN</span><span class="token punctuation">,</span> <span class="token constant">MAR</span><span class="token punctuation">,</span> <span class="token constant">MAY</span><span class="token punctuation">,</span> <span class="token constant">JUL</span><span class="token punctuation">,</span> <span class="token constant">AUG</span><span class="token punctuation">,</span> <span class="token constant">OCT</span><span class="token punctuation">,</span> <span class="token constant">DEC</span> <span class="token operator">-&gt;</span> <span class="token number">31</span><span class="token punctuation">;</span>
    <span class="token keyword">case</span> <span class="token constant">APR</span><span class="token punctuation">,</span> <span class="token constant">JUN</span><span class="token punctuation">,</span> <span class="token constant">SEP</span><span class="token punctuation">,</span> <span class="token constant">NOV</span> <span class="token operator">-&gt;</span> <span class="token number">30</span><span class="token punctuation">;</span>
    <span class="token keyword">case</span> <span class="token constant">FEB</span> <span class="token operator">-&gt;</span> <span class="token punctuation">{</span>
        <span class="token keyword">if</span> <span class="token punctuation">(</span>year <span class="token operator">%</span> <span class="token number">400</span> <span class="token operator">==</span> <span class="token number">0</span><span class="token punctuation">)</span> <span class="token keyword">yield</span> <span class="token number">29</span><span class="token punctuation">;</span>
        <span class="token keyword">else</span> <span class="token keyword">if</span> <span class="token punctuation">(</span>year <span class="token operator">%</span> <span class="token number">100</span> <span class="token operator">==</span> <span class="token number">0</span><span class="token punctuation">)</span> <span class="token keyword">yield</span> <span class="token number">28</span><span class="token punctuation">;</span>
        <span class="token keyword">else</span> <span class="token keyword">if</span> <span class="token punctuation">(</span>year <span class="token operator">%</span> <span class="token number">4</span> <span class="token operator">==</span> <span class="token number">0</span><span class="token punctuation">)</span> <span class="token keyword">yield</span> <span class="token number">29</span><span class="token punctuation">;</span>
        <span class="token keyword">else</span> <span class="token keyword">yield</span> <span class="token number">28</span><span class="token punctuation">;</span> <span class="token punctuation">}</span>
<span class="token punctuation">}</span><span class="token punctuation">;</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>Java 16 加入了类型判断的模式匹配（Java 14 开始预览），以下示例在效果上类似于 Kotlin 的智能类型转换：</p><div class="language-java line-numbers-mode" data-ext="java"><pre class="language-java"><code><span class="token keyword">if</span> <span class="token punctuation">(</span>obj <span class="token keyword">instanceof</span> <span class="token class-name">String</span> s<span class="token punctuation">)</span> <span class="token punctuation">{</span>
    <span class="token class-name">System</span><span class="token punctuation">.</span>out<span class="token punctuation">.</span><span class="token function">println</span><span class="token punctuation">(</span> s<span class="token punctuation">.</span><span class="token function">length</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">}</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>还有数据类（Java 14 开始预览）：</p><div class="language-java line-numbers-mode" data-ext="java"><pre class="language-java"><code><span class="token keyword">record</span> <span class="token class-name">Point</span><span class="token punctuation">(</span><span class="token keyword">int</span> x<span class="token punctuation">,</span> <span class="token keyword">int</span> y<span class="token punctuation">)</span> <span class="token punctuation">{</span> <span class="token punctuation">}</span>
<span class="token class-name">Point</span> p <span class="token operator">=</span> <span class="token keyword">new</span> <span class="token class-name">Point</span><span class="token punctuation">(</span><span class="token number">3</span><span class="token punctuation">,</span><span class="token number">4</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token class-name">System</span><span class="token punctuation">.</span>out<span class="token punctuation">.</span><span class="token function">println</span><span class="token punctuation">(</span> p<span class="token punctuation">.</span><span class="token function">x</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">)</span><span class="token punctuation">;</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>可以说，Java 重新焕发了生机，喜欢 Java 的开发者们再也不必等待漫长的版本更新了。</p><p><img src="https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates/6F181E49.png" alt=""></p><p>然后更有趣的事情发生了。Java 就这么疯狂的发版发了三年之后，Kotlin 慌了，它终于在花了将近两年时间憋完 1.4 这个编译器重写的大版本之后宣布，后续每半年发一个版本。</p><p><img src="https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates-01-intro/02F416C6.jpg" alt="img"></p><p>哈哈，看来我再也不用发愁选题了。​做为一个最近专注于发 C++ 视频的 Kotlin 补刀师，连续研究了一周 Java 17 的更新，真是给我乐坏了：你们快卷起来啊。</p><p><img src="https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates/6F17BC34.jpg" alt=""></p><p>好了，这一篇算是这一系列的开篇，为了降低大家的阅读成本，我会把主要的更新内容，其实就是合入的 JEP 拆成了十几篇文章，后面尽快发出来。另外，有些比较有意思的内容，我也许大概率也会提供配套视频介绍，欢迎大家关注我的 Bilibili 频道：<strong>bennyhuo 不是算命的</strong>。</p><h2 id="关于作者" tabindex="-1"><a class="header-anchor" href="#关于作者" aria-hidden="true">#</a> 关于作者</h2><p><strong>霍丙乾 bennyhuo</strong>，Google 开发者专家（Kotlin 方向）；<strong>《深入理解 Kotlin 协程》</strong> 作者（机械工业出版社，2020.6）；<strong>《深入实践 Kotlin 元编程》</strong> 作者（机械工业出版社，预计 2023 Q3）；前腾讯高级工程师，现就职于猿辅导</p>`,28),b=n("li",null,"GitHub：https://github.com/bennyhuo",-1),g=n("li",null,"博客：https://www.bennyhuo.com",-1),h={href:"https://space.bilibili.com/28615855",target:"_blank",rel:"noopener noreferrer"},y=n("strong",null,"霍丙乾 bennyhuo",-1),f=n("li",null,[a("微信公众号："),n("strong",null,"霍丙乾 bennyhuo")],-1);function J(_,w){const s=l("ExternalLinkIcon");return p(),o("div",null,[u,r,d,k,n("p",null,[a("我记得五六年前，谈论起当时刚刚进入人们视野不久的 Java 8，大家还是一副“我们公司还在用 Java 6” 的表情，现在想想 "),n("a",v,[a("RetroLambda"),t(s)]),a(" 都已经是很久远的事儿了：")]),m,n("ul",null,[b,g,n("li",null,[a("bilibili："),n("a",h,[y,t(s)])]),f])])}const S=e(i,[["render",J],["__file","01-intro.html.vue"]]);export{S as default};
