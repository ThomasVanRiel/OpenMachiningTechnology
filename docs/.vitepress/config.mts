import { defineConfig } from 'vitepress'
import { sidebar } from './sidebar.mts'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  lang: 'en-US',
  title: 'Open Machining Technology',
  titleTemplate: 'OMT - :title',
  description: "A VitePress Site",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Read the book', link: '/about-this-book' }
    ],
    
    sidebar,
    
    socialLinks: [
      { icon: 'github', link: 'https://github.com/ThomasVanRiel/OpenMachiningTechnology' }
    ],
    outline: {
      level: [2, 6],
      label: 'On this page'
    }, 
    footer: {
      message: 'Released under the MIT License.'
    },
    search: {
      provider: 'local'
    },
  },
  markdown: {
    math: true
  },
  head: [
    [
      'link',
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' }
    ],
    [
      'link',
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }
    ],
    [
      'link',
      { href: 'https://fonts.googleapis.com/css2?family=Source+Code+Pro:ital,wght@0,200..900;1,200..900&family=Source+Sans+3:ital,wght@0,200..900;1,200..900&family=Source+Serif+4:ital,opsz,wght@0,8..60,200..900;1,8..60,200..900&display=swap', rel: 'stylesheet' }
    ],
    [
      'script',
      { src: 'https://cdn.counter.dev/script.js', 'data-id': 'fa09609c-7c99-41c8-8b42-a06efa306a86', 'data-utcoffset': '1'}
    ]
  ],
  cleanUrls: true
})
