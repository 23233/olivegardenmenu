import { Hono } from 'hono'
import { serveStatic } from 'hono/cloudflare-workers'
const app = new Hono()

// 设置路由以服务 /static/ 目录下的所有文件
// @ts-ignore
app.get('/static/*', serveStatic({ root: './' }))

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

export default app
