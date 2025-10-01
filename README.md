## Style guide


### Directory structure

All .md files are named in kebab-casing.md, components in PascalCase.vue

```
Book
├─ Part I
│  ├─ Chapter 1
│  ├─ Chapter 2
│  └─ ...
├─ Part 2
└─ ...
```


### Citations
Citations are formatted according to the APA guidelines (to avoid complex numbering schemes (IEEE) which are sadly difficult to interpret using multiple webpages)


## Instructions for contributors
### Initial setup
#### Install software
Download Git for windows
Download node.js https://nodejs.org/en/download
Sign in copilot using GitHub

#### To clone the repo
*CTRL+SHIFT+P* - Git Clone - enter repo URL (https://github.com/ThomasVanRiel/OpenMachiningTechnology)
Select C:/Workdir/Develop/ as repository destination (on KUL laptops)

To contribute: *CTRL+SHIFT+P* - Git: Checkout to... - origin/dev
(This makes sure that you are changing the development branch, as the main branch is automatically built and published)

#### Installing the node.js server
*CTRL+SHIFT+P* - Terminal: Select default profile - Command prompt

Open new terminal (*CTRL+SHIFT+`*)
C:\Workdir\Develop\OpenMachiningTechnology>npm install

### To start dev server (when working on the book) 
C:\Workdir\Develop\OpenMachiningTechnology>npm run docs:dev
Open browser and go to page indicated, e.g. http://localhost:5173/
