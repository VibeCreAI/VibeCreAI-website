# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VibeCreAI Website is a stunning personal portfolio showcasing AI-human collaboration in web development. Built as a single-page application demonstrating creative possibilities when combining human imagination with AI tools (Claude and Cursor IDE). Features interactive themes, hidden games, neural network animations, and progressive content discovery through a terminal interface.

## Tech Stack & Architecture

- **Frontend**: HTML5, CSS3, Vanilla JavaScript (ES6+)
- **Animations**: Anime.js library via CDN
- **Graphics**: Canvas API for neural network effects and games
- **Architecture**: Single-file application (index.html) with modular game components
- **Deployment**: Vercel with custom domain (vibecreai.com)
- **No Build Process**: Static files, no compilation required

## Development Commands

### Local Development
```powershell
# Serve locally (Windows)
python -m http.server 8000
# or
npx serve .
# Then visit http://localhost:8000

# Open in browser
start index.html
```

### Git Workflow
```powershell
git status
git add .
git commit -m "feat: description of changes"
git push origin main  # Auto-deploys via Vercel
```

## File Structure

```
├── index.html              # Main application (all HTML, CSS, core JS)
├── js/
│   ├── game-manager.js     # Game coordination system
│   ├── vibe-runner-game.js # Side-scrolling runner game
│   └── vibe-survivor-game.js # Survival/defense game
├── images/                 # Static assets (favicon, social previews)
├── fonts/                  # Custom typography (Born2bSportyFS.otf)
└── sound/                  # Audio assets
```

## Code Architecture

### Core Components
1. **Neural Network Animation**: Canvas-based particle system with hardware acceleration
2. **Theme System**: 4 visual themes using CSS custom properties (Default, Synthwave, Matrix, Ghost)
3. **Terminal Interface**: Progressive story revelation system
4. **Game Launcher**: Hidden games activated via double-click interactions
5. **Responsive Canvas**: Dynamic sizing with performance optimization

### JavaScript Patterns
- **ES6 Classes**: Games use class-based architecture (GameManager, VibeRunner, VibeSurvivor)
- **Event-Driven**: Heavy use of DOM events and custom event dispatching
- **Canvas Optimization**: Efficient rendering loops and particle management
- **Progressive Loading**: Games loaded dynamically only when activated

## Coding Conventions

### JavaScript Style
- Use ES6+ features (const/let, arrow functions, destructuring)
- Class names: PascalCase
- Variables/functions: camelCase
- Extensive event listener usage
- Canvas API for hardware-accelerated graphics

### CSS Style
- CSS custom properties for theming
- Mobile-first responsive design
- Animation-heavy with smooth transitions
- Embedded in HTML head for single-file architecture

### HTML Structure
- Semantic HTML5 elements
- Accessibility with ARIA labels and keyboard navigation
- SEO optimized with meta tags and structured data
- Progressive enhancement approach

## Testing & Quality Assurance

### Manual Testing Required
- **Cross-browser**: Chrome, Firefox, Safari, Edge
- **Mobile/Tablet**: All responsive breakpoints
- **Core Features**: Theme switching, neural animation, terminal interface
- **Hidden Games**: Both Vibe Runner and Vibe Survivor
- **Performance**: 60fps canvas animations
- **Accessibility**: Keyboard navigation and screen readers

### Validation Steps
- HTML validation (W3C validator)
- Browser console error checking
- Asset loading verification
- SEO meta tag validation

## Key Features to Understand

### Theme System
Four themes controlled by CSS custom properties:
- Default (Cyan/Blue)
- Synthwave (Pink/Purple)
- Matrix (Green)
- Ghost (White/Gray)

### Hidden Games
- **Activation**: Double-click interactions on specific elements
- **Vibe Runner**: Side-scrolling endless runner
- **Vibe Survivor**: Defense/survival game
- **Game Manager**: Coordinates between games and main site

### Neural Network Animation
- Canvas-based particle system
- Dynamic node connections
- Mouse interaction effects
- Performance-optimized rendering

## Development Philosophy

This project embodies AI-human collaboration principles:
- Human creativity drives vision and user experience
- AI assists with implementation and optimization
- Code should be readable and maintainable
- Performance and accessibility are priorities
- Single-file architecture for simplicity

## Deployment Notes

- Automatic deployment via Vercel on git push
- Custom domain configured through CNAME
- No build process or CI/CD required
- Static file serving with CDN optimization