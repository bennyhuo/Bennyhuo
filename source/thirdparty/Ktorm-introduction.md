---
layout:     post
title:      "你还在用 MyBatis 吗，Ktorm 了解一下？"
subtitle:   "一个专注于 Kotlin 的 ORM 框架"
author:     "刘文俊"
date:       2019-05-04
top: true
tags:
    - Kotlin
    - ORM
    - Ktorm
---

自从 Google 宣布 Kotlin 成为 Android 的官方语言，Kotlin 可以说是突然火了一波。其实不仅仅是 Android，在服务端开发的领域，Kotlin 也可以说是优势明显。由于其支持空安全、方法扩展、协程等众多的优良特性，以及与 Java 几乎完美的兼容性，选择 Kotlin 可以说是好处多多。

然而，切换到 Kotlin 之后，你还在用 MyBatis 吗？MyBatis 作为一个 Java 的 SQL 映射框架，虽然在国内使用人数众多，但是也受到了许多吐槽。使用 MyBatis，你必须要忍受在 XML 里写 SQL 这种奇怪的操作，以及在众多 XML 与 Java 接口文件之间跳来跳去的麻烦，以及往 XML 中传递多个参数时的一坨坨 `@Param` 注解(或者你使用 `Map`？那就更糟了，连基本的类型校验都没有，参数名也容易写错)。甚至，在与 Kotlin 共存的时候，还会出现一些奇怪的问题，比如： [Kotlin 遇到 MyBatis：到底是 Int 的错，还是 data class 的错？](https://mp.weixin.qq.com/s?__biz=MzIzMTYzOTYzNA==&mid=2247483908&idx=1&sn=0c072a630198d4a23a7d3aec700c138b&chksm=e8a05d39dfd7d42f1494c5f0fcc0562112be6d8912e44fc51f17dee472f9ebdfaad7d930e3b1#rd)。

这时，你可能想要一款专属于 Kotlin 的 ORM 框架。它可以充分利用 Kotlin 的各种优良特性，让我们写出更加 Kotlin 的代码。它应该是轻量级的，只需要添加依赖即可直接使用，不需要各种麻烦的配置文件。它的 SQL 最好可以自动生成，不需要像 MyBatis 那样每条 SQL 都自己写，但是也给我们保留精确控制 SQL 的能力，不至于像 Hibernate 那样难以进行 SQL 调优。

如果你真的这么想的话，Ktorm 可能会适合你。Ktorm 是直接基于纯 JDBC 编写的高效简洁的 Kotlin ORM 框架，它提供了强类型而且灵活的 SQL DSL 和方便的序列 API，以减少我们操作数据库的重复劳动。当然，所有的 SQL 都是自动生成的。本文的目的就是对 Ktorm 进行介绍，帮助我们快速上手使用。

<!-- more -->

> 你可以在 Ktorm 的官网上获取更详细的使用文档，如果使用遇到问题，还可以在 GitHub 提出 issue。如果 Ktorm 对你有帮助的话，请在 GitHub 留下你的 star，也欢迎加入我们，共同打造 Kotlin 优雅的 ORM 解决方案。
>
> Ktorm 官网：[https://ktorm.liuwj.me/](https://ktorm.liuwj.me/zh-cn/)
> GitHub 地址：[https://github.com/vincentlauvlwj/Ktorm](https://github.com/vincentlauvlwj/Ktorm)

## Hello, Ktorm!

还记得我们刚开始学编程的时候写的第一个程序吗，现在我们先从 Ktorm 的 "Hello, World" 开始，了解如何快速地搭建一个使用 Ktorm 的项目。

Ktorm 已经发布到 maven 中央仓库和 jcenter，因此，如果你使用 maven 的话，首先需要在 `pom.xml` 文件里面添加一个依赖：

```xml
<dependency>
    <groupId>me.liuwj.ktorm</groupId>
    <artifactId>ktorm-core</artifactId>
    <version>${ktorm.version}</version>
</dependency>
```

或者 gradle：

```groovy
compile "me.liuwj.ktorm:ktorm-core:${ktorm.version}"
```

在使用 Ktorm 之前，我们需要要让它能够了解我们的表结构。假设我们有两个表，他们分别是部门表 `t_department` 和员工表 `t_employee`， 它们的建表 SQL 如下，我们要如何描述这两个表呢？

```sql
create table t_department(
  id int not null primary key auto_increment,
  name varchar(128) not null,
  location varchar(128) not null
);

create table t_employee(
  id int not null primary key auto_increment,
  name varchar(128) not null,
  job varchar(128) not null,
  manager_id int null,
  hire_date date not null,
  salary bigint not null,
  department_id int not null
);
```

一般来说，Ktorm 使用 Kotlin 中的 object 关键字定义一个继承 `Table` 类的对象来描述表结构，上面例子中的两个表可以像这样在 Ktorm 中定义：

```kotlin
object Departments : Table<Nothing>("t_department") {
    val id by int("id").primaryKey()    // Column<Int>
    val name by varchar("name")         // Column<String>
    val location by varchar("location") // Column<String>
}

object Employees : Table<Nothing>("t_employee") {
    val id by int("id").primaryKey()
    val name by varchar("name")
    val job by varchar("job")
    val managerId by int("manager_id")
    val hireDate by date("hire_date")
    val salary by long("salary")
    val departmentId by int("department_id")
}
```

可以看到，`Departments` 和 `Employees` 都继承了 `Table`，并且在构造函数中指定了表名，`Table` 类还有一个泛型参数，它是此表绑定到的实体类的类型，在这里我们不需要绑定到任何实体类，因此指定为 `Nothing` 即可。表中的列则使用 val 和 by 关键字定义为表对象中的成员属性，列的类型使用 int、long、varchar、date 等函数定义，它们分别对应了 SQL 中的相应类型。

定义好表结构后，我们就可以使用 `Database.connect` 函数连接到数据库，然后执行一个简单的查询：

```kotlin
fun main() {
    Database.connect("jdbc:mysql://localhost:3306/ktorm", driver = "com.mysql.jdbc.Driver")

    for (row in Employees.select()) {
        println(row[Employees.name])
    }
}
```

这就是一个最简单的 Ktorm 项目，这个 `main` 函数中只有短短三四行代码，但是你运行它时，它却可以连接到数据库，自动生成一条 SQL `select * from t_employee`，查询表中所有的员工记录，然后打印出他们的名字。因为 `select` 函数返回的查询对象实现了 `Iterable<QueryRowSet>` 接口，所以你可以在这里使用 for-each 循环语法。当然，任何针对 `Iteralble` 的扩展函数也都可用，比如 Kotlin 标准库提供的 map/filter/reduce 系列函数。

## SQL DSL

让我们在上面的查询里再增加一点筛选条件：

```kotlin
val names = Employees
    .select(Employees.name)
    .where { (Employees.departmentId eq 1) and (Employees.name like "%vince%") }
    .map { row -> row[Employees.name] }
println(names)
```

生成的 SQL 如下:

```sql
select t_employee.name as t_employee_name 
from t_employee 
where (t_employee.department_id = ?) and (t_employee.name like ?)
```

这就是 Kotlin 的魔法，使用 Ktorm 写查询十分地简单和自然，所生成的 SQL 几乎和 Kotlin 代码一一对应。并且，Ktorm 是强类型的，编译器会在你的代码运行之前对它进行检查，IDE 也能对你的代码进行智能提示和自动补全。

实现基于条件的动态查询也十分简单，因为都是纯 Kotlin 代码，直接使用 if 语句就好，比 MyBatis 在 XML 里面写 `<if>` 标签好太多。

```kotlin
val names = Employees
    .select(Employees.name)
    .whereWithConditions {
        if (someCondition) {
            it += Employees.managerId.isNull()
        }
        if (otherCondition) {
            it += Employees.departmentId eq 1
        }
    }
    .map { it.getString(1) }
```

聚合查询：

```kotlin
val t = Employees
val salaries = t
    .select(t.departmentId, avg(t.salary))
    .groupBy(t.departmentId)
    .having { avg(t.salary) greater 100.0 }
    .associate { it.getInt(1) to it.getDouble(2) }
```

Union：

```kotlin
Employees
    .select(Employees.id)
    .unionAll(
        Departments.select(Departments.id)
    )
    .unionAll(
        Departments.select(Departments.id)
    )
    .orderBy(Employees.id.desc())
```

多表连接查询：

```kotlin
data class Names(val name: String, val managerName: String?, val departmentName: String)

val emp = Employees.aliased("emp")
val mgr = Employees.aliased("mgr")
val dept = Departments.aliased("dept")

val results = emp
    .leftJoin(dept, on = emp.departmentId eq dept.id)
    .leftJoin(mgr, on = emp.managerId eq mgr.id)
    .select(emp.name, mgr.name, dept.name)
    .orderBy(emp.id.asc())
    .map {
        Names(
            name = it.getString(1),
            managerName = it.getString(2),
            departmentName = it.getString(3)
        )
    }
```

插入：

```kotlin
Employees.insert {
    it.name to "jerry"
    it.job to "trainee"
    it.managerId to 1
    it.hireDate to LocalDate.now()
    it.salary to 50
    it.departmentId to 1
}
```

更新：

```kotlin
Employees.update {
    it.job to "engineer"
    it.managerId to null
    it.salary to 100

    where {
        it.id eq 2
    }
}
```

删除：

```kotlin
Employees.delete { it.id eq 4 }
```

这就是 Ktorm 提供的 SQL DSL，使用这套 DSL，我们可以使用纯 Kotlin 代码来编写查询，不再需要在 XML 中写 SQL，也不需要在代码中拼接 SQL 字符串。而且，强类型的 DSL 还能让我们获得一些额外的好处，比如将一些低级的错误暴露在编译期，以及 IDE 的智能提示和自动补全。最重要的是，它生成的 SQL 几乎与我们的 Kotlin 代码一一对应，因此虽然我们的 SQL 是自动生成的，我们仍然对它拥有绝对的控制。

这套 DSL 几乎可以覆盖我们工作中常见的所有 SQL 的用法，比如 union、联表、聚合等，甚至对嵌套查询也有一定的支持。当然，肯定也有一些暂时不支持的用法，比如某些数据库中的特殊语法，或者十分复杂的查询(如相关子查询)。这其实十分罕见，但如果真的发生，Ktorm 也提供了一些解决方案：

- Ktorm 可以方便的对 SQL DSL 进行扩展，以支持某些数据库中的特殊语法，这些扩展主要以独立的 jar 包提供，比如 `ktorm-support-mysql`。当然，我们也能自己编写扩展。
- 对于确实无法支持的情况，Ktorm 也可以直接使用原生 SQL 进行查询，并额外提供了一些方便的扩展函数支持。

更多 SQL DSL 的用法，请参考 Ktorm 的[具体文档](https://ktorm.liuwj.me/zh-cn/query.html)。

## 实体类与列绑定

前面我们已经介绍了 SQL DSL，但是如果只有 DSL，Ktorm 还远不能称为一个 ORM 框架。接下来我们将介绍实体类的概念，了解如何将数据库中的表与实体类进行绑定，这正是 ORM 框架的核心：对象 - 关系映射。

我们仍然以前面的部门表 `t_department` 和员工表 `t_employee` 为例，创建两个 Ktorm 的实体类，分别用来表示部门和员工这两个业务概念：

```kotlin
interface Department : Entity<Department> {
    companion object : Entity.Factory<Department>()
    val id: Int
    var name: String
    var location: String
}

interface Employee : Entity<Employee> {
    companion object : Entity.Factory<Employee>()
    val id: Int?
    var name: String
    var job: String
    var manager: Employee?
    var hireDate: LocalDate
    var salary: Long
    var department: Department
}
```

可以看到，Ktorm 中的实体类都继承了 `Entity<E>` 接口，这个接口为实体类注入了一些通用的方法。实体类的属性则使用 var 或 val 关键字直接定义即可，根据需要确定属性的类型及是否为空。

有一点可能会违背你的直觉，Ktorm 中的实体类并不是 data class，甚至也不是一个普通的 class，而是 interface。这是 Ktorm 的设计要求，通过将实体类定义为 interface，Ktorm 才能够实现一些特别的功能，以后你会了解到它的意义。

众所周知，接口并不能实例化，既然实体类被定义为接口，我们要如何才能创建一个实体对象呢？其实很简单，只需要像下面这样，假装它有一个构造函数：

````kotlin
val department = Department()
````

有心的同学应该已经发现，上面定义实体类接口的时候，还为这两个接口都增加了一个伴随对象。这个伴随对象重载了 Kotlin 中的 `invoke` 操作符，因此可以使用括号像函数一样直接调用。在 Ktorm 的内部，我们使用了 JDK 的动态代理创建了实体对象。

还记得在上一节中我们定义的两个表对象吗？现在我们已经有了实体类，下一步就是把实体类和前面的表对象进行绑定。这个绑定其实十分简单，只需要在声明列之后继续链式调用 `bindTo` 函数或 `references` 函数即可，下面的代码修改了前面的两个表对象，完成了 ORM 绑定：

```kotlin
object Departments : Table<Department>("t_department") {
    val id by int("id").primaryKey().bindTo { it.id }
    val name by varchar("name").bindTo { it.name }
    val location by varchar("location").bindTo { it.location }
}

object Employees : Table<Employee>("t_employee") {
    val id by int("id").primaryKey().bindTo { it.id }
    val name by varchar("name").bindTo { it.name }
    val job by varchar("job").bindTo { it.job }
    val managerId by int("manager_id").bindTo { it.manager.id }
    val hireDate by date("hire_date").bindTo { it.hireDate }
    val salary by long("salary").bindTo { it.salary }
    val departmentId by int("department_id").references(Departments) { it.department }
}
```

> 命名规约：强烈建议使用单数名词命名实体类，使用名词的复数形式命名表对象，如：Employee/Employees、Department/Departments。

把两个表对象与修改前进行对比，我们可以发现两处不同：

1. `Table` 类的泛型参数，我们需要指定为实体类的类型，以便 Ktorm 将表对象与实体类进行绑定；在之前，我们设置为 `Nothing` 表示不绑定到任何实体类。
2. 在每个列声明函数的调用后，都链式调用了 `bindTo` 或 `references` 函数将该列与实体类的某个属性进行绑定；如果没有这个调用，则不会绑定到任何属性。

列绑定的意义在于，通过查询从数据库中获取实体对象的时候（如 `findList` 函数），Ktorm 会根据我们的绑定配置，将某个列的数据填充到它所绑定的属性中去；在将实体对象中的修改更新到数据库中的时候（如 `flushChanges` 函数），Ktorm 也会根据我们的绑定配置，将某个属性的变更，同步更新到绑定它的那个列。

完成列绑定后，我们就可以使用针对实体类的各种方便的扩展函数。比如根据名字获取员工：

```kotlin
val vince = Employees.findOne { it.name eq "vince" }
println(vince)
```

`findOne` 函数接受一个 lambda 表达式作为参数，使用该 lambda 的返回值作为条件，生成一条查询 SQL，自动 left jion 了关联表 `t_department`。生成的 SQL 如下：

```sql
select * 
from t_employee 
left join t_department _ref0 on t_employee.department_id = _ref0.id 
where t_employee.name = ?
```

其他 `find*` 系列函数：

```kotlin
Employees.findAll()
Employees.findById(1)
Employees.findListByIds(listOf(1))
Employees.findMapByIds(listOf(1))
Employees.findList { it.departmentId eq 1 }
Employees.findOne { it.name eq "vince" }
```

将实体对象保存到数据库：

```kotlin
val employee = Employee {
    name = "jerry"
    job = "trainee"
    manager = Employees.findOne { it.name eq "vince" }
    hireDate = LocalDate.now()
    salary = 50
    department = Departments.findOne { it.name eq "tech" }
}

Employees.add(employee)
```

将内存中实体对象的变化更新到数据库：

```kotlin
val employee = Employees.findById(2) ?: return
employee.job = "engineer"
employee.salary = 100
employee.flushChanges()
```

从数据库中删除实体对象：

```kotlin
val employee = Employees.findById(2) ?: return
employee.delete()
```

更多实体 API 的用法，可参考[列绑定](https://ktorm.liuwj.me/zh-cn/entities-and-column-binding.html)和[实体查询](https://ktorm.liuwj.me/zh-cn/entity-finding.html)相关的文档。

可以看到，只需要将表对象与实体类进行绑定，我们就可以使用这些方便的函数，大部分对实体对象的增删改查操作，都只需要一个函数调用即可完成，但 Ktorm 能做到的，还远不止于此。

## 实体序列 API

除了 `find*` 函数以外，Ktorm 还提供了一套名为”实体序列”的 API，用来从数据库中获取实体对象。正如其名字所示，它的风格和使用方式与 Kotlin 标准库中的序列 API 及其类似，它提供了许多同名的扩展函数，比如 `filter`、`map`、`reduce` 等。

要获取一个实体序列，我们可以在表对象上调用 `asSequence` 扩展函数：

```kotlin
val sequence = Employees.asSequence()
```

Ktorm 的实体序列 API，大部分都是以扩展函数的方式提供的，这些扩展函数大致可以分为两类，它们分别是中间操作和终止操作。

### 中间操作

这类操作并不会执行序列中的查询，而是修改并创建一个新的序列对象，比如 `filter` 函数会使用指定的筛选条件创建一个新的序列对象。下面使用 `filter` 获取部门 1 中的所有员工：

```kotlin
val employees = Employees.asSequence().filter { it.departmentId eq 1 }.toList()
```

可以看到，用法几乎与 `kotlin.Sequence` 完全一样，不同的仅仅是在 lambda 表达式中的等号 `==` 被这里的 `eq` 函数代替了而已。`filter` 函数还可以连续使用，此时所有的筛选条件将使用 `and` 操作符进行连接，比如：

```kotlin
val employees = Employees
    .asSequence()
    .filter { it.departmentId eq 1 }
    .filter { it.managerId.isNotNull() }
    .toList()
```

生成 SQL：

```sql
select * 
from t_employee 
left join t_department _ref0 on t_employee.department_id = _ref0.id 
where (t_employee.department_id = ?) and (t_employee.manager_id is not null)
```

使用 `sortedBy` 或 `sortedByDescending` 对序列中的元素进行排序：

```kotlin
val employees = Employees.asSequence().sortedBy { it.salary }.toList()
```

使用 `drop` 和 `take` 函数进行分页：

```kotlin
val employees = Employees.asSequence().drop(1).take(1).toList()
```

### 终止操作

实体序列的终止操作会马上执行一个查询，获取查询的执行结果，然后执行一定的计算。for-each 循环就是一个典型的终止操作，下面我们使用 for-each 循环打印出序列中所有的员工：

```kotlin
for (employee in Employees.asSequence()) {
    println(employee)
}
```

生成的 SQL 如下：

```sql
select * 
from t_employee 
left join t_department _ref0 on t_employee.department_id = _ref0.id
```

`toCollection`、`toList` 等方法用于将序列中的元素保存为一个集合：

```kotlin
val employees = Employees.asSequence().toCollection(ArrayList())
```

`mapColumns` 函数用于获取指定列的结果：

```kotlin
val names = Employees.asSequenceWithoutReferences().mapColumns { it.name }
```

除此之外，还有 `mapColumns2`、`mapColumns3` 等更多函数，它们用来同时获取多个列的结果，这时我们需要在闭包中使用 `Pair` 或 `Triple` 包装我们的这些字段，函数的返回值也相应变成了 `List<Pair<C1?, C2?>>` 或 `List<Triple<C1?, C2?, C3?>>`：

```kotlin
Employees
    .asSequenceWithoutReferences()
    .filter { it.departmentId eq 1 }
    .mapColumns2 { Pair(it.id, it.name) }
    .forEach { (id, name) ->
        println("$id:$name")
    }
```

生成 SQL：

```sql
select t_employee.id, t_employee.name
from t_employee 
where t_employee.department_id = ?
```

其他我们熟悉的序列函数也都支持，比如 `fold`、`reduce`、`forEach` 等，下面使用 `fold` 计算所有员工的工资总和：

```kotlin
val totalSalary = Employees
    .asSequenceWithoutReferences()
    .fold(0L) { acc, employee -> 
        acc + employee.salary 
    }
```

### 序列聚合

实体序列 API 不仅可以让我们使用类似 `kotlin.Sequence` 的方式获取数据库中的实体对象，它还支持丰富的聚合功能，让我们可以方便地对指定字段进行计数、求和、求平均值等操作。

下面使用 `aggregateColumns` 函数获取部门 1 中工资的最大值：

```kotlin
val max = Employees
    .asSequenceWithoutReferences()
    .filter { it.departmentId eq 1 }
    .aggregateColumns { max(it.salary) }
```

如果你希望同时获取多个聚合结果，可以改用 `aggregateColumns2` 或 `aggregateColumns3` 函数，这时我们需要在闭包中使用 `Pair` 或 `Triple` 包装我们的这些聚合表达式，函数的返回值也相应变成了 `Pair<C1?, C2?>` 或 `Triple<C1?, C2?, C3?>`。下面的例子获取部门 1 中工资的平均值和极差：

```kotlin
val (avg, diff) = Employees
    .asSequenceWithoutReferences()
    .filter { it.departmentId eq 1 }
    .aggregateColumns2 { Pair(avg(it.salary), max(it.salary) - min(it.salary)) }
```

生成 SQL：

```sql
select avg(t_employee.salary), max(t_employee.salary) - min(t_employee.salary) 
from t_employee 
where t_employee.department_id = ?
```

除了直接使用 `aggregateColumns` 函数以外，Ktorm 还为序列提供了许多方便的辅助函数，他们都是基于 `aggregateColumns` 函数实现的，分别是 `count`、`any`、`none`、`all`、`sumBy`、`maxBy`、`minBy`、`averageBy`。

下面改用 `maxBy` 函数获取部门 1 中工资的最大值：

```kotlin
val max = Employees
    .asSequenceWithoutReferences()
    .filter { it.departmentId eq 1 }
    .maxBy { it.salary }
```

除此之外，Ktorm 还支持分组聚合，只需要先调用 `groupingBy`，再调用 `aggregateColumns`。下面的代码可以获取所有部门的平均工资，它的返回值类型是 `Map<Int?, Double?>`，其中键为部门 ID，值是各个部门工资的平均值：

```kotlin
val averageSalaries = Employees
    .asSequenceWithoutReferences()
    .groupingBy { it.departmentId }
    .aggregateColumns { avg(it.salary) }
```

生成 SQL：

```sql
select t_employee.department_id, avg(t_employee.salary) 
from t_employee 
group by t_employee.department_id
```

在分组聚合时，Ktorm 也提供了许多方便的辅助函数，它们是 `eachCount(To)`、`eachSumBy(To)`、`eachMaxBy(To)`、`eachMinBy(To)`、`eachAverageBy(To)`。有了这些辅助函数，上面获取所有部门平均工资的代码就可以改写成：

```kotlin
val averageSalaries = Employees
    .asSequenceWithoutReferences()
    .groupingBy { it.departmentId }
    .eachAverageBy { it.salary }
```

除此之外，Ktorm 还提供了 `aggregate`、`fold`、`reduce` 等函数，它们与 `kotlin.collections.Grouping` 的相应函数同名，功能也完全一样。下面的代码使用 `fold` 函数计算每个部门工资的总和：

```kotlin
val totalSalaries = Employees
    .asSequenceWithoutReferences()
    .groupingBy { it.departmentId }
    .fold(0L) { acc, employee -> 
        acc + employee.salary 
    }
```

更多实体序列 API 的用法，可参考[实体序列](https://ktorm.liuwj.me/zh-cn/entity-sequence.html)和[序列聚合](https://ktorm.liuwj.me/zh-cn/sequence-aggregation.html)相关的文档。

## 小结

本文从一个 "Hello, World" 程序开始，对 Ktorm 的几大特性进行了介绍，它们分别是 SQL DSL、实体类与列绑定、实体序列 API 等。有了 Ktorm，我们就可以使用纯 Kotlin 代码方便地完成数据持久层的操作，不需要再使用 MyBatis 烦人的 XML。同时，由于 Ktorm 是专注于 Kotlin 语言的框架，因此没有兼容 Java 的包袱，能够让我们更加充分地使用 Kotlin 各种优越的语法特性，写出更加优雅的代码。既然语言都已经切换到 Kotlin，为何不尝试一下纯 Kotlin 的框架呢？

Enjoy Ktorm, enjoy Kotlin!

