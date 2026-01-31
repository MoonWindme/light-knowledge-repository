import html2pdf from 'html2pdf.js'

export interface ExportOptions {
  filename?: string
  margin?: number
  pageSize?: 'a4' | 'letter' | 'legal'
  orientation?: 'portrait' | 'landscape'
}

/**
 * 将 HTML 元素导出为 PDF
 */
export async function exportHtmlToPdf(
  element: HTMLElement,
  options: ExportOptions = {}
): Promise<void> {
  const {
    filename = 'document.pdf',
    margin = 10,
    pageSize = 'a4',
    orientation = 'portrait',
  } = options

  const opt = {
    margin,
    filename,
    image: { type: 'jpeg' as const, quality: 0.98 },
    html2canvas: { 
      scale: 2,
      useCORS: true,
      logging: false,
    },
    jsPDF: { 
      unit: 'mm' as const, 
      format: pageSize, 
      orientation,
    },
  }

  await html2pdf().set(opt).from(element).save()
}

/**
 * 将 Markdown 预览内容导出为 PDF
 */
export async function exportMarkdownToPdf(
  previewElement: HTMLElement,
  title: string,
  options: ExportOptions = {}
): Promise<void> {
  // 创建一个临时容器来包装内容
  const container = document.createElement('div')
  container.style.cssText = `
    padding: 20px 40px;
    background: white;
    color: #1a1a1a;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    line-height: 1.6;
    max-width: 800px;
    margin: 0 auto;
  `
  
  // 添加标题
  if (title) {
    const titleElement = document.createElement('h1')
    titleElement.textContent = title
    titleElement.style.cssText = `
      font-size: 24px;
      font-weight: 600;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 2px solid #e5e5e5;
    `
    container.appendChild(titleElement)
  }
  
  // 克隆预览内容
  const contentClone = previewElement.cloneNode(true) as HTMLElement
  
  // 调整样式以适应 PDF
  contentClone.style.cssText = `
    color: #1a1a1a;
  `
  
  // 修复代码块样式
  contentClone.querySelectorAll('pre').forEach((pre) => {
    ;(pre as HTMLElement).style.cssText = `
      background: #f5f5f5;
      padding: 12px;
      border-radius: 6px;
      overflow-x: auto;
      font-size: 13px;
    `
  })
  
  // 修复行内代码样式
  contentClone.querySelectorAll('code:not(pre code)').forEach((code) => {
    ;(code as HTMLElement).style.cssText = `
      background: #f0f0f0;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 0.9em;
    `
  })
  
  // 修复链接颜色
  contentClone.querySelectorAll('a').forEach((a) => {
    ;(a as HTMLElement).style.color = '#0066cc'
  })
  
  // 修复表格样式
  contentClone.querySelectorAll('table').forEach((table) => {
    ;(table as HTMLElement).style.cssText = `
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
    `
  })
  
  contentClone.querySelectorAll('th, td').forEach((cell) => {
    ;(cell as HTMLElement).style.cssText = `
      border: 1px solid #ddd;
      padding: 8px 12px;
      text-align: left;
    `
  })
  
  contentClone.querySelectorAll('th').forEach((th) => {
    ;(th as HTMLElement).style.background = '#f5f5f5'
  })
  
  container.appendChild(contentClone)
  
  // 临时添加到 DOM 以便渲染
  document.body.appendChild(container)
  
  try {
    await exportHtmlToPdf(container, {
      filename: options.filename || `${title || 'document'}.pdf`,
      ...options,
    })
  } finally {
    document.body.removeChild(container)
  }
}

/**
 * 将 SVG 元素导出为 PDF
 */
export async function exportSvgToPdf(
  svgElement: SVGSVGElement,
  title: string,
  options: ExportOptions = {}
): Promise<void> {
  const {
    filename = `${title || 'mindmap'}.pdf`,
    orientation = 'landscape',
    pageSize = 'a4',
  } = options

  // 获取 SVG 的边界框
  const bbox = svgElement.getBBox()
  const svgWidth = bbox.width + bbox.x * 2
  const svgHeight = bbox.height + bbox.y * 2

  // 克隆 SVG
  const svgClone = svgElement.cloneNode(true) as SVGSVGElement
  svgClone.setAttribute('width', String(svgWidth))
  svgClone.setAttribute('height', String(svgHeight))
  svgClone.style.background = 'white'

  // 创建包装容器
  const container = document.createElement('div')
  container.style.cssText = `
    background: white;
    padding: 20px;
  `
  
  // 添加标题
  if (title) {
    const titleElement = document.createElement('h1')
    titleElement.textContent = title
    titleElement.style.cssText = `
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 16px;
      text-align: center;
      color: #1a1a1a;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    `
    container.appendChild(titleElement)
  }
  
  container.appendChild(svgClone)
  
  // 临时添加到 DOM
  document.body.appendChild(container)
  
  try {
    await exportHtmlToPdf(container, {
      filename,
      orientation,
      pageSize,
      margin: 10,
    })
  } finally {
    document.body.removeChild(container)
  }
}

/**
 * 将 SVG 导出为图片
 */
export function exportSvgToImage(
  svgElement: SVGSVGElement,
  filename: string = 'mindmap.png',
  format: 'png' | 'jpeg' = 'png'
): void {
  // 获取 SVG 内容
  const svgClone = svgElement.cloneNode(true) as SVGSVGElement
  
  // 设置背景色
  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
  rect.setAttribute('width', '100%')
  rect.setAttribute('height', '100%')
  rect.setAttribute('fill', 'white')
  svgClone.insertBefore(rect, svgClone.firstChild)
  
  // 获取 SVG 边界
  const bbox = svgElement.getBBox()
  const padding = 20
  const width = bbox.width + padding * 2
  const height = bbox.height + padding * 2
  
  svgClone.setAttribute('width', String(width))
  svgClone.setAttribute('height', String(height))
  svgClone.setAttribute('viewBox', `${bbox.x - padding} ${bbox.y - padding} ${width} ${height}`)
  
  // 转换为 Base64
  const svgString = new XMLSerializer().serializeToString(svgClone)
  const base64 = btoa(unescape(encodeURIComponent(svgString)))
  const dataUrl = `data:image/svg+xml;base64,${base64}`
  
  // 创建 canvas 并绘制
  const canvas = document.createElement('canvas')
  const scale = 2 // 高清
  canvas.width = width * scale
  canvas.height = height * scale
  
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  
  const img = new Image()
  img.onload = () => {
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    
    // 下载
    const link = document.createElement('a')
    link.download = filename
    link.href = canvas.toDataURL(`image/${format}`, 0.95)
    link.click()
  }
  img.src = dataUrl
}
