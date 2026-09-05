# WhatsApp Broadcasting Platform - Design Guidelines

## Design Approach

**Selected System:** Carbon Design System + Material Design influences
**Rationale:** Enterprise-grade data application requiring robust information architecture, real-time data visualization, and complex table interactions. Carbon excels at data-dense interfaces while Material provides excellent real-time feedback patterns.

**Core Design Principles:**
- Data clarity and scanability over visual decoration
- Instant feedback for real-time updates
- Hierarchical information architecture for complex workflows
- Consistent interaction patterns across all modules

---

## Typography

**Font Family:** IBM Plex Sans (primary), IBM Plex Mono (data/numbers)
- **Display:** 2.5rem (40px) / 600 weight - Dashboard titles
- **H1:** 2rem (32px) / 600 weight - Page headers
- **H2:** 1.5rem (24px) / 600 weight - Section headers
- **H3:** 1.25rem (20px) / 500 weight - Card titles
- **Body Large:** 1rem (16px) / 400 weight - Primary content
- **Body:** 0.875rem (14px) / 400 weight - Table content, descriptions
- **Small:** 0.75rem (12px) / 400 weight - Labels, captions, timestamps
- **Mono:** IBM Plex Mono 0.875rem - Message IDs, phone numbers, API codes

**Hierarchy Rules:**
- Use weight variations (400/500/600) rather than size changes for subtle emphasis
- Monospace font for all technical identifiers (IDs, phone numbers, error codes)
- Consistent letter-spacing: -0.01em for headings, 0 for body

---

## Layout System

**Spacing Scale:** Tailwind units of **2, 3, 4, 6, 8, 12, 16, 24**
- **Micro spacing:** p-2, gap-2 (element padding, tight gaps)
- **Component spacing:** p-4, gap-4 (card padding, list gaps)
- **Section spacing:** p-6, py-8 (major component padding)
- **Page spacing:** p-8, py-12 (page margins, section breaks)
- **Module spacing:** py-16, gap-24 (large module separation)

**Grid System:**
- Dashboard: 12-column grid with 4-column sidebar (fixed 280px)
- Content area: max-w-7xl with responsive 1-4 column layouts
- Cards: Consistent 1/2/3/4 column grids based on content density
- Tables: Full-width within containers

**Container Strategy:**
- Sidebar navigation: Fixed w-70 (280px)
- Main content: flex-1 with px-8 py-6
- Modal overlays: max-w-2xl to max-w-4xl based on complexity
- Full-page tables: No max-width constraints

---

## Component Library

### Navigation
**Primary Sidebar (Fixed Left):**
- Dark background treatment with active state indicators
- Icon + label pattern (24px icons, 14px labels)
- Sections: Dashboard, Campaigns, Templates, Messages, Analytics, Settings
- Collapse state for focused work (icon-only mode)
- Live notification badges on relevant sections

**Top Bar:**
- Account info (right-aligned): Phone number status, quality rating badge, user menu
- Breadcrumb navigation (left-aligned)
- Real-time sync status indicator
- Height: h-16

### Dashboard Cards & Metrics
**Metric Cards:**
- White background with subtle border
- Large number display (2rem, 600 weight) with trend indicator
- Label (0.75rem) below number
- Icon (24px) in top-right corner
- 4-column grid on desktop, 2-column tablet, 1-column mobile
- Minimum height: h-32
- Live update pulse animation on data change

**Status Cards:**
- Color-coded left border (4px) for status indication
- Status badge in header
- Progress ring or bar for campaign tracking
- Last updated timestamp in footer

### Tables
**Message Tracking Table:**
- Alternating row backgrounds for scanability
- Fixed header row (sticky positioning)
- Column structure: Checkbox (32px), Status Icon (40px), Message ID (120px), Recipient (140px), Template (160px), Timestamps (120px each), Error (flex), Actions (80px)
- Row height: h-14 for comfortable data density
- Hover state: slight background change
- Real-time row highlight: brief background flash on update
- Pagination: 25/50/100 per page options

**Template Table:**
- Status badge (prominent column)
- Quality score indicator with color coding
- Last synced timestamp
- Quick actions: Edit, Duplicate, Delete
- Expandable rows for component preview

### Forms & Inputs
**Text Inputs:**
- Height: h-12
- Padding: px-4
- Border: 1px with focus state (2px)
- Label: 0.875rem above input with 0.5rem gap
- Helper text: 0.75rem below with 0.25rem gap
- Error states: Red border with error message

**Select Dropdowns:**
- Same height as text inputs (h-12)
- Chevron icon (right-aligned)
- Multi-select with chip display

**Template Builder:**
- Live preview panel (right side, 40% width)
- Form fields (left side, 60% width)
- Component sections: Header, Body, Footer, Buttons
- Character counters for text limitations
- Variable placeholder buttons for body text

### Buttons & Actions
**Primary Button:**
- Height: h-12
- Padding: px-6
- Font: 0.875rem, 500 weight
- Rounded: rounded-lg

**Secondary/Tertiary:**
- Same dimensions as primary
- Ghost buttons for tertiary actions

**Icon Buttons:**
- Square: w-10 h-10
- Rounded: rounded-lg
- Used for table actions, refresh triggers

### Real-time Elements
**Live Activity Feed:**
- Right sidebar or bottom panel
- Scrollable list of recent events
- Event types: Message sent, Template approved, Error occurred
- Timestamp for each event (relative time)
- Auto-scroll with pause option
- Max height: h-96

**Status Badges:**
- Height: h-6
- Padding: px-2
- Font: 0.75rem, 500 weight
- Rounded: rounded-full
- Pulsing animation for "pending" states
- Color coding: Green (approved/delivered), Yellow (pending/sent), Red (rejected/failed), Gray (disabled)

**Progress Indicators:**
- Campaign progress: Ring chart (120px diameter) or horizontal bar
- Real-time percentage updates
- Color gradient based on completion
- Animated transitions (0.3s ease)

### Modals & Overlays
**Standard Modal:**
- Backdrop: Semi-transparent dark overlay
- Content: max-w-2xl, rounded-xl
- Header: Sticky with title and close button
- Footer: Action buttons (right-aligned)
- Padding: p-6

**Confirmation Dialogs:**
- Smaller: max-w-md
- Prominent action buttons
- Warning icon for destructive actions

### Charts & Visualizations
**Dashboard Charts:**
- Line charts: Message delivery over time
- Bar charts: Status distribution, error types
- Donut charts: Template categories, message costs
- Height: h-80 standard size
- Tooltips on hover with precise values
- Legend positioned below chart

---

## Animations

**Use Sparingly:**
- Status badge pulse (pending states only)
- Row flash on real-time update (0.4s fade)
- Number counter animations for metric changes (0.6s)
- Loading skeletons for data fetch (pulse animation)
- No hover animations, no scroll-triggered effects

---

## Images

**No Hero Images:** This is a dashboard application - focus on data clarity
**Supporting Images:**
- Empty states: Illustrations for "No campaigns yet", "No templates found" (max-w-sm, centered)
- Template previews: WhatsApp-style message mockups in preview panel
- Quality: SVG illustrations or high-quality PNGs

**Icon Usage:**
- Heroicons (outline style) via CDN for UI elements
- Template category icons in template list
- Status indicators (checkmark, warning, error, clock)
- Navigation icons in sidebar