---
title:  如何为 Gradle 的 KTS 脚本添加扩展？ 
keywords: Gradle Groovy Kotlin KTS 
date: 2021/04/18
description: 
tags: 
    - gradle
    - groovy
    - kotlin
    - kts 
---

> 本质上还是要搞清楚 KTS 是怎么运行的 

<iframe class="bilibili"  src="//player.bilibili.com/player.html?aid=290197027&bvid=BV1BU4y1b7Wk&cid=325923583&page=1&high_quality=1" scrolling="no" border="0" frameborder="no" framespacing="0" allowfullscreen="true"> </iframe>

<!-- more -->




要知道在 Groovy 当中想要做到这一点并不难，毕竟作为一门动态类型的语言，只要运行时能够访问到即可，反正又不需要 IDE 代码提示。但在 Kotlin 这里情况就显得有点儿麻烦了，因为我们添加的扩展要在编译的时候就能够让编译器访问到。

## 1. Kotlin DSL 的 Gradle 脚本是怎么运行的？

为了搞清楚怎么添加扩展，我们同样需要搞清楚采用 Kotlin DSL 的 Gradle 脚本是怎么运行的。但受限于篇幅，我就不带着大家一步一步去看源码了，大家有兴趣可以在 Gradle 源码当中找到 org.gradle.kotlin.dsl 包，其中就是有关 Kotlin DSL 的支持的实现。

![Gradle Kotlin DSL 的源码路径](https://kotlinblog-1251218094.costj.myqcloud.com/9e300468-a645-433d-ae41-60b3eaa97f5a/media/image-20210416165202793.png)

有了前面“[你的 Gradle 脚本是怎么运行起来的？](http://mp.weixin.qq.com/s?__biz=MzIzMTYzOTYzNA==&mid=2247484963&idx=1&sn=1f475e8f26b62df0c55bcf3418fb5f0a&chksm=e8a0591edfd7d0085bc1344f25613ae93aa9ef8a238dd4b01f52ca0a10d2fbb1bcefbe095c96&token=793373419&lang=zh_CN#rd)”这个视频的基础，相信大家已经了解了 Gradle 脚本运行时的两个阶段：

* classpath 阶段
* body 阶段

其实 Kotlin DSL 也是如此，只不过运行的时候具体的形式稍微有些差异。

Kotlin DSL 版本的脚本被称为 "Program"，它在 Gradle 的实现当中也通过一个叫 **Program** 的类及其子类来描述，定义在 Program.kt 文件当中。

```kotlin
sealed class Program {
	object Empty: Program() { ... }
    data class Buildscript(override val fragment: ProgramSourceFragment) : Stage1(), FragmentHolder
    data class PluginManagement(override val fragment: ProgramSourceFragment) : Stage1(), FragmentHolder
    data class Plugins(override val fragment: ProgramSourceFragment) : Stage1(), FragmentHolder
    data class Stage1Sequence(val pluginManagement: PluginManagement?, val buildscript: Buildscript?, val plugins: Plugins?) : Stage1()
    data class Script(val source: ProgramSource) : Program()
    data class Staged(val stage1: Stage1, val stage2: Script) : Program()
    abstract class Stage1 : Program()
}
```

注意到所有在 classpath 阶段编译运行的代码块都继承自 Stage1 这个类。我认为这段代码定义中最有趣的是 `Stage1Sequence`，它通过类型的形式强制给出了几个代码块的顺序的定义。

> **提示：**可以看到这还是一个密封的使用案例，所以不要总是说密封类没啥用，代码储备量的贫乏限制了大家的想象力。

那么它究竟是怎么运行的呢？

简单来说就是任意一个 Kotlin DSL 的 Gradle 脚本都会把分属于不同阶段的部分拆分开，每一个部分都会编译成两个类，叫做 **Program** 和 **Build_gradle**，其中 Program 类的 execute 函数是调用入口，DSL 脚本的内容则被编译成 Build_gradle 类的构造函数。

![Kotlin DSL 的编译运行示意图](https://kotlinblog-1251218094.costj.myqcloud.com/9e300468-a645-433d-ae41-60b3eaa97f5a/media/image-20210417092350607.png)

有朋友肯定会发出疑问，两个阶段分别编译出不同的两个类，但名字是一样的，这不会冲突吗？当然不会，二者运行时用的 classloader 都是不一样的。而且需要特别注意的是，我们会在 classpath 阶段的 buildscript 代码块中添加 classpath，所以这个阶段与 body 阶段运行时的 classpath 是不一样的，因此不是所有在 body 阶段能访问到的类和成员都能在 classpath 阶段访问到。

我们以之前改造好的根目录下的 build.gradle.kts 为例，它的内容如下：

```kotlin
// Top-level(build file where you can add configuration options common to all sub-projects/modules.)
buildscript {
    val kotlin_version: String by extra("1.4.30")
    repositories {
        maven("https://mirrors.tencent.com/nexus/repository/maven-public/")
    }
    dependencies {
        classpath("com.android.tools.build:gradle:4.0.1")
        classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:$kotlin_version")

        classpath("com.vanniktech:gradle-maven-publish-plugin:0.14.2")
        // For(Kotlin projects, you need to add Dokka.)
        classpath("org.jetbrains.dokka:dokka-gradle-plugin:0.10.1")
    }
}

subprojects {
    repositories {
        maven("https://mirrors.tencent.com/nexus/repository/maven-public/")
    }
    afterEvaluate {
        if (plugins.hasPlugin("com.android.library") || plugins.hasPlugin("java-library")) {
            group = "com.bennyhuo"
            version = "1.0"

            apply(plugin = "com.vanniktech.maven.publish")
        }
    }
}

tasks.register<Delete>("clean") {
    delete(rootProject.buildDir)
}
```

编译时会分成两部分，其中 

* classpath 阶段的内容为：

  ```kotlin
  buildscript {
      val kotlin_version: String by extra("1.4.30")
      repositories {
          maven("https://mirrors.tencent.com/nexus/repository/maven-public/")
      }
      dependencies {
          classpath("com.android.tools.build:gradle:4.0.1")
          classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:$kotlin_version")
  
          classpath("com.vanniktech:gradle-maven-publish-plugin:0.14.2")
          // For(Kotlin projects, you need to add Dokka.)
          classpath("org.jetbrains.dokka:dokka-gradle-plugin:0.10.1")
      }
  }
  ```

* body 阶段的内容为：

  ```kotlin
  // Top-level(build file where you can add configuration options common to all sub-projects/modules.)
  subprojects {
      repositories {
          maven("https://mirrors.tencent.com/nexus/repository/maven-public/")
      }
      afterEvaluate {
          if (plugins.hasPlugin("com.android.library") || plugins.hasPlugin("java-library")) {
              group = "com.bennyhuo"
              version = "1.0"
  
              apply(plugin = "com.vanniktech.maven.publish")
          }
      }
  }
  
  tasks.register<Delete>("clean") {
      delete(rootProject.buildDir)
  }
  ```

由于 body 阶段的 classloader 包含了 classpath 阶段添加的依赖，因此在 body 阶段可以访问所有前面 dependencies 当中添加的 maven 依赖库中的类。

大家也可以单步调试一下这个脚本来深入了解一下它。值得一提的是，Gradle 在编译运行时会生成两个不同的 jar 包来存储 **Program** 和 **Gradle_build** 类，因此我们可以通过加载它的 classloader 找到这两个 jar 包的路径。

在 buildscript 当中随便找个位置打断点，启动调试之后，就可以看到下面的情景，顺着 classloader 就可以看到生成的 jar 在 `<用户目录>/.gradle/caches/jars-8/` 下：

![classpath stage 的脚本编译生成的 jar](https://kotlinblog-1251218094.costj.myqcloud.com/9e300468-a645-433d-ae41-60b3eaa97f5a/media/image-20210416171142126.png)

我们找到这个 jar 包，里面正如我们前面所讲，两个类，反编译之后如下：

```java
public final class Program extends StagedProgram {
    public void execute(Host var1, KotlinScriptHost<?> var2) {
        var1.setupEmbeddedKotlinFor(var2);

        try {
            // 运行 classpath 阶段的脚本
            new Build_gradle(var2, (Project)var2.getTarget());
        } catch (Throwable var5) {
            var1.handleScriptException(var5, Build_gradle.class, var2);
        }

        var1.applyPluginsTo(var2, MultiPluginRequests.EMPTY);
        var1.applyBasePluginsTo((Project)var2.getTarget());
        // 加载并运行 body 阶段的脚本
        var1.evaluateSecondStageOf(this, var2, "Project/TopLevel/stage2", HashCode.fromBytes(...), var1.accessorsClassPathFor(var2));
    }

   	...
}
```

```java
public class Build_gradle extends CompiledKotlinBuildscriptBlock {
   public final Project $$implicitReceiver0;
	
   public Build_gradle(KotlinScriptHost var1, Project var2) {
      super(var1);
      this.$$implicitReceiver0 = var2;
      // 运行 buildscript 块
      ((Build_gradle)this).buildscript((Function1)null.INSTANCE);
      Unit var10001 = Unit.INSTANCE;
   }
}
```

实际上我们可以看到 classpath 阶段的脚本运行完之后马上就开始编译、加载和运行 body 阶段的脚本了。

接下来我们再看下 body 阶段，同样断点运行到 body 对应的脚本时，我们可以看到调用栈其实跟 classpath 是一致的，调用顺序是 

![脚本的调用顺序](https://kotlinblog-1251218094.costj.myqcloud.com/9e300468-a645-433d-ae41-60b3eaa97f5a/media/image-20210417093245689.png)

其中第二个 eval 就是在运行 body 阶段的脚本了：

![body stage 的脚本编译生成的 jar](https://kotlinblog-1251218094.costj.myqcloud.com/9e300468-a645-433d-ae41-60b3eaa97f5a/media/image-20210416170811407.png)

这与我们反编译看到的 classpath 当中的 Program 的代码时一致的。

我们也把 body 阶段的 jar 反编译后贴出来，我稍微加了点儿注释，大家可以大致感受一下对应的脚本内容：

```java
public final class Program extends ExecutableProgram {
    public void execute(Host var1, KotlinScriptHost<?> var2) {
        try {
            new Build_gradle(var2, (Project)var2.getTarget());
        } catch (Throwable var5) {
            var1.handleScriptException(var5, Build_gradle.class, var2);
        }
    }
}
```

```java
public class Build_gradle extends CompiledKotlinBuildScript {
   public final Project $$implicitReceiver0;
   public final Delete $$result;

   public Build_gradle(KotlinScriptHost var1, Project var2) {
      super(var1);
      this.$$implicitReceiver0 = var2;
       // 调用 subprojects
      this.$$implicitReceiver0.subprojects((Action)null.INSTANCE);
       // 定义 task "clean"
      Project $this$task$iv = this.$$implicitReceiver0;
      String name$iv = "clean";
       // task "clean" 的配置代码
      Function1 configuration$iv = (Function1)(new Function1() 
         ...
         public final void invoke(@NotNull Delete $this$task) {
             // 对应于 group = "build"
            $this$task.setGroup("build");
             
             // 对应于 delete(rootProject.buildDir)
            Object[] var10001 = new Object[1];
            Project var10004 = Build_gradle.this.$$implicitReceiver0.getRootProject();
            Intrinsics.checkExpressionValueIsNotNull(var10004, "rootProject");
            var10001[0] = var10004.getBuildDir();
            $this$task.delete(var10001);
         }
      });
       
       // 对应于 task<Delete>(...)，前面的 configuration$iv 对应于 Lambda 表达式
      int $i$f$task = false;
      Task var9 = ProjectExtensionsKt.task($this$task$iv, name$iv, Reflection.getOrCreateKotlinClass(Delete.class), configuration$iv);
      this.$$result = (Delete)var9;
   }
}
```

截止目前，我想大家应该能够明白 Gradle Kotlin DSL 脚本是如何运行的了。

接下来我们就看看如何实现扩展的定义。

## 2. 定义一个像 mavenCentral 一样的函数

我们定义一个类似于 mavenCentral 的函数 tencentCloud 来方便我们添加腾讯云的 maven 仓库镜像，并以此来说明扩展的定义有哪些注意事项。最终的效果是：

```kotlin
repositories {
    tencentCloud()
    //等价于：maven("https://mirrors.tencent.com/nexus/repository/maven-public/")
}
```

代码很好写，repositories { ... } 的参数的 Receiver 是 RepositoryHandler：

```kotlin
fun RepositoryHandler.tencentCloud() {
    maven("https://mirrors.tencent.com/nexus/repository/maven-public/")
}
```

接下来问题就是：我们应该把这个扩展函数写在哪里呢？

### 2.1 定义在根工程的 build.gradle.kts 当中

按照我们前面的分析，只要定义在 Gradle 脚本当中，不管写到哪里，都相当于定义了在了 Build_gradle 的构造函数当中，这样一个局部的函数只能在当前范围内使用：

**build.gradle.kts(rootProject)**

```kotlin
fun RepositoryHandler.tencentCloud() {
    maven("https://mirrors.tencent.com/nexus/repository/maven-public/")
}

buildscript {
    repositories {
        tencentCloud() // ERROR!! IDE 可能不报错，但编译报错
    }
    ...
}
subprojects {
    repositories {
        tencentCloud() // OK，都在 body 阶段的 Build_gradle 构造内部
    }
   	...
}
```

**build.gradle.kts(:app)**

```kotlin
buildscript {
    repositories {
        tencentCloud() // ERROR!! 不在同一个作用域内
    }
}
```

效果不理想，但不管怎么样，我们现在已经实现了相同运行阶段的文件范围内的扩展实现。

### 2.2 定义在 buildSrc 当中

buildSrc 是一个神奇的存在，工程当中所有的脚本都可以访问到它当中的类和函数。我们可以在 BuildTreePreparingProjectsPreparer 的 prepareProjects 方法当中看到对 buildSrc 的处理：

**文件：BuildTreePreparingProjectsPreparer.java**

```java
public void prepareProjects(GradleInternal gradle) {
	...
    ClassLoaderScope baseProjectClassLoaderScope = parentClassLoaderScope.createChild(settings.getBuildSrcDir().getAbsolutePath());
    gradle.setBaseProjectClassLoaderScope(baseProjectClassLoaderScope);
    ...
    // Build buildSrc and export classpath to root project
    buildBuildSrcAndLockClassloader(gradle, baseProjectClassLoaderScope);
	// Evaluate projects
    delegate.prepareProjects(gradle);
	...
}
```

在 evaluate project 之前，buildSrc 模块的代码就被添加到了 baseProjectClassLoaderScope 当中，这个 classloaderScope 实际上是后续所有 project 的脚本都能访问到的。

这样看来，在 build.gradle.kts 当中任意代码运行之前，buildSrc 的代码就已经在 classpath 当中了，因此把我们的扩展添加到 buildSrc 当中，就能解决整个工程的脚本访问的问题。

至此，我们实现了为整个工程的构建脚本定义扩展。这一点与我们在 buildSrc 当中定义依赖的版本常量的思路实际上也是一致的。

### 2.3 定义在 init.gradle.kts 当中

接下来我们就要考虑，有没有什么办法让我的电脑上所有的工程都能支持这个扩展呢？

我们很自然地想到 init.gradle.kts，因为 Gradle 会在处理编译流程之前就加载运行这个脚本；如果我们把它放到 **<用户目录>/.gradle/** 目录下，那么所有的工程在启动编译时都会默认执行这个脚本。

不过事情并不是想想的那样顺利，因为 init.gradle.kts 当中直接定义这个扩展函数也会同样只能在局部范围内有效，达不到我们的目标。

那是不是只要比 project 当中的 buildscript 执行得早，并且我们提前通过常规的 classpath 函数添加依赖，就能让 project 当中的 buildscript 访问到呢？不行。例如：

```kotlin
beforeProject {
    buildscript {
        repositories {
            mavenLocal()
        }
        dependencies {
            classpath("com.bennyhuo.gradle:repos:1.0-SNAPSHOT")
        }
    }
}
```

我把我们的扩展发布到 maven 的仓库当中，然后通过常规的 classpath 的方式引入，我们非常清楚这段代码一定会比我们在工程当中的 buildscript 先运行，但 classpath 调用之后实际上是添加到了 body 阶段的 classloader 当中的，而在 classpath 阶段运行的 buildscript 使用的 classloader 实际上是 body 阶段的父 classloader，因而达不到我们的目的。

那怎么办？经过我反复的调试，暂时没有找到很好的正规途径的办法。

常规操作搞不定就只能骚操作了。思路也很简单，找到加载 buildSrc 的那个 classloader，它其实也是加载运行 classpath 阶段的 buildscript  代码的 classloader，我们在里面添加一下我们自己的依赖即可。重点就在 BuildTreePreparingProjectsPreparer 的 prepareProjects 当中:

**文件：BuildTreePreparingProjectsPreparer.java**

```java
public void prepareProjects(GradleInternal gradle) {
	...
    ClassLoaderScope baseProjectClassLoaderScope = parentClassLoaderScope.createChild(settings.getBuildSrcDir().getAbsolutePath());
    // 这个 classloader 被 gradle 持有，我们可以通过 gradle 实例获取到它
    gradle.setBaseProjectClassLoaderScope(baseProjectClassLoaderScope);
    ...
    // Build buildSrc and export classpath to root project
    buildBuildSrcAndLockClassloader(gradle, baseProjectClassLoaderScope);
	// Evaluate projects
    delegate.prepareProjects(gradle);
	...
}
```

再看 buildBuildSrcAndLockClassloader 方法：

```java
private void buildBuildSrcAndLockClassloader(GradleInternal gradle, ClassLoaderScope baseProjectClassLoaderScope) {
    ClassPath buildSrcClassPath = buildSourceBuilder.buildAndGetClassPath(gradle);
    // 重点看这一句，export 可以添加一个 `ClassPath` 类型的实例
    baseProjectClassLoaderScope.export(buildSrcClassPath).lock();
}
```

因此只要我们自己也调用一下这个 export 方法，把我们自己编译好的 jar 包作为 ClassPath 传进去，问题就解决了。

当然，上帝在为我们打开了一扇窗户的同时又装上了不锈钢纱窗。事情并不是那么直接就能办到的，因为后面那个 lock，它的意思真的就是 lock。

**文件：DefaultClassLoaderScope.java**

```java
public ClassLoaderScope export(ClassPath classPath) {
    ...
    // 必须是非锁定状态，如果已经 lock，这里抛出断言异常
    assertNotLocked();
    // 在解析了所有的 classpath 之后才会创建，buildSrc 添加的时候为 null
    if (exportingClassLoader != null) {
        ...
    } else {
        // 命中这个分支
        export = export.plus(classPath);
    }
    return this;
}
```

lock 了之后，我们想要直接调用 export 方法来添加我们自己的 jar 包的愿望落空，不过上帝还是给我们的不锈钢纱窗留了一把钥匙的，那就是 Java 反射。我们可以通过反射来直接修改 export，无视 lock 的状态，代码如下：

```kotlin
import org.gradle.api.internal.GradleInternal
import org.gradle.api.internal.initialization.DefaultClassLoaderScope
import org.gradle.internal.classpath.ClassPath
import org.gradle.internal.classpath.DefaultClassPath

// 获取当前脚本所在目录下的 repos-1.0-SNAPSHOT.jar 文件
val depFile = file("repos-1.0-SNAPSHOT.jar")
// 在 project evaluate 之前调用，比 buildscript 早
beforeProject {
    if (this == rootProject){
        val gradleInternal = gradle as GradleInternal
        val field = DefaultClassLoaderScope::class.java.getDeclaredField("export")
        field.isAccessible = true
        val oldClassPath = field.get(gradleInternal.baseProjectClassLoaderScope()) as ClassPath
        field.set(gradleInternal.baseProjectClassLoaderScope(), oldClassPath + DefaultClassPath.of(depFile))
    }
}
```

把扩展函数编译成的 jar 文件也放到 **<用户目录>/.gradle/** 中：

![init 脚本和 jar 依赖的文件路径](https://kotlinblog-1251218094.costj.myqcloud.com/9e300468-a645-433d-ae41-60b3eaa97f5a/media/image-20210417085046475.png)

这样运行时就会把这个 jar 添加到 baseProjectClassLoaderScope 当中，所有的工程就都能访问到它了。

需要注意的是，我们的示例是基于 Gradle 7.0 的，不同版本可能会存在差异。

### 2.4 如果是 Groovy 呢？

之所以这么麻烦，就是因为我们需要兼顾 Kotlin 的静态类型的特性。如果是 Groovy 版本的特性，那么问题就简单多了，你只需要在 init.gradle 当中添加以下代码：

```groovy
RepositoryHandler.metaClass.tencentCloud {
    delegate.maven {
      url "https://mirrors.tencent.com/nexus/repository/maven-public/"
    }
}
```

后面访问 RepositoryHandler 的 tencentCloud 方法的时候就能够动态调用到这个扩展了。这实际上是 Groovy 元编程的内容，我们就不展开介绍了。

## 3. 小结

本节我们以实现一个简单的扩展为背景，先了解了一下 Kotlin DSL 的运行机制，接着又给出了在各个范围内实现扩展的方法。

一个很小的需求，实际上需要我们了解的背景知识还是很多的。

很多时候我们的学习和成长都是以点筑面，大厦固然高，但抵不住我一层一层地爬。

---


C 语言是所有程序员应当认真掌握的基础语言，不管你是 Java 还是 Python 开发者，欢迎大家关注我的新课 《C 语言系统精讲》：

**扫描二维码或者点击链接[《C 语言系统精讲》](https://coding.imooc.com/class/463.html)即可进入课程**

![](https://kotlinblog-1251218094.costj.myqcloud.com/9e300468-a645-433d-ae41-60b3eaa97f5a/media/program_in_c.png)


--- 

Kotlin 协程对大多数初学者来讲都是一个噩梦，即便是有经验的开发者，对于协程的理解也仍然是懵懵懂懂。如果大家有同样的问题，不妨阅读一下我的新书《深入理解 Kotlin 协程》，彻底搞懂 Kotlin 协程最难的知识点：

**扫描二维码或者点击链接[《深入理解 Kotlin 协程》](https://item.jd.com/12898592.html)购买本书**

![](https://kotlinblog-1251218094.costj.myqcloud.com/9e300468-a645-433d-ae41-60b3eaa97f5a/media/understanding_kotlin_coroutines.png)

---

如果大家想要快速上手 Kotlin 或者想要全面深入地学习 Kotlin 的相关知识，可以关注我基于 Kotlin 1.3.50 全新制作的入门课程：

**扫描二维码或者点击链接[《Kotlin 入门到精通》](https://coding.imooc.com/class/398.html)即可进入课程**

![](https://kotlinblog-1251218094.costj.myqcloud.com/40b0da7d-0147-44b3-9d08-5755dbf33b0b/media/exported_qrcode_image_256.png)

---

Android 工程师也可以关注下《破解Android高级面试》，这门课涉及内容均非浅尝辄止，除知识点讲解外更注重培养高级工程师意识：

**扫描二维码或者点击链接[《破解Android高级面试》](https://s.imooc.com/SBS30PR)即可进入课程**

![](https://kotlinblog-1251218094.costj.myqcloud.com/9ab6e571-684b-4108-9600-a9e3981e7aca/media/15520936284634.jpg)

