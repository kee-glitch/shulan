import { test, expect } from '@playwright/test'
import { truncateSync, writeFileSync } from 'node:fs'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})

async function mockVideoMetadata(page, metadata = {}) {
  await page.evaluate(values => {
    const originalCreateElement = document.createElement.bind(document)
    document.createElement = (tagName, options) => {
      const element = originalCreateElement(tagName, options)
      if (String(tagName).toLowerCase() !== 'video') return element
      Object.defineProperties(element, {
        duration: { configurable: true, value: values.duration ?? 5 },
        videoWidth: { configurable: true, value: values.width ?? 1280 },
        videoHeight: { configurable: true, value: values.height ?? 720 }
      })
      element.load = () => { if (element.getAttribute('src')) queueMicrotask(() => element.onloadedmetadata?.()) }
      return element
    }
  }, metadata)
}

test('选择素材引用后保留编辑器滚动位置', async ({ page }) => {
  await page.getByRole('tab', { name: '图片生成' }).click()
  await page.locator('input[type="file"]').setInputFiles({ name: '参考图.png', mimeType: 'image/png', buffer: Buffer.from('prototype') })
  const editor = page.getByLabel('创作提示词')
  await editor.fill(Array.from({ length: 30 }, (_, index) => `第 ${index + 1} 行提示词内容`).join('\n'))
  await editor.press('Tab')
  await editor.click()
  await editor.press('Control+End')
  await editor.evaluate(element => { element.scrollTop = element.scrollHeight })
  const before = await editor.evaluate(element => element.scrollTop)
  expect(before).toBeGreaterThan(0)
  await editor.type('@')
  await page.getByRole('option', { name: '图片1' }).click()
  await expect(editor).toContainText('@图片1')
  await expect.poll(() => editor.evaluate(element => element.scrollTop)).toBeGreaterThan(0)
})

test('鼠标选择附件时在 @ 触发位置插入引用', async ({ page }) => {
  await page.getByRole('tab', { name: '图片生成' }).click()
  await page.locator('input[type="file"]').setInputFiles({ name: '参考图.png', mimeType: 'image/png', buffer: Buffer.from('prototype') })
  const editor = page.getByLabel('创作提示词')
  await editor.fill('前文 后文')
  await editor.press('Tab')
  await editor.click()
  await editor.press('Home')
  await editor.press('ArrowRight')
  await editor.press('ArrowRight')
  await editor.press('ArrowRight')
  await editor.type('@')
  await page.getByRole('option', { name: '图片1' }).click()
  await expect(editor).toHaveText('前文 @图片1 后文')
})

test('AI 对话按模型限制文件大小并显示文档图标', async ({ page }) => {
  const input = page.locator('input[type="file"]')
  await input.setInputFiles({ name: '需求说明.pdf', mimeType: 'application/pdf', buffer: Buffer.from('prototype') })
  await expect(page.getByLabel('PDF 文件')).toBeVisible()

  await page.locator('.real-material-gallery .material-thumb > button').evaluate(button => button.click())
  await page.getByRole('button', { name: 'gpt-5.6-sol' }).click()
  await page.getByRole('button', { name: /claude-opus-5/ }).last().click()
  await input.setInputFiles({ name: '超限图片.jpg', mimeType: 'image/jpeg', buffer: Buffer.alloc(10 * 1024 * 1024 + 1) })
  await expect(page.getByRole('alert')).toContainText('图片上限 10 MB')
})

test('切换模型后显示对应文件大小限制', async ({ page }) => {
  await expect(page.getByText('单文件 ≤ 10 MB · 附件合计 ≤ 64 MB')).toBeVisible()
  await expect(page.locator('.prompt-meta .limits')).not.toContainText('视频')
  await expect(page.locator('.prompt-meta .limits')).not.toContainText('音频')
  await page.getByRole('button', { name: 'gpt-5.6-sol' }).click()
  await page.getByRole('button', { name: /claude-opus-5/ }).last().click()
  await expect(page.getByText('单文件 ≤ 10 MB · 附件合计 ≤ 64 MB')).toBeVisible()
})

test('gpt-5.6-sol 拒绝视频和音频附件', async ({ page }) => {
  const input = page.locator('input[type="file"]')
  await input.setInputFiles({ name: '参考视频.mp4', mimeType: 'video/mp4', buffer: Buffer.from('video') })
  await expect(page.getByRole('alert')).toContainText('gpt-5.6-sol 不支持上传视频，当前模型允许类型：图片、文档')
  await input.setInputFiles({ name: '旁白.mp3', mimeType: 'audio/mpeg', buffer: Buffer.from('audio') })
  const alert = page.getByRole('alert')
  await expect(alert).toContainText('不支持上传音频')
  const isAboveComposer = await page.evaluate(() => {
    const message = document.querySelector('.composer-error')?.getBoundingClientRect()
    const tabs = document.querySelector('.composer .tabs')?.getBoundingClientRect()
    return Boolean(message && tabs && message.bottom <= tabs.top - 12)
  })
  expect(isAboveComposer).toBeTruthy()
  await page.getByRole('button', { name: '关闭错误提示' }).click()
  await expect(alert).toBeHidden()
})

test('不支持提示使用当前模型名称', async ({ page }) => {
  await page.getByRole('button', { name: 'gpt-5.6-sol' }).click()
  await page.getByRole('button', { name: /claude-opus-5/ }).last().click()
  await page.locator('input[type="file"]').setInputFiles({ name: '参考视频.mp4', mimeType: 'video/mp4', buffer: Buffer.from('video') })
  await expect(page.getByRole('alert')).toContainText('claude-opus-5 不支持上传视频，当前模型允许类型：图片、文档')
})

test('合法附件上传完成不会提前清除错误提示', async ({ page }) => {
  const input = page.locator('input[type="file"]')
  await input.setInputFiles([
    { name: '参考图.png', mimeType: 'image/png', buffer: Buffer.from('image') },
    { name: '参考视频.mp4', mimeType: 'video/mp4', buffer: Buffer.from('video') }
  ])
  const alert = page.getByRole('alert')
  await expect(alert).toContainText('gpt-5.6-sol 不支持上传视频')
  await page.waitForTimeout(1200)
  await expect(alert).toBeVisible()
  await expect(page.locator('.real-material-gallery .material-thumb.image')).toHaveCount(1)
  await page.waitForTimeout(3200)
  await expect(alert).toBeHidden()
})

test('附件类型标签可以筛选素材', async ({ page }) => {
  const input = page.locator('input[type="file"]')
  await input.setInputFiles([
    { name: '参考图.png', mimeType: 'image/png', buffer: Buffer.from('image') },
    { name: '需求说明.pdf', mimeType: 'application/pdf', buffer: Buffer.from('document') }
  ])
  await expect(page.getByRole('tab', { name: '全部 (2)' })).toHaveAttribute('aria-selected', 'true')
  await page.getByRole('tab', { name: '图片 (1)' }).click()
  await expect(page.locator('.real-material-gallery .material-thumb.image')).toHaveCount(1)
  await expect(page.getByLabel('PDF 文件')).toHaveCount(0)
  await page.getByRole('tab', { name: '文档 (1)' }).click()
  await expect(page.getByLabel('PDF 文件')).toBeVisible()
  await expect(page.locator('.real-material-gallery .material-thumb.image')).toHaveCount(0)
})

test('高频关闭附件不会导致页面空白或运行时错误', async ({ page }) => {
  const pageErrors = []
  page.on('pageerror', error => pageErrors.push(error.message))
  const files = Array.from({ length: 8 }, (_, index) => ({
    name: `附件${index + 1}.pdf`, mimeType: 'application/pdf', buffer: Buffer.from(`file-${index}`)
  }))
  await page.locator('input[type="file"]').setInputFiles(files)
  await expect(page.getByRole('tab', { name: '全部 (8)' })).toBeVisible()
  await page.evaluate(async () => {
    for (let index = 0; index < 30; index += 1) {
      document.querySelector('.real-material-gallery .material-thumb > button')?.click()
      await new Promise(resolve => setTimeout(resolve, 5))
    }
  })
  await expect(page.getByRole('tab', { name: 'AI 对话' })).toBeVisible()
  await expect(page.getByLabel('创作提示词')).toBeVisible()
  expect(pageErrors).toEqual([])
})

test('拖入不支持文件只提示错误且不会离开原型页面', async ({ page }) => {
  const pageErrors = []
  page.on('pageerror', error => pageErrors.push(error.message))
  const originalUrl = page.url()
  await page.locator('.composer').evaluate(composer => {
    const transfer = new DataTransfer()
    transfer.items.add(new File(['archive'], '不支持的压缩包.rar', { type: 'application/vnd.rar' }))
    composer.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: transfer }))
    composer.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: transfer }))
  })
  await expect(page.getByRole('alert')).toContainText('格式不支持')
  expect(page.url()).toBe(originalUrl)
  await expect(page.getByRole('tab', { name: 'AI 对话' })).toBeVisible()
  expect(pageErrors).toEqual([])

  await page.locator('body').evaluate(body => {
    const transfer = new DataTransfer()
    transfer.items.add(new File(['archive'], '页面外拖放.rar', { type: 'application/vnd.rar' }))
    body.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: transfer }))
  })
  expect(page.url()).toBe(originalUrl)
  await expect(page.getByLabel('创作提示词')).toBeVisible()
})

test('上传成功提示显示在创作框上方居中位置', async ({ page }) => {
  await page.locator('input[type="file"]').setInputFiles({ name: '参考图.png', mimeType: 'image/png', buffer: Buffer.from('image') })
  const success = page.locator('.composer-success')
  await expect(success).toContainText('已上传：参考图.png')
  const placement = await page.evaluate(() => {
    const message = document.querySelector('.composer-success')?.getBoundingClientRect()
    const tabs = document.querySelector('.composer .tabs')?.getBoundingClientRect()
    const composer = document.querySelector('.composer')?.getBoundingClientRect()
    if (!message || !tabs || !composer) return null
    return {
      above: message.bottom <= tabs.top - 12,
      centered: Math.abs((message.left + message.width / 2) - (composer.left + composer.width / 2)) < 2
    }
  })
  expect(placement).toEqual({ above: true, centered: true })
  await expect(page.locator('.toast')).toHaveCount(0)
})

test('附件超出可视宽度后在容器内横向滚动', async ({ page }) => {
  await page.locator('.composer').evaluate(element => { element.style.width = '420px' })
  const documents = Array.from({ length: 10 }, (_, index) => ({ name: `文件${index + 1}.pdf`, mimeType: 'application/pdf', buffer: Buffer.from(`doc-${index}`) }))
  const images = Array.from({ length: 8 }, (_, index) => ({ name: `图片${index + 1}.png`, mimeType: 'image/png', buffer: Buffer.from(`image-${index}`) }))
  await page.locator('input[type="file"]').setInputFiles([...documents, ...images])
  await expect(page.getByRole('tab', { name: '全部 (18)' })).toBeVisible()
  const scrollState = await page.locator('.real-material-gallery .material-thumbnails').evaluate(element => ({
    scrollable: element.scrollWidth > element.clientWidth,
    overflowX: getComputedStyle(element).overflowX,
    scrollbarWidth: getComputedStyle(element).scrollbarWidth
  }))
  expect(scrollState.scrollable).toBeTruthy()
  expect(scrollState.overflowX).toBe('auto')
  expect(scrollState.scrollbarWidth).toBe('none')
  await expect(page.locator('.real-material-gallery .material-scroll-track')).toBeVisible()
  await expect(page.locator('.real-material-gallery .material-scroll-track button')).toHaveCount(0)
  const trackWidth = await page.locator('.real-material-gallery .material-scroll-track').evaluate(element => element.getBoundingClientRect().width)
  await page.locator('.real-material-gallery .material-scroll-track').click({ position: { x: trackWidth - 4, y: 3 } })
  expect(await page.locator('.real-material-gallery .material-thumbnails').evaluate(element => element.scrollLeft)).toBeGreaterThan(0)
  await expect(page.locator('.upload-placeholder-floating')).toHaveCount(0)
})

test('附件预览与追加按钮使用调整后的统一尺寸', async ({ page }) => {
  await page.locator('input[type="file"]').setInputFiles({
    name: '缩略图.png', mimeType: 'image/png', buffer: Buffer.from('preview')
  })
  await expect(page.locator('.real-material-gallery .material-thumb.image')).toHaveCount(1)
  await expect(page.locator('.real-material-gallery .material-add-more')).toHaveCount(1)
  const dimensions = await page.locator('.real-material-gallery').evaluate(element => {
    const preview = element.querySelector('.material-thumb')?.getBoundingClientRect()
    const add = element.querySelector('.material-add-more')?.getBoundingClientRect()
    return { preview: [preview?.width, preview?.height], add: [add?.width, add?.height] }
  })
  expect(dimensions).toEqual({ preview: [34, 39], add: [34, 39] })
  await expect(page.locator('.real-material-gallery .material-scroll-track')).toHaveCount(0)
  await expect(page.locator('.real-material-gallery .material-scroll-thumb')).toHaveCount(0)
})

test('两个添加附件入口共用来源菜单且不显示从作品选择', async ({ page }) => {
  await page.getByRole('button', { name: '添加素材' }).click()
  await expect(page.getByText('本地上传')).toBeVisible()
  await expect(page.getByText('从资产库选择')).toBeVisible()
  await expect(page.getByText('从作品选择')).toHaveCount(0)
  await page.getByRole('button', { name: '添加素材' }).click()

  await page.locator('input[type="file"]').setInputFiles({
    name: '缩略图.png', mimeType: 'image/png', buffer: Buffer.from('preview')
  })
  await expect(page.locator('.real-material-gallery .material-thumb.image')).toHaveCount(1)
  await page.getByLabel('创作提示词').click()
  await page.getByRole('button', { name: '继续添加素材' }).click()
  await expect(page.getByText('本地上传')).toBeVisible()
  await expect(page.getByText('从资产库选择')).toBeVisible()
  await expect(page.getByText('从作品选择')).toHaveCount(0)
  const alignment = await page.evaluate(() => {
    const add = document.querySelector('.real-material-gallery .material-add-more')?.getBoundingClientRect()
    const menu = document.querySelector('.upload-source-menu.append-menu')?.getBoundingClientRect()
    return {
      above: (menu?.bottom || 0) < (add?.top || 0),
      leftEdgeDelta: Math.abs((menu?.left || 0) - (add?.left || 0))
    }
  })
  expect(alignment.above).toBeTruthy()
  expect(alignment.leftEdgeDelta).toBeLessThanOrEqual(1)
})

test('无附件状态的上传入口尺寸为 34×39', async ({ page }) => {
  const dimensions = await page.locator('.prompt-add').evaluate(element => {
    const box = element.getBoundingClientRect()
    return [box.width, box.height]
  })
  expect(dimensions).toEqual([34, 39])
})

test('视频文件单文件上限为 50MB', async ({ page }, testInfo) => {
  await page.getByRole('tab', { name: '视频生成' }).click()
  await expect(page.getByText(/视频 ≤ 3 个\/50 MB/)).toBeVisible()
  const oversizedVideo = testInfo.outputPath('超限视频.mp4')
  writeFileSync(oversizedVideo, '')
  truncateSync(oversizedVideo, 50 * 1024 * 1024 + 1)
  await page.locator('input[type="file"]').setInputFiles(oversizedVideo)
  await expect(page.getByRole('alert')).toContainText('视频文件上限 50 MB')
  await expect(page.locator('.real-material-gallery .material-thumb.video')).toHaveCount(0)
})

test('视频附件使用视频封面预览而不是通用图标', async ({ page }) => {
  await page.getByRole('tab', { name: '视频生成' }).click()
  await mockVideoMetadata(page)
  await page.locator('input[type="file"]').setInputFiles({
    name: '参考视频.mp4', mimeType: 'video/mp4', buffer: Buffer.from('video-preview')
  })
  const thumbnail = page.locator('.real-material-gallery .material-thumb.video')
  await expect(thumbnail.locator('video')).toHaveCount(1)
  await expect(thumbnail.locator('i')).toHaveCount(0)
})

test('Seedance 拒绝短于 2 秒及超出画面范围的参考视频', async ({ page }) => {
  await page.getByRole('tab', { name: '视频生成' }).click()
  await mockVideoMetadata(page, { duration: 1, width: 1280, height: 720 })
  await page.locator('input[type="file"]').setInputFiles({ name: '过短.mp4', mimeType: 'video/mp4', buffer: Buffer.from('short') })
  await expect(page.getByRole('alert')).toContainText('时长须为 2–15 秒')
  await page.reload()
  await page.getByRole('tab', { name: '视频生成' }).click()
  await mockVideoMetadata(page, { duration: 5, width: 200, height: 720 })
  await page.locator('input[type="file"]').setInputFiles({ name: '过窄.mov', mimeType: 'video/quicktime', buffer: Buffer.from('narrow') })
  await expect(page.getByRole('alert')).toContainText('宽高须在 300–6000px')
})

test('Seedance 参考视频仅允许 MP4 和 MOV', async ({ page }) => {
  await page.getByRole('tab', { name: '视频生成' }).click()
  await page.locator('input[type="file"]').setInputFiles({ name: '不支持.webm', mimeType: 'video/webm', buffer: Buffer.from('webm') })
  await expect(page.getByRole('alert')).toContainText('仅支持 mp4、mov')
})

test('鼠标经过附件时显示放大预览并在移开后隐藏', async ({ page }) => {
  await page.locator('input[type="file"]').setInputFiles({
    name: '预览图片.png', mimeType: 'image/png', buffer: Buffer.from('hover-preview')
  })
  const thumbnail = page.locator('.real-material-gallery .material-thumb.image')
  await thumbnail.hover()
  await expect(page.getByRole('tooltip')).toBeVisible()
  await expect(page.getByRole('tooltip').getByText('图片1')).toBeVisible()
  const alignment = await page.evaluate(() => {
    const thumbnail = document.querySelector('.real-material-gallery .material-thumb.image')?.getBoundingClientRect()
    const preview = document.querySelector('.material-hover-preview')?.getBoundingClientRect()
    return Math.abs((thumbnail?.left || 0) - (preview?.left || 0))
  })
  expect(alignment).toBeLessThan(1)
  await expect(page.getByRole('tooltip')).toHaveCSS('width', '312px')
  await expect(page.getByRole('tooltip').locator('img')).toHaveCSS('object-fit', 'contain')
  await expect(page.getByRole('tooltip').locator('img')).toHaveCSS('max-height', '320px')
  await page.locator('.prompt-meta').hover()
  await expect(page.getByRole('tooltip')).toHaveCount(0)
})

test('点击素材缩略图在当前光标位置添加引用', async ({ page }) => {
  await page.locator('input[type="file"]').setInputFiles({
    name: '引用图片.png', mimeType: 'image/png', buffer: Buffer.from('reference-image')
  })
  const textarea = page.getByLabel('创作提示词')
  await textarea.fill('前文 后文')
  await textarea.evaluate(element => { const range = document.createRange(); range.setStart(element.firstChild, 3); range.collapse(true); const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range); element.focus(); element.dispatchEvent(new Event('click', { bubbles: true })) })
  await page.getByRole('button', { name: '引用图片1' }).click()
  await expect(textarea).toHaveText('前文 @图片1 后文')
  await expect(textarea.locator('.prompt-reference')).toHaveText('@图片1')
  const caret = await textarea.evaluate(element => { const selection = window.getSelection(); const range = selection.getRangeAt(0).cloneRange(); range.selectNodeContents(element); range.setEnd(selection.anchorNode, selection.anchorOffset); return range.toString().length })
  expect(caret).toBe(8)
})

test('引用胶囊悬停时显示对应素材预览', async ({ page }) => {
  await page.locator('input[type="file"]').setInputFiles({ name: '胶囊图片.png', mimeType: 'image/png', buffer: Buffer.from('capsule-preview') })
  await page.getByRole('button', { name: '引用图片1' }).click()
  const capsule = page.locator('.prompt-reference')
  await expect(capsule).toBeVisible()
  await expect(capsule.locator('svg')).toHaveCount(0)
  await capsule.hover()
  await expect(page.getByRole('tooltip')).toBeVisible()
  await expect(page.getByRole('tooltip')).toContainText('图片1')
})

test('删除素材时移除对应胶囊并重排剩余引用序号', async ({ page }) => {
  await page.locator('input[type="file"]').setInputFiles([
    { name: '第一张.png', mimeType: 'image/png', buffer: Buffer.from('first') },
    { name: '第二张.png', mimeType: 'image/png', buffer: Buffer.from('second') }
  ])
  await page.getByRole('button', { name: '引用图片1' }).click()
  await page.getByRole('button', { name: '引用图片2' }).click()
  await expect(page.locator('.prompt-reference')).toHaveCount(2)
  const firstThumbnail = page.getByRole('button', { name: '引用图片1' })
  await firstThumbnail.hover()
  await firstThumbnail.getByRole('button', { name: /移除/ }).click()
  await expect(page.locator('.prompt-reference')).toHaveCount(1)
  await expect(page.locator('.prompt-reference')).toHaveText('@图片1')
  await expect(page.getByLabel('创作提示词')).not.toContainText('@图片2')
})

test('Backspace 将引用胶囊作为整体删除且不会白屏', async ({ page }) => {
  const pageErrors = []
  page.on('pageerror', error => pageErrors.push(error.message))
  await page.locator('input[type="file"]').setInputFiles({ name: '待删除引用.png', mimeType: 'image/png', buffer: Buffer.from('backspace-reference') })
  await page.getByRole('button', { name: '引用图片1' }).click()
  const editor = page.getByLabel('创作提示词')
  await expect(editor.locator('.prompt-reference')).toHaveCount(1)
  await editor.press('Backspace')
  await editor.press('Backspace')
  await editor.press('Backspace')
  await expect(editor.locator('.prompt-reference')).toHaveCount(0)
  await expect(page.getByRole('tab', { name: 'AI 对话' })).toBeVisible()
  expect(pageErrors).toEqual([])
})

test('上传较大图片不会因本地存储超限导致白屏', async ({ page }) => {
  const pageErrors = []
  page.on('pageerror', error => pageErrors.push(error.message))
  await page.locator('input[type="file"]').setInputFiles({
    name: '大图预览.png', mimeType: 'image/png', buffer: Buffer.alloc(6 * 1024 * 1024)
  })
  await expect(page.locator('.real-material-gallery .material-thumb.image')).toHaveCount(1)
  await expect(page.getByRole('tab', { name: 'AI 对话' })).toBeVisible()
  await expect(page.getByLabel('创作提示词')).toBeVisible()
  const persisted = await page.evaluate(() => localStorage.getItem('wujie-prototype-v2') || '')
  expect(persisted.length).toBeLessThan(100_000)
  expect(persisted).not.toContain('data:image')
  expect(pageErrors).toEqual([])
})

test('gpt-image-2 使用 16 张、20MB 和指定图片格式约束', async ({ page }) => {
  await page.getByRole('tab', { name: '图片生成' }).click()
  await expect(page.locator('.prompt-meta .limits')).toContainText('图片 0/16')
  await expect(page.getByText('单张 ≤ 20 MB · PNG/JPG/WebP · 附件合计 ≤ 64 MB')).toBeVisible()
  const accept = await page.locator('input[type="file"]').getAttribute('accept')
  expect(accept).toContain('.png')
  expect(accept).toContain('.jpg')
  expect(accept).toContain('.jpeg')
  expect(accept).toContain('.webp')
  expect(accept).not.toContain('.gif')
  await page.locator('input[type="file"]').setInputFiles({ name: '动图.gif', mimeType: 'image/gif', buffer: Buffer.from('gif') })
  await expect(page.getByRole('alert')).toContainText('gpt-image-2 当前支持：png、jpg、jpeg、webp')
  await page.locator('input[type="file"]').setInputFiles({ name: '超大参考图.png', mimeType: 'image/png', buffer: Buffer.alloc(20 * 1024 * 1024 + 1) })
  await expect(page.getByRole('alert')).toContainText('上限 20 MB')
})

test('Nano Banana 使用 14 张、7MB 和扩展图片格式约束', async ({ page }) => {
  await page.getByRole('tab', { name: '图片生成' }).click()
  await page.getByRole('button', { name: 'gpt-image-2' }).click()
  await page.getByRole('button', { name: /gemini-3.1-flash-image-preview/ }).last().click()
  await expect(page.locator('.prompt-meta .limits')).toContainText('图片 0/14')
  await expect(page.getByText(/单张 ≤ 7 MB（建议 ≤ 5 MB）/)).toBeVisible()
  const accept = await page.locator('input[type="file"]').getAttribute('accept')
  expect(accept).toContain('.heic')
  expect(accept).toContain('.heif')
  const images = Array.from({ length: 15 }, (_, index) => ({ name: `参考图${index + 1}.png`, mimeType: 'image/png', buffer: Buffer.from(`image-${index}`) }))
  await page.locator('input[type="file"]').setInputFiles(images)
  await expect(page.getByRole('tab', { name: '全部 (14)' })).toBeVisible()
  await expect(page.getByRole('alert')).toContainText('图片最多上传 14 个')
  await page.getByRole('button', { name: '清空全部素材' }).click()
  await page.locator('input[type="file"]').setInputFiles({ name: '超大参考图.heic', mimeType: '', buffer: Buffer.alloc(7 * 1024 * 1024 + 1) })
  await expect(page.getByRole('alert')).toContainText('上限 7 MB')
})
