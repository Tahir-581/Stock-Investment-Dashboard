declare module 'sentiment' {
  interface SentimentResult {
    score: number
    comparative: number
    calculation: { [token: string]: number }
    tokens: string[]
    words: string[]
    positive: string[]
    negative: string[]
  }

  export default class Sentiment {
    analyze(phrase: string, extras?: object, language?: string): SentimentResult
  }
}

declare module 'rss-parser' {
  interface Item {
    guid?: string
    link?: string
    title?: string
    content?: string
    contentSnippet?: string
    pubDate?: string
  }

  interface Feed {
    items: Item[]
  }

  interface ParserOptions {
    timeout?: number
    headers?: Record<string, string>
  }

  export default class Parser {
    constructor(options?: ParserOptions)
    parseURL(url: string): Promise<Feed>
  }
}
