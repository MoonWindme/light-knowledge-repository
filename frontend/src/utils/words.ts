const WORD_PATTERN = /[A-Za-z0-9]+/g

export function countWordLike(text: string): number {
  if (!text) {
    return 0
  }

  let chineseCount = 0
  let ascii = ''

  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i)
    if (isCjk(code)) {
      chineseCount += 1
      ascii += ' '
    } else if (isAsciiWord(code)) {
      ascii += text[i]
    } else {
      ascii += ' '
    }
  }

  const matches = ascii.match(WORD_PATTERN)
  return chineseCount + (matches ? matches.length : 0)
}

function isAsciiWord(code: number) {
  return (
    (code >= 48 && code <= 57) ||
    (code >= 65 && code <= 90) ||
    (code >= 97 && code <= 122)
  )
}

function isCjk(code: number) {
  return (
    (code >= 0x4e00 && code <= 0x9fff) ||
    (code >= 0x3400 && code <= 0x4dbf) ||
    (code >= 0xf900 && code <= 0xfaff) ||
    (code >= 0x3000 && code <= 0x303f) ||
    (code >= 0xff00 && code <= 0xffef)
  )
}
