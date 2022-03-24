const getConfig = require("vuepress-bar");

const { nav, sidebar } = getConfig({
    addReadMeToFirstGroup: false
});

console.log(sidebar)

const sideBarContent = sidebar.filter((e) => e != '').map((e) => {
    return {
        text: e.title,
        collapsible: true,
        children: [...e.children.filter((path) => path != "" && path != `${e.title}/index`).map((path) => {
            console.log(path)
            return `/${path}`
        })]
    }
}).reduce((obj, current) => {
    obj['/'] = [...obj['/'], current]
    return obj
}, {
    "/": [{ text: 'Benny Huo 的专栏', collapsible: true, link: "/" }]
});


const sideBar = { ...sideBarContent }

module.exports = {
    title: '编程指南',
    description: '',
    themeConfig: {
        docsDir: 'docs',
        sidebar: sideBar,
        sidebarDepth: 1
    }
}
