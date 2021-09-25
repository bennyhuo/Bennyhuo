# Java 17 更新（1）：历史包袱有点儿多，删了点儿没用的功能

**Java Java17**

> Java 17 更新了，我们将按照 JEP 提案的顺序依次为大家介绍这些更新的内容。

==  Java|Java17 ==

## JEP 382: New macOS Rendering Pipeline

不知道大家在 macOS 上用 IntelliJ IDEA 或者 Android Studio 会不会觉得卡，就是那种在本地打字打出了远程控制的感觉的那种卡，解决办法也很简单，把窗口调小一点儿就行。

![](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates/image-20210920202342410.png)

我有个 2015 款的 MacBook Pro，之前我用它连 4K 外接显示器写代码，发现很快电脑就发烫发热，IDE 也会卡得不成样子。一开始我以为是我的电脑快不行了，后来我发现很多用最新款 MacBook 的人也在抱怨 IntelliJ IDEA 的垃圾性能。

![](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates/0033dr8Dgy1gskvcr4481g603w02naa802.gif)

![](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates/image-20210920204103615.png)

结果发现 JetBrains 把锅甩给了 JDK。JDK 也不客气，直接用 IntelliJ IDEA 做测试：

![](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates/image-20210920204435651.png)

简单来说就是 Mac 上以前 Java 2D 的 API 是基于 OpenGL 的，从 Java 17 开始则提供了基于最新的 Metal Framework 的实现。目前默认还是基于 OpenGL，这样对于线上的程序几乎没有负面影响，如果大家需要启用 Metal 的支持，则需要在 虚拟机参数当中添加：

```
-Dsun.java2d.metal=true
```

Metal 在后面也应该会成为默认选择。

所以这条更新，建议使用 Mac 的小伙伴们密切关注，也建议开发 Mac 桌面程序的小伙伴尽快适配。

（跟我有什么关系，Windows 11 YYDS! ）

![](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates/7103A24A.png)

对了，我在 Mac M1 上下载了 Java 17 的 arm64 版本（下一条将会提到），然后用 AppCode（JetBrains 全家桶当中用来写 iOS 程序的 IDE） 替换了这个 JDK，并在 JVM 参数当中配置了：

```
-Dsun.java2d.metal=true
```

接了 4K 显示器以后，代码编写和代码提示的速度有了明显的提升，大家可以试试看。

## JEP 391: macOS/AArch64 Port

噗。。。还记得我司刚给小伙伴们发了一台高贵的 Apple Silicon 的 Air 的时候，有大佬还专门写教程告诉我们去哪儿找 [arm64 的 JDK](https://www.azul.com/downloads/?version=java-11-lts&os=macos&architecture=arm-64-bit&package=jdk)：

![](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates/image-20210920204728153.png)

这回 Java 官方终于也支持了，直接到 [Oracle 的网站](https://www.oracle.com/java/technologies/javase/jdk17-archive-downloads.html)上就能下载，要知道 Java 16 的时候还只有 x86 的版本：

![](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates/image-20210920204910901.png)

哎，等等，下面的 DMG Installer 是不是丢了个 Arm 啊。。这得扣钱啊小编。

![](https://kotlinblog-1251218094.costj.myqcloud.com/6c8656be-f0d8-432e-9bfd-94a1fbd7cd6c/media/Java17-Updates/710ABDBF.jpg) 
