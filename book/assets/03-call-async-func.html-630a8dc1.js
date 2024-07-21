const e=JSON.parse('{"key":"v-5abf3dc4","path":"/swift-coroutines/03-call-async-func.html","title":"3. 在程序当中调用异步函数","lang":"zh-CN","frontmatter":{"description":"异步函数需要被异步函数调用，这听上去就是一个鸡生蛋蛋生鸡的问题。关键的问题在于，第一个异步函数从哪儿来？ 我们现在已经知道怎么定义异步函数了，也可以很轻松的转换将现有的异步回调 API 转成异步函数。那下一个问题就是，既然普通函数不能调用异步函数，那定义好的这些异步函数该从哪儿开始调用呢？ 使用 Task Task 的创建 其实从上一节我们分析如何将回...","head":[["meta",{"property":"og:url","content":"https://www.bennyhuo.com/book/swift-coroutines/03-call-async-func.html"}],["meta",{"property":"og:site_name","content":"Benny Huo 的专栏"}],["meta",{"property":"og:title","content":"3. 在程序当中调用异步函数"}],["meta",{"property":"og:description","content":"异步函数需要被异步函数调用，这听上去就是一个鸡生蛋蛋生鸡的问题。关键的问题在于，第一个异步函数从哪儿来？ 我们现在已经知道怎么定义异步函数了，也可以很轻松的转换将现有的异步回调 API 转成异步函数。那下一个问题就是，既然普通函数不能调用异步函数，那定义好的这些异步函数该从哪儿开始调用呢？ 使用 Task Task 的创建 其实从上一节我们分析如何将回..."}],["meta",{"property":"og:type","content":"article"}],["meta",{"property":"og:locale","content":"zh-CN"}],["meta",{"property":"og:updated_time","content":"2023-08-29T20:01:10.000Z"}],["meta",{"property":"article:author","content":"Benny Huo"}],["meta",{"property":"article:modified_time","content":"2023-08-29T20:01:10.000Z"}],["script",{"type":"application/ld+json"},"{\\"@context\\":\\"https://schema.org\\",\\"@type\\":\\"Article\\",\\"headline\\":\\"3. 在程序当中调用异步函数\\",\\"image\\":[\\"\\"],\\"dateModified\\":\\"2023-08-29T20:01:10.000Z\\",\\"author\\":[{\\"@type\\":\\"Person\\",\\"name\\":\\"Benny Huo\\",\\"url\\":\\"https://www.bennyhuo.com\\"}]}"]]},"headers":[{"level":2,"title":"使用 Task","slug":"使用-task","link":"#使用-task","children":[{"level":3,"title":"Task 的创建","slug":"task-的创建","link":"#task-的创建","children":[]},{"level":3,"title":"两种 Task 的对比","slug":"两种-task-的对比","link":"#两种-task-的对比","children":[]}]},{"level":2,"title":"Task 的结果","slug":"task-的结果","link":"#task-的结果","children":[]},{"level":2,"title":"异步 main 函数","slug":"异步-main-函数","link":"#异步-main-函数","children":[]},{"level":2,"title":"小结","slug":"小结","link":"#小结","children":[]},{"level":2,"title":"关于作者","slug":"关于作者","link":"#关于作者","children":[]}],"git":{"createdTime":1648122991000,"updatedTime":1693339270000,"contributors":[{"name":"bennyhuo","email":"bennyhuo@kotliner.cn","commits":5}]},"readingTime":{"minutes":6.47,"words":1941},"filePathRelative":"swift-coroutines/03-call-async-func.md","localizedDate":"2022年3月24日","autoDesc":true}');export{e as data};
