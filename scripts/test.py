import re

values = map(lambda x: x * 2, [1, 2, 3, 4])
print(list(values))

m = re.search(r"\s*#\s*([^#]+)\n", '## aldjfkajld\n')
if m:
    print(m.group(0))
    print(m.group(1))
else:
    print("No match.")
#
# print('hello.sjlfa.md'.rsplit('.', 1))
#
# print(open("./main.py").name)

print("{{{1}}}")

x = {"z": 1, "y": 2}

for k, v in enumerate(x):
    print(k, v)

line = "\n"

if line:
    print("Line")
else:
    print("False")

# -*- coding:utf-8 -*-
import time

# # 当前时间
# print(time.time())
# # 时间戳形式
# print(time.localtime(time.time()))
# # 简单可读形式
# print(time.asctime(time.localtime(time.time())))
# # 格式化成2016-03-20 11:45:39形式
# print(time.strftime("%Y-%m-%d %H:%M:%S", time.localtime()))
# # 格式化成Sat Mar 28 22:24:24 2016形式
# print(time.strftime("%a %b %d %H:%M:%S %Y", time.localtime()))
# # 将格式字符串转换为时间戳
# a = "Sat Mar 28 22:24:24 2016"
# print(time.mktime(time.strptime(a, "%a %b %d %H:%M:%S %Y")))
r'\[([^\]]*?)\]\s*\(((?:https?://mp.weixin.qq.com).*?(?:^jpg|^(png)|^(jpeg)|^(gif)|^(bmp))))\)'
# [破解 Kotlin 协程 - 入门篇](https://www.bennyhuo.com/2019/04/01/basic-coroutines/xxx.jpg) 提到了 Jake Wharton 大神为 Retrofit 写的 协程 Adapter，[破解 Kotlin 协程 - 入门篇](http://mp.weixin.qq.com/2019/04/01/basic-coroutines/)
# [破解 Kotlin 协程 - 入门篇](http://mp.weixin.qq.com//2019/04/01/basic-coroutines/xxx.jpg) 提到了 Jake Wharton 大神为 Retrofit 写的 协程 Adapter，![破解 Kotlin 协程 - 入门篇](http://mp.weixin.qq.com/2019/04/01/basic-coroutines/)
# [破解 Kotlin 协程 - 入门篇](http://mp.weixin.qq.com//2019/04/01/basic-coroutines/xxx.png) 提到了 Jake Wharton 大神为 Retrofit 写的 协程 Adapter，![破解 Kotlin 协程 - 入门篇](http://mp.weixin.qq.com/2019/04/01/basic-coroutines/)
# [破解 Kotlin 协程 - 入门篇](http://mp.weixin.qq.com//2019/04/01/basic-coroutines/xxx.jpeg) 提到了 Jake Wharton 大神为 Retrofit 写的 协程 Adapter，![破解 Kotlin 协程 - 入门篇](http://mp.weixin.qq.com/2019/04/01/basic-coroutines/)
# [破解 Kotlin 协程 - 入门篇](http://mp.weixin.qq.com//2019/04/01/basic-coroutines/xxx.gif) 提到了 Jake Wharton 大神为 Retrofit 写的 协程 Adapter，![破解 Kotlin 协程 - 入门篇](http://mp.weixin.qq.com/2019/04/01/basic-coroutines/dfg)
# ![破解 Kotlin 协程 - 入门篇](http://mp.weixin.qq.com//2019/04/01/basic-coroutines/xxx.bmp) 提到了 Jake Wharton 大神为 Retrofit 写的 协程 Adapter，![破解 Kotlin 协程 - 入门篇](http://mp.weixin.qq.com/2019/04/01/basic-coroutines/)

result = re.sub(r'(?<!!)\[([^\]]*?)\]\s*\(((?!https?://mp.weixin.qq.com).*?)\)',
                r'**\1**(\2)',
                "[破解 Kotlin 协程 - 入门篇](https://www.bennyhuo.com/2019/04/01/basic-coroutines/) "
                "提到了 Jake Wharton 大神为 Retrofit 写的 协程 Adapter，![破解 Kotlin 协程 - 入门篇](http://mp.weixin.qq.com/2019/04/01/basic-coroutines/)"
                "提到了 Jake Wharton 大神为 Retrofit 写的 协程 Adapter，![破解 Kotlin 协程 - 入门篇](http://mp.weixin.qq.com/2019/04/01/basic-coroutines/)")
if result:
    print(result)
else:
    print("no match.")