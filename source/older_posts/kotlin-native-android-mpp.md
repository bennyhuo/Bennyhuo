# Kotlin Native 写 Jni 第三弹：改造成 MPP 的工程结构

**Kotlin Kotlin-Native Jni 跨平台**

> 前不久有个兄弟问有没有可能把之前 Native 写 Jni 的工程改造成 Gradle 的。正好借此机会把之前的工程整理得更完整一些。

== Kotlin|Kotlin-Native|MPP ==

在读这篇文章之前，大家可以去参考下之前的文章：

* [用 Kotlin Native 写 Jni，以后写 Android 基本上要没有别的语言什么事儿了的节奏](https://www.bennyhuo.com/2018/12/17/kotlin_native_jni/)
* [Kotlin Native 写 Jni 第二弹：动态绑定 Native 方法](https://www.bennyhuo.com/2018/12/31/kotlin-native-jni-dynamic/)

之前两篇文章已经介绍了如何通过 `CName` 注解来限定 Kotlin-Native 代码编出来的动态链接库的符号名，以实现与 Java 的 native 方法的绑定，也介绍了如何使用 `JNI_OnLoad` 来动态注册 native 方法来实现绑定。换句话说，如果你想要知道如何用 Kotlin-Native 写 Android 的 Jni 的 Native 层代码，那么前面的两篇文章里面就有答案。

前文撰写的时候 Kotlin-Native 的构建插件尚未稳定，当时除了 Multiplatform Project（以下简称 mpp） 的 Gradle 插件以外还有一个单独的 native 的插件，用法也不是特别统一，现在后者已经被废弃，因此我们只需要用 mpp 的插件来构建 Kotlin-Native 的工程即可。顺带提一句，现在使用 Kotlin DSL 来编写 Gradle 脚本体验已经比之前强多了，建议大家把 IDE 的 Kotlin 插件升级到 1.3.70 以上版本来体验。

接下来我们就把之前的工程改造一下，工程源码见：[hello-kni](https://github.com/enbandari/hello-kni)。

首先我们创建一个 Module，你可以选择使用 IntelliJ 的 new module 方式，选择创建一个 Android library，当然也可以自己创建一个目录，然后再创建一个 build.gradle.kts 文件，就像这样：

![](https://kotlinblog-1251218094.costj.myqcloud.com/9e300468-a645-433d-ae41-60b3eaa97f5a/media/2020-04-19-08-37-45.png)

接着，在 settings.gradle.kts 当中引入这个 Module：

```kotlin
include(":app", ":nativeLib")
```

好，关键来了，剩下的主要就是修改 build.gradle.kts。我们先来添加 mpp 的 Gradle 插件：

```kotlin
plugins {
    kotlin("multiplatform") version "1.3.71"
    id("com.android.library")
}
```

这里可以看到我们还添加了 Android 的 library 插件，原因是我们想要把 Kotlin-Native 编译出来的 so 打进一个 aar 里面作为 Android 的依赖提供给 app 工程。

所以构建出来的 so 文件我们需要引入到 aar 的编译流程中，可以将这个 so 文件复制到一个路径，我们把这个路径添加为 Android 的 jniLibs 路径即可：

```kotlin
val jniLibDir = File(project.buildDir, arrayOf("generated", "jniLibs").joinToString(File.separator))

android {
    ...
    sourceSets {
        val main by getting {
            jniLibs.srcDir(jniLibDir)
        }
    }
}
```

我们在 build 目录下选了 generated/jniLibs 作为 jniLibs 目录添加到了 aar 的编译流程中。接下来我们只需要完成 so 文件的复制即可：

```kotlin
kotlin {
    androidNativeArm32 {
        binaries {
            sharedLib("knlib") {
                if(buildType == NativeBuildType.RELEASE){
                    linkTask.doLast {
                        copy {
                            from(outputFile)
                            into(File(jniLibDir, "armeabi-v7a"))
                        }
                    }

                    afterEvaluate {
                        val preReleaseBuild by tasks.getting
                        preReleaseBuild.dependsOn(linkTask)
                    }
                }
            }
        }
    }
}
```

kotlin mpp 的工程配置非常清晰：

1. 内部的第一层是选择目标平台，这里选择的是 androidNativeArm32，当然如果你想要构建 iOS 平台的，也可以选择 iosArm64 等等。
2. 第二层是 binaries 就是定义产出物，其内部的 sharedLib 表示产出物是共享库（shared object，so），当然如果希望编译出可执行文件，就替换成 executable。sharedLib 有两个参数，第一个是库的名字，我们这里与原来保持了一致，将库的名字指定为 knlib，这样编译出来的 so 文件就是 libknlib.so。
3. 我们通过 buildType 来选择将 RELEASE 的产出物复制到指定路径（也就是刚才定义的 jniLibDir），如果做得更完善的话也可以分别对 DEBUG/RELEASE 进行处理。
4. 为 aar 的构建流程中的 preReleaseBuild 任务添加依赖，这样在 assembleRelease 执行时可以触发对 Kotlin-Native 代码的编译。当然，这里也可以选择其他的任务进行依赖，只要能够在 assemble 时触发编译即可。

工程配置搞定之后，我们还需要把源码添加进来。androidNativeArm32 的源码路径默认为 src/androidNativeArm32Main/kotlin，因此我们把之前已经写好的 Kotlin-Native 的源文件添加进去即可：

![](https://kotlinblog-1251218094.costj.myqcloud.com/9e300468-a645-433d-ae41-60b3eaa97f5a/media/2020-04-19-18-01-24.png)

另外作为 Android Library 工程，manifest 文件当然是必须的，不过里面也不需要有什么特别的配置。

至此，使用 Kotlin-Native 编写 Jni 的工程改造就完成了，在 app 工程中添加依赖：

```kotlin
implementation(project(":nativeLib"))
```

直接编译运行 app 工程即可运行，再也不用使用命令行编译啦。