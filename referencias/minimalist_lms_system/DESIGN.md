---
name: Minimalist LMS System
colors:
  surface: '#f6f9ff'
  surface-dim: '#d6dae0'
  surface-bright: '#f6f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f4fa'
  surface-container: '#eaeef4'
  surface-container-high: '#e4e8ef'
  surface-container-highest: '#dfe3e9'
  on-surface: '#171c21'
  on-surface-variant: '#3e4850'
  inverse-surface: '#2c3136'
  inverse-on-surface: '#edf1f7'
  outline: '#6e7882'
  outline-variant: '#bec8d2'
  surface-tint: '#006493'
  primary: '#006493'
  on-primary: '#ffffff'
  primary-container: '#38b6ff'
  on-primary-container: '#004566'
  inverse-primary: '#8ccdff'
  secondary: '#7c5800'
  on-secondary: '#ffffff'
  secondary-container: '#feb700'
  on-secondary-container: '#6b4b00'
  tertiary: '#825500'
  on-tertiary: '#ffffff'
  tertiary-container: '#e99d0c'
  on-tertiary-container: '#5a3a00'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#cae6ff'
  primary-fixed-dim: '#8ccdff'
  on-primary-fixed: '#001e30'
  on-primary-fixed-variant: '#004b70'
  secondary-fixed: '#ffdea8'
  secondary-fixed-dim: '#ffba20'
  on-secondary-fixed: '#271900'
  on-secondary-fixed-variant: '#5e4200'
  tertiary-fixed: '#ffddb3'
  tertiary-fixed-dim: '#ffb94f'
  on-tertiary-fixed: '#291800'
  on-tertiary-fixed-variant: '#624000'
  background: '#f6f9ff'
  on-background: '#171c21'
  surface-variant: '#dfe3e9'
typography:
  h1:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  h2:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.3'
  h3:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '700'
    lineHeight: '1'
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 12px
  md: 24px
  lg: 32px
  xl: 48px
  sidebar_width: 240px
  container_max_width: 1200px
---

## Brand & Style

The brand personality of this design system is defined by clarity, accessibility, and a frictionless learning experience. It targets professional learners and students who require a distraction-free environment to absorb complex information. 

The aesthetic follows a **Minimalist Modern** approach, characterized by vast white space, a restricted but purposeful color palette, and high-quality typography. By removing non-essential decorative elements, the UI emphasizes content hierarchy and ease of use. The emotional response is intended to be one of calm focus and professional reliability, ensuring that the interface never competes with the educational material.

## Colors

The color palette is anchored by a pure white background to maintain a sense of openness and cleanliness. 

- **Primary (#38B6FF):** A vibrant sky blue used for brand identifiers, active navigation states, and primary call-to-action buttons. It signifies progress and clarity.
- **Secondary (#FFB800):** A warm amber used sparingly for "reward" elements, such as star ratings, badges, and progress milestones, providing a psychological "win" for the learner.
- **Neutrals:** Deep charcoals are used for high-legibility text, while soft slate grays are reserved for secondary information and iconography.

## Typography

This design system utilizes **Inter** for all typographic needs to ensure maximum readability across digital screens. 

The type scale is built on a clear hierarchy: 
- Large, bold headlines in high-contrast black for section titles.
- Generous line heights for body text to reduce eye strain during long reading sessions.
- Small, uppercase labels for utility text like "Available Packages" or status indicators.
- Medium-weight subheaders to organize course syllabi and modular content effectively.

## Layout & Spacing

The layout utilizes a **Fixed Sidebar + Fluid Content** model. The sidebar is intentionally narrow and simplified to house only 'My Courses' and 'Account', ensuring the user's focus remains on the dashboard or course player.

A generous 24px to 32px padding is maintained around all major containers to create a "breathable" interface. Grid gutters are kept consistent at 24px. The design relies on internal white space within cards rather than heavy borders to separate content modules, creating a more open and modern feel.

## Elevation & Depth

To maintain the minimalist aesthetic while providing visual structure, depth is achieved through **Ambient Shadows** rather than lines. 

- **Level 1 (Cards/Sidebar):** Very soft, diffused shadows with 0px offset, 15px blur, and 4-6% opacity. This creates a subtle "lift" from the pure white background.
- **Level 2 (Modals/Overlays):** Increased blur (30px) and slightly higher opacity (10%) to indicate clear priority over the base layer.
- **Surface Tints:** Occasional use of an off-white or very light blue tint (#F0F9FF) for background sections behind cards to further distinguish the "working area" from the "navigation area."

## Shapes

The shape language is defined by **pronounced roundedness**, ranging from 12px to 16px. 

- **Primary Containers (Cards):** Use a 16px radius to appear soft and friendly.
- **Interactive Elements (Buttons/Inputs):** Use a 12px radius to maintain consistency with the larger containers while feeling more precise.
- **Progress Bars:** Use fully rounded (pill-shaped) caps to signify fluid movement and completion.

## Components

### Navigation
The sidebar is minimalist, featuring a vertical list of two items: 'My Courses' and 'Account'. Active states are indicated by a light blue background tint (#EBF8FF) and a bold primary blue text color.

### Course Cards
Cards are the primary content container. They feature a top-heavy layout with a thumbnail (16:9 ratio), followed by a bold title, a secondary-color progress indicator (gold), and a subtle completion percentage label.

### Buttons
- **Primary:** Solid #38B6FF with white text, 12px rounded corners.
- **Secondary:** Transparent with a 1px border of #38B6FF or #FFB800 for achievement-related actions.

### Lesson Lists
Instructional content is organized into accordion-style modules. Active lessons are highlighted with a soft blue background and a primary-colored play icon. Completed lessons feature a gold star icon to leverage the secondary brand color for positive reinforcement.

### Progress Bars
Utilize a two-tone blue or blue-to-gold approach to visualize course completion. The track should be a very light gray or pale blue, with a vibrant #38B6FF fill.