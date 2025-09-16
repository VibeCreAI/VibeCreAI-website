# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VibeCreAI Website is a stunning personal portfolio showcasing AI-human collaboration in web development. Built as a single-page application demonstrating creative possibilities when combining human imagination with AI tools (Claude and Cursor IDE). Features interactive themes, hidden games, neural network animations, and progressive content discovery through a terminal interface.

## Recent Updates & Improvements

### Latest Changes (2025)
- **Modular CSS Architecture**: Transitioned from single-file CSS to organized modules
- **UI/UX Improvements**: 
  - Changed "PROJECTS" to "APPS" for better clarity
  - Standardized button widths for visual consistency
  - Removed black text shadows from game buttons for cleaner appearance
  - Updated loading screen font color to white for better contrast
- **Enhanced Performance**: Multi-phase optimization system in Vibe Survivor game
- **Better Organization**: Separated JavaScript modules for improved maintainability
- **Code Quality**: Improved code structure and documentation

### Current Status
- ✅ Fully functional with all games operational
- ✅ Mobile-optimized with touch controls
- ✅ Cross-browser compatible (Chrome, Firefox, Safari, Edge)
- ✅ SEO optimized with complete meta tags
- ✅ Performance optimized with 60fps target
- ✅ Accessible with keyboard navigation support

## Tech Stack & Architecture

- **Frontend**: HTML5, CSS3, Vanilla JavaScript (ES6+)
- **Animations**: Anime.js library via CDN
- **Graphics**: Canvas API for neural network effects and games
- **Architecture**: Main HTML entry point with modular CSS and JavaScript components
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
├── index.html              # Main application entry point
├── js/                     # JavaScript modules (modular architecture)
│   ├── game-manager.js     # Game coordination system
│   ├── main.js             # Core application logic and animations
│   ├── menu-handler.js     # Navigation and menu interactions
│   ├── performance-utils.js # Performance monitoring utilities
│   ├── pixel-hover.js      # Pixel art hover effects
│   ├── pixel-maze-background.js # Dynamic maze background
│   ├── terminal.js         # Terminal interface functionality
│   ├── theme-switcher.js   # Theme system management
│   ├── vibe-runner-game.js # Side-scrolling runner game
│   ├── vibe-survivor-game.js # Advanced survival/defense game
│   └── components/         # Reusable component modules
├── styles/                 # Modular CSS architecture
│   ├── base.css           # Base styles and layout
│   ├── themes.css         # Theme color definitions
│   ├── animations.css     # Animation definitions
│   ├── components.css     # Component-specific styles
│   ├── responsive.css     # Mobile and responsive styles
│   └── pixel-hover.css    # Pixel art hover effects
├── images/                 # Static assets (favicon, social previews)
├── fonts/                  # Custom typography (Born2bSportyFS.otf)
└── sound/                  # Audio assets (prepared for future audio features)
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
- Modular CSS architecture with organized stylesheets

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

## Performance Optimization System

### Overview
The Vibe Survivor game includes a comprehensive 3-phase performance optimization system designed to handle intensive gameplay with hundreds of entities while maintaining smooth 60fps performance. The system is **future-proof** and will automatically optimize new weapons, enemies, and game features.

### Phase 1: Core Memory & Rendering Optimizations
- **Object Pooling**: Reuses projectiles, particles, explosions, and enemies to eliminate garbage collection
  - Projectile pool: 200 objects
  - Particle pool: 500 objects  
  - Explosion pool: 50 objects
- **Enhanced Frustum Culling**: Only renders entities visible on screen with intelligent distance-based culling
- **Smart Array Management**: Reverse iteration for safe removal during loops

### Phase 2: Spatial Optimization (Optional)
- **Quadtree Spatial Partitioning**: Available but disabled (caused weapon firing issues)
- Can be re-enabled for collision detection optimization if needed

### Phase 3: Advanced Rendering & Quality Systems
- **Batch Rendering**: Groups similar entities for efficient GPU calls
- **Canvas Layers**: Separates static/dynamic elements (currently disabled for stability)
- **Adaptive Quality Scaling**: Automatically adjusts visual fidelity based on performance
  - 5 quality levels (Ultra Low → Ultra High)
  - Real-time FPS monitoring with automatic quality adjustment
  - Scales particle count, shadow effects, trail length, and visual complexity

### Future-Proof Design for New Content

#### Adding New Weapons
```javascript
// New weapons automatically benefit from:
// 1. Object pooling - projectiles reused from existing pools
// 2. Frustum culling - only drawn when visible
// 3. Adaptive quality - visual effects scale with performance
// 4. Batch rendering - grouped with similar projectile types

createNewWeaponProjectile(x, y, type) {
    const projectile = this.getPooledProjectile(); // Uses existing pool
    projectile.type = 'new_weapon_type';
    // Rest of implementation...
}
```

#### Adding New Enemies
```javascript
// New enemies automatically benefit from:
// 1. Object pooling - reused from enemy pools
// 2. Frustum culling - only updated/rendered when near player
// 3. Batch rendering - grouped by behavior type

spawnNewEnemyType() {
    const enemy = this.getPooledEnemy(); // Uses existing pool
    enemy.behavior = 'new_behavior_type';
    // Optimization systems handle the rest automatically
}
```

#### Adding New Visual Effects
```javascript
// New effects automatically scale with adaptive quality:
shouldCreateEffect() {
    return this.shouldCreateParticle(); // Respects quality settings
}

getEffectIntensity() {
    return this.getQualityShadowBlur(); // Scales with performance
}
```

### Maintenance Guidelines

#### Performance Monitoring
- Game automatically logs quality level changes
- Monitor console for adaptive quality adjustments
- Target: Maintain 55+ FPS for optimal experience

#### Adding New Content Checklist
1. **Use existing object pools** - Never create objects in game loops
2. **Implement shouldRender() checks** - Respect frustum culling
3. **Use adaptive quality helpers** - shouldCreateParticle(), getQualityShadowBlur()
4. **Group similar entities** - Enable efficient batch rendering
5. **Test with many entities** - Verify performance with 50+ enemies

#### System Status Indicators
```javascript
// Check optimization status in browser console:
// ✅ "Batch rendering system initialized"
// ✅ "Adaptive quality scaling initialized at level 3"
// ✅ "Canvas layers system initialized" (when enabled)
// 🔺 "Adaptive quality: FPS 60.0 > 58, increasing quality 3 → 4"
```

The optimization system ensures **consistent performance** regardless of game complexity and **automatically adapts** to maintain smooth gameplay on all devices.