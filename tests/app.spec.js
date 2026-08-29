import { test, expect } from '@playwright/test'

test('默认 AI 对话且图片生成主流程可完成并刷新恢复', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('tab', { name: 'AI 对话' })).toHaveAttribute('aria-selected', 'true')
  await page.getByRole('tab', { name: '图片生成' }).click()
  await page.getByLabel('创作提示词').fill('一罐柚子气泡水，清爽夏日感')
  await page.getByRole('button', { name: /添加素材/ }).click()
  await page.getByRole('button', { name: /20 积分/ }).click()
  await expect(page.getByText('图片生成结果')).toBeVisible()
  await page.reload()
  await expect(page.getByText('图片生成结果')).toBeVisible()
})

test('视频拆解校验并完成流程', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('tab', { name: '视频拆解' }).click()
  await page.getByLabel('创作提示词').fill('拆解前 3 秒钩子')
  await page.getByRole('button', { name: '需上传视频后提交' }).click()
  await expect(page.getByRole('alert')).toContainText('请先上传至少 1 个视频')
  await page.getByRole('button', { name: /添加素材/ }).click()
  await page.getByRole('button', { name: /10 积分/ }).click()
  await expect(page.getByLabel('生成结果').getByText('视频拆解结果')).toBeVisible()
})

test('历史搜索、重命名和删除确认可用', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('打开创作历史').click()
  await page.getByLabel('重命名新对话').click()
  await page.getByLabel('会话名称').fill('营销文案讨论')
  await page.getByRole('button', { name: '保存' }).click()
  await page.getByLabel('打开创作历史').click()
  await expect(page.getByText('营销文案讨论')).toBeVisible()
  await page.getByLabel('删除营销文案讨论').click()
  await expect(page.getByRole('alertdialog', { name: '确认删除会话' })).toBeVisible()
  await page.getByRole('button', { name: '取消' }).click()
  await expect(page.getByText('营销文案讨论')).toBeVisible()
})

test('移动端无水平溢出', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile')
  await page.goto('/')
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBeFalsy()
})

test('创作面板可展开 400px 并恢复默认高度', async ({ page }) => {
  await page.goto('/')
  const editor = page.getByLabel('创作提示词')
  await expect(page.locator('.composer')).toHaveClass(/is-compact/)
  await editor.focus()
  await expect(page.locator('.composer')).toHaveClass(/is-default/)
  await expect.poll(async () => editor.evaluate(element => element.getBoundingClientRect().height)).toBe(86)
  const initialHeight = 86

  await page.getByRole('button', { name: '增高创作面板' }).click()
  await expect(page.getByRole('button', { name: '恢复创作面板默认高度' })).toHaveAttribute('aria-expanded', 'true')
  await expect.poll(async () => editor.evaluate(element => element.getBoundingClientRect().height)).toBe(initialHeight + 400)

  await page.getByRole('button', { name: '恢复创作面板默认高度' }).click()
  await expect.poll(async () => editor.evaluate(element => element.getBoundingClientRect().height)).toBe(initialHeight)
})

test('创作面板仅在触底或点击输入框时展开，向上滚动立即收缩', async ({ page }) => {
  await page.goto('/')
  const composer = page.locator('.composer')
  await page.evaluate(() => {
    const spacer = document.createElement('div')
    spacer.id = 'scroll-test-spacer'
    spacer.style.height = '1600px'
    document.querySelector('main')?.appendChild(spacer)
  })

  await expect(composer).toHaveClass(/is-compact/)
  await page.evaluate(() => window.scrollTo(0, 300))
  await expect(composer).toHaveClass(/is-compact/)

  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
  await expect(composer).toHaveClass(/is-default/)

  await page.evaluate(() => window.scrollBy(0, -20))
  await expect(composer).toHaveClass(/is-compact/)

  await page.getByLabel('创作提示词').focus()
  await expect(composer).toHaveClass(/is-default/)
})

test('极简输入框控件垂直居中且文字贴近添加按钮', async ({ page }) => {
  await page.goto('/')
  await page.waitForTimeout(300)
  const positions = await page.evaluate(() => {
    const add = document.querySelector('.composer.is-compact .prompt-add').getBoundingClientRect()
    const editor = document.querySelector('.composer.is-compact .prompt-editor').getBoundingClientRect()
    const submit = document.querySelector('.composer.is-compact .submit').getBoundingClientRect()
    return {
      centerSpread: Math.max(add.top + add.height / 2, editor.top + editor.height / 2, submit.top + submit.height / 2) - Math.min(add.top + add.height / 2, editor.top + editor.height / 2, submit.top + submit.height / 2),
      editorGap: editor.left - add.right
    }
  })
  expect(positions.centerSpread).toBeLessThanOrEqual(1)
  expect(positions.editorGap).toBe(8)
})

test('极简态重新展开时保留增高状态', async ({ page }) => {
  await page.goto('/')
  const composer = page.locator('.composer')
  const editor = page.getByLabel('创作提示词')
  await page.evaluate(() => {
    const spacer = document.createElement('div')
    spacer.style.height = '1200px'
    document.querySelector('main')?.appendChild(spacer)
  })
  await editor.focus()
  await page.getByRole('button', { name: '增高创作面板' }).click()
  await expect(composer).toHaveClass(/is-tall/)

  await page.evaluate(() => window.scrollTo(0, 120))
  await page.evaluate(() => window.scrollBy(0, -20))
  await expect(composer).toHaveClass(/is-compact/)

  await editor.click()
  await expect(composer).toHaveClass(/is-tall/)
})

test('清空全部位于发送按钮旁并同时清除提示词和素材', async ({ page }) => {
  await page.goto('/')
  const editor = page.getByLabel('创作提示词')
  await editor.fill('需要一起清除的提示词')
  await page.locator('.native-file-input').setInputFiles({
    name: 'reference.png',
    mimeType: 'image/png',
    buffer: Buffer.from('89504e470d0a1a0a', 'hex')
  })
  await expect(page.locator('.real-material-gallery')).toBeVisible()

  const clearButton = page.getByRole('button', { name: '清空全部', exact: true })
  const gap = await page.evaluate(() => {
    const clear = document.querySelector('.clear-all').getBoundingClientRect()
    const submit = document.querySelector('.submit').getBoundingClientRect()
    return submit.left - clear.right
  })
  expect(gap).toBeLessThanOrEqual(12)

  await clearButton.click()
  await expect(editor).toHaveText('')
  await expect(page.locator('.real-material-gallery')).toHaveCount(0)
})

test('创作面板内滚动不会影响外部页面', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => {
    const spacer = document.createElement('div')
    spacer.style.height = '1600px'
    document.querySelector('main')?.appendChild(spacer)
    window.scrollTo(0, 300)
  })
  await page.getByLabel('创作提示词').click()
  const before = await page.evaluate(() => window.scrollY)
  await page.getByRole('button', { name: '清空全部', exact: true }).hover()
  await page.mouse.wheel(0, 500)
  await page.waitForTimeout(100)
  expect(await page.evaluate(() => window.scrollY)).toBe(before)
  await expect(page.locator('.composer')).not.toHaveClass(/is-compact/)
})
