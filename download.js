/**
 * 【将想要下载保存的文章，在网站上收藏起来，利用此脚本保存 PDF 即可.】
 * 下载掘金【我的收藏集】的文章为 PDF 文件，含文章中的背景图片、懒加载图片。
 * USER: 登录用户
 * PASSWORD: 用户密码
 * SOURCE_URL: 浏览器登录后获取的【我的收藏集】链接
 * IS_LAZYLOAD: 是否开启对懒加载图片(lazyload)的处理, 默认开启
 * SAVE_DIR: PDF 文件存储路径
 */
const puppeteer = require('puppeteer');
const mkdirp = require('mkdirp');
const axios = require('axios');
const ProgressBar = require('progress');

const BASE_URL = 'https://juejin.im';

// 调试
// process.on('unhandledRejection', (reason, p) => {
//   console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
//   // application specific logging, throwing an error, or other logic here
// });

const printJuejinBooks = async (userName, password, sourceUrl, isLazyload = true, saveDir = './books') => {
  if (!userName) {
    throw new Error('请输入用户名');
  }
  if (!password) {
    throw new Error('请输入密码');
  }
  if (!sourceUrl) {
    throw new Error('请输入【我的收藏集】链接');
  }
  try {
    const viewport = {
      width: 1376,
      height: 768
    };

    console.log('启动浏览器');
    const browser = await puppeteer.launch();

    console.log('打开新页面');
    const page = await browser.newPage();
    page.setViewport(viewport);

    const postData = {
      password,
      phoneNumber: userName
    }
    // 不用设置 headers
    const headers = {
      'Content-Type': 'application/json; charset=utf-8',
      'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/535.1 (KHTML, like Gecko) Chrome/14.0.835.163 Safari/535.1'
    }

    axios.post('https://juejin.im/auth/type/phoneNumber', postData, {
      headers
    }).then(res => {
      console.log('登录成功!');
      console.log('---> 用户名: ', res.data.user && res.data.user.username);
    }).catch(err => {
      console.log('登录失败: ', err);
      return
    })
    console.log('进入【我的收藏集】');
    await page.goto(sourceUrl);

    await page.waitForSelector('.collection-view');
    const books = await page.$eval('.collection-view', element => {
      const booksHTMLCollection = element.querySelectorAll('.content-box');
      const booksElementArray = Array.prototype.slice.call(booksHTMLCollection);
      const books = booksElementArray.map(item => {
        const a = item.querySelector('.title-row .title');
        return {
          href: a.getAttribute('href'),
          title: a.innerText
        };
      });
      return books;
    });
    console.log(`收藏集上共找到${books.length}篇文章:`);
    books.forEach((item, index) => {
      console.log('  ', index + 1 + '.' + item.title);
    });

    for (let article of books) {
      const articlePage = await browser.newPage();
      articlePage.setViewport(viewport);

      await articlePage.goto(`${BASE_URL}${article.href}`);

      if (isLazyload) {
        console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
        console.log('开始图片懒加载识别, 请稍后...');
        var maxScroll = await articlePage.evaluate(() => {
          return Promise.resolve(
            Math.max(document.body.scrollHeight, document.body.offsetHeight,
              document.documentElement.clientHeight, document.documentElement.scrollHeight, document.documentElement.offsetHeight) - window.innerHeight
          );
        }).catch((err) => {
          console.log(err);
        });

        // how many times full scroll needs to be done
        var fullScrolls = Math.floor(maxScroll / viewport.height);
        console.log("预计总用时: ", fullScrolls, 's')
        // amount left to get to the bottom of the page after doing the full scrolls
        var lastScroll = maxScroll % viewport.height;
        // progress
        var bar = new ProgressBar('  Timing [:bar] :percent :etas', {
          complete: '=',
          incomplete: ' ',
          total: fullScrolls
        });

        // do full scrolls if there is any
        for (var i = 1; i <= fullScrolls; i++) {
          await articlePage.evaluate((i, viewportHeight) => {
            return Promise.resolve(window.scrollTo(0, i * viewportHeight));
          }, i, viewport.height).catch(err => {
            console.log(err);
          });
          await articlePage.waitFor(1000).catch(err => {
            console.log(err);
          });
          bar.tick(1);
        }
        // do last scroll if there is any
        if (lastScroll > 0) {
          await articlePage.evaluate(maxScroll => {
            return Promise.resolve(window.scrollTo(0, maxScroll + 25));
          }, maxScroll).catch(err => {
            console.log(err);
          });
        }
        await articlePage.waitFor(2000).catch(err => {
          console.log(err);
        });
      }
      await articlePage.waitForSelector('.main-container');
      await articlePage.$eval('body', body => {
        body.querySelector('.main-header-box').style.display = 'none';
        // 隐藏评论列表
        // body.querySelector('.comment-list-box').style.display = 'none';
        body.querySelector('.recommended-area').style.display = 'none';
        body.querySelector('.tag-list-box').style.display = 'none';
        body.querySelector('.article-banner').style.display = 'none';
        body.querySelector('.meiqia-btn').style.display = 'none';
        body.querySelector('.footer-author-block').style.display = 'none';
        Promise.resolve();
      });

      const fileName = `${article.title.replace(/\//g, '、')}.pdf`;
      const filePath = `${saveDir}/${fileName}`;
      mkdirp.sync(saveDir);

      console.log('开始转换为 PDF 文件...');
      await page.emulateMedia('screen');
      await articlePage.pdf({
        path: filePath,
        format: 'A4',
        printBackground: true
      });
      console.log(`保存成功: ${filePath}`);
      // Protocol error (Target.closeTarget): Target closed.
      // articlePage.close();
    }
    console.log('恭喜您! 全部下载成功！');
    browser.close();
  } catch (err) {
    console.error(err);
  }
};

const USER = process.argv[2];
const PASSWORD = process.argv[3];
const SOURCE_URL = process.argv[4];
const SAVE_DIR = process.argv[5];
const IS_LAZYLOAD = process.argv[6];

if (!USER || !PASSWORD || !SOURCE_URL) {
  console.log('Invalid user or password or source url.');
  process.exit();
}

printJuejinBooks(USER, PASSWORD, SOURCE_URL, IS_LAZYLOAD, SAVE_DIR);
