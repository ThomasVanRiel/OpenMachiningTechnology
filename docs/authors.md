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
    title: 'Co-Founder',
    links: [
      { icon: 'github', link: 'https://github.com/ThomasVanRiel'}
    ]

  },
  {
    avatar: '',
    name: 'K. D.',
    title: 'Co-Founder'
  }
]
</script>

<VPTeamPage>
  <VPTeamPageTitle>
    <template #title>
      The founders
    </template>
    <template #lead>
      This project is initiated by these founders
    </template>
  </VPTeamPageTitle>
  <VPTeamMembers :members />
</VPTeamPage>