---
layout: page
---
<script setup>
import {
  VPTeamPage,
  VPTeamPageTitle,
  VPTeamMembers
} from 'vitepress/theme-without-fonts'

const members = [
  {
    avatar: 'https://avatars.githubusercontent.com/u/11393106',
    name: 'Thomas Van Riel',
    title: 'Co-Author',
    links: [
      { icon: 'github', link: 'https://github.com/ThomasVanRiel'}
    ]

  },
  {
    avatar: '',
    name: 'K. D.',
    title: 'Co-Author'
  }
]
</script>

<VPTeamPage>
  <VPTeamPageTitle>
    <template #title>
      The authors
    </template>
    <template #lead>
      This book is written by these authors
    </template>
  </VPTeamPageTitle>
  <VPTeamMembers :members />
</VPTeamPage>