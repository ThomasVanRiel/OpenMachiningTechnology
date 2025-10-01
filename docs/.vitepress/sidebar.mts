import type { DefaultTheme } from 'vitepress'

export const sidebar: DefaultTheme.Sidebar = [
  { text: 'About this book', link: '/about-this-book' },
  {
    text: 'I - Theoretical background',
    items: [
      { text: 'Introduction', link: '/theoretical-background/introduction' },
      { text: 'Equation Test', link: '/theoretical-background/equation-test' },
      { text: 'Cutting Geometry', link: '/theoretical-background/cutting-geometry' },

    ]
  },
  {
    text: 'II - Technological considerations',
    items: [
      { text: 'Introduction', link: '/technological-considerations/introduction' },
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
  { text: 'References', link: '/references' }
  
]