const getConfig = require("vuepress-bar");

const rootDir = "book"

const { nav, sidebar } = getConfig({
    addReadMeToFirstGroup: false
});

const bookTitles = {
    "Java17 Updates": "Java 17 版本更新",
    "Cpp Coroutines": "渡劫 C++ 协程",
    "Swift Coroutines": "闲话 Swift 协程"
}

const sideBarContent = sidebar.filter((e) => e != '').map((e) => {
    return {
        text: bookTitles[e.title] ?? e.title,
        collapsible: true,
        children: [...e.children.filter((path) => path != "" && path != `${e.title}/index`).map((path) => {
            return `/${path}`
        })]
    }
}).reduce((obj, current) => {
    obj[`/`] = [...obj[`/`], current]
    return obj
}, {
    [`/`]: [{ text: '内容介绍', collapsible: true, link: "/" }]
});


const sideBar = { ...sideBarContent }

console.log(sideBar)

module.exports = {
    title: 'Benny Huo 的专栏',
    logo: "/assets/avatar.jpg",
    base: `/${rootDir}/`,
    description: '',
    themeConfig: {
        docsDir: `docs`,
        sidebar: sideBar,
        sidebarDepth: 1
    }
}
