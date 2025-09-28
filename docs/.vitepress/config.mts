import { defineConfig } from 'vitepress'

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
      { text: 'Documentation', link: '/about-this-book' }
    ],
    
    sidebar: [
      { text: 'About this book', link: '/about-this-book' },
      {
        text: 'I - Theoretical background',
        items: [
          { text: 'Introduction', link: '/introduction-1' },
          { text: 'Equation test', link: '/taylor' },
          
        ]
      },
      {
        text: 'II - Technological considerations',
        items: [
          { text: 'Introduction', link: '/introduction-2' },
          { text: 'Clamping', items: [
            { text: 'Item A' },
            { text: 'Item B' },
                      
        ]}]
      },
      {
        text: 'III - Practical applications',
        items: [
          { text: 'Introduction' },
          { text: 'Item F' },
        ]
      },
      
    ],
    
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
      { href: 'https://fonts.googleapis.com/css2?family=Source+Sans+3&family=Source+Serif+4:opsz@8..60&display=swap', rel: 'stylesheet' }
    ]
  ]
})
