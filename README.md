# juejin-pdf-image-puppeteer

下载掘金【我的收藏集】的文章为 PDF 文件，**含文章中的背景图片、懒加载图片**。

将想要下载保存的文章，在网站上收藏起来，利用此脚本保存 PDF 即可。

## 使用方法

* 【将想要下载保存的文章，在网站上收藏起来，利用此脚本保存 PDF 即可.】
* 下载掘金【我的收藏集】的文章为 PDF 文件，含文章中的背景图片、懒加载图片。
* USER: 登录用户
* PASSWORD: 用户密码
* SOURCE_URL: 浏览器登录后获取的【我的收藏集】链接
* IS_LAZYLOAD: 是否开启对懒加载图片(lazyload)的处理, 默认开启
* SAVE_DIR: PDF 文件存储路径 默认为 './books'


命令行中运行：

```shell
git clone https://github.com/forijk/juejin-pdf-image-puppeteer.git

npm install

node download.js USER PASSWORD SOURCE_URL
```
