# Speech page

可一键部署属于自己的语音识别服务。包含对接 Azure 接口的 NodeJS 服务，以及基于 Vue 的前端交互页面。

## 配置 Azure 密钥

按官方文档注册好账号，并获取到专属的 key。

https://azure.microsoft.com/zh-cn/products/cognitive-services/speech-to-text

新建 secret.json 文件到项目根目录，文件内容:

```json
{
  "key": "your key",
  "region": "your key region"
}
```

## 启动服务

启动：

```bash
$ npm i
$ npm start
```

更多启动参数：

port: 服务端口

例子：

```bash
$ npm start -- --port 9999
```

浏览器打开 `localhost:port` 即可访问页面使用。

