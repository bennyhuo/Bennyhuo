const e=JSON.parse('{"key":"v-ad76938a","path":"/cpp-coroutines/05-dispatcher.html","title":"5. 协程的调度器","lang":"zh-CN","frontmatter":{"description":"协程想要实现异步，很大程度上依赖于调度器的设计。 调度器的抽象设计 为了实现协程的异步调度，我们需要提供调度器的实现。调度器听起来有些厉害，但实际上就是负责执行一段逻辑的工具。 下面我们给出调度器的抽象设计： 是的，你没看错，调度器本身就是这么简单。 调度的位置 现在我们已经知道了调度器的样子，那么问题来了，怎么才能把它接入到协程当中呢？这个问题换个说...","head":[["meta",{"property":"og:url","content":"https://www.bennyhuo.com/book/cpp-coroutines/05-dispatcher.html"}],["meta",{"property":"og:site_name","content":"Benny Huo 的专栏"}],["meta",{"property":"og:title","content":"5. 协程的调度器"}],["meta",{"property":"og:description","content":"协程想要实现异步，很大程度上依赖于调度器的设计。 调度器的抽象设计 为了实现协程的异步调度，我们需要提供调度器的实现。调度器听起来有些厉害，但实际上就是负责执行一段逻辑的工具。 下面我们给出调度器的抽象设计： 是的，你没看错，调度器本身就是这么简单。 调度的位置 现在我们已经知道了调度器的样子，那么问题来了，怎么才能把它接入到协程当中呢？这个问题换个说..."}],["meta",{"property":"og:type","content":"article"}],["meta",{"property":"og:locale","content":"zh-CN"}],["meta",{"property":"og:updated_time","content":"2023-08-29T20:01:10.000Z"}],["meta",{"property":"article:author","content":"Benny Huo"}],["meta",{"property":"article:modified_time","content":"2023-08-29T20:01:10.000Z"}],["script",{"type":"application/ld+json"},"{\\"@context\\":\\"https://schema.org\\",\\"@type\\":\\"Article\\",\\"headline\\":\\"5. 协程的调度器\\",\\"image\\":[\\"\\"],\\"dateModified\\":\\"2023-08-29T20:01:10.000Z\\",\\"author\\":[{\\"@type\\":\\"Person\\",\\"name\\":\\"Benny Huo\\",\\"url\\":\\"https://www.bennyhuo.com\\"}]}"]]},"headers":[{"level":2,"title":"调度器的抽象设计","slug":"调度器的抽象设计","link":"#调度器的抽象设计","children":[]},{"level":2,"title":"调度的位置","slug":"调度的位置","link":"#调度的位置","children":[]},{"level":2,"title":"调度器应该由谁持有","slug":"调度器应该由谁持有","link":"#调度器应该由谁持有","children":[]},{"level":2,"title":"调度器的实现","slug":"调度器的实现","link":"#调度器的实现","children":[{"level":3,"title":"NoopExecutor","slug":"noopexecutor","link":"#noopexecutor","children":[]},{"level":3,"title":"NewThreadExecutor","slug":"newthreadexecutor","link":"#newthreadexecutor","children":[]},{"level":3,"title":"AsyncExecutor","slug":"asyncexecutor","link":"#asyncexecutor","children":[]},{"level":3,"title":"LooperExecutor","slug":"looperexecutor","link":"#looperexecutor","children":[]},{"level":3,"title":"SharedLooperExecutor","slug":"sharedlooperexecutor","link":"#sharedlooperexecutor","children":[]}]},{"level":2,"title":"小试牛刀","slug":"小试牛刀","link":"#小试牛刀","children":[]},{"level":2,"title":"小结","slug":"小结","link":"#小结","children":[]},{"level":2,"title":"关于作者","slug":"关于作者","link":"#关于作者","children":[]}],"git":{"createdTime":1648122991000,"updatedTime":1693339270000,"contributors":[{"name":"bennyhuo","email":"bennyhuo@kotliner.cn","commits":5}]},"readingTime":{"minutes":9.81,"words":2943},"filePathRelative":"cpp-coroutines/05-dispatcher.md","localizedDate":"2022年3月24日","autoDesc":true}');export{e as data};
