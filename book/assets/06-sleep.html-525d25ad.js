const e=JSON.parse('{"key":"v-3e2d8078","path":"/cpp-coroutines/06-sleep.html","title":"6. 基于协程的挂起实现无阻塞的 sleep","lang":"zh-CN","frontmatter":{"description":"如果你想要等待 100ms，你会怎么做？sleep_for(100ms) 吗？ 实现目标 在以往，我们想要让程序等待 100ms，我们只能调用线程的 sleep 函数来阻塞当前线程 100ms。 这样做确实可以让程序等待 100ms，但坏处就是这 100ms 期间，被阻塞的当前线程什么也做不了，白白占用了内存。协程出现之后，我们其实完全可以让协程在需要...","head":[["meta",{"property":"og:url","content":"https://www.bennyhuo.com/book/cpp-coroutines/06-sleep.html"}],["meta",{"property":"og:site_name","content":"Benny Huo 的专栏"}],["meta",{"property":"og:title","content":"6. 基于协程的挂起实现无阻塞的 sleep"}],["meta",{"property":"og:description","content":"如果你想要等待 100ms，你会怎么做？sleep_for(100ms) 吗？ 实现目标 在以往，我们想要让程序等待 100ms，我们只能调用线程的 sleep 函数来阻塞当前线程 100ms。 这样做确实可以让程序等待 100ms，但坏处就是这 100ms 期间，被阻塞的当前线程什么也做不了，白白占用了内存。协程出现之后，我们其实完全可以让协程在需要..."}],["meta",{"property":"og:type","content":"article"}],["meta",{"property":"og:locale","content":"zh-CN"}],["meta",{"property":"og:updated_time","content":"2024-07-21T13:14:11.000Z"}],["meta",{"property":"article:author","content":"Benny Huo"}],["meta",{"property":"article:modified_time","content":"2024-07-21T13:14:11.000Z"}],["script",{"type":"application/ld+json"},"{\\"@context\\":\\"https://schema.org\\",\\"@type\\":\\"Article\\",\\"headline\\":\\"6. 基于协程的挂起实现无阻塞的 sleep\\",\\"image\\":[\\"\\"],\\"dateModified\\":\\"2024-07-21T13:14:11.000Z\\",\\"author\\":[{\\"@type\\":\\"Person\\",\\"name\\":\\"Benny Huo\\",\\"url\\":\\"https://www.bennyhuo.com\\"}]}"]]},"headers":[{"level":2,"title":"实现目标","slug":"实现目标","link":"#实现目标","children":[]},{"level":2,"title":"为 duration 实现 await_transform","slug":"为-duration-实现-await-transform","link":"#为-duration-实现-await-transform","children":[]},{"level":2,"title":"定时任务调度器 Scheduler","slug":"定时任务调度器-scheduler","link":"#定时任务调度器-scheduler","children":[{"level":3,"title":"定义定时任务的描述类型","slug":"定义定时任务的描述类型","link":"#定义定时任务的描述类型","children":[]},{"level":3,"title":"实现定时任务调度器","slug":"实现定时任务调度器","link":"#实现定时任务调度器","children":[]}]},{"level":2,"title":"小试牛刀","slug":"小试牛刀","link":"#小试牛刀","children":[]},{"level":2,"title":"小结","slug":"小结","link":"#小结","children":[]},{"level":2,"title":"关于作者","slug":"关于作者","link":"#关于作者","children":[]}],"git":{"createdTime":1648122991000,"updatedTime":1721567651000,"contributors":[{"name":"bennyhuo","email":"bennyhuo@kotliner.cn","commits":6}]},"readingTime":{"minutes":8.6,"words":2579},"filePathRelative":"cpp-coroutines/06-sleep.md","localizedDate":"2022年3月24日","autoDesc":true}');export{e as data};
