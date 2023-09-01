const e=JSON.parse('{"key":"v-307a71f9","path":"/kotlin-coroutines/09-channel.html","title":"9. Channel 篇","lang":"zh-CN","frontmatter":{"description":"Channel 实际上就是协程在生产消费者模型上的应用，把过去你用 BlockingQueue 实现的功能替换成 Channel，也许会有新的发现~ 1. 认识 Channel Channel 实际上就是一个队列，而且是并发安全的，它可以用来连接协程，实现不同协程的通信。废话不多说，直接看例子： 我们构造了两个协程，分别叫他们 producer 和 c...","head":[["meta",{"property":"og:url","content":"https://www.bennyhuo.com/book/kotlin-coroutines/09-channel.html"}],["meta",{"property":"og:site_name","content":"Benny Huo 的专栏"}],["meta",{"property":"og:title","content":"9. Channel 篇"}],["meta",{"property":"og:description","content":"Channel 实际上就是协程在生产消费者模型上的应用，把过去你用 BlockingQueue 实现的功能替换成 Channel，也许会有新的发现~ 1. 认识 Channel Channel 实际上就是一个队列，而且是并发安全的，它可以用来连接协程，实现不同协程的通信。废话不多说，直接看例子： 我们构造了两个协程，分别叫他们 producer 和 c..."}],["meta",{"property":"og:type","content":"article"}],["meta",{"property":"og:locale","content":"zh-CN"}],["meta",{"property":"og:updated_time","content":"2023-04-16T15:04:10.000Z"}],["meta",{"property":"article:author","content":"Benny Huo"}],["meta",{"property":"article:modified_time","content":"2023-04-16T15:04:10.000Z"}],["script",{"type":"application/ld+json"},"{\\"@context\\":\\"https://schema.org\\",\\"@type\\":\\"Article\\",\\"headline\\":\\"9. Channel 篇\\",\\"image\\":[\\"\\"],\\"dateModified\\":\\"2023-04-16T15:04:10.000Z\\",\\"author\\":[{\\"@type\\":\\"Person\\",\\"name\\":\\"Benny Huo\\",\\"url\\":\\"https://www.bennyhuo.com\\"}]}"]]},"headers":[{"level":2,"title":"1. 认识 Channel","slug":"_1-认识-channel","link":"#_1-认识-channel","children":[]},{"level":2,"title":"2. Channel 的容量","slug":"_2-channel-的容量","link":"#_2-channel-的容量","children":[]},{"level":2,"title":"3. 迭代 Channel","slug":"_3-迭代-channel","link":"#_3-迭代-channel","children":[]},{"level":2,"title":"4. produce 和 actor","slug":"_4-produce-和-actor","link":"#_4-produce-和-actor","children":[]},{"level":2,"title":"5. Channel 的关闭","slug":"_5-channel-的关闭","link":"#_5-channel-的关闭","children":[]},{"level":2,"title":"6. BroadcastChannel","slug":"_6-broadcastchannel","link":"#_6-broadcastchannel","children":[]},{"level":2,"title":"7. Channel 版本的序列生成器","slug":"_7-channel-版本的序列生成器","link":"#_7-channel-版本的序列生成器","children":[]},{"level":2,"title":"8. Channel 的内部结构","slug":"_8-channel-的内部结构","link":"#_8-channel-的内部结构","children":[]},{"level":2,"title":"9. 小结","slug":"_9-小结","link":"#_9-小结","children":[]},{"level":2,"title":"关于作者","slug":"关于作者","link":"#关于作者","children":[]}],"git":{"createdTime":1648649921000,"updatedTime":1681657450000,"contributors":[{"name":"bennyhuo","email":"bennyhuo@kotliner.cn","commits":3}]},"readingTime":{"minutes":18.33,"words":5500},"filePathRelative":"kotlin-coroutines/09-channel.md","localizedDate":"2022年3月30日","autoDesc":true}');export{e as data};