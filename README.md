# Wholesale Product Marketplace

A modern wholesale marketplace website designed for B2B buyers to discover products, compare pricing tiers, explore supplier information, and manage cart actions with a smooth and responsive experience.

## Features

- Responsive homepage with a polished marketplace layout
- Hero carousel and market alert sections for featured promotions
- Category-based product browsing
- Advanced filtering and sorting options
  - Verified suppliers only
  - Category selection
  - Price sorting
  - Recommended/default ordering
- Product cards with quick product details and supplier information
- Load-more functionality for browsing larger catalogs
- Detailed product pages with:
  - Bulk pricing and standard pricing
  - MOQ and quantity calculator
  - Supplier verification badge
  - Shipping and product specifications
- Cart management using context-based state
- Smooth animations and transitions for a modern UI experience
- Contact vendor call-to-action for buyer engagement

## Tech Stack

### Frontend

- React.js
- React Router DOM
- Vite
- Tailwind CSS
- GSAP for animations
- Lucide React for icons
- PropTypes

### Backend

- Node.js
- Express.js
- CORS
- dotenv
- Nodemon

### Development Tools

- ESLint
- Concurrently

## Project Structure

- client/: Frontend React application
- server/: Backend server setup
- package.json: Root scripts for running the full project

## Getting Started

1. Install dependencies for the root project:

   ```bash
   npm install
   ```

2. Install client and server dependencies:

   ```bash
   npm install --prefix client
   npm install --prefix server
   ```

3. Start the full application:
   ```bash
   npm run dev
   ```

This will run the client and server together for local development.
