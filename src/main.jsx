import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { createPortal } from 'react-dom'
import {
  ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, Copy, Diamond, DownloadSimple,
  FilmStrip, ImageSquare, List, MagnifyingGlass, Paperclip, PencilSimple,
  Plus, Sparkle, Trash, VideoCamera, WarningCircle, X, Robot,
  SquaresFour, FolderOpen, ClockCounterClockwise, Keyboard, DotsThree, PushPin,
  FilePdf, FileDoc, FileXls, FilePpt, FileText, FileCsv, FileCode,
  CornersIn, CornersOut, Link, Brain, ClipboardText, ListNumbers, Scan,
  PaintBrush, FilmSlate, Stack, ShieldCheck
} from '@phosphor-icons/react'
import './styles.css'
import './review-fixes.css'
import './typography.css'
import './navigation-typography.css'
import './header-layout.css'

const MODES = {
  chat: { label: 'AI 对话', icon: Sparkle, placeholder: '输入问题、需求或灵感，与 AI 连续对话', model: 'gpt-5.6-sol', points: 10, limits: ['图片 0/10', '文档 0/10'] },
  image: { label: '图片生成', icon: ImageSquare, placeholder: '描述画面，可上传参考图片辅助生成', model: 'gpt-image-2', points: 20, limits: ['图片 0/16'], params: true },
  analyze: { label: '视频拆解', icon: FilmStrip, placeholder: '上传视频，让 AI 拆解内容、镜头和创意', model: 'gemini-3.1-pro-preview', points: 10, limits: ['图片 0/10', '文档 0/10', '视频 0/10', '音频 0/1'], needsVideo: true },
  video: { label: '视频生成', icon: VideoCamera, placeholder: '描述画面的运动、场景与镜头，支持 @ 引用首帧素材', model: 'seedance 2.0', points: 250, limits: ['图片 0/9', '视频 0/3', '音频 0/3'], params: true }
}

const CREATION_MODES = ['chat', 'image', 'video']
const GENERATION_STATES = {
  chat: [
    { key: 'connecting', title: '正在连接 AI…', icon: Link, tips: ['已收到你的消息', '正在建立安全连接', '马上开始处理你的需求'] },
    { key: 'understanding', title: '正在理解你的需求…', icon: Brain, tips: ['正在分析问题重点', '正在读取上下文信息', '正在确认任务目标'] },
    { key: 'materials', title: '正在读取参考素材…', icon: FileText, tips: ['正在识别图片和文件内容', '正在整理可用信息', '你可以暂时离开，任务会继续'] },
    { key: 'skill', title: '正在加载专业技能…', icon: Sparkle, tips: ['正在调用专业创作能力', '正在匹配适合的处理方法', '技能加载完成后将继续生成'] },
    { key: 'generating', title: 'AI 正在思考并组织回答…', icon: DotsThree, tips: ['正在梳理内容结构', '正在完善表达和细节', '正在检查回答是否完整'] }
  ],
  image: [
    { key: 'connecting', title: '正在连接图片生成模型…', icon: Link, tips: ['已收到你的创作需求', '正在创建图片生成任务', '任务创建后可在后台继续'] },
    { key: 'created', title: '图片生成任务已创建', icon: ClipboardText, tips: ['正在准备生成资源', '你可以继续浏览其他内容', '离开当前页面后任务仍会继续'] },
    { key: 'queued', title: '正在等待生成资源…', icon: ListNumbers, tips: ['当前请求较多，正在有序排队', '你的任务已保留，无需重复提交', '排队完成后会自动开始生成'] },
    { key: 'analyzing', title: '正在理解画面描述…', icon: Scan, tips: ['正在识别主体、场景和风格', '正在分析参考图片', '正在整理构图和视觉重点'] },
    { key: 'composing', title: '正在构建画面…', icon: ImageSquare, tips: ['正在生成主体和背景', '正在调整构图与色彩', '画面正在逐步成形'] },
    { key: 'refining', title: '正在优化图片细节…', icon: PaintBrush, tips: ['正在完善光影和质感', '正在处理边缘与局部细节', '正在进行最后的质量检查'] }
  ],
  video: [
    { key: 'connecting', title: '正在连接视频生成模型…', icon: Link, tips: ['已收到你的视频创作需求', '正在创建视频生成任务', '视频任务通常需要更多处理时间'] },
    { key: 'created', title: '视频生成任务已创建', icon: ClipboardText, tips: ['正在准备生成资源', '任务会在后台持续处理', '离开当前页面不会中断生成'] },
    { key: 'queued', title: '正在等待生成资源…', icon: ListNumbers, tips: ['当前请求较多，正在有序排队', '你的任务已保留，无需重复提交', '排队完成后会自动开始生成'] },
    { key: 'analyzing', title: '正在分析提示词和参考素材…', icon: FilmStrip, tips: ['正在理解主体、动作和镜头要求', '正在检查参考图片与视频', '正在规划画面节奏'] },
    { key: 'frames', title: '正在生成视频画面…', icon: FilmSlate, tips: ['正在构建镜头和人物动作', '正在生成连续画面', '正在处理镜头运动'] },
    { key: 'compositing', title: '正在合成视频…', icon: Stack, tips: ['正在处理画面衔接', '正在调整视频节奏', '正在合成最终文件'] },
    { key: 'checking', title: '正在进行最后的质量检查…', icon: ShieldCheck, tips: ['正在检查画面完整性', '正在确认视频可以正常播放', '很快就可以查看视频了'] }
  ]
}
const MATERIAL_ACCEPT = {
  图片: 'image/png,image/jpeg,image/webp,image/gif',
  文档: '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.md',
  视频: 'video/mp4,video/quicktime,video/webm',
  音频: 'audio/mpeg,audio/wav,audio/mp4,audio/x-m4a'
}
const MODEL_UPLOAD_EXTENSIONS = {
  'gpt-4o': ['pdf','docx','doc','rtf','odt','pptx','ppt','xlsx','xls','csv','tsv','txt','md','json','xml','jpg','jpeg','png','gif','webp','bmp','heic','mp3','m4a','wav','webm','mpga'],
  'gpt-5.6-sol': ['pdf','docx','doc','rtf','odt','pptx','ppt','xlsx','xls','csv','tsv','txt','md','json','xml','jpg','jpeg','png','gif','webp','bmp','heic'],
  'claude-opus-5': ['pdf','docx','rtf','odt','epub','html','txt','md','json','csv','jpg','jpeg','png','gif','webp'],
  'gemini-3.1-pro-preview': ['pdf','txt','md','json','csv','html','docx','xlsx','pptx','jpg','jpeg','png','webp','heic','heif','mp3','wav','m4a','flac','opus','webm','mp4','mov','avi','mpeg'],
  'gpt-image-2': ['png','jpg','jpeg','webp'],
  'gemini-3.1-flash-image-preview': ['png','jpg','jpeg','webp','heic','heif']
}
const MB = 1024 * 1024
const VIDEO_FILE_SIZE_LIMIT = 50 * MB
const MODEL_FILE_SIZE_LIMITS = {
  'gpt-4o': { file: 10 * MB, total: 64 * MB },
  'gpt-5.6-sol': { file: 10 * MB, total: 64 * MB },
  'claude-opus-5': { file: 10 * MB, total: 64 * MB },
  'gemini-3.1-pro-preview': { file: 10 * MB, total: 64 * MB },
  'gpt-image-2': { file: 20 * MB, total: 64 * MB },
  'gemini-3.1-flash-image-preview': { file: 7 * MB, total: 64 * MB },
  '满血版 Seedance 2.0': { video: 50 * MB, total: 64 * MB },
  'Fast-Seedance 2.0': { video: 50 * MB, total: 64 * MB },
  'Mini-Seedance 2.0': { video: 50 * MB, total: 64 * MB }
}
const CHAT_MODEL_LIMITS = {
  'gpt-4o': ['图片 0/10', '文档 0/10', '视频 0/10', '音频 0/1'],
  'gpt-5.6-sol': ['图片 0/10', '文档 0/10'],
  'claude-opus-5': ['图片 0/10', '文档 0/10'],
  'gemini-3.1-pro-preview': ['图片 0/10', '文档 0/10', '视频 0/10', '音频 0/1']
}
const IMAGE_MODEL_LIMITS = {
  'gpt-image-2': ['图片 0/16'],
  'gemini-3.1-flash-image-preview': ['图片 0/14']
}
const EXTENSION_MATERIAL_TYPE = {
  jpg: '图片', jpeg: '图片', png: '图片', gif: '图片', webp: '图片', bmp: '图片', heic: '图片', heif: '图片',
  mp3: '音频', m4a: '音频', wav: '音频', mpga: '音频', flac: '音频', opus: '音频',
  webm: '视频', mp4: '视频', mov: '视频', avi: '视频', mpeg: '视频'
}
const DOCUMENT_ICON_TYPES = {
  pdf: 'pdf', doc: 'word', docx: 'word', odt: 'word', rtf: 'word', epub: 'word',
  xls: 'excel', xlsx: 'excel', csv: 'csv', tsv: 'csv',
  ppt: 'ppt', pptx: 'ppt',
  json: 'code', xml: 'code', html: 'code', md: 'text', txt: 'text'
}

function fileExtension(name = '') { return name.split('.').pop()?.toLowerCase() || '' }
function formatFileSize(bytes) {
  if (bytes >= 1024 * MB) return `${(bytes / 1024 / MB).toFixed(bytes % (1024 * MB) ? 1 : 0)} GB`
  if (bytes >= MB) return `${(bytes / MB).toFixed(bytes % MB ? 1 : 0)} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}
function inspectVideoFile(file) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    const source = URL.createObjectURL(file)
    const cleanup = () => { clearTimeout(timeout); video.removeAttribute('src'); video.load(); URL.revokeObjectURL(source) }
    const timeout = setTimeout(() => { cleanup(); reject(new Error('timeout')) }, 6000)
    video.preload = 'metadata'
    video.muted = true
    video.onloadedmetadata = () => {
      const metadata = { duration: video.duration, width: video.videoWidth, height: video.videoHeight }
      cleanup()
      resolve(metadata)
    }
    video.onerror = () => { cleanup(); reject(new Error('decode')) }
    video.src = source
    video.load()
  })
}
function DocumentIcon({ name }) {
  const extension = fileExtension(name)
  const type = DOCUMENT_ICON_TYPES[extension] || 'text'
  const Icon = { pdf: FilePdf, word: FileDoc, excel: FileXls, csv: FileCsv, ppt: FilePpt, code: FileCode, text: FileText }[type]
  return <span className={`document-icon ${type}`} aria-label={`${extension.toUpperCase() || '文档'} 文件`}><Icon weight="fill"/><small>{extension.toUpperCase() || 'DOC'}</small></span>
}
function MaterialIcon({ item }) {
  if (item.kind === 'document') return <DocumentIcon name={item.name}/>
  if (item.kind === 'video') return <VideoCamera/>
  if (item.kind === 'image') return <ImageSquare/>
  return <Paperclip/>
}
function modelSizeHint(model) {
  if (model === 'gpt-image-2') return '单张 ≤ 20 MB · PNG/JPG/WebP · 附件合计 ≤ 64 MB'
  if (model === 'gemini-3.1-flash-image-preview') return '单张 ≤ 7 MB（建议 ≤ 5 MB）· PNG/JPG/WebP/HEIC/HEIF · 附件合计 ≤ 64 MB'
  if (MODEL_FILE_SIZE_LIMITS[model]) return '单文件 ≤ 10 MB · 附件合计 ≤ 64 MB'
  return ''
}

function AttachmentStrip({ children }) {
  const viewportRef = useRef(null)
  const activityTimer = useRef(null)
  const [scrollbar, setScrollbar] = useState({ visible: false, size: 100, position: 0, atStart: true, atEnd: true })
  const [scrolling, setScrolling] = useState(false)
  const updateScrollbar = () => {
    const viewport = viewportRef.current
    if (!viewport) return
    const visible = viewport.scrollWidth > viewport.clientWidth + 1
    const size = visible ? Math.max(12, viewport.clientWidth / viewport.scrollWidth * 100) : 100
    const maxScroll = viewport.scrollWidth - viewport.clientWidth
    const position = maxScroll > 0 ? viewport.scrollLeft / maxScroll * (100 - size) : 0
    setScrollbar({ visible, size, position, atStart: viewport.scrollLeft <= 1, atEnd: maxScroll <= 1 || viewport.scrollLeft >= maxScroll - 1 })
  }
  const showScrollFeedback = () => {
    setScrolling(true)
    clearTimeout(activityTimer.current)
    activityTimer.current = setTimeout(() => setScrolling(false), 800)
  }
  useEffect(() => {
    updateScrollbar()
    const observer = new ResizeObserver(updateScrollbar)
    if (viewportRef.current) observer.observe(viewportRef.current)
    return () => { observer.disconnect(); clearTimeout(activityTimer.current) }
  }, [children])
  const handleScroll = () => { updateScrollbar(); showScrollFeedback() }
  const handleWheel = event => {
    const viewport = viewportRef.current
    if (!viewport || !scrollbar.visible || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return
    event.preventDefault()
    viewport.scrollLeft += event.deltaY
    showScrollFeedback()
  }
  const startDrag = event => {
    const viewport = viewportRef.current
    if (!viewport) return
    event.preventDefault()
    const track = event.currentTarget.getBoundingClientRect()
    const maxScroll = viewport.scrollWidth - viewport.clientWidth
    const thumbWidth = track.width * scrollbar.size / 100
    const startX = event.clientX
    const startScroll = viewport.scrollLeft
    if (!(event.target instanceof Element) || !event.target.closest('.material-scroll-thumb')) {
      const nextLeft = event.clientX - track.left - thumbWidth / 2
      viewport.scrollLeft = Math.max(0, Math.min(maxScroll, nextLeft / Math.max(1, track.width - thumbWidth) * maxScroll))
    }
    const move = moveEvent => {
      const distance = moveEvent.clientX - startX
      viewport.scrollLeft = Math.max(0, Math.min(maxScroll, startScroll + distance / Math.max(1, track.width - thumbWidth) * maxScroll))
    }
    const stop = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', stop) }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', stop, { once: true })
  }
  const shellClass = `material-scroll-shell${scrollbar.visible ? ' can-scroll' : ''}${scrollbar.atStart ? ' at-start' : ''}${scrollbar.atEnd ? ' at-end' : ''}${scrolling ? ' is-scrolling' : ''}`
  return <div className={shellClass}><div ref={viewportRef} className="material-thumbnails" onScroll={handleScroll} onWheel={handleWheel}>{children}</div>{scrollbar.visible && <div className="material-scroll-track" aria-hidden="true" onPointerDown={startDrag}><div className="material-scroll-thumb" style={{ width: `${scrollbar.size}%`, left: `${scrollbar.position}%` }}/></div>}</div>
}

function HistoryMaterialStrip({ items = [], aliases = [], action, align = 'start' }) {
  const viewportRef = useRef(null)
  const previewRequestRef = useRef(0)
  const [preview, setPreview] = useState(null)
  const [edges, setEdges] = useState({ left: false, right: items.length > 1 })
  const updateEdges = () => {
    const viewport = viewportRef.current
    if (!viewport) return
    const maxScroll = viewport.scrollWidth - viewport.clientWidth
    setEdges({ left: viewport.scrollLeft > 2, right: maxScroll > 2 && viewport.scrollLeft < maxScroll - 2 })
  }
  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    updateEdges()
    const observer = new ResizeObserver(updateEdges)
    observer.observe(viewport)
    return () => observer.disconnect()
  }, [items.length])
  const handleWheel = event => {
    const viewport = viewportRef.current
    if (!viewport || viewport.scrollWidth <= viewport.clientWidth + 1) return
    event.preventDefault()
    viewport.scrollLeft += Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX
  }
  const showPreview = (event, item, alias) => {
    const target = event.currentTarget
    const requestId = ++previewRequestRef.current
    const width = 190
    const height = 226
    const gap = 9
    const updatePreviewPosition = () => {
      if (requestId !== previewRequestRef.current || !target.isConnected) return
      const rect = target.getBoundingClientRect()
      const placeBelow = rect.top < height + gap + 10
      const alignRight = align === 'end'
      const preferredLeft = alignRight ? rect.right - width : rect.left
      const preferredTop = placeBelow ? rect.bottom + gap : rect.top - height - gap
      setPreview({
        item,
        alias,
        placement: `${placeBelow ? 'below' : 'above'}-${alignRight ? 'right-aligned' : 'left-aligned'}`,
        left: Math.max(10, Math.min(window.innerWidth - width - 10, preferredLeft)),
        top: Math.max(10, Math.min(window.innerHeight - height - 10, preferredTop))
      })
    }
    updatePreviewPosition()
    window.setTimeout(() => target.matches(':hover') && updatePreviewPosition(), 240)
  }
  const hidePreview = () => { previewRequestRef.current += 1; setPreview(null) }
  if (!items.length) return null
  return <div className={`history-material-strip ${align}${items.length >= 2 ? ' has-multiple' : ''}`} style={{ '--history-material-count': Math.min(items.length, 5) }} aria-label={items.length >= 2 ? `${items.length} 个附件，悬停展开` : undefined}>
    <div className="history-material-viewport" ref={viewportRef} onWheel={handleWheel} onScroll={updateEdges}>
      <div className="history-material-track">{items.map((item, index) => { const alias = aliases[index] || `素材${index + 1}`; return <button type="button" key={item.id || index} aria-label={`预览${alias}`} onClick={() => action?.(`预览${alias}（模拟）`)} onMouseEnter={event => showPreview(event, item, alias)} onMouseLeave={hidePreview}>{item.kind === 'image' && item.preview ? <img src={item.preview} alt={alias}/> : item.kind === 'video' && item.preview ? <video src={item.preview} muted preload="metadata" aria-label={`${alias}视频封面`}/> : <MaterialIcon item={item}/>}</button> })}</div>
    </div>
    {edges.left && <i className="history-scroll-edge left" aria-hidden="true"/>}
    {edges.right && <i className="history-scroll-edge right" aria-hidden="true"/>}
    {items.length > 5 && <small className="history-material-scroll-hint">滚轮横向浏览</small>}
    {preview && createPortal(<div className={`history-material-tip ${preview.placement}`} role="tooltip" style={{ left: preview.left, top: preview.top }}><div>{preview.item.kind === 'image' && preview.item.preview ? <img src={preview.item.preview} alt={preview.alias}/> : preview.item.kind === 'video' && preview.item.preview ? <video src={preview.item.preview} muted autoPlay loop playsInline/> : <MaterialIcon item={preview.item}/>}</div><b>{preview.alias}</b></div>, document.body)}
  </div>
}
function HistoryReference({ item, alias, children }) {
  const [previewPosition, setPreviewPosition] = useState(null)
  const showPreview = event => {
    const rect = event.currentTarget.getBoundingClientRect()
    const width = 170
    const height = 226
    const gap = 9
    const edge = 10
    const spaceAbove = rect.top - edge
    const spaceBelow = window.innerHeight - rect.bottom - edge
    const placeBelow = spaceBelow >= height + gap || (spaceAbove < height + gap && spaceBelow >= spaceAbove)
    const preferredTop = placeBelow ? rect.bottom + gap : rect.top - height - gap
    const preferredLeft = rect.left + rect.width / 2 - width / 2
    setPreviewPosition({
      left: Math.max(edge, Math.min(window.innerWidth - width - edge, preferredLeft)),
      top: Math.max(edge, Math.min(window.innerHeight - height - edge, preferredTop)),
      placement: placeBelow ? 'below' : 'above'
    })
  }
  return <span className="history-reference" onMouseEnter={showPreview} onMouseLeave={() => setPreviewPosition(null)}>
    {children}
    {previewPosition && createPortal(<span className={`history-reference-preview portal ${previewPosition.placement}`} style={{ left: previewPosition.left, top: previewPosition.top }}><span>{item.kind === 'image' && item.preview ? <img src={item.preview} alt={alias}/> : item.kind === 'video' && item.preview ? <video src={item.preview} muted autoPlay loop playsInline/> : <MaterialIcon item={item}/>}</span><b>{alias}</b></span>, document.body)}
  </span>
}
const SKILL_OPTIONS = {
  chat: ['需求拆解', '卖点挖掘', '剧本创作', '分镜生成'],
  image: ['人物4宫格视图', '空间资产', '空气感OOTD'],
  video: ['满血版', 'Fast', 'Mini']
}
const SKILL_DESCRIPTIONS = {
  '需求拆解': '梳理目标、约束条件与交付标准', '卖点挖掘': '从产品信息中提炼差异化核心卖点',
  '剧本创作': '自动生成故事大纲、台词与短片脚本', '分镜生成': '把脚本拆解为可执行的镜头方案',
  '人物4宫格视图': '生成统一人物的多角度视觉参考', '空间资产': '构建场景空间与可复用视觉资产',
  '空气感OOTD': '生成轻盈自然的人像穿搭画面', '满血版': '优先使用完整能力生成高质量视频',
  'Fast': '快速生成适合预览和方案验证', 'Mini': '轻量生成适合低成本批量尝试'
}
const MODEL_OPTIONS = {
  chat: ['gpt-5.6-sol', 'claude-opus-5', 'gemini-3.1-pro-preview'],
  image: ['gpt-image-2', 'gemini-3.1-flash-image-preview'],
  video: ['满血版 Seedance 2.0', 'Fast-Seedance 2.0', 'Mini-Seedance 2.0']
}
const MODEL_DESCRIPTIONS = {
  'gpt-5.6-sol': '综合创作与复杂需求理解能力更强',
  'claude-opus-5': '长文本、分析与结构化写作表现出色',
  'gemini-3.1-pro-preview': '多模态理解与素材分析能力更强',
  'gpt-image-2': '支持最多 16 张参考图，可进行图生图与局部编辑',
  'gemini-3.1-flash-image-preview': 'Nano Banana · 支持最多 14 张参考图与多轮修改',
  '满血版 Seedance 2.0': '画面质量与复杂运动表现最佳',
  'Fast-Seedance 2.0': '生成速度更快，兼顾画面质量',
  'Mini-Seedance 2.0': '轻量高效，适合快速创意验证'
}

const emptyDrafts = () => ({ chat: '', image: '', analyze: '', video: '' })
const seed = {
  catalogVersion: 5,
  activeId: 5,
  sessions: [
    { id: 5, title: '新对话', mode: 'chat', time: '刚刚', drafts: emptyDrafts(), files: {}, result: null },
    { id: 1, title: '小红书新品种草文案', mode: 'chat', time: '今天', pinned: true, drafts: { ...emptyDrafts(), chat: '@图片1 @文件1 为一款低糖柚子气泡水整理三条小红书种草文案方向，突出清爽口感和真实分享感。' }, files: {}, result: 'chat', editContext: { skill: '卖点挖掘', model: 'gpt-5.6-sol', materials: [{ id: 'chat-1-image', name: '柚子气泡水产品图.jpg', kind: 'image', meta: '图片 · 2.4 MB' }, { id: 'chat-1-doc', name: '新品卖点资料.docx', kind: 'document', meta: '文档 · 860 KB' }] } },
    { id: 2, title: '夏日气泡水电商主图', mode: 'image', time: '今天', drafts: { ...emptyDrafts(), image: '一罐柚子气泡水漂浮在透明冰块之间，浅蓝背景，阳光折射与细腻水珠，清爽夏日感，电商主图。' }, files: {}, result: 'image' },
    { id: 3, title: '气泡水新品动态广告', mode: 'video', time: '今天', drafts: { ...emptyDrafts(), video: '9:16 竖屏产品广告，柚子气泡水从冰块间升起，镜头缓慢推进，气泡与水珠在逆光中闪烁。' }, files: {}, result: 'video' },
    { id: 4, title: '品牌发布会脚本大纲', mode: 'chat', time: '昨天', drafts: { ...emptyDrafts(), chat: '@文件1 为气泡水新品发布会写一份 60 秒开场脚本大纲，包含品牌主张、产品卖点和结尾口号。' }, files: {}, result: 'chat', editContext: { skill: '剧本创作', model: 'claude-opus-5', materials: [{ id: 'chat-4-doc', name: '品牌发布会资料.pdf', kind: 'document', meta: '文档 · 1.6 MB' }] } },
    { id: 6, title: '饮品海报延展视觉', mode: 'image', time: '昨天', drafts: { ...emptyDrafts(), image: '延续浅蓝与白色的气泡水品牌视觉，生成一张 4:5 社交媒体海报，保留大面积留白。' }, files: {}, result: 'image' },
    { id: 7, title: '竖屏产品氛围短片', mode: 'video', time: '更早', drafts: { ...emptyDrafts(), video: '清晨阳光下的桌面，冰镇气泡水瓶身凝结水珠，镜头从柚子切片平移到产品正面，9:16。' }, files: {}, result: 'video' }
  ]
}

function freezeGeneratedRecords(source) {
  return {
    ...source,
    sessions: source.sessions.map(session => {
      if (session.turns?.length || !session.result) return session
      const mode = session.result
      return {
        ...session,
        turns: [{
          id: `legacy-${session.id}`,
          mode,
          prompt: session.drafts?.[mode] || '请帮我整理三个适合小红书发布的文案方向，语气自然一些。',
          skill: session.editContext?.skill || '',
          model: session.editContext?.model || MODES[mode]?.model,
          materials: (session.editContext?.materials || []).map(item => ({ ...item })),
          status: 'complete',
          time: '10:24'
        }]
      }
    })
  }
}

function loadData() {
  try {
    const saved = JSON.parse(localStorage.getItem('wujie-prototype-v2'))
    return freezeGeneratedRecords(saved?.catalogVersion === seed.catalogVersion ? saved : seed)
  } catch { return freezeGeneratedRecords(seed) }
}

function persistentFile(file) {
  if (!file) return file
  const { preview, ...metadata } = file
  return metadata
}

function persistentData(data) {
  return {
    ...data,
    sessions: data.sessions.map(session => ({
      ...session,
      files: Object.fromEntries(Object.entries(session.files || {}).map(([mode, file]) => [mode, persistentFile(file)]))
    }))
  }
}

function chatTurnsFor(session) {
  if (session.turns?.length) return session.turns
  if (!session.result) return []
  return [{
    id: `legacy-${session.id}`,
    mode: session.result,
    prompt: session.drafts?.[session.result] || '请帮我整理三个适合小红书发布的文案方向，语气自然一些。',
    skill: session.editContext?.skill || '卖点挖掘',
    model: session.editContext?.model || 'gpt-5.6-sol',
    materials: session.editContext?.materials || [],
    status: 'complete',
    time: '10:24'
  }]
}

function editorCaretOffset(editor) {
  const selection = window.getSelection()
  if (!selection?.rangeCount || !editor.contains(selection.anchorNode)) return editor.textContent.length
  const range = selection.getRangeAt(0).cloneRange()
  range.selectNodeContents(editor)
  range.setEnd(selection.anchorNode, selection.anchorOffset)
  return range.toString().length
}

function editorSelectionOffsets(editor) {
  const selection = window.getSelection()
  if (!selection?.rangeCount || !editor.contains(selection.anchorNode) || !editor.contains(selection.focusNode)) {
    const end = editor.textContent.length
    return { start: end, end }
  }
  const pointOffset = (node, offset) => {
    const range = document.createRange()
    range.selectNodeContents(editor)
    range.setEnd(node, offset)
    return range.toString().length
  }
  const anchor = pointOffset(selection.anchorNode, selection.anchorOffset)
  const focus = pointOffset(selection.focusNode, selection.focusOffset)
  return { start: Math.min(anchor, focus), end: Math.max(anchor, focus) }
}

function setEditorCaret(editor, offset) {
  const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT)
  let remaining = offset
  let node = walker.nextNode()
  while (node) {
    if (remaining <= node.textContent.length) {
      const range = document.createRange()
      range.setStart(node, remaining)
      range.collapse(true)
      const selection = window.getSelection()
      selection.removeAllRanges()
      selection.addRange(range)
      return
    }
    remaining -= node.textContent.length
    node = walker.nextNode()
  }
  const range = document.createRange()
  range.selectNodeContents(editor)
  range.collapse(false)
  const selection = window.getSelection()
  selection.removeAllRanges()
  selection.addRange(range)
}

function aliasesForMaterials(items) {
  const counts = { image: 0, video: 0, audio: 0, document: 0 }
  const labels = { image: '图片', video: '视频', audio: '音频', document: '文件' }
  return items.map(item => `${labels[item.kind]}${++counts[item.kind]}`)
}

function escapeRegExp(value) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') }

function App() {
  const [data, setData] = useState(loadData)
  const [drawer, setDrawer] = useState(false)
  const [search, setSearch] = useState('')
  const [task, setTask] = useState('idle')
  const [toast, setToast] = useState('')
  const [notice, setNotice] = useState('')
  const [uploadSuccess, setUploadSuccess] = useState('')
  const [dialog, setDialog] = useState(null)
  const [shortcutOpen, setShortcutOpen] = useState(false)
  const [assetPickerOpen, setAssetPickerOpen] = useState(false)
  const [duration, setDuration] = useState(15)
  const [size, setSize] = useState('1024×1024')
  const [quality, setQuality] = useState('low')
  const [uploadMenu, setUploadMenu] = useState(false)
  const [uploadMenuPosition, setUploadMenuPosition] = useState(null)
  const [controlMenu, setControlMenu] = useState(null)
  const [selectedSkills, setSelectedSkills] = useState({})
  const [selectedModels, setSelectedModels] = useState({})
  const [skillSearch, setSkillSearch] = useState('')
  const [imageParamOpen, setImageParamOpen] = useState(false)
  const [imageRatio, setImageRatio] = useState('智能')
  const [imageResolution, setImageResolution] = useState('1K')
  const [videoParamOpen, setVideoParamOpen] = useState(false)
  const [videoRatio, setVideoRatio] = useState('9:16')
  const [videoResolution, setVideoResolution] = useState('480p')
  const [uploadedFiles, setUploadedFiles] = useState({})
  const uploadedFilesRef = useRef({})
  const uploadEpoch = useRef(0)
  const [uploading, setUploading] = useState([])
  const [materialFilter, setMaterialFilter] = useState('全部')
  const [materialMention, setMaterialMention] = useState(null)
  const [materialMentionIndex, setMaterialMentionIndex] = useState(0)
  const [materialPreview, setMaterialPreview] = useState(null)
  const [composerState, setComposerState] = useState('compact')
  const composerExpandedState = useRef('default')
  const composerScrollTop = useRef(0)
  const promptCaret = useRef(0)
  const promptScroll = useRef({ top: 0, left: 0 })
  const mentionScroll = useRef(null)
  const referenceSelection = useRef(null)
  const mentionSelection = useRef(null)
  const promptComposing = useRef(false)
  const promptBuffer = useRef('')
  const localFileInput = useRef(null)
  useEffect(() => {
    const closeControlMenu = event => {
      if (event.target instanceof Element && event.target.closest('.real-material-gallery .material-thumb')) {
        const editor = document.querySelector('[aria-label="创作提示词"]')
        const selection = window.getSelection()
        if (editor && selection?.anchorNode && editor.contains(selection.anchorNode)) {
          referenceSelection.current = { text: editor.textContent || promptBuffer.current, ...editorSelectionOffsets(editor) }
        }
      }
      if (!(event.target instanceof Element) || !event.target.closest('.control-select')) setControlMenu(null)
      if (!(event.target instanceof Element) || !event.target.closest('.parameter-select')) setImageParamOpen(false)
      if (!(event.target instanceof Element) || !event.target.closest('.video-parameter-select')) setVideoParamOpen(false)
      if (!(event.target instanceof Element) || !event.target.closest('.material-entry, .upload-source-menu')) setUploadMenu(false)
      if (!(event.target instanceof Element) || !event.target.closest('.material-mention-menu, [aria-label="创作提示词"]')) setMaterialMention(null)
    }
    document.addEventListener('pointerdown', closeControlMenu)
    return () => document.removeEventListener('pointerdown', closeControlMenu)
  }, [])
  useEffect(() => {
    const openNativeUploader = event => {
      const button = event.target instanceof Element ? event.target.closest('.upload-source-menu > button') : null
      if (!button || !button.textContent?.includes('本地上传')) return
      event.preventDefault()
      event.stopPropagation()
      setUploadMenu(false)
      localFileInput.current?.click()
    }
    document.addEventListener('click', openNativeUploader, true)
    return () => document.removeEventListener('click', openNativeUploader, true)
  }, [])
  const timer = useRef()
  const session = data.sessions.find(x => x.id === data.activeId) || data.sessions[0]
  const mode = session.mode
  const baseConfig = MODES[mode]
  const activeModel = selectedModels[mode] || baseConfig.model
  const config = mode === 'chat'
    ? { ...baseConfig, limits: CHAT_MODEL_LIMITS[activeModel] || baseConfig.limits }
    : mode === 'image'
      ? { ...baseConfig, limits: IMAGE_MODEL_LIMITS[activeModel] || baseConfig.limits }
      : baseConfig
  const materialTypes = config.limits.map(x => x.split(' ')[0])
  const modelUploadExtensions = MODEL_UPLOAD_EXTENSIONS[activeModel]
  const uploadAccept = modelUploadExtensions
    ? modelUploadExtensions.filter(extension => materialTypes.includes(EXTENSION_MATERIAL_TYPE[extension] || '文档')).map(extension => `.${extension}`).join(',')
    : materialTypes.flatMap(type => MATERIAL_ACCEPT[type]?.split(',') || []).join(',')
  const prompt = session.drafts[mode] || ''
  const file = session.files?.[mode]
  const materialKey = `${session.id}:${mode}`
  const materials = uploadedFiles[materialKey] || (file ? [file] : [])
  const materialTypeLabel = item => ({ image: '图片', video: '视频', audio: '音频', document: '文档' }[item.kind])
  const visibleMaterials = materialFilter === '全部' ? materials : materials.filter(item => materialTypeLabel(item) === materialFilter)
  const materialAliases = useMemo(() => aliasesForMaterials(materials), [materials])
  const materialMentionOptions = materialAliases
    .map((alias, index) => ({ alias, index }))
    .filter(option => materialMention === null || option.alias.includes(materialMention))
  const canSubmit = Boolean(prompt.trim()) && task !== 'loading' && uploading.length === 0 && (!config.needsVideo || file?.kind === 'video')
  const shown = useMemo(() => data.sessions.filter(x => x.title.toLowerCase().includes(search.toLowerCase())).sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned))), [data.sessions, search])

  useEffect(() => {
    const thumbnail = document.querySelector('.material-thumb')
    if (!thumbnail || !file) return
    thumbnail.title = `${file.name}\n${file.meta}`
    thumbnail.style.setProperty('--uploaded-preview', file.kind === 'image' && file.preview ? `url("${file.preview}")` : 'none')
  }, [file?.name, file?.meta, file?.kind, file?.preview])
  useEffect(() => {
    document.querySelectorAll('.real-material-gallery .material-thumb:not(.upload-placeholder)').forEach((thumbnail, index) => {
      thumbnail.dataset.name = materialAliases[index] || ''
    })
  }, [materials, materialAliases])
  useEffect(() => {
    try { localStorage.setItem('wujie-prototype-v2', JSON.stringify(persistentData(data))) }
    catch { /* 原型存储空间不足时保留当前内存状态，避免页面崩溃 */ }
  }, [data])
  useEffect(() => { setTask(session.result ? 'success' : 'idle') }, [session.id])
  useEffect(() => { setMaterialFilter('全部') }, [materialKey])
  useEffect(() => { if (materialFilter !== '全部' && !materialTypes.includes(materialFilter)) setMaterialFilter('全部') }, [activeModel, materialFilter])
  useEffect(() => { document.documentElement.style.setProperty('--duration-progress', `${((duration - 4) / 11) * 100}%`) }, [duration])
  useEffect(() => {
    composerScrollTop.current = window.scrollY
    const handleWorkspaceScroll = () => {
      const nextScrollTop = window.scrollY
      const scrollingUp = nextScrollTop < composerScrollTop.current - 2
      const reachedBottom = window.innerHeight + nextScrollTop >= document.documentElement.scrollHeight - 2

      if (reachedBottom) setComposerState(composerExpandedState.current)
      else if (scrollingUp) setComposerState('compact')

      composerScrollTop.current = nextScrollTop
    }
    window.addEventListener('scroll', handleWorkspaceScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleWorkspaceScroll)
  }, [])
  useEffect(() => {
    const composer = document.querySelector('.composer')
    if (!composer) return
    const handleComposerWheel = event => {
      event.stopPropagation()
      const target = event.target instanceof Element ? event.target : null
      const internalScroller = target?.closest('.prompt-editor, .material-thumbnails, .control-dropdown, .mention-material-list, .nano-params, .gpt-image-params, .video-params')
      if (!internalScroller) event.preventDefault()
    }
    composer.addEventListener('wheel', handleComposerWheel, { passive: false })
    return () => composer.removeEventListener('wheel', handleComposerWheel)
  }, [])
  useEffect(() => {
    const composer = document.querySelector('.composer')
    const workspace = document.querySelector('.app > main')
    if (!composer || !workspace) return
    const updateComposerClearance = () => {
      const height = Math.ceil(composer.getBoundingClientRect().height)
      workspace.style.setProperty('--composer-clearance', `${height + 72}px`)
    }
    updateComposerClearance()
    const observer = new ResizeObserver(updateComposerClearance)
    observer.observe(composer)
    window.addEventListener('resize', updateComposerClearance)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updateComposerClearance)
      workspace.style.removeProperty('--composer-clearance')
    }
  }, [])
  useEffect(() => {
    if (!videoParamOpen) return
    const output = document.querySelector('.duration-control output')
    if (!output) return
    output.contentEditable = 'true'
    output.setAttribute('role', 'spinbutton')
    output.setAttribute('aria-label', '视频时长（秒）')
    output.setAttribute('aria-valuemin', '4')
    output.setAttribute('aria-valuemax', '15')
    const update = value => setDuration(Math.min(15, Math.max(4, Number(value) || 4)))
    const onInput = () => update(output.firstChild?.textContent)
    const onKeyDown = event => {
      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        event.preventDefault()
        update(duration + (event.key === 'ArrowUp' ? 1 : -1))
      }
      if (event.key === 'Enter') { event.preventDefault(); output.blur() }
    }
    const onBlur = () => update(output.firstChild?.textContent)
    output.addEventListener('input', onInput)
    output.addEventListener('keydown', onKeyDown)
    output.addEventListener('blur', onBlur)
    return () => {
      output.removeEventListener('input', onInput)
      output.removeEventListener('keydown', onKeyDown)
      output.removeEventListener('blur', onBlur)
    }
  }, [videoParamOpen, duration])
  useEffect(() => () => clearTimeout(timer.current), [])
  useEffect(() => { if (!toast) return; const id = setTimeout(() => setToast(''), 2200); return () => clearTimeout(id) }, [toast])
  useEffect(() => { if (!notice) return; const id = setTimeout(() => setNotice(''), 4200); return () => clearTimeout(id) }, [notice])
  useEffect(() => { if (!uploadSuccess) return; const id = setTimeout(() => setUploadSuccess(''), 2200); return () => clearTimeout(id) }, [uploadSuccess])
  useEffect(() => {
    const onKeyDown = event => {
      const command = event.ctrlKey || event.metaKey
      if (command && event.key.toLowerCase() === 'n') { event.preventDefault(); createSession(); return }
      if (command && event.key.toLowerCase() === 'k') { event.preventDefault(); document.querySelector('[aria-label="搜索对话"]')?.focus(); return }
      if (command && event.key === 'Enter') {
        const livePrompt = document.querySelector('[aria-label="创作提示词"]')?.textContent || promptBuffer.current || prompt
        if (livePrompt.trim()) { event.preventDefault(); submit() }
        return
      }
      if (event.altKey && /^Digit[1-3]$/.test(event.code)) { event.preventDefault(); switchMode(CREATION_MODES[Number(event.code.at(-1)) - 1]); return }
      if (event.key === 'Escape') {
        setDialog(null); setShortcutOpen(false); setAssetPickerOpen(false); setNotice(''); setControlMenu(null)
        setMaterialMention(null); setUploadMenu(false); setImageParamOpen(false); setVideoParamOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })
  useEffect(() => {
    const isFileDrag = event => {
      const types = Array.from(event.dataTransfer?.types || [])
      const items = Array.from(event.dataTransfer?.items || [])
      return types.includes('Files') || items.some(item => item.kind === 'file') || Boolean(event.dataTransfer?.files?.length)
    }
    const handleFileDrag = event => {
      if (!isFileDrag(event)) return
      event.preventDefault()
      event.stopPropagation()
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'
      const composer = document.querySelector('.composer')
      const target = event.target instanceof Node ? event.target : null
      const isInsideComposer = Boolean(composer && target && composer.contains(target))
      if (event.type === 'dragenter' || event.type === 'dragover') {
        composer?.classList.toggle('is-dragging', isInsideComposer)
        return
      }
      composer?.classList.remove('is-dragging')
      if (event.type === 'drop' && isInsideComposer) {
        Array.from(event.dataTransfer?.files || []).forEach(uploadFile)
      }
    }
    const clearDragState = () => document.querySelector('.composer')?.classList.remove('is-dragging')
    window.addEventListener('dragenter', handleFileDrag, true)
    window.addEventListener('dragover', handleFileDrag, true)
    window.addEventListener('drop', handleFileDrag, true)
    window.addEventListener('dragend', clearDragState, true)
    return () => {
      window.removeEventListener('dragenter', handleFileDrag, true)
      window.removeEventListener('dragover', handleFileDrag, true)
      window.removeEventListener('drop', handleFileDrag, true)
      window.removeEventListener('dragend', clearDragState, true)
    }
  }, [session.id, mode, activeModel, materials])
  useEffect(() => {
    const composer = document.querySelector('.composer')
    if (!composer) return
    const onPaste = event => {
      const pastedFiles = Array.from(event.clipboardData?.files || [])
      if (!pastedFiles.length) return
      event.preventDefault()
      pastedFiles.forEach(uploadFile)
    }
    composer.addEventListener('paste', onPaste)
    return () => {
      composer.removeEventListener('paste', onPaste)
    }
  }, [session.id, mode])
  useEffect(() => {
    if (materialMention === null) return
    const editor = document.querySelector('[aria-label="创作提示词"]')
    if (editor) positionMaterialMention(editor)
  }, [materialMention, session.id, mode])
  useEffect(() => {
    setMaterialMentionIndex(0)
  }, [materialMention, materialKey])
  useEffect(() => {
    document.querySelector('.mention-material-list .keyboard-active')?.scrollIntoView({ block: 'nearest' })
  }, [materialMentionIndex])
  useEffect(() => {
    const editor = document.querySelector('[aria-label="创作提示词"]')
    if (!editor) return
    promptBuffer.current = editor.textContent || prompt
    const syncVisualState = () => {
      let liveValue = editor.textContent || ''
      if (liveValue.length > 8000) {
        liveValue = liveValue.slice(0, 8000)
        editor.textContent = liveValue
        setEditorCaret(editor, liveValue.length)
      }
      promptBuffer.current = liveValue
      promptCaret.current = Math.min(editorCaretOffset(editor), liveValue.length)
      const mentionMatch = liveValue.slice(0, promptCaret.current).match(/@([^@\s]*)$/)
      if (mentionMatch) {
        mentionSelection.current = {
          text: liveValue,
          start: promptCaret.current,
          end: promptCaret.current
        }
      }
      const counter = editor.closest('.compose')?.querySelector('.prompt-meta .counter')
      if (counter) counter.textContent = `${liveValue.length}/8000`
      const submitButton = editor.closest('.compose')?.querySelector('button.submit')
      if (submitButton) submitButton.disabled = !liveValue.trim() || task === 'loading' || uploading.length > 0 || (config.needsVideo && file?.kind !== 'video')
    }
    const commitBuffer = () => {
      const liveValue = promptBuffer.current
      if (liveValue !== prompt) updatePrompt(liveValue)
    }
    const syncCaret = () => {
      const offsets = editorSelectionOffsets(editor)
      promptCaret.current = offsets.start
      const liveText = editor.textContent || promptBuffer.current || prompt
      const savedOffset = referenceSelection.current?.text === liveText ? referenceSelection.current.start : offsets.start
      if (!referenceSelection.current || referenceSelection.current.text !== liveText || offsets.start > 0) {
        referenceSelection.current = { text: liveText, ...offsets }
      }
      if (editor.textContent !== prompt) {
        updatePrompt(editor.textContent)
        requestAnimationFrame(() => {
          const nextEditor = document.querySelector('[aria-label="创作提示词"]')
          if (nextEditor) setEditorCaret(nextEditor, savedOffset)
        })
      }
    }
    const syncScroll = () => {
      if (editor.scrollTop > 0 || promptScroll.current.top === 0) {
        promptScroll.current = { top: editor.scrollTop, left: editor.scrollLeft }
      }
    }
    editor.addEventListener('input', syncVisualState)
    editor.addEventListener('blur', commitBuffer)
    editor.addEventListener('click', syncCaret)
    editor.addEventListener('scroll', syncScroll)
    syncVisualState()
    return () => {
      editor.removeEventListener('input', syncVisualState)
      editor.removeEventListener('blur', commitBuffer)
      editor.removeEventListener('click', syncCaret)
      editor.removeEventListener('scroll', syncScroll)
    }
  }, [session.id, mode, prompt, task, uploading.length, file?.kind])
  useEffect(() => {
    const editor = document.querySelector('[aria-label="创作提示词"]')
    if (!editor || promptScroll.current.top <= 0) return
    const restore = () => {
      editor.scrollTop = promptScroll.current.top
      editor.scrollLeft = promptScroll.current.left
    }
    restore()
    const frame = requestAnimationFrame(restore)
    return () => cancelAnimationFrame(frame)
  }, [prompt, session.id, mode])
  useEffect(() => {
    const rememberSelection = () => {
      const editor = document.querySelector('[aria-label="创作提示词"]')
      const selection = window.getSelection()
      if (editor && selection?.anchorNode && editor.contains(selection.anchorNode)) {
        const offsets = editorSelectionOffsets(editor)
        promptCaret.current = offsets.start
        if (editor.textContent && (!referenceSelection.current || referenceSelection.current.text !== editor.textContent || offsets.start > 0)) {
          referenceSelection.current = { text: editor.textContent, ...offsets }
        }
      }
    }
    document.addEventListener('selectionchange', rememberSelection)
    return () => document.removeEventListener('selectionchange', rememberSelection)
  }, [session.id, mode])

  const updateSession = patch => setData(old => ({ ...old, sessions: old.sessions.map(x => x.id === old.activeId ? { ...x, ...patch } : x) }))
  const updatePrompt = value => {
    updateSession({ drafts: { ...session.drafts, [mode]: value } })
    const beforeCaret = value.slice(0, promptCaret.current)
    const mention = beforeCaret.match(/@([^@\s]*)$/)
    setMaterialMention(mention ? mention[1] : null)
  }

  const commitPromptSync = value => updatePrompt(value)

  function restoreChatSnapshot(turn) {
    const snapshot = turn || session.editContext || {}
    const restoredPrompt = turn?.prompt || session.drafts.chat || ''
    const restoredMaterials = (snapshot.materials || []).map(item => ({ ...item }))
    const restoredKey = `${session.id}:chat`
    setSelectedSkills(old => ({ ...old, chat: snapshot.skill || '' }))
    setSelectedModels(old => ({ ...old, chat: snapshot.model || MODES.chat.model }))
    uploadedFilesRef.current[restoredKey] = restoredMaterials
    setUploadedFiles(old => ({ ...old, [restoredKey]: restoredMaterials }))
    updateSession({
      mode: 'chat',
      files: { ...session.files, chat: restoredMaterials[0] || null },
      drafts: { ...session.drafts, chat: restoredPrompt }
    })
    setMaterialFilter('全部')
    setControlMenu(null)
    setToast('已恢复原始输入、素材、技能和模型')
    requestAnimationFrame(() => {
      const editor = document.querySelector('[aria-label="创作提示词"]')
      editor?.focus()
      if (editor) setEditorCaret(editor, restoredPrompt.length)
      promptCaret.current = restoredPrompt.length
    })
  }

  function restoreCreativeSnapshot(turn) {
    const restoredMode = turn.mode || 'image'
    const restoredPrompt = turn.prompt || ''
    const restoredMaterials = (turn.materials || []).map(item => ({ ...item }))
    const restoredKey = `${session.id}:${restoredMode}`
    setSelectedSkills(old => ({ ...old, [restoredMode]: turn.skill || '' }))
    setSelectedModels(old => ({ ...old, [restoredMode]: turn.model || MODES[restoredMode].model }))
    if (restoredMode === 'image') {
      if (turn.model === 'gemini-3.1-flash-image-preview') {
        setImageRatio(turn.ratio || '1:1')
        setImageResolution(turn.resolution || '1K')
      } else {
        setSize(turn.resolution || turn.ratio || '1024×1024')
      }
    }
    if (restoredMode === 'video') {
      setVideoRatio(turn.ratio || '9:16')
      setVideoResolution(turn.resolution || '480p')
      if (turn.duration) setDuration(turn.duration)
    }
    uploadedFilesRef.current[restoredKey] = restoredMaterials
    setUploadedFiles(old => ({ ...old, [restoredKey]: restoredMaterials }))
    setData(old => ({ ...old, sessions: old.sessions.map(item => item.id === old.activeId ? {
      ...item, mode: restoredMode,
      files: { ...item.files, [restoredMode]: restoredMaterials[0] || null },
      drafts: { ...item.drafts, [restoredMode]: restoredPrompt }
    } : item) }))
    setMaterialFilter('全部'); setControlMenu(null); setTask('success')
    setToast('已恢复提示词、素材、技能、模型和参数')
    requestAnimationFrame(() => {
      const editor = document.querySelector('[aria-label="创作提示词"]')
      editor?.focus()
      if (editor) setEditorCaret(editor, restoredPrompt.length)
      promptCaret.current = restoredPrompt.length
    })
  }

  function positionMaterialMention(textarea) {
    if (!textarea) return
    const composer = textarea.closest('.composer')
    if (!composer) return
    const style = getComputedStyle(textarea)
    const mirror = document.createElement('div')
    const properties = ['boxSizing', 'width', 'height', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth', 'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'letterSpacing', 'lineHeight', 'textTransform', 'textAlign', 'whiteSpace', 'wordBreak', 'overflowWrap', 'tabSize']
    Object.assign(mirror.style, { position: 'fixed', visibility: 'hidden', overflow: 'hidden', top: `${textarea.getBoundingClientRect().top}px`, left: `${textarea.getBoundingClientRect().left}px`, whiteSpace: 'pre-wrap', wordWrap: 'break-word' })
    properties.forEach(property => { mirror.style[property] = style[property] })
    mirror.textContent = (textarea.textContent || '').slice(0, editorCaretOffset(textarea))
    const marker = document.createElement('span')
    marker.textContent = '\u200b'
    mirror.appendChild(marker)
    document.body.appendChild(mirror)
    const markerRect = marker.getBoundingClientRect()
    const composerRect = composer.getBoundingClientRect()
    composer.style.setProperty('--mention-left', `${Math.max(12, markerRect.left - composerRect.left)}px`)
    composer.style.setProperty('--mention-bottom', `${Math.max(76, composerRect.bottom - markerRect.top + 7)}px`)
    mirror.remove()
  }

  function selectMaterialMention(alias, savedSelection = null) {
    const editor = document.querySelector('[aria-label="创作提示词"]')
    if (!editor) return
    const savedScrollTop = Math.max(editor.scrollTop, promptScroll.current.top, mentionScroll.current?.top || 0)
    const savedScrollLeft = Math.max(editor.scrollLeft, promptScroll.current.left, mentionScroll.current?.left || 0)
    mentionScroll.current = null
    const effectiveSelection = savedSelection || (materialMention !== null ? mentionSelection.current : null)
    const livePrompt = (effectiveSelection?.text ?? editor.textContent ?? promptBuffer.current ?? prompt).slice(0, 8000)
    const selection = window.getSelection()
    const selectionInside = Boolean(selection?.anchorNode && editor.contains(selection.anchorNode))
    const offsets = effectiveSelection
      ? { start: effectiveSelection.start, end: effectiveSelection.end }
      : selectionInside ? editorSelectionOffsets(editor) : { start: promptCaret.current, end: promptCaret.current }
    const caret = Math.max(0, Math.min(livePrompt.length, offsets.start))
    const selectionEnd = Math.max(caret, Math.min(livePrompt.length, offsets.end))
    const beforeCaret = livePrompt.slice(0, caret)
    // 吞掉当前触发串以及重复的 @，确保键盘回车和鼠标选择都只插入一个引用前缀。
    const mention = beforeCaret.match(/@+[^@\s]*$/)
    const start = mention ? caret - mention[0].length : caret
    const inserted = `@${alias} `
    const prefix = livePrompt.slice(0, start).replace(/@+$/, '')
    const suffix = livePrompt.slice(selectionEnd).replace(/^@+/, '')
    const nextPrompt = prefix + inserted + suffix
    const nextCaret = prefix.length + inserted.length
    promptCaret.current = nextCaret
    promptBuffer.current = nextPrompt
    commitPromptSync(nextPrompt)
    setMaterialMention(null)
    mentionSelection.current = null
    requestAnimationFrame(() => {
      const nextEditor = document.querySelector('[aria-label="创作提示词"]')
      nextEditor?.focus({ preventScroll: true })
      if (nextEditor) {
        setEditorCaret(nextEditor, nextCaret)
        nextEditor.scrollTop = savedScrollTop
        nextEditor.scrollLeft = savedScrollLeft
        requestAnimationFrame(() => {
          nextEditor.scrollTop = savedScrollTop
          nextEditor.scrollLeft = savedScrollLeft
        })
        setTimeout(() => {
          const mountedEditor = document.querySelector('[aria-label="创作提示词"]')
          if (mountedEditor) {
            mountedEditor.scrollTop = savedScrollTop
            mountedEditor.scrollLeft = savedScrollLeft
          }
        }, 0)
      }
      promptCaret.current = nextCaret
    })
  }

  function showMaterialPreview(event, item) {
    const composer = event.currentTarget.closest('.composer')
    if (!composer) return
    const editor = document.querySelector('[aria-label="创作提示词"]')
    const selection = window.getSelection()
    const isThumbnail = event.currentTarget.classList.contains('material-thumb')
    if (editor && selection?.anchorNode && editor.contains(selection.anchorNode)) {
      const offsets = editorSelectionOffsets(editor)
      promptCaret.current = offsets.start
      referenceSelection.current = { text: editor.textContent || promptBuffer.current || prompt, ...offsets }
    }
    const thumbnail = event.currentTarget.getBoundingClientRect()
    const width = 312
    const height = 370
    const gap = 9
    const edge = 10
    const spaceAbove = thumbnail.top - edge
    const spaceBelow = window.innerHeight - thumbnail.bottom - edge
    const placeBelow = isThumbnail
      ? !(spaceAbove >= height + gap || spaceAbove >= spaceBelow)
      : spaceBelow >= height + gap || (spaceAbove < height + gap && spaceBelow >= spaceAbove)
    const preferredLeft = isThumbnail ? thumbnail.left : thumbnail.left + thumbnail.width / 2 - width / 2
    const originalIndex = materials.indexOf(item)
    setMaterialPreview({
      item,
      alias: materialAliases[originalIndex] || '素材',
      left: Math.max(edge, Math.min(window.innerWidth - width - edge, preferredLeft)),
      top: placeBelow ? thumbnail.bottom + gap : undefined,
      bottom: placeBelow ? undefined : window.innerHeight - thumbnail.top + gap,
      placement: placeBelow ? 'below' : 'above'
    })
  }

  function referenceMaterial(item) {
    const alias = materialAliases[materials.indexOf(item)]
    const savedSelection = referenceSelection.current || { text: promptBuffer.current || prompt, start: promptCaret.current, end: promptCaret.current }
    referenceSelection.current = null
    if (alias) selectMaterialMention(alias, savedSelection)
  }

  function renderPromptContent() {
    if (!materialAliases.length) return prompt
    const aliases = [...materialAliases].sort((a, b) => b.length - a.length)
    const escaped = aliases.map(alias => alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    const pattern = new RegExp(`(@(?:${escaped.join('|')}))`, 'g')
    return prompt.split(pattern).map((part, index) => {
      const alias = part.startsWith('@') ? part.slice(1) : ''
      const materialIndex = materialAliases.indexOf(alias)
      if (materialIndex < 0) return part
      const item = materials[materialIndex]
      return <span key={`${part}-${index}`} className="prompt-reference" contentEditable={false} onMouseEnter={event => showMaterialPreview(event, item)} onMouseLeave={() => setMaterialPreview(null)}>{part}</span>
    })
  }

  function handlePromptDelete(event) {
    promptScroll.current = { top: event.currentTarget.scrollTop, left: event.currentTarget.scrollLeft }
    if (materialMention !== null && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault()
      if (!materialMentionOptions.length) return
      const direction = event.key === 'ArrowDown' ? 1 : -1
      setMaterialMentionIndex(index => (index + direction + materialMentionOptions.length) % materialMentionOptions.length)
      return
    }
    if (materialMention !== null && event.key === 'Enter') {
      event.preventDefault()
      const option = materialMentionOptions[materialMentionIndex]
      if (option) selectMaterialMention(option.alias)
      return
    }
    if (materialMention !== null && event.key === 'Escape') {
      event.preventDefault()
      setMaterialMention(null)
      setControlMenu(null)
      return
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      setControlMenu(null); setMaterialMention(null); setUploadMenu(false); setImageParamOpen(false); setVideoParamOpen(false)
      return
    }
    // Open the resource picker from the physical `@` key immediately. This is
    // independent of beforeinput so it also works with IMEs and browsers that
    // remount the controlled contenteditable between keydown and input.
    if (event.key === '@') {
      mentionScroll.current = { top: event.currentTarget.scrollTop, left: event.currentTarget.scrollLeft }
      const offsets = editorSelectionOffsets(event.currentTarget)
      mentionSelection.current = { text: event.currentTarget.textContent || promptBuffer.current || prompt, ...offsets }
      setControlMenu(null)
      setMaterialMentionIndex(0)
      setMaterialMention('')
      return
    }
    if (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey) {
      setMaterialMention(null)
      setControlMenu('skill')
      setSkillSearch('')
    }
    // Backspace/Delete 使用浏览器原生 contenteditable 行为，避免同步重挂载吞掉首次按键。
  }

  function replacePromptSelection(editor, insertedText) {
    const { start, end } = editorSelectionOffsets(editor)
    const available = Math.max(0, 8000 - (prompt.length - (end - start)))
    const safeText = insertedText.slice(0, available)
    const nextPrompt = prompt.slice(0, start) + safeText + prompt.slice(end)
    const nextCaret = start + safeText.length
    promptCaret.current = nextCaret
    commitPromptSync(nextPrompt)
    // The editor is intentionally remounted after every controlled edit. Re-derive
    // the mention after that synchronous remount so an `@` typed at the caret
    // cannot be lost with the old editor's event lifecycle.
    const mention = nextPrompt.slice(0, nextCaret).match(/@([^@\s]*)$/)
    setMaterialMention(mention ? mention[1] : null)
    const nextEditor = document.querySelector('[aria-label="创作提示词"]')
    nextEditor?.focus()
    if (nextEditor) setEditorCaret(nextEditor, nextCaret)
    // focus fires before the restored DOM selection is applied; keep the
    // model-side caret aligned with the selection we just restored.
    promptCaret.current = nextCaret
  }

  function handlePromptCompositionEnd(event) {
    promptComposing.current = false
    const editor = event.currentTarget
    const nextPrompt = editor.textContent.slice(0, 8000)
    const nextCaret = Math.min(editorCaretOffset(editor), nextPrompt.length)
    promptCaret.current = nextCaret
    promptBuffer.current = nextPrompt
  }

  function handlePromptBeforeInput() {
    // 保留事件入口但不拦截输入，让浏览器直接完成文本插入与删除。
  }

  function handlePromptInput(event) {
    if (promptComposing.current) return
    const editor = event.currentTarget
    let nextPrompt = editor.textContent || ''
    if (nextPrompt.length > 8000) {
      nextPrompt = nextPrompt.slice(0, 8000)
      editor.textContent = nextPrompt
      setEditorCaret(editor, nextPrompt.length)
    }
    promptCaret.current = Math.min(editorCaretOffset(editor), nextPrompt.length)
    updatePrompt(nextPrompt)
  }

  function rememberPromptCaret(event) {
    // A controlled edit remounts the contenteditable. Ignore the trailing
    // keyup/focus event from the detached previous node; otherwise it rewinds
    // the saved caret and leaves the typed `@` behind when a resource is chosen.
    if (!event.currentTarget.isConnected || event.currentTarget !== document.querySelector('[aria-label="创作提示词"]')) return
    promptCaret.current = editorCaretOffset(event.currentTarget)
    if (materialMention !== null) positionMaterialMention(event.currentTarget)
  }

  function handlePromptPaste(event) {
    if (event.clipboardData?.files?.length) return
    const text = event.clipboardData?.getData('text/plain')
    if (!text) return
    // 文本粘贴使用浏览器原生插入，随后由 onInput 一次同步，避免重复改写 DOM。
  }

  function switchMode(next) {
    updateSession({ mode: next })
    setNotice(''); setMaterialMention(null); setControlMenu(null)
  }

  function addMaterial() {
    const item = mode === 'analyze'
      ? { name: '品牌短片_v3.mp4', kind: 'video', meta: '视频 · 18.6 MB · 已解析' }
      : { name: mode === 'video' ? '产品正面.png' : '气泡水参考图.jpg', kind: 'image', meta: '图片 · 2.4 MB · 已上传' }
    updateSession({ files: { ...session.files, [mode]: item } })
    setNotice(''); setUploadSuccess('素材上传完成（模拟）')
  }

  async function uploadFile(selectedFile) {
    const startedUploadEpoch = uploadEpoch.current
    const rawExtension = fileExtension(selectedFile.name)
    const extensionType = EXTENSION_MATERIAL_TYPE[rawExtension]
    const kind = extensionType === '视频' ? 'video' : extensionType === '音频' ? 'audio' : extensionType === '图片' ? 'image' : selectedFile.type.startsWith('video/') ? 'video' : selectedFile.type.startsWith('audio/') ? 'audio' : selectedFile.type.startsWith('image/') ? 'image' : 'document'
    const labels = { video: '视频', audio: '音频', image: '图片', document: '文档' }
    const typeLabel = labels[kind]
    const constraint = config.limits.find(rule => rule.startsWith(typeLabel))
    if (!constraint) {
      setNotice(`${activeModel} 不支持上传${typeLabel}，当前模型允许类型：${materialTypes.join('、')}`)
      return
    }
    const maximum = Number(constraint.split('/')[1])
    const currentCount = materials.filter(item => item.kind === kind).length
    if (currentCount >= maximum) {
      setNotice(`${typeLabel}最多上传 ${maximum} 个，请先移除已有素材`)
      return
    }
    if (mode === 'video' && materials.length + uploading.length >= 12) {
      setNotice('全部参考素材合计不超过 12 个文件，请先移除已有素材')
      return
    }
    const extension = `.${rawExtension}`
    const acceptedFormats = MATERIAL_ACCEPT[typeLabel]?.split(',') || []
    const formatAllowed = modelUploadExtensions
      ? modelUploadExtensions.includes(rawExtension) && materialTypes.includes(EXTENSION_MATERIAL_TYPE[rawExtension] || '文档')
      : acceptedFormats.some(format => format.startsWith('.') ? extension === format : selectedFile.type === format)
    if (!formatAllowed) {
      const supported = modelUploadExtensions ? modelUploadExtensions.filter(item => materialTypes.includes(EXTENSION_MATERIAL_TYPE[item] || '文档')).join('、') : acceptedFormats.join('、')
      setNotice(`${selectedFile.name} 格式不支持；${activeModel} 当前支持：${supported}`)
      return
    }
    if (mode === 'video' && kind === 'video' && !['mp4', 'mov'].includes(rawExtension)) {
      setNotice(`${selectedFile.name} 格式不支持；Seedance 2.0 参考视频仅支持 mp4、mov`)
      return
    }
    const sizeLimits = MODEL_FILE_SIZE_LIMITS[activeModel]
    const perFileLimit = kind === 'video'
      ? sizeLimits?.video || VIDEO_FILE_SIZE_LIMIT
      : rawExtension === 'pdf' && sizeLimits?.pdf
        ? sizeLimits.pdf
        : kind === 'image' && sizeLimits?.image
          ? sizeLimits.image
          : sizeLimits?.file
    if (perFileLimit && selectedFile.size > perFileLimit) {
      setNotice(`${selectedFile.name} 超过 ${activeModel} 的${rawExtension === 'pdf' ? ' PDF' : kind === 'image' ? '图片' : kind === 'video' ? '视频文件' : '单文件'}上限 ${formatFileSize(perFileLimit)}`)
      return
    }
    const currentTotal = materials.reduce((sum, item) => sum + (item.sizeBytes || 0), 0)
    if (sizeLimits?.total && currentTotal + selectedFile.size > sizeLimits.total) {
      setNotice(`附件总大小不能超过 ${formatFileSize(sizeLimits.total)}，请移除部分素材后重试`)
      return
    }
    let videoMetadata = null
    if (mode === 'video' && kind === 'video') {
      try { videoMetadata = await inspectVideoFile(selectedFile) }
      catch { setNotice(`${selectedFile.name} 无法解析，请确认文件未加密且使用 H.264 恒定帧率`); return }
      const { duration, width, height } = videoMetadata
      if (!Number.isFinite(duration) || duration < 2 || duration > 15) { setNotice(`${selectedFile.name} 时长须为 2–15 秒`); return }
      const totalDuration = materials.filter(item => item.kind === 'video').reduce((sum, item) => sum + (item.duration || 0), 0)
      if (totalDuration + duration > 15) { setNotice('全能参考视频总时长不能超过 15 秒'); return }
      const ratio = width / height
      const pixels = width * height
      if (width < 300 || width > 6000 || height < 300 || height > 6000) { setNotice(`${selectedFile.name} 宽高须在 300–6000px`); return }
      if (ratio < .4 || ratio > 2.5) { setNotice(`${selectedFile.name} 宽高比须在 0.4–2.5`); return }
      if (pixels < 409600 || pixels > 8295044) { setNotice(`${selectedFile.name} 总像素须在 409600–8295044`); return }
    }
    const startedAt = Date.now()
    const uploadId = `${Date.now()}-${selectedFile.name}-${Math.random()}`
    if (startedUploadEpoch !== uploadEpoch.current) return
    setUploading(old => [...old, { id: uploadId, name: selectedFile.name, kind }])
    const size = formatFileSize(selectedFile.size)
    const save = preview => {
      const finishUpload = () => {
        if (startedUploadEpoch !== uploadEpoch.current) {
          if (preview?.startsWith?.('blob:')) URL.revokeObjectURL(preview)
          setUploading(old => old.filter(upload => upload.id !== uploadId))
          return
        }
        const item = { id: uploadId, name: selectedFile.name, kind, sizeBytes: selectedFile.size, extension: rawExtension, meta: `${labels[kind]} · ${size} · 已上传`, preview, ...videoMetadata }
        const currentMaterials = uploadedFilesRef.current[materialKey] || materials
        if (currentMaterials.filter(existing => existing.kind === kind).length >= maximum) {
          setUploading(old => old.filter(upload => upload.id !== uploadId))
          setNotice(`${typeLabel}最多上传 ${maximum} 个，超出文件未添加`)
          return
        }
        if (mode === 'video' && currentMaterials.length >= 12) {
          setUploading(old => old.filter(upload => upload.id !== uploadId))
          setNotice('全部参考素材合计不超过 12 个文件，超出文件未添加')
          return
        }
        if (mode === 'video' && kind === 'video' && currentMaterials.filter(item => item.kind === 'video').reduce((sum, item) => sum + (item.duration || 0), 0) + (videoMetadata?.duration || 0) > 15) {
          setUploading(old => old.filter(upload => upload.id !== uploadId))
          setNotice('全能参考视频总时长不能超过 15 秒')
          return
        }
        const nextMaterials = [...currentMaterials, item]
        uploadedFilesRef.current[materialKey] = nextMaterials
        setUploadedFiles(old => ({ ...old, [materialKey]: nextMaterials }))
        updateSession({ files: { ...session.files, [mode]: persistentFile(nextMaterials[0]) } })
        setUploading(old => old.filter(upload => upload.id !== uploadId))
        setUploadSuccess(`已上传：${selectedFile.name}`)
      }
      setTimeout(finishUpload, Math.max(0, 450 - (Date.now() - startedAt)))
    }
    if (kind === 'image') {
      const reader = new FileReader()
      reader.onload = () => save(reader.result)
      reader.onerror = () => { setUploading(old => old.filter(upload => upload.id !== uploadId)); setNotice('文件读取失败，请重新选择') }
      reader.readAsDataURL(selectedFile)
    } else {
      save(URL.createObjectURL(selectedFile))
    }
  }

  function uploadLocalFile(event) {
    const selectedFiles = Array.from(event.target.files || [])
    if (!selectedFiles.length) return
    selectedFiles.forEach(uploadFile)
    event.target.value = ''
  }

  function AttachmentSourceMenu({ position = null } = {}) {
    const menu = <div className={`upload-source-menu${position ? ' portal append-menu' : ''}`} style={position || undefined}>
      <button onClick={() => { localFileInput.current?.click(); setUploadMenu(false) }}><ArrowUp/><span><b>本地上传</b><small>从电脑选择素材</small></span></button>
      <button onClick={() => { setAssetPickerOpen(true); setUploadMenu(false) }}><Diamond/><span><b>从资产库选择</b><small>个人与团队产品素材</small></span></button>
    </div>
    return position ? createPortal(menu, document.body) : menu
  }

  function removeUploadedMaterial(target) {
    const currentMaterials = uploadedFilesRef.current[materialKey] || materials
    const targetIndex = currentMaterials.findIndex(item => target.id ? item.id === target.id : item === target)
    const nextMaterials = currentMaterials.filter(item => target.id ? item.id !== target.id : item !== target)
    const oldAliases = aliasesForMaterials(currentMaterials)
    const nextAliases = aliasesForMaterials(nextMaterials)
    let nextPrompt = prompt
    oldAliases.forEach((alias, index) => {
      const placeholder = index === targetIndex ? '' : `\uE000${index}\uE001`
      nextPrompt = nextPrompt.replace(new RegExp(`@${escapeRegExp(alias)}`, 'g'), placeholder)
    })
    currentMaterials.forEach((item, index) => {
      if (index === targetIndex) return
      const nextIndex = nextMaterials.findIndex(nextItem => item.id ? nextItem.id === item.id : nextItem === item)
      nextPrompt = nextPrompt.replaceAll(`\uE000${index}\uE001`, `@${nextAliases[nextIndex]}`)
    })
    nextPrompt = nextPrompt.replace(/[ \t]{2,}/g, ' ').trimStart()
    if (target.preview?.startsWith?.('blob:')) URL.revokeObjectURL(target.preview)
    uploadedFilesRef.current[materialKey] = nextMaterials
    setUploadedFiles(old => ({ ...old, [materialKey]: nextMaterials }))
    updateSession({ files: { ...session.files, [mode]: nextMaterials[0] || null }, drafts: { ...session.drafts, [mode]: nextPrompt } })
  }

  function clearComposer() {
    uploadEpoch.current += 1
    materials.forEach(item => { if (item.preview?.startsWith?.('blob:')) URL.revokeObjectURL(item.preview) })
    uploadedFilesRef.current[materialKey] = []
    setUploadedFiles(old => ({ ...old, [materialKey]: [] }))
    setUploading([])
    setMaterialFilter('全部')
    setMaterialMention(null)
    setMaterialPreview(null)
    setUploadMenu(false)
    setUploadMenuPosition(null)
    promptBuffer.current = ''
    promptCaret.current = 0
    referenceSelection.current = null
    mentionSelection.current = null
    if (localFileInput.current) localFileInput.current.value = ''
    updateSession({ files: { ...session.files, [mode]: null }, drafts: { ...session.drafts, [mode]: '' } })
  }

  function submit() {
    if (config.needsVideo && file?.kind !== 'video') { setNotice('请先上传至少 1 个视频'); return }
    const rawPrompt = document.querySelector('[aria-label="创作提示词"]')?.textContent || promptBuffer.current || prompt
    if (rawPrompt.length > 8000) { setNotice('提示词最多 8,000 字，请删减后再提交'); return }
    const livePrompt = rawPrompt
    if (!livePrompt.trim()) return
    // Sending commits the composer state. All transient overlays belong to the
    // draft interaction and must close before the message/result is rendered.
    setMaterialPreview(null)
    setUploadMenu(false)
    setControlMenu(null)
    setImageParamOpen(false)
    setVideoParamOpen(false)
    const turnId = `turn-${Date.now()}`
    const sessionId = session.id
    const turn = {
      id: turnId, mode, prompt: livePrompt.trim(),
      skill: selectedSkills[mode] || (mode === 'chat' ? '卖点挖掘' : ''),
      model: activeModel,
      ratio: mode === 'image' ? (activeModel === 'gpt-image-2' ? size : imageRatio) : videoRatio,
      resolution: mode === 'image' ? (activeModel === 'gpt-image-2' ? size : imageResolution) : videoResolution,
      duration: mode === 'video' ? duration : undefined,
      materials: materials.map(item => ({ ...item })),
      status: mode === 'image' || mode === 'video' ? 'queued' : 'pending',
      phase: 0,
      time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })
    }
    setNotice(''); setTask('success')
    setData(old => ({ ...old, sessions: old.sessions.map(item => item.id === old.activeId ? {
      ...item,
      title: item.title === '新对话' ? turn.prompt.slice(0, 14) : item.title,
      time: '刚刚', result: mode, turns: [...chatTurnsFor(item), turn],
      files: { ...item.files, [mode]: null }, drafts: { ...item.drafts, [mode]: '' }
    } : item) }))
    const jumpToConversationBottom = () => {
      const scroller = document.scrollingElement || document.documentElement
      const bottom = Math.max(scroller.scrollHeight, document.body.scrollHeight)
      scroller.scrollTop = bottom
      window.scrollTo({ top: bottom, left: 0, behavior: 'auto' })
    }
    requestAnimationFrame(jumpToConversationBottom)
    window.setTimeout(jumpToConversationBottom, 80)
    uploadedFilesRef.current[materialKey] = []
    setUploadedFiles(old => ({ ...old, [materialKey]: [] }))
    setMaterialFilter('全部'); setMaterialMention(null); promptCaret.current = 0
    promptScroll.current = { top: 0, left: 0 }
    const phaseCount = GENERATION_STATES[mode]?.length || 1
    for (let phase = 1; phase < phaseCount; phase += 1) setTimeout(() => {
      setData(old => ({ ...old, sessions: old.sessions.map(item => item.id === sessionId ? { ...item, turns: (item.turns || []).map(existing => existing.id === turnId ? { ...existing, status: mode === 'chat' ? 'pending' : 'generating', phase } : existing) } : item) }))
    }, phase * (mode === 'video' ? 260 : 240))
    timer.current = setTimeout(() => {
      setData(old => ({ ...old, sessions: old.sessions.map(item => item.id === sessionId ? { ...item, turns: (item.turns || []).map(existing => existing.id === turnId ? { ...existing, status: turn.prompt.includes('失败') ? 'failed' : 'complete' } : existing) } : item) }))
    }, mode === 'chat' ? 1600 : mode === 'image' ? 1900 : 2200)
  }

  function regenerateTurn(sourceTurn) {
    const sessionId = session.id
    const turnId = `turn-${Date.now()}`
    const isChat = (sourceTurn.mode || 'chat') === 'chat'
    const nextTurn = {
      ...sourceTurn,
      id: turnId,
      status: isChat ? 'pending' : 'queued',
      phase: 0,
      variant: isChat ? (sourceTurn.variant === 2 ? 1 : 2) : sourceTurn.variant,
      time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }),
      materials: (sourceTurn.materials || []).map(item => ({ ...item }))
    }
    setData(old => ({ ...old, sessions: old.sessions.map(item => item.id === sessionId ? {
      ...item,
      time: '刚刚',
      turns: [...(item.turns || []), nextTurn]
    } : item) }))
    setToast('已创建新的生成记录')
    requestAnimationFrame(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' }))
    const states = GENERATION_STATES[sourceTurn.mode || 'chat'] || GENERATION_STATES.chat
    const phaseDelay = sourceTurn.mode === 'video' ? 260 : 240
    for (let phase = 1; phase < states.length; phase += 1) window.setTimeout(() => {
      setData(old => ({ ...old, sessions: old.sessions.map(item => item.id === sessionId ? {
        ...item,
        turns: (item.turns || []).map(existing => existing.id === turnId ? { ...existing, status: isChat ? 'pending' : 'generating', phase } : existing)
      } : item) }))
    }, phase * phaseDelay)
    window.setTimeout(() => {
      setData(old => ({ ...old, sessions: old.sessions.map(item => item.id === sessionId ? {
        ...item,
        turns: (item.turns || []).map(existing => existing.id === turnId ? { ...existing, status: 'complete' } : existing)
      } : item) }))
    }, isChat ? 1600 : sourceTurn.mode === 'video' ? 2200 : 1900)
  }

  function deleteTurn(targetTurn) {
    setData(old => ({ ...old, sessions: old.sessions.map(item => item.id === session.id ? {
      ...item,
      turns: (item.turns || []).filter(turn => turn.id !== targetTurn.id)
    } : item) }))
    setToast('整条记录已删除')
  }

  function createSession() {
    const next = { id: Date.now(), title: '新对话', mode: 'chat', time: '刚刚', drafts: emptyDrafts(), files: {}, result: null }
    setData(old => ({ activeId: next.id, sessions: [next, ...old.sessions] }))
    setTask('idle'); setNotice(''); setDrawer(false)
  }

  function selectSession(item) {
    setData(old => ({ ...old, activeId: item.id })); setTask(item.result ? 'success' : 'idle'); setNotice(''); setDrawer(false)
  }

  function renameSession(id, title) {
    const clean = title.trim()
    if (!clean) return false
    setData(old => ({ ...old, sessions: old.sessions.map(x => x.id === id ? { ...x, title: clean } : x) }))
    setDialog(null); setToast('会话已重命名'); return true
  }

  function pinSession(id, pinned = true) {
    setData(old => ({ ...old, sessions: old.sessions.map(x => x.id === id ? { ...x, pinned } : x) }))
    setToast(pinned ? '会话已置顶' : '已取消置顶')
  }

  function deleteSession(id) {
    setData(old => {
      const left = old.sessions.filter(x => x.id !== id)
      if (!left.length) { const next = { id: Date.now(), title: '新对话', mode: 'chat', time: '刚刚', drafts: emptyDrafts(), files: {}, result: null }; return { activeId: next.id, sessions: [next] } }
      return { sessions: left, activeId: old.activeId === id ? left[0].id : old.activeId }
    })
    setDialog(null); setTask('idle'); setToast('会话已删除')
  }

  return <div className="app">
    <aside className="side-nav">
      <div className="side-logo">AI</div>
      <nav aria-label="左侧固定菜单">
        <button className="active" aria-current="page" onClick={() => setToast('当前位于 Agent 工作台')}><Robot/><span>Agent</span></button>
        <button onClick={() => setToast('画布功能建设中')}><SquaresFour/><span>画布</span></button>
        <button onClick={() => setToast('创作功能建设中')}><PencilSimple/><span>创作</span></button>
        <button onClick={() => setToast('技能功能建设中')}><Sparkle/><span>技能</span></button>
        <button onClick={() => setToast('资产功能建设中')}><FolderOpen/><span>资产</span></button>
        <button onClick={() => setToast('创作记录已固定显示')}><ClockCounterClockwise/><span>记录</span></button>
      </nav>
    </aside>
    <header className="top">
      <div className="top-location"><strong>Agent</strong><span>/ 创作工作台</span></div>
      <div className="header-actions"><button className="shortcut-button" aria-label="查看快捷键" onClick={() => setShortcutOpen(true)}><Keyboard/>快捷键</button><button className="points" aria-label="积分余额" onClick={() => setToast('当前可用积分 4,820')}><Diamond weight="fill"/>4,820</button></div>
    </header>
    <HistoryPanel items={shown} search={search} setSearch={setSearch} active={data.activeId} fresh={createSession} openDefault={() => { const target = data.sessions.find(x => x.id === 5) || data.sessions.find(x => x.mode === 'chat'); target ? selectSession(target) : createSession() }} select={selectSession} pin={pinSession} rename={renameSession} remove={item => setDialog({ type: 'delete', item })}/>
    <main>
      <section className="welcome"><div><p>AI 创作工作台</p><h1>今天</h1></div><div className="workspace-filters"><button aria-label="搜索创作内容" onClick={() => setToast('搜索当前创作内容（模拟）')}><MagnifyingGlass/></button><button onClick={() => setToast('时间筛选（模拟）')}>时间<ArrowDown/></button><button onClick={() => setToast('生成模式筛选（模拟）')}>生成模式<ArrowDown/></button><button onClick={() => setToast('操作类型筛选（模拟）')}>操作类型<ArrowDown/></button><button onClick={() => setToast('打开资产（模拟）')}><FolderOpen/>资产</button></div></section>
      {chatTurnsFor(session).length > 0 && <ChatConversation key={session.id} turns={chatTurnsFor(session)} action={setToast} onEditOriginal={restoreChatSnapshot} onEditCreative={restoreCreativeSnapshot} onRegenerate={regenerateTurn} onDelete={deleteTurn} onQuote={() => { updatePrompt(`${prompt}${prompt ? ' ' : ''}引用：AI 回答`); setToast('已添加引用') }}/>} 
      <section className={`composer is-${composerState}`} aria-label="创作输入区">
        {materialPreview && createPortal(<div className={`material-hover-preview portal ${materialPreview.item.kind} ${materialPreview.placement}`} style={{ left: materialPreview.left, top: materialPreview.top, bottom: materialPreview.bottom }} role="tooltip"><div>{materialPreview.item.kind === 'image' && materialPreview.item.preview ? <img src={materialPreview.item.preview} alt={materialPreview.alias}/> : materialPreview.item.kind === 'video' && materialPreview.item.preview ? <video src={materialPreview.item.preview} muted autoPlay loop playsInline aria-label={`${materialPreview.alias}视频预览`}/> : <i><MaterialIcon item={materialPreview.item}/></i>}</div><span>{materialPreview.alias}</span></div>, document.body)}
        {(notice || uploadSuccess || toast) && <div className="composer-notices">
          {notice && <div className="composer-error" role="alert" aria-live="assertive"><WarningCircle weight="fill"/><span>{notice}</span><button aria-label="关闭错误提示" onClick={() => setNotice('')}><X/></button></div>}
          {uploadSuccess && <div className="composer-success" role="status" aria-live="polite"><Check weight="bold"/><span>{uploadSuccess}</span></div>}
          {toast && <div className="toast" role="status"><Check/>{toast}</div>}
        </div>}
        <div className="tabs" role="tablist" aria-label="创作模式">{CREATION_MODES.map(id => { const item = MODES[id]; const Icon = item.icon; return <button role="tab" aria-selected={mode === id} className={mode === id ? 'active' : ''} onClick={() => switchMode(id)} key={id}><Icon/><span>{item.label}</span></button> })}</div>
        {composerState !== 'compact' && <button className="composer-size-toggle" type="button" aria-label={composerState === 'tall' ? '恢复创作面板默认高度' : '增高创作面板'} aria-expanded={composerState === 'tall'} title={composerState === 'tall' ? '恢复默认高度' : '增加 400px 高度'} onClick={() => setComposerState(state => { const nextState = state === 'tall' ? 'default' : 'tall'; composerExpandedState.current = nextState; return nextState })}>{composerState === 'tall' ? <CornersIn/> : <CornersOut/>}</button>}
        <div className="compose">
          <input ref={localFileInput} className="native-file-input" type="file" accept={uploadAccept} multiple onChange={uploadLocalFile}/>
          {uploading.length > 0 && materials.length === 0 && <div className="material-gallery real-material-gallery upload-only-gallery" role="status"><div className="material-gallery-head"><div><button className="active">全部 ({uploading.length})</button><button>上传中</button></div></div><AttachmentStrip>{uploading.map(upload => <div className="material-thumb upload-placeholder" key={upload.id} title={upload.name}><span className="upload-spinner"></span></div>)}</AttachmentStrip></div>}
          {materialMention !== null && <div className="material-mention-menu"><small>可能的内容</small><div className="create-subject-row"><button><Plus/><b>创建主体</b></button><div className="mention-source-menu"><button onClick={() => { setMaterialMention(null); localFileInput.current?.click() }}><ArrowUp/><span>从本地添加</span></button><button onClick={() => setToast('打开资产库选择主体（模拟）')}><Diamond/><span>从资产添加</span></button></div></div><div className="mention-material-list" role="listbox" aria-label="可引用资源">{materialMentionOptions.map((option, optionIndex) => { const item = materials[option.index]; return <button key={option.alias} role="option" aria-selected={optionIndex === materialMentionIndex} className={optionIndex === materialMentionIndex ? 'keyboard-active' : ''} onMouseEnter={() => setMaterialMentionIndex(optionIndex)} onClick={() => selectMaterialMention(option.alias)}><span>{item.kind === 'image' && item.preview ? <img src={item.preview} alt=""/> : item.kind === 'video' && item.preview ? <video src={item.preview} muted preload="metadata" aria-label={`${option.alias}视频封面`}/> : <MaterialIcon item={item}/>}</span><b>{option.alias}</b></button>})}{materials.length === 0 && <p>上传素材后可在这里引用</p>}</div></div>}
          {materials.length > 0 && <div className="material-gallery real-material-gallery"><div className="material-gallery-head"><div role="tablist" aria-label="附件类型"><button role="tab" aria-selected={materialFilter === '全部'} className={materialFilter === '全部' ? 'active' : ''} onClick={() => setMaterialFilter('全部')}>全部 ({materials.length})</button>{materialTypes.map(type => <button role="tab" aria-selected={materialFilter === type} className={materialFilter === type ? 'active' : ''} key={type} onClick={() => setMaterialFilter(type)}>{type} ({materials.filter(item => materialTypeLabel(item) === type).length})</button>)}</div></div><AttachmentStrip>{visibleMaterials.map((item, index) => <div className={'material-thumb ' + item.kind} key={item.id || `${item.name}-${index}`} title={`${item.name}\n${item.meta}`} role="button" tabIndex={0} aria-label={`引用${materialAliases[materials.indexOf(item)] || '素材'}`} onPointerDown={event => { event.preventDefault(); const editor = document.querySelector('[aria-label="创作提示词"]'); const selection = window.getSelection(); const offsets = editor && selection?.anchorNode && editor.contains(selection.anchorNode) ? editorSelectionOffsets(editor) : { start: promptCaret.current, end: promptCaret.current }; referenceSelection.current = { text: editor?.textContent || promptBuffer.current || prompt, ...offsets }; referenceMaterial(item) }} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); referenceMaterial(item) } }} onMouseEnter={event => showMaterialPreview(event, item)} onMouseLeave={() => setMaterialPreview(null)}>{item.kind === 'image' && item.preview ? <img src={item.preview} alt={item.name}/> : item.kind === 'video' && item.preview ? <video src={item.preview} muted preload="metadata" aria-label={`${item.name}视频封面`}/> : <i><MaterialIcon item={item}/></i>}<button type="button" aria-label={`移除 ${item.name}`} onPointerDown={event => event.stopPropagation()} onClick={event => { event.stopPropagation(); setMaterialPreview(null); removeUploadedMaterial(item) }}><X/></button></div>)}{uploading.filter(upload => materialFilter === '全部' || materialTypeLabel(upload) === materialFilter).map(upload => <div className="material-thumb upload-placeholder" role="status" key={upload.id} title={upload.name}><span className="upload-spinner"></span></div>)}<div className="material-entry material-add-entry"><button type="button" className="material-add-more" aria-label="继续添加素材" aria-expanded={uploadMenu} onClick={event => { const rect = event.currentTarget.getBoundingClientRect(); setUploadMenuPosition({ left: rect.left, top: rect.top - 10 }); setUploadMenu(!uploadMenu) }}><Plus/></button></div></AttachmentStrip>{uploadMenu && uploadMenuPosition && <AttachmentSourceMenu position={uploadMenuPosition}/>}</div>}
          <div className={'prompt-entry' + (file || materials.length > 0 ? ' has-file' : '')}>{!file && materials.length === 0 && <div className="material-entry"><button className="prompt-add" aria-label="添加素材" aria-expanded={uploadMenu} onClick={() => { setUploadMenuPosition(null); setUploadMenu(!uploadMenu) }}><Plus/></button>{uploadMenu && !uploadMenuPosition && <AttachmentSourceMenu/>}</div>}<div key={`${session.id}:${mode}:${prompt}`} className="prompt-editor" role="textbox" aria-label="创作提示词" aria-multiline="true" contentEditable="plaintext-only" suppressContentEditableWarning data-placeholder={config.placeholder} onBeforeInput={handlePromptBeforeInput} onCompositionStart={() => { promptComposing.current = true }} onCompositionEnd={handlePromptCompositionEnd} onPaste={handlePromptPaste} onKeyDown={handlePromptDelete} onClick={event => { if (composerState === 'compact') setComposerState(composerExpandedState.current); rememberPromptCaret(event) }} onKeyUp={rememberPromptCaret} onFocus={event => { if (composerState === 'compact') setComposerState(composerExpandedState.current); rememberPromptCaret(event) }} onInput={event => { if (!promptComposing.current) promptCaret.current = Math.min(editorCaretOffset(event.currentTarget), event.currentTarget.textContent.length) }}>{renderPromptContent()}</div></div>
          <div className="prompt-meta"><div className="limits">{config.limits.map(rule => { const [type, quota] = rule.split(' '); const count = materials.filter(item => materialTypeLabel(item) === type).length; return <span key={rule}>{type} {count}/{quota.split('/')[1]}</span> })}{(mode === 'chat' || mode === 'image') && <span className="model-size-hint">{modelSizeHint(activeModel)}</span>}{mode === 'video' && <span className="model-size-hint" title="视频 MP4/MOV · H.264 CFR · 音频 AAC/PCM · 300–6000px · 0.4–2.5 · 409600–8295044px · 24–60FPS">素材合计 ≤ 12/64 MB · 视频 ≤ 3 个/50 MB · 单条 2–15s/总时长 ≤ 15s</span>}</div><div className="counter">{prompt.length}/8000</div></div>
          <footer><div><div className="control-select"><button aria-expanded={controlMenu === 'skill'} onClick={() => { setControlMenu(controlMenu === 'skill' ? null : 'skill'); setSkillSearch('') }}><Sparkle/>{selectedSkills[mode] || '技能'}<ArrowDown/></button>{controlMenu === 'skill' && <div className="control-dropdown skill-dropdown"><header><label><MagnifyingGlass/><input aria-label="搜索技能" placeholder="搜索技能" value={skillSearch} onChange={event => setSkillSearch(event.target.value)}/></label></header><div className="skill-list">{SKILL_OPTIONS[mode].filter(option => option.includes(skillSearch.trim())).map(option => <button key={option} className={selectedSkills[mode] === option ? 'selected' : ''} onClick={() => { setSelectedSkills(old => ({ ...old, [mode]: option })); setControlMenu(null) }}><Sparkle/><span><b>{option}<em>官方</em></b><small>{SKILL_DESCRIPTIONS[option]}</small></span>{selectedSkills[mode] === option && <Check/>}</button>)}{!SKILL_OPTIONS[mode].some(option => option.includes(skillSearch.trim())) && <p className="skill-empty">未找到相关技能</p>}</div></div>}</div><div className="control-select"><button aria-expanded={controlMenu === 'model'} onClick={() => setControlMenu(controlMenu === 'model' ? null : 'model')}><Robot/>{selectedModels[mode] || config.model}<ArrowDown/></button>{controlMenu === 'model' && <div className="control-dropdown model-dropdown"><p>选择模型 · {MODES[mode].label}</p>{MODEL_OPTIONS[mode].map(option => <button key={option} className={(selectedModels[mode] || config.model) === option ? 'selected' : ''} onClick={() => { setSelectedModels(old => ({ ...old, [mode]: option })); setControlMenu(null) }}><i><Robot weight="fill"/></i><span><b>{option}</b><small>{MODEL_DESCRIPTIONS[option]}</small></span>{(selectedModels[mode] || config.model) === option && <Check/>}</button>)}</div>}</div>{mode === 'image' && (activeModel === 'gemini-3.1-flash-image-preview' ? <div className="parameter-select"><button aria-expanded={imageParamOpen} onClick={() => setImageParamOpen(!imageParamOpen)}>参数 · {imageRatio} · {imageResolution}<ArrowDown/></button>{imageParamOpen && <div className="nano-params"><p>选择比例</p><div className="ratio-options">{['4:3','3:4','16:9','9:16','2:3','3:2','1:1','4:5','5:4','21:9','9:21','1:4','4:1','8:1','1:8'].map(option => <button key={option} className={imageRatio === option ? 'selected' : ''} onClick={() => setImageRatio(option)}><i style={{ aspectRatio: option.replace(':', '/') }}></i><span>{option}</span></button>)}</div><p>选择分辨率</p><div className="resolution-options">{['1K','2K','4K'].map(option => <button key={option} className={imageResolution === option ? 'selected' : ''} onClick={() => setImageResolution(option)}>{option}</button>)}</div></div>}</div> : <div className="parameter-select"><button aria-expanded={imageParamOpen} onClick={() => setImageParamOpen(!imageParamOpen)}>分辨率 · {size}<ArrowDown/></button>{imageParamOpen && <div className="gpt-image-params"><p>选择分辨率</p><div className="gpt-resolution-options">{['1024×1024','1536×1024','1024×1536','2048×2048','2048×1152','1152×2048','3840×2160','2160×3840'].map(option => { const [width, height] = option.split('×').map(Number); const scale = Math.min(24 / width, 22 / height); return <button key={option} className={size === option ? 'selected' : ''} onClick={() => setSize(option)}><i style={{ width: Math.max(4, Math.round(width * scale)), height: Math.max(4, Math.round(height * scale)) }}></i><span>{option}</span>{size === option && <Check/>}</button> })}</div></div>}</div>)}{mode === 'video' && <div className="video-parameter-select"><button aria-expanded={videoParamOpen} onClick={() => setVideoParamOpen(!videoParamOpen)}>参数 · {videoRatio} · {videoResolution} · {duration}s<ArrowDown/></button>{videoParamOpen && <div className="video-params"><p>选择尺寸</p><div className="video-ratio-options">{['9:16','16:9','21:9','3:4','4:3','1:1','adaptive'].map(option => <button key={option} className={videoRatio === option ? 'selected' : ''} onClick={() => setVideoRatio(option)}><i></i><span>{option}</span></button>)}</div><p>选择清晰度</p><div className="video-resolution-options">{['480p','720p','1080p'].map(option => <button key={option} className={videoResolution === option ? 'selected' : ''} onClick={() => setVideoResolution(option)}>{option}</button>)}</div><p>选择视频生成时长</p><div className="duration-control"><input aria-label="视频时长" type="range" min="4" max="15" step="1" value={duration} onChange={event => setDuration(Number(event.target.value))}/><output>{duration}<small>s</small></output></div><div className="duration-scale"><span>4</span><span>9</span><span>15</span></div></div>}</div>}</div><button className="clear-all" type="button" onClick={clearComposer}>清空全部</button><button className="submit" title={`Ctrl/⌘ + Enter · ${config.points} 积分`} disabled={!canSubmit} onClick={submit}>{task === 'loading' ? '…' : <ArrowUp/>}</button></footer>
          {config.needsVideo && !file && <button className="hint" onClick={() => setNotice('请先上传至少 1 个视频')}>需上传视频后提交</button>}
        </div>
      </section>
      <p className="note">交互原型 · 数据保存在当前浏览器 · 上传与生成均为模拟行为</p>
    </main>
    {dialog?.type === 'delete' && <ConfirmDialog item={dialog.item} close={() => setDialog(null)} confirm={deleteSession}/>} 
    {shortcutOpen && <ShortcutDialog close={() => setShortcutOpen(false)}/>} 
    {assetPickerOpen && <AssetPicker close={() => setAssetPickerOpen(false)} confirm={assets => { assets.forEach(() => addMaterial()); setAssetPickerOpen(false); setToast(`已添加 ${assets.length} 个资产`) }}/>} 
  </div>
}

const ASSET_LIBRARY = [
  { id: 'a1', type: '素材', media: '图片', scope: '个人资产', name: '夏日气泡水产品图', count: 6, creator: '我', permission: '可编辑', tone: 'coral' },
  { id: 'a2', type: '素材', media: '图片', scope: '团队资产', name: '品牌人物形象参考', count: 12, creator: '林晓', permission: '团队可用', tone: 'mint' },
  { id: 'a3', type: '作品', media: '视频', scope: '个人资产', name: '新品上市动态海报', count: 4, creator: '我', permission: '可编辑', tone: 'blue' },
  { id: 'a4', type: '商品', media: '文件夹', scope: '团队资产', name: '柚子气泡水商品图库', count: 9, creator: '周辰', permission: '团队可用', tone: 'yellow' },
  { id: 'a5', type: '作品', media: '视频', scope: '团队资产', name: '夏日露营主题视觉', count: 8, creator: '陈屿', permission: '仅使用', tone: 'forest' },
  { id: 'a6', type: '商品', media: '文件夹', scope: '个人资产', name: '轻盈系列包装素材', count: 5, creator: '我', permission: '可编辑', tone: 'violet' },
  { id: 'a7', type: '素材', media: '图片', scope: '个人资产', name: '冰块与气泡特写', count: 14, creator: '我', permission: '可编辑', tone: 'blue' },
  { id: 'a8', type: '素材', media: '视频', scope: '个人资产', name: '开罐慢动作参考', count: 7, creator: '我', permission: '可编辑', tone: 'yellow' },
  { id: 'a9', type: '素材', media: '文件夹', scope: '个人资产', name: '柚子切片元素合集', count: 18, creator: '我', permission: '可编辑', tone: 'mint' },
  { id: 'a10', type: '作品', media: '图片', scope: '个人资产', name: '夏日清爽主视觉', count: 6, creator: '我', permission: '可编辑', tone: 'coral' },
  { id: 'a11', type: '作品', media: '文件夹', scope: '个人资产', name: '社媒九宫格成片', count: 9, creator: '我', permission: '可编辑', tone: 'violet' },
  { id: 'a12', type: '商品', media: '图片', scope: '个人资产', name: '青柚口味商品图', count: 8, creator: '我', permission: '可编辑', tone: 'forest' },
  { id: 'a13', type: '商品', media: '视频', scope: '个人资产', name: '产品旋转展示视频', count: 5, creator: '我', permission: '可编辑', tone: 'blue' },
  { id: 'a14', type: '素材', media: '视频', scope: '团队资产', name: '品牌广告镜头素材', count: 16, creator: '顾言', permission: '团队可用', tone: 'coral' },
  { id: 'a15', type: '素材', media: '文件夹', scope: '团队资产', name: '品牌基础视觉元素', count: 24, creator: '林晓', permission: '团队可用', tone: 'violet' },
  { id: 'a16', type: '作品', media: '图片', scope: '团队资产', name: '城市便利店系列海报', count: 10, creator: '陈屿', permission: '仅使用', tone: 'blue' },
  { id: 'a17', type: '作品', media: '文件夹', scope: '团队资产', name: '夏季营销活动成片', count: 15, creator: '许安', permission: '团队可用', tone: 'yellow' },
  { id: 'a18', type: '商品', media: '图片', scope: '团队资产', name: '白桃气泡水商品图', count: 11, creator: '周辰', permission: '团队可用', tone: 'coral' },
  { id: 'a19', type: '商品', media: '视频', scope: '团队资产', name: '组合装开箱展示', count: 6, creator: '周辰', permission: '团队可用', tone: 'mint' },
  { id: 'a20', type: '商品', media: '文件夹', scope: '团队资产', name: '电商详情页全套素材', count: 20, creator: '苏禾', permission: '仅使用', tone: 'forest' },
  { id: 'a21', type: '素材', media: '图片', scope: '团队资产', name: '户外露营场景参考', count: 13, creator: '许安', permission: '团队可用', tone: 'forest' },
  { id: 'a22', type: '作品', media: '视频', scope: '个人资产', name: '竖屏新品种草短片', count: 7, creator: '我', permission: '可编辑', tone: 'mint' },
  { id: 'a23', type: '作品', media: '图片', scope: '团队资产', name: '会员日活动KV', count: 5, creator: '林晓', permission: '团队可用', tone: 'violet' },
  { id: 'a24', type: '商品', media: '图片', scope: '个人资产', name: '六罐组合装白底图', count: 12, creator: '我', permission: '可编辑', tone: 'yellow' }
]

function AssetVisual({ tone, index = 0 }) { return <span className={`asset-visual tone-${tone} visual-${index}`} aria-hidden="true"><i/><b>YUZU</b></span> }

function AssetPicker({ close, confirm }) {
  const [type, setType] = useState('素材')
  const [scope, setScope] = useState('个人资产')
  const [selectedFolders, setSelectedFolders] = useState([])
  const [selectedImages, setSelectedImages] = useState([])
  const [detail, setDetail] = useState(null)
  const [media, setMedia] = useState('全部')
  const [query, setQuery] = useState('')
  const [view, setView] = useState('grid')
  const matchesCommonFilters = asset => asset.scope === scope && (media === '全部' || asset.media === media) && asset.name.toLowerCase().includes(query.trim().toLowerCase())
  const visible = ASSET_LIBRARY.filter(asset => matchesCommonFilters(asset) && asset.type === type && (type !== '商品' || asset.media === '文件夹'))
  const counts = label => ASSET_LIBRARY.filter(asset => matchesCommonFilters(asset) && asset.type === label && (label !== '商品' || asset.media === '文件夹')).length
  const imageKey = (assetId, index) => `${assetId}:${index}`
  const toggleFolder = asset => {
    const removing = selectedFolders.includes(asset.id)
    setSelectedFolders(items => removing ? items.filter(id => id !== asset.id) : [...items, asset.id])
    if (!removing) setSelectedImages(items => items.filter(key => !key.startsWith(`${asset.id}:`)))
  }
  const toggleImage = (asset, index) => {
    const key = imageKey(asset.id, index)
    if (selectedFolders.includes(asset.id)) {
      setSelectedFolders(items => items.filter(id => id !== asset.id))
      setSelectedImages(items => [...items.filter(item => !item.startsWith(`${asset.id}:`)), ...Array.from({ length: Math.min(asset.count, 8) }, (_, itemIndex) => imageKey(asset.id, itemIndex)).filter(item => item !== key)])
      return
    }
    setSelectedImages(items => items.includes(key) ? items.filter(item => item !== key) : [...items, key])
  }
  const selectWholeFolder = asset => {
    const selected = selectedFolders.includes(asset.id)
    setSelectedFolders(items => selected ? items.filter(id => id !== asset.id) : [...items, asset.id])
    setSelectedImages(items => items.filter(key => !key.startsWith(`${asset.id}:`)))
  }
  const directMediaMode = media === '图片' || media === '视频'
  const toggleDirectMedia = asset => {
    const key = imageKey(asset.id, 'media')
    setSelectedImages(items => items.includes(key) ? items.filter(item => item !== key) : [...items, key])
  }
  const switchMedia = label => {
    setMedia(label)
    if (label === '图片' || label === '视频') {
      setSelectedFolders([])
      setSelectedImages([])
    }
  }
  const switchType = label => {
    setType(label)
    setDetail(null)
    if (label === '商品') setMedia('全部')
  }
  const isImageSelected = (asset, index) => selectedFolders.includes(asset.id) || selectedImages.includes(imageKey(asset.id, index))
  const selectedVideoCount = selectedImages.filter(key => { const [assetId, index] = key.split(':'); return index === 'media' && ASSET_LIBRARY.find(asset => asset.id === assetId)?.media === '视频' }).length
  const selectedImageCount = selectedImages.length - selectedVideoCount
  const totalSelected = selectedFolders.length + selectedImages.length
  const selectedPayload = [
    ...ASSET_LIBRARY.filter(asset => selectedFolders.includes(asset.id)),
    ...selectedImages.map(key => { const [assetId, index] = key.split(':'); const asset = ASSET_LIBRARY.find(item => item.id === assetId); return asset ? index === 'media' ? { ...asset, id: `${assetId}-${asset.media}`, name: `${asset.name} · ${asset.media}` } : { ...asset, id: `${assetId}-image-${Number(index) + 1}`, name: `${asset.name} · 第 ${Number(index) + 1} 张` } : null }).filter(Boolean)
  ]

  return <div className="asset-picker-layer" role="dialog" aria-modal="true" aria-label="从资产库选择" onMouseDown={event => event.target === event.currentTarget && close()}>
    <section className="asset-picker">
      <header><h2>从资产库选择</h2><div className="asset-header-path"><nav aria-label="当前文件路径"><span>{detail?.scope || scope}</span><i>/</i><b>{detail?.type || type}</b>{detail && <><i>/</i><b>{detail.name}</b></>}</nav></div><button className="asset-picker-close" aria-label="关闭资产选择" onClick={close}><X/></button></header>
      <div className="asset-picker-body">
        <aside>
          <div className="asset-scope"><small>资产范围</small>{['个人资产','团队资产'].map(label => <button key={label} className={scope === label ? 'active' : ''} onClick={() => { setScope(label); setDetail(null) }}><i>{label === '个人资产' ? '我' : '团'}</i><span>{label}</span>{scope === label && <Check/>}</button>)}</div>
          <nav className="asset-type" aria-label="资产分类"><small>分类</small>{['素材','作品','商品'].map(label => <button key={label} className={type === label ? 'active' : ''} onClick={() => switchType(label)}><span>{label}</span><em>{counts(label)}</em></button>)}</nav>
        </aside>
        <main className="asset-content">{detail ? <div className="asset-detail">
          <div className="asset-detail-title"><div><h3>{detail.name}</h3><p>共{detail.count}张</p></div><div className="asset-detail-actions"><button className={selectedFolders.includes(detail.id) ? 'selected' : ''} onClick={() => selectWholeFolder(detail)}>{selectedFolders.includes(detail.id) ? <><Check/>已选择整个文件夹</> : '选择整个文件夹'}</button><button className="asset-detail-return" onClick={() => setDetail(null)}><ArrowLeft/>返回</button></div></div>
          <div className="asset-image-list">{Array.from({ length: Math.min(detail.count, 8) }, (_, index) => { const checked = isImageSelected(detail, index); return <button key={index} className={checked ? 'selected' : ''} aria-label={`${checked ? '取消选择' : '选择'}第 ${index + 1} 张图片`} aria-pressed={checked} onClick={() => toggleImage(detail, index)}><span className="asset-image-frame"><AssetVisual tone={detail.tone} index={index}/></span><i className="image-check">{checked && <Check weight="bold"/>}</i></button> })}</div>
        </div> : <>
          <div className={`asset-filterbar${type === '商品' ? ' no-media-filter' : ''}`}>{type !== '商品' && <div role="tablist" aria-label="资产媒体类型">{['全部','视频','图片','文件夹'].map(label => <button role="tab" aria-selected={media === label} key={label} className={media === label ? 'active' : ''} onClick={() => switchMedia(label)}>{label}</button>)}</div>}<div className="asset-filter-actions"><label><MagnifyingGlass/><input aria-label="搜索资产" placeholder="搜索作品" value={query} onChange={event => setQuery(event.target.value)}/>{query && <button aria-label="清除资产搜索" onClick={() => setQuery('')}><X/></button>}</label><span className="asset-view-toggle"><button className={view === 'grid' ? 'active' : ''} aria-label="网格视图" onClick={() => setView('grid')}><SquaresFour/></button><button className={view === 'list' ? 'active' : ''} aria-label="列表视图" onClick={() => setView('list')}><List/></button></span></div></div>
          <div className={`asset-grid ${view === 'list' ? 'list-view' : ''}`}>{visible.map(asset => { const isDirectAsset = directMediaMode || asset.media !== '文件夹'; const checked = isDirectAsset ? selectedImages.includes(imageKey(asset.id, 'media')) : selectedFolders.includes(asset.id); const toggleCard = () => isDirectAsset ? toggleDirectMedia(asset) : toggleFolder(asset); const MediaIcon = asset.media === '视频' ? VideoCamera : ImageSquare; return <article key={asset.id} className={`${checked ? 'selected' : ''}${isDirectAsset ? ' direct-media-card' : ''}`}><button className="asset-card-select" aria-label={`${checked ? '取消选择' : '选择'}${asset.name}`} aria-pressed={checked} onClick={toggleCard}>{checked && <Check weight="bold"/>}</button><button className="asset-card-main" onClick={() => isDirectAsset ? toggleDirectMedia(asset) : setDetail(asset)}>{isDirectAsset ? <span className="asset-media-frame"><AssetVisual tone={asset.tone}/></span> : <AssetVisual tone={asset.tone}/>}<span><b>{asset.name}</b><small>{isDirectAsset ? (asset.media === '视频' ? '单条视频' : '单张图片') : `共${asset.count}张`}</small></span>{isDirectAsset && <i className={`asset-media-icon ${asset.media === '视频' ? 'video' : 'image'}`} title={asset.media}><MediaIcon weight="fill"/></i>}</button>{scope === '团队资产' && <footer><span>创建人：{asset.creator}</span></footer>}</article> })}</div>
          {!visible.length && <div className="asset-empty"><MagnifyingGlass/><b>未找到符合条件的资产</b><p>尝试切换筛选项或清除搜索关键词</p><button onClick={() => { setMedia('全部'); setQuery('') }}>清除筛选</button></div>}
        </>}</main>
      </div>
      <footer><span>{directMediaMode ? <>已选 <b>{selectedImages.length}</b> {media === '视频' ? '条视频' : '张图片'}</> : <>已选 <b>{totalSelected}</b> 项：{selectedFolders.length}个文件夹，{selectedImageCount}张图片，{selectedVideoCount}条视频</>}</span><div><button onClick={close}>取消</button><button className="asset-confirm" disabled={!totalSelected} onClick={() => confirm(selectedPayload)}>确认添加{totalSelected ? ` (${totalSelected})` : ''}</button></div></footer>
    </section>
  </div>
}

function Result({ turn, mode, prompt, action, retry }) {
  return <article className="result" aria-label="生成结果"><header><b>AI</b><span><strong>{MODES[mode].label}结果</strong><small>{turn?.skill && <>{turn.skill} · </>}{turn?.model || MODES[mode].model} · {turn?.time || '刚刚'} 完成 · 消耗 {MODES[mode].points} 积分</small></span><em><Check/>已完成</em></header>{mode === 'image' && <div className="art"><div>YUZU<b>柚子气泡水</b></div><span>AI 生成预览</span></div>}{mode === 'video' && <div className="vid"><VideoCamera/><b>00:05</b><span>视频预览（模拟）</span></div>}{mode === 'analyze' && <div className="text"><h2>品牌短片镜头拆解</h2><p><b>前 3 秒钩子：</b>产品高速入画，气泡声先于画面出现，快速建立清爽感。</p><p><b>镜头节奏：</b>0–3 秒快切，4–12 秒以微距慢镜头展示水珠与冰块。</p></div>}{mode === 'chat' && <div className="text"><h2>3 个社媒表达方向</h2><p>01 不只解渴，是把夏天调成气泡模式。</p><p>02 真柚子香气，入口清爽，甜度刚刚好。</p></div>}<p className="result-prompt">{prompt}</p><footer><button onClick={() => action('提示词已复制（模拟）')}><Copy/>复制提示词</button><button onClick={retry}><PencilSimple/>重新编辑</button><button onClick={() => action('结果已下载（模拟）')}><DownloadSimple/>下载</button></footer></article>
}

function ConfirmableAction({ type, mode, onConfirm, children }) {
  const [open, setOpen] = useState(false)
  const isRegenerate = type === 'regenerate'
  const isDelete = type === 'delete'
  const modeLabel = MODES[mode]?.label || 'AI'
  const title = isDelete ? `删除这条${modeLabel}记录？` : isRegenerate ? `再次生成${modeLabel}内容？` : `重新编辑这条${modeLabel}记录？`
  const description = isDelete
    ? '确认后将删除整条记录，包括提示词、附件、生成状态和结果。此操作无法撤回。'
    : isRegenerate
    ? `将保留当前记录，并创建一条新的生成记录。本次将再次消耗 ${MODES[mode]?.points || 0} 积分。`
    : '确认后会把原提示词、附件和生成参数载入输入区，当前生成结果仍会保留。'
  return <>
    <button className={isDelete ? 'danger' : undefined} onClick={() => setOpen(true)}>{children}</button>
    {open && createPortal(<div className="modal-layer" role="alertdialog" aria-modal="true" aria-label={title} onMouseDown={event => event.target === event.currentTarget && setOpen(false)}>
      <div className="modal action-confirm-modal"><h2>{title}</h2><p>{description}</p><footer><button onClick={() => setOpen(false)}>取消</button><button className={isDelete ? 'danger' : 'primary-action'} onClick={() => { setOpen(false); onConfirm() }}>确认</button></footer></div>
    </div>, document.body)}
  </>
}

function ChatConversation({ turns, action, onEditOriginal, onEditCreative, onRegenerate, onDelete, onQuote }) {
  return <section className="chat-history" aria-label="AI 对话记录">
    <div className="chat-date"><span>今天</span></div>
    {turns.map(turn => (turn.mode || 'chat') === 'chat'
      ? <ChatTurn key={turn.id} turn={turn} action={action} onEditOriginal={onEditOriginal} onRegenerate={onRegenerate} onDelete={onDelete} onQuote={onQuote}/>
      : <GenerationTurn key={turn.id} turn={turn} action={action} onEditCreative={onEditCreative} onRegenerate={onRegenerate} onDelete={onDelete}/>)}
  </section>
}

function GenerationTurn({ turn, action, onEditCreative, onRegenerate, onDelete }) {
  if (turn.mode === 'image') return <ImageGenerationTurn turn={turn} action={action} onEditCreative={onEditCreative} onRegenerate={onRegenerate} onDelete={onDelete}/>
  if (turn.mode === 'video') return <VideoGenerationTurn turn={turn} action={action} onEditCreative={onEditCreative} onRegenerate={onRegenerate} onDelete={onDelete}/>
  const label = MODES[turn.mode]?.label || '创作'
  return <div className="chat-round generation-round" data-status={turn.status}>
    <article className="chat-turn user-turn">
      {turn.materials?.length > 0 && <div className="sent-materials">{turn.materials.map((item, index) => <span key={item.id || index}>{item.kind === 'image' ? '图片' : item.kind === 'video' ? '视频' : '文件'}{index + 1}</span>)}</div>}
      <div className="user-message"><small>{label}</small><p>{turn.prompt}</p></div><time>{turn.time}</time>
    </article>
    {turn.status === 'pending' ? <Loading mode={turn.mode}/> : turn.status === 'failed' ? <Failure retry={() => action('请修改提示词后重新发送')}/> : <Result turn={turn} mode={turn.mode} prompt={turn.prompt} action={action} retry={() => action(`已将这条${label}任务载入输入框（模拟）`)}/>} 
  </div>
}

function VideoGenerationTurn({ turn, action, onEditCreative, onRegenerate, onDelete }) {
  const [deleted, setDeleted] = useState(false)
  const referenceItems = turn.materials || []
  const aliases = aliasesForMaterials(referenceItems)
  const promptPattern = aliases.length ? new RegExp(`(@(?:${aliases.map(escapeRegExp).join('|')}))`, 'g') : null
  const promptParts = promptPattern ? turn.prompt.split(promptPattern) : [turn.prompt]
  const referenceVideo = referenceItems.find(item => item.kind === 'video' && item.preview)
  const parameterText = `${turn.ratio || '9:16'} · ${turn.resolution || '480p'} · ${turn.duration || 15}s`
  return <div className="chat-round image-generation-round video-generation-round" data-status={turn.status}>
    <div className="image-request-line">
      <HistoryMaterialStrip items={referenceItems} aliases={aliases} action={action}/>
      <div className="image-request-copy"><p>{promptParts.map((part, index) => { const alias = part.startsWith('@') ? part.slice(1) : ''; const materialIndex = aliases.indexOf(alias); const item = referenceItems[materialIndex]; return item ? <HistoryReference item={item} alias={alias} key={`${part}-${index}`}>{part}</HistoryReference> : part })}</p><small>{turn.skill && <><b>{turn.skill}</b><i/></>}{turn.model || 'seedance 2.0'}<i/>{parameterText}<i/><button onClick={() => action('提示词已复制')}><Copy/>复制</button><i/><span>{turn.time || '刚刚'} 完成</span><i/><span>消耗 {MODES.video.points} 积分</span></small></div>
    </div>
    {(turn.status === 'queued' || turn.status === 'generating') && <GenerationStatus mode="video" phase={turn.phase}/>} 
    {turn.status === 'failed' && <Failure retry={() => action('请修改提示词后重新发送')}/>} 
    {turn.status === 'complete' && (deleted ? <div className="deleted-answer"><span>该视频生成结果已删除</span><button onClick={() => setDeleted(false)}>撤销</button></div> : <div className="image-complete-stage video-complete-stage">
      <div className="image-output-preview video-output-preview">{referenceVideo ? <video src={referenceVideo.preview} muted controls loop playsInline aria-label="视频生成预览"/> : <div className="generated-video-placeholder"><VideoCamera weight="duotone"/><strong>视频生成预览</strong><small>{parameterText}</small></div>}<div className="image-overlay-actions"><button aria-label="下载视频" onClick={() => action('视频已下载（模拟）')}><DownloadSimple/></button></div><span>AI 生成预览</span></div>
      <div className="image-result-actions"><ConfirmableAction type="edit" mode="video" onConfirm={() => onEditCreative(turn)}><PencilSimple/>重新编辑</ConfirmableAction><ConfirmableAction type="regenerate" mode="video" onConfirm={() => onRegenerate(turn)}><ClockCounterClockwise/>再次生成</ConfirmableAction><ConfirmableAction type="delete" mode="video" onConfirm={() => onDelete(turn)}><Trash/>删除</ConfirmableAction></div>
    </div>)}
  </div>
}

function ImageGenerationTurn({ turn, action, onEditCreative, onRegenerate, onDelete }) {
  const [deleted, setDeleted] = useState(false)
  const modelLabel = turn.model === 'gemini-3.1-flash-image-preview' ? 'Nano Banana' : turn.model || 'gpt-image-2'
  const referenceItems = turn.materials || []
  const aliases = aliasesForMaterials(referenceItems)
  const promptPattern = aliases.length ? new RegExp(`(@(?:${aliases.map(escapeRegExp).join('|')}))`, 'g') : null
  const promptParts = promptPattern ? turn.prompt.split(promptPattern) : [turn.prompt]
  return <div className="chat-round image-generation-round" data-status={turn.status}>
    <div className="image-request-line">
      <HistoryMaterialStrip items={referenceItems} aliases={aliases} action={action}/>
      <div className="image-request-copy"><p>{promptParts.map((part, index) => { const alias = part.startsWith('@') ? part.slice(1) : ''; const materialIndex = aliases.indexOf(alias); const item = referenceItems[materialIndex]; return item ? <HistoryReference item={item} alias={alias} key={`${part}-${index}`}>{part}</HistoryReference> : part })}</p><small>{turn.skill && <><b>{turn.skill}</b><i/></>}{modelLabel}<i/>{turn.model === 'gemini-3.1-flash-image-preview' ? `比例 ${turn.ratio || '1:1'} · ${turn.resolution || '1K'}` : `分辨率 ${turn.resolution || '1024×1024'}`}<i/><button onClick={() => action('提示词已复制')}><Copy/>复制</button><i/><span>{turn.time || '刚刚'} 完成</span><i/><span>消耗 {MODES.image.points} 积分</span></small></div>
    </div>
    {(turn.status === 'queued' || turn.status === 'generating') && <GenerationStatus mode="image" phase={turn.phase}/>} 
    {turn.status === 'failed' && <Failure retry={() => action('请修改提示词后重新发送')}/>} 
    {turn.status === 'complete' && (deleted ? <div className="deleted-answer"><span>该图片生成结果已删除</span><button onClick={() => setDeleted(false)}>撤销</button></div> : <div className="image-complete-stage">
      <div className="image-output-preview"><div className="generated-character">🐷<b>YUZU</b></div><div className="image-overlay-actions"><button aria-label="下载图片" onClick={() => action('图片已下载（模拟）')}><DownloadSimple/></button></div><span>AI 生成预览</span></div>
      <div className="image-result-actions"><ConfirmableAction type="edit" mode="image" onConfirm={() => onEditCreative(turn)}><PencilSimple/>重新编辑</ConfirmableAction><ConfirmableAction type="regenerate" mode="image" onConfirm={() => onRegenerate(turn)}><ClockCounterClockwise/>再次生成</ConfirmableAction><ConfirmableAction type="delete" mode="image" onConfirm={() => onDelete(turn)}><Trash/>删除</ConfirmableAction></div>
    </div>)}
  </div>
}

function ChatTurn({ turn, action, onEditOriginal, onRegenerate, onDelete, onQuote }) {
  const message = turn.prompt
  const [version] = useState(turn.variant || 1)
  const [readingMode, setReadingMode] = useState('md')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleted, setDeleted] = useState(false)

  const answers = [
    ['松弛感日常', '把产品放进真实生活场景，用一句轻松的体验感受开场，再补充最打动人的使用细节。', '适合建立亲近感，弱化销售表达。'],
    ['痛点反转', '先说用户最常遇到的困扰，再用产品带来的具体变化完成反转，让卖点自然出现。', '适合强调效果与购买理由。'],
    ['清单式种草', '用“最近反复使用的 3 个理由”组织内容，搭配简短场景和明确结论。', '适合收藏与快速阅读。']
  ]
  const alternate = [
    ['第一眼氛围', '从画面和情绪切入，让用户先感受到产品带来的生活方式，再补充功能信息。', '适合视觉感强的笔记。'],
    ['真实体验线', '用“使用前—第一次使用—持续使用后”的顺序讲述变化，增强可信度。', '适合体验型内容。'],
    ['朋友推荐感', '以聊天口吻分享最意外的优点，并给出适用人群和使用建议。', '适合降低营销感。']
  ]
  const scriptAnswers = [
    ['开场建立记忆点', '用冰块碰撞和气泡升腾的声音开场，主持人随后抛出“让每一次举杯都更轻盈”的品牌主张。', '建议控制在前 12 秒。'],
    ['集中释放产品卖点', '依次介绍低糖、真柚子香气与清爽气泡感，配合产品特写和核心数字强化可信度。', '每个卖点只保留一句话。'],
    ['口号收束与行动引导', '全场灯光转为品牌浅蓝色，产品定格，主持人与屏幕同步呈现新品口号。', '结尾保留 8 秒品牌记忆。']
  ]
  const scriptAlternate = [
    ['用户场景开场', '从午后办公室、运动后和朋友聚会三个场景快速切入，建立新品适用范围。', '用场景代替直接介绍。'],
    ['创始人一句话', '以品牌初心连接低糖配方和真实柚子风味，让卖点拥有更清晰的来源。', '适合增强品牌信任。'],
    ['新品揭幕', '倒计时后完成产品亮相，以“清爽有气泡，轻盈没负担”作为统一收束。', '适合舞台与直播同步。']
  ]
  const isScriptConversation = /脚本|发布会|故事|大纲|分镜/.test(message)
  const currentAnswers = isScriptConversation ? (version === 1 ? scriptAnswers : scriptAlternate) : (version === 1 ? answers : alternate)
  const answerIntro = isScriptConversation ? '可以按“记忆点—卖点—口号”组织这段 60 秒开场，让信息完整又不显得拥挤：' : '可以从下面三个方向展开，既保留真实分享感，也能让重点更容易被读者记住：'
  const answerClosing = isScriptConversation ? '如果你确定舞台形式和主持人口吻，我可以继续扩写为带时间轴的完整台词。' : '如果你告诉我具体产品和目标人群，我还可以继续细化成可直接发布的完整文案。'
  const aliases = aliasesForMaterials(turn.materials || [])
  const promptPattern = aliases.length ? new RegExp(`(@(?:${aliases.map(escapeRegExp).join('|')}))`, 'g') : null
  const promptParts = promptPattern ? message.split(promptPattern) : [message]
  const plainAnswer = [answerIntro, ...currentAnswers.map(([title, body, note], index) => `${index + 1}. ${title}\n${body}${note ? `\n${note}` : ''}`), answerClosing].join('\n\n')

  return <div className="chat-round" data-status={turn.status}>
    <article className="chat-turn user-turn">
      {turn.materials?.length > 0 && <HistoryMaterialStrip items={turn.materials} aliases={aliases} action={action} align="end"/>}
      <div className="user-message">
        <p>{promptParts.map((part, index) => { const alias = part.startsWith('@') ? part.slice(1) : ''; const materialIndex = aliases.indexOf(alias); const item = turn.materials?.[materialIndex]; return item ? <HistoryReference item={item} alias={alias} key={`${part}-${index}`}>{part}</HistoryReference> : part })}</p>
      </div>
      <div className="user-message-meta"><time>{turn.time || '10:24'}</time><button onClick={() => action('消息已复制')}><Copy/>复制</button><ConfirmableAction type="edit" mode="chat" onConfirm={() => onEditOriginal(turn)}><PencilSimple/>重新编辑</ConfirmableAction></div>
    </article>
    {turn.status === 'pending' ? <article className="chat-turn assistant-turn assistant-waiting"><GenerationStatus mode="chat" phase={turn.phase} skill={turn.skill}/></article> :
    <article className="chat-turn assistant-turn">
      {deleted ? <div className="deleted-answer"><span>该 AI 回复已删除</span><button onClick={() => { setDeleted(false); action('回答已恢复') }}>撤销</button></div> : <><div className="answer-complete-status" role="status"><Check weight="bold"/>已完成</div><div className={`assistant-answer ${isScriptConversation ? 'structured-answer' : ''} ${readingMode === 'txt' ? 'plain-reading' : ''}`}>
        {readingMode === 'txt' ? <pre>{plainAnswer}</pre> :
        (isScriptConversation ? <>
          <h2>《松下来的⼀天》短片故事大纲</h2>
          <section><h3>1. 故事概览</h3><h4>1.1 故事类型</h4><p>都市情感治愈向短片。以真实可感的日常细节切入，用一条清晰的情绪线串联产品与人物。</p><h4>1.2 核心创意</h4><p>主角从持续紧绷的工作状态中短暂抽离，在一口清爽气泡和片刻停顿里重新找回自己的节奏。</p></section>
          <section><h3>2. 主要角色</h3><table><thead><tr><th>项目</th><th>内容</th></tr></thead><tbody><tr><td>人物</td><td>27 岁的互联网运营，习惯忙碌但渴望喘息</td></tr><tr><td>核心性格</td><td>认真、克制，偶尔也愿意允许自己慢下来</td></tr><tr><td>角色弧线</td><td>从“紧绷”到主动给自己留出片刻松弛</td></tr></tbody></table></section>
          <section><h3>3. 故事结构</h3><ol>{currentAnswers.map(([title, body]) => <li key={title}><strong>{title}</strong><p>{body}</p></li>)}</ol></section>
          <section><h3>4. 主题与情感</h3><p>产品不是解决一切的工具，而是陪伴人物慢慢调整状态的小陪伴。情绪曲线从焦虑、停顿走向轻松。</p></section>
          <p>{answerClosing}</p>
        </> : <><p>{answerIntro}</p><ol>{currentAnswers.map(([title, body, note]) => <li key={title}><strong>{title}</strong><p>{body}</p><small>{note}</small></li>)}</ol><p>{answerClosing}</p></>)}
      </div>
      <div className="chat-meta"><span>以上内容由 AI 生成</span>{turn.skill && <span>{turn.skill}</span>}<span>{turn.model || 'gpt-5.6-sol'}</span><span>{turn.time || '10:24'} 完成</span><span>消耗 {MODES.chat.points} 积分</span></div>
      <div className="chat-actions result-actions">
        <button onClick={() => setReadingMode(readingMode === 'md' ? 'txt' : 'md')}><FileText/>{readingMode === 'md' ? 'TXT 格式' : 'MD 格式'}</button>
        <button onClick={() => action('AI 回复已复制')}><Copy/>复制结果</button>
        <ConfirmableAction type="regenerate" mode="chat" onConfirm={() => onRegenerate(turn)}><ClockCounterClockwise/>再次生成</ConfirmableAction>
        <ConfirmableAction type="delete" mode="chat" onConfirm={() => onDelete(turn)}><Trash/>删除</ConfirmableAction>
      </div>
      </>}
    </article>}
  </div>
}

function GenerationStatus({ mode, phase = 0, skill = '' }) {
  const states = GENERATION_STATES[mode] || GENERATION_STATES.chat
  const state = states[Math.min(phase || 0, states.length - 1)]
  const [tipIndex, setTipIndex] = useState(0)
  useEffect(() => { setTipIndex(0) }, [state.key])
  useEffect(() => {
    if (state.tips.length < 2) return undefined
    const id = window.setInterval(() => setTipIndex(index => (index + 1) % state.tips.length), 4800)
    return () => window.clearInterval(id)
  }, [state.key, state.tips.length])
  const Icon = state.icon
  const title = state.key === 'skill' && skill ? `正在加载「${skill}」技能…` : state.title
  return <div className={`generation-status mode-${mode} phase-${state.key}`} role="status" aria-live="polite" aria-atomic="true">
    <div className="generation-status-icon" aria-hidden="true"><Icon weight="duotone"/><i/><i/><i/></div>
    <div className="generation-status-copy"><strong>{title}</strong><span key={`${state.key}-${tipIndex}`}>{state.tips[tipIndex]}</span></div>
    <small>{mode === 'chat' ? '请稍候' : '可离开页面，任务会继续'}</small>
  </div>
}

function Loading({ mode }) { return <article className="loading"><GenerationStatus mode={mode}/></article> }
function Failure({ retry }) { return <article className="failure" role="alert"><WarningCircle/><span><b>生成失败</b><p>服务暂时不可用，本次积分未扣除。</p></span><button onClick={retry}>修改并重试</button></article> }

function ConversationThumbnail({ item }) {
  const turns = chatTurnsFor(item)
  const attachments = turns.flatMap(turn => turn.materials || [])
  const legacyAttachments = item.editContext?.materials || []
  const allAttachments = attachments.length ? attachments : legacyAttachments
  const firstImage = allAttachments.find(attachment => attachment.kind === 'image')
  const firstFile = allAttachments[0]
  const attachment = firstImage || firstFile
  const firstMode = turns[0]?.mode || item.mode || 'chat'
  const FallbackIcon = MODES[firstMode]?.icon || Sparkle

  if (!attachment) return <i className="conversation-cover type-cover"><FallbackIcon/></i>
  return <i className={`conversation-cover attachment-cover ${attachment.kind}`} title={attachment.name || '会话附件'} aria-hidden="true">
    {attachment.kind === 'image' && attachment.preview
      ? <img src={attachment.preview} alt=""/>
      : attachment.kind === 'video' && attachment.preview
        ? <video src={attachment.preview} muted preload="metadata" aria-hidden="true"/>
      : attachment.kind === 'document' ? <FileText aria-hidden="true"/> : <MaterialIcon item={attachment}/>} 
  </i>
}

function HistoryPanel({ items, search, setSearch, active, fresh, openDefault, select, pin, rename, remove }) {
  const [editingId, setEditingId] = useState(null)
  const [menuId, setMenuId] = useState(null)
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 })
  useEffect(() => {
    const closeOutside = event => { if (!(event.target instanceof Element) || !event.target.closest('.conversation-menu, .more-button')) setMenuId(null) }
    document.addEventListener('pointerdown', closeOutside)
    return () => document.removeEventListener('pointerdown', closeOutside)
  }, [])
  const [editingTitle, setEditingTitle] = useState('')
  const startEditing = item => { setEditingId(item.id); setEditingTitle(item.title) }
  const finishEditing = item => {
    if (editingId !== item.id) return
    if (!editingTitle.trim()) { setEditingTitle(item.title); setEditingId(null); return }
    rename(item.id, editingTitle)
    setEditingId(null)
  }
  const pinnedItems = items.filter(item => item.pinned)
  const regularItems = items.filter(item => !item.pinned)
  const renderItem = item => <div className={item.id === active ? 'selected' : ''} key={item.id}><button onClick={() => select(item)}><ConversationThumbnail item={item}/><span>{editingId === item.id ? <input className="inline-rename" aria-label="修改会话名称" autoFocus maxLength={40} value={editingTitle} onPointerDown={event => event.stopPropagation()} onClick={event => event.stopPropagation()} onBlur={() => finishEditing(item)} onChange={event => setEditingTitle(event.target.value)} onKeyDown={event => { event.stopPropagation(); if (event.key === 'Enter') { event.preventDefault(); finishEditing(item) } if (event.key === 'Escape') { event.preventDefault(); setEditingTitle(item.title); setEditingId(null) } }}/> : <b>{item.title}</b>}<small>{MODES[item.mode].label} · {item.time}</small></span></button><span className="row-actions"><button className="more-button" aria-label={'更多操作' + item.title} aria-expanded={menuId === item.id} onClick={event => { event.stopPropagation(); const rect = event.currentTarget.getBoundingClientRect(); setMenuPosition({ top: Math.min(rect.top - 8, window.innerHeight - 132), left: rect.right + 10 }); setMenuId(menuId === item.id ? null : item.id) }}><DotsThree weight="bold"/></button>{menuId === item.id && <span className="conversation-menu" role="menu" style={{ top: menuPosition.top, left: menuPosition.left }}><button role="menuitem" onClick={() => { pin(item.id, !item.pinned); setMenuId(null) }}><PushPin/>{item.pinned ? '取消置顶' : '置顶'}</button><button role="menuitem" onClick={() => { startEditing(item); setMenuId(null) }}><PencilSimple/>重命名</button><button role="menuitem" className="delete-item" onClick={() => { remove(item); setMenuId(null) }}><Trash/>删除</button></span>}</span></div>
  return <aside className="history-panel" aria-label="创作记录"><header><div><small>WORKSPACE</small><strong>创作记录</strong></div><button className="new" title="Ctrl/⌘ + N" aria-label="新建会话" onClick={fresh}><Plus/></button></header><label className="search"><MagnifyingGlass/><input title="Ctrl/⌘ + K" aria-label="搜索对话" placeholder="搜索对话" value={search} onChange={e => setSearch(e.target.value)}/>{search && <button aria-label="清除搜索" onClick={() => setSearch('')}><X/></button>}</label><div className="fixed-conversations"><button onClick={fresh}><Plus/><span><b>新对话</b><small>创建空白会话</small></span></button>{pinnedItems.length > 0 && <div className="history pinned-history">{pinnedItems.map(renderItem)}</div>}</div><div className="history-scroll"><button className="default-conversation" onClick={openDefault}><Sparkle/><span><b>默认对话</b><small>返回默认会话</small></span></button><small className="group">今天与更早</small>{regularItems.length ? <div className="history">{regularItems.map(renderItem)}</div> : <div className="empty"><MagnifyingGlass/><b>未找到相关对话</b><p>换个关键词试试</p><button onClick={() => setSearch('')}>清除关键词</button></div>}</div></aside>
}

function Drawer({ items, search, setSearch, active, close, fresh, select, rename, remove }) {
  return <div className="layer" role="dialog" aria-modal="true" aria-label="创作历史" onMouseDown={e => e.target === e.currentTarget && close()}><aside className="drawer"><header><button className="icon" aria-label="关闭创作历史" onClick={close}><ArrowLeft/></button><strong>创作历史</strong><button className="new" aria-label="新建会话" onClick={fresh}><Plus/></button></header><label className="search"><MagnifyingGlass/><input aria-label="搜索对话" placeholder="搜索对话" value={search} onChange={e => setSearch(e.target.value)}/>{search && <button aria-label="清除搜索" onClick={() => setSearch('')}><X/></button>}</label><small className="group">今天与更早</small>{items.length ? <div className="history">{items.map(item => <div className={item.id === active ? 'selected' : ''} key={item.id}><button onClick={() => select(item)}><ConversationThumbnail item={item}/><span><b>{item.title}</b><small>{MODES[item.mode].label} · {item.time}</small></span></button><span className="row-actions"><button aria-label={'重命名' + item.title} onClick={() => rename(item)}><PencilSimple/></button><button aria-label={'删除' + item.title} onClick={() => remove(item)}><Trash/></button></span></div>)}</div> : <div className="empty"><MagnifyingGlass/><b>未找到相关对话</b><p>换个关键词试试</p><button onClick={() => setSearch('')}>清除关键词</button></div>}</aside></div>
}

function RenameDialog({ item, close, save }) { const [value, setValue] = useState(item.title); const [invalid, setInvalid] = useState(false); return <div className="modal-layer" role="dialog" aria-modal="true" aria-label="重命名会话"><div className="modal"><h2>重命名会话</h2><input aria-label="会话名称" autoFocus value={value} maxLength={40} onChange={e => { setValue(e.target.value); setInvalid(false) }}/>{invalid && <p className="modal-error">名称不能为空</p>}<footer><button onClick={close}>取消</button><button className="danger primary-action" onClick={() => { if (!save(item.id, value)) setInvalid(true) }}>保存</button></footer></div></div> }
function ConfirmDialog({ item, close, confirm }) { return <div className="modal-layer" role="alertdialog" aria-modal="true" aria-label="确认删除会话"><div className="modal"><h2>删除“{item.title}”？</h2><p>此操作无法撤回，删除对话后，仍可在「资产」中找回已生成的内容，确认删除么？</p><footer><button onClick={close}>取消</button><button className="danger" onClick={() => confirm(item.id)}>确认删除</button></footer></div></div> }
function ShortcutDialog({ close }) { const rows = [['新建会话', 'Ctrl / ⌘', 'N'], ['搜索创作记录', 'Ctrl / ⌘', 'K'], ['提交生成', 'Ctrl / ⌘', 'Enter'], ['切换三种模式', 'Alt', '1—3'], ['关闭弹窗或提示', '', 'Esc']]; return <div className="modal-layer" role="dialog" aria-modal="true" aria-label="键盘快捷键"><div className="modal shortcut-modal"><header><div><small>KEYBOARD</small><h2>键盘快捷键</h2></div><button aria-label="关闭快捷键" onClick={close}><X/></button></header><div className="shortcut-list">{rows.map(([label, modifier, key]) => <div key={label}><span>{label}</span><span>{modifier && <kbd>{modifier}</kbd>}<kbd>{key}</kbd></span></div>)}</div><p>Mac 使用 ⌘，Windows 使用 Ctrl。</p></div></div> }

createRoot(document.getElementById('root')).render(<App/>)

