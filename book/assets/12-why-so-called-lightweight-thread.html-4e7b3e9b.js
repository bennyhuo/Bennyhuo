const e=JSON.parse('{"key":"v-795f4afe","path":"/kotlin-coroutines/12-why-so-called-lightweight-thread.html","title":"12. 协程为什么被称为『轻量级线程』？","lang":"zh-CN","frontmatter":{"description":"接触新概念，最好的办法就是先整体看个大概，再回过头来细细品味。 文中如果没有特别说明，协程指编程语言级别的协程，线程则特指操作系统内核线程。 1. 协程到底是啥？ Kotlin 的协程从 v1.1 开始公测(Experimental) 到现在，已经算是非常成熟了，但大家对它的看法却一直存在各种疑问，为什么呢？因为即便我们把 Kotlin 丢掉，单纯协程...","head":[["meta",{"property":"og:url","content":"https://www.bennyhuo.com/book/kotlin-coroutines/12-why-so-called-lightweight-thread.html"}],["meta",{"property":"og:site_name","content":"Benny Huo 的专栏"}],["meta",{"property":"og:title","content":"12. 协程为什么被称为『轻量级线程』？"}],["meta",{"property":"og:description","content":"接触新概念，最好的办法就是先整体看个大概，再回过头来细细品味。 文中如果没有特别说明，协程指编程语言级别的协程，线程则特指操作系统内核线程。 1. 协程到底是啥？ Kotlin 的协程从 v1.1 开始公测(Experimental) 到现在，已经算是非常成熟了，但大家对它的看法却一直存在各种疑问，为什么呢？因为即便我们把 Kotlin 丢掉，单纯协程..."}],["meta",{"property":"og:type","content":"article"}],["meta",{"property":"og:locale","content":"zh-CN"}],["meta",{"property":"og:updated_time","content":"2023-08-29T20:01:10.000Z"}],["meta",{"property":"article:author","content":"Benny Huo"}],["meta",{"property":"article:modified_time","content":"2023-08-29T20:01:10.000Z"}],["script",{"type":"application/ld+json"},"{\\"@context\\":\\"https://schema.org\\",\\"@type\\":\\"Article\\",\\"headline\\":\\"12. 协程为什么被称为『轻量级线程』？\\",\\"image\\":[\\"\\"],\\"dateModified\\":\\"2023-08-29T20:01:10.000Z\\",\\"author\\":[{\\"@type\\":\\"Person\\",\\"name\\":\\"Benny Huo\\",\\"url\\":\\"https://www.bennyhuo.com\\"}]}"]]},"headers":[{"level":2,"title":"1. 协程到底是啥？","slug":"_1-协程到底是啥","link":"#_1-协程到底是啥","children":[]},{"level":2,"title":"2. 为什么协程的概念会有混乱的感觉？","slug":"_2-为什么协程的概念会有混乱的感觉","link":"#_2-为什么协程的概念会有混乱的感觉","children":[]},{"level":2,"title":"3. 协程有哪些主流的实现？","slug":"_3-协程有哪些主流的实现","link":"#_3-协程有哪些主流的实现","children":[]},{"level":2,"title":"4. Kotlin 协程真的只是一个线程框架吗？","slug":"_4-kotlin-协程真的只是一个线程框架吗","link":"#_4-kotlin-协程真的只是一个线程框架吗","children":[]},{"level":2,"title":"5. 协程真的比线程有优势吗？","slug":"_5-协程真的比线程有优势吗","link":"#_5-协程真的比线程有优势吗","children":[]},{"level":2,"title":"6. 小结","slug":"_6-小结","link":"#_6-小结","children":[]},{"level":2,"title":"关于作者","slug":"关于作者","link":"#关于作者","children":[]}],"git":{"createdTime":1648649921000,"updatedTime":1693339270000,"contributors":[{"name":"bennyhuo","email":"bennyhuo@kotliner.cn","commits":4}]},"readingTime":{"minutes":15.75,"words":4725},"filePathRelative":"kotlin-coroutines/12-why-so-called-lightweight-thread.md","localizedDate":"2022年3月30日","autoDesc":true}');export{e as data};
