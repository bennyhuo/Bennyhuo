const e=JSON.parse('{"key":"v-6c9a884f","path":"/kotlin-coroutines/05-cancellation.html","title":"5. 协程取消篇","lang":"zh-CN","frontmatter":{"description":"协程的任务的取消需要靠协程内部调用的协作支持，这就类似于我们线程中断以及对中断状态的响应一样。 1. 线程的中断 我们先从大家熟悉的话题讲起。线程有一个被废弃的 stop 方法，这个方法会让线程立即死掉，并且释放它持有的锁，这样会让它正在读写的存储处于一个不安全的状态，因此 stop 被废弃了。如果我们启动了一个线程并让它执行一些任务，但很快我们就后悔...","head":[["meta",{"property":"og:url","content":"https://www.bennyhuo.com/book/kotlin-coroutines/05-cancellation.html"}],["meta",{"property":"og:site_name","content":"Benny Huo 的专栏"}],["meta",{"property":"og:title","content":"5. 协程取消篇"}],["meta",{"property":"og:description","content":"协程的任务的取消需要靠协程内部调用的协作支持，这就类似于我们线程中断以及对中断状态的响应一样。 1. 线程的中断 我们先从大家熟悉的话题讲起。线程有一个被废弃的 stop 方法，这个方法会让线程立即死掉，并且释放它持有的锁，这样会让它正在读写的存储处于一个不安全的状态，因此 stop 被废弃了。如果我们启动了一个线程并让它执行一些任务，但很快我们就后悔..."}],["meta",{"property":"og:type","content":"article"}],["meta",{"property":"og:locale","content":"zh-CN"}],["meta",{"property":"og:updated_time","content":"2024-07-21T13:14:11.000Z"}],["meta",{"property":"article:author","content":"Benny Huo"}],["meta",{"property":"article:modified_time","content":"2024-07-21T13:14:11.000Z"}],["script",{"type":"application/ld+json"},"{\\"@context\\":\\"https://schema.org\\",\\"@type\\":\\"Article\\",\\"headline\\":\\"5. 协程取消篇\\",\\"image\\":[\\"\\"],\\"dateModified\\":\\"2024-07-21T13:14:11.000Z\\",\\"author\\":[{\\"@type\\":\\"Person\\",\\"name\\":\\"Benny Huo\\",\\"url\\":\\"https://www.bennyhuo.com\\"}]}"]]},"headers":[{"level":2,"title":"1. 线程的中断","slug":"_1-线程的中断","link":"#_1-线程的中断","children":[]},{"level":2,"title":"2. 协程类似的例子","slug":"_2-协程类似的例子","link":"#_2-协程类似的例子","children":[]},{"level":2,"title":"3. 完善我们之前的例子","slug":"_3-完善我们之前的例子","link":"#_3-完善我们之前的例子","children":[]},{"level":2,"title":"4. 再谈 Retrofit 的协程扩展","slug":"_4-再谈-retrofit-的协程扩展","link":"#_4-再谈-retrofit-的协程扩展","children":[{"level":3,"title":"4.1 Jake Wharton 的 Adapter 存在的问题","slug":"_4-1-jake-wharton-的-adapter-存在的问题","link":"#_4-1-jake-wharton-的-adapter-存在的问题","children":[]},{"level":3,"title":"4.2 如何正确的将回调转换为协程","slug":"_4-2-如何正确的将回调转换为协程","link":"#_4-2-如何正确的将回调转换为协程","children":[]}]},{"level":2,"title":"5. 小结","slug":"_5-小结","link":"#_5-小结","children":[]},{"level":2,"title":"关于作者","slug":"关于作者","link":"#关于作者","children":[]}],"git":{"createdTime":1648649921000,"updatedTime":1721567651000,"contributors":[{"name":"bennyhuo","email":"bennyhuo@kotliner.cn","commits":5}]},"readingTime":{"minutes":12.34,"words":3701},"filePathRelative":"kotlin-coroutines/05-cancellation.md","localizedDate":"2022年3月30日","autoDesc":true}');export{e as data};
