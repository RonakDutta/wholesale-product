# Wholesale Product Marketplace

A modern B2B wholesale marketplace platform designed for wholesalers/suppliers and retailers/buyers to connect, communicate, and purchase products. The platform enables bulk product discovery, supplier comparison, direct WhatsApp communication, and seamless order management.

## 🌟 Features

### User Management & Authentication
- **User Registration & Login**: Secure authentication system with role-based access
- **Role-Based Access Control**: 
  - **Buyer/Retailer**: Browse products, place orders, contact suppliers
  - **Supplier/Wholesaler**: Add products, manage orders, receive buyer inquiries
- **User Profiles**: Business information, contact details, and preferences
- **JWT Authentication**: Secure token-based authentication with automatic token refresh

### Marketplace Features
- **Responsive Homepage**: Modern marketplace layout with hero carousel and market alerts
- **Product Discovery**: 
  - Category-based browsing
  - Advanced search functionality
  - Verified supplier filtering
  - Price sorting and comparison
- **Product Details**:
  - Bulk pricing and standard pricing tiers
  - Minimum Order Quantity (MOQ) calculator
  - Supplier verification badges
  - Shipping information and specifications
  - Multiple supplier comparison
  - Real-time pricing updates

### Supplier Features
- **Product Management**: Add, edit, and manage product listings
- **Supplier Profiles**: Business information, trust scores, and verification status
- **Order Management**: View and manage incoming orders
- **WhatsApp Integration**: Direct buyer communication via WhatsApp
- **Inventory Tracking**: Stock levels and availability management

### Buyer Features
- **Cart Management**: Add products to cart with quantity management
- **Wishlist**: Save favorite products for later
- **Supplier Comparison**: Compare prices, MOQ, and shipping across suppliers
- **Order Tracking**: View order status and history
- **Direct Communication**: Contact suppliers via WhatsApp

### Dashboard Features
- **Buyer Dashboard**: 
  - Order overview and tracking
  - Wishlist management
  - Account settings
- **Supplier Dashboard**:
  - Product inventory management
  - Order management and status updates
  - Business analytics
  - Message center

### Communication Features
- **WhatsApp Integration**: 
  - Direct supplier contact without exposing phone numbers
  - Pre-filled messages with product information
  - Secure communication channel
- **Message Center**: In-platform messaging between buyers and suppliers

### Order Management
- **Order Creation**: Complete checkout flow with address validation
- **Payment Integration**: Razorpay payment gateway integration
- **Order Status Tracking**: Real-time order status updates
- **Order History**: Complete order history for both buyers and suppliers

## 🛠 Tech Stack

### Frontend
- **React.js**: UI framework with modern hooks and context API
- **Vite**: Fast build tool and development server
- **React Router DOM**: Client-side routing
- **Tailwind CSS**: Utility-first CSS framework for styling
- **GSAP**: Advanced animations and transitions
- **Lucide React**: Modern icon library
- **Axios**: HTTP client for API requests
- **Sonner**: Toast notifications
- **Context API**: State management for cart, wishlist, and authentication

### Backend
- **Node.js**: JavaScript runtime
- **Express.js**: Web application framework
- **PostgreSQL**: Relational database for data persistence
- **pg**: PostgreSQL client for Node.js
- **JWT**: JSON Web Tokens for authentication
- **bcryptjs**: Password hashing for security
- **Razorpay**: Payment gateway integration
- **CORS**: Cross-Origin Resource Sharing
- **dotenv**: Environment variable management
- **Nodemon**: Development server with auto-reload

### Development Tools
- **ESLint**: Code linting and formatting
- **Concurrently**: Run multiple scripts simultaneously
- **Git**: Version control

## 📁 Project Structure

```
wholesale-product/
├── client/                      # Frontend React application
│   ├── public/                  # Static assets
│   ├── src/
│   │   ├── components/         # Reusable components
│   │   │   ├── CartDrawer.jsx
│   │   │   ├── CategorySlider.jsx
│   │   │   ├── ContactVendorBtn.jsx
│   │   │   ├── FilterBar.jsx
│   │   │   ├── HeroCarousel.jsx
│   │   │   ├── Navbar.jsx
│   │   │   ├── ProductCard.jsx
│   │   │   ├── SupplierComparison.jsx
│   │   │   └── UserProfilePopup.jsx
│   │   ├── context/            # Context providers
│   │   │   ├── AuthContext.jsx
│   │   │   ├── CartContext.jsx
│   │   │   └── WishlistContext.jsx
│   │   ├── layouts/            # Layout components
│   │   │   ├── AuthLayout.jsx
│   │   │   ├── DashboardLayout.jsx
│   │   │   ├── InfoLayout.jsx
│   │   │   └── MainLayout.jsx
│   │   ├── pages/              # Page components
│   │   │   ├── dashboard/      # Dashboard pages
│   │   │   ├── BuyerDashboard.jsx
│   │   │   ├── SupplierDashboard.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── MarketplaceHome.jsx
│   │   │   ├── ProductDetails.jsx
│   │   │   ├── SearchResults.jsx
│   │   │   ├── SignUp.jsx
│   │   │   └── Wishlist.jsx
│   │   ├── utils/              # Utility functions
│   │   │   ├── axios.js
│   │   │   ├── mockProducts.js
│   │   │   └── supplierUtils.js
│   │   ├── App.jsx             # Main app component
│   │   ├── index.css           # Global styles
│   │   └── main.jsx            # Entry point
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── server/                     # Backend Express application
│   ├── src/
│   │   ├── config/             # Configuration files
│   │   │   └── db.js           # Database configuration
│   │   ├── controllers/        # Route controllers
│   │   │   ├── authController.js
│   │   │   ├── orderController.js
│   │   │   ├── paymentController.js
│   │   │   └── productController.js
│   │   ├── middlewares/        # Custom middlewares
│   │   │   └── authMiddleware.js
│   │   ├── models/             # Database models
│   │   │   ├── Order.js
│   │   │   ├── Product.js
│   │   │   └── User.js
│   │   ├── routes/             # API routes
│   │   │   ├── authRoutes.js
│   │   │   ├── orderRoutes.js
│   │   │   ├── paymentRoutes.js
│   │   │   └── productRoutes.js
│   │   ├── app.js              # Express app setup
│   │   └── server.js           # Server entry point
│   ├── .env                    # Environment variables
│   ├── package.json
│   └── nodemon.json
├── .gitignore
├── package.json                # Root package.json
└── README.md                   # This file
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- PostgreSQL database
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd wholesale-product
   ```

2. **Install root dependencies**
   ```bash
   npm install
   ```

3. **Install client dependencies**
   ```bash
   npm install --prefix client
   ```

4. **Install server dependencies**
   ```bash
   npm install --prefix server
   ```

### Environment Setup

1. **Configure server environment variables** (`server/.env`)
   ```env
   DATABASE_URL=postgresql://username:password@localhost:5432/database_name
   PORT=5000
   JWT_SECRET=your_jwt_secret_key
   RAZORPAY_KEY_ID=your_razorpay_key_id
   RAZORPAY_KEY_SECRET=your_razorpay_key_secret
   ```

2. **Configure client environment variables** (`client/.env`)
   ```env
   VITE_API_BASE_URL=http://localhost:5000
   VITE_RAZORPAY_KEY_ID=your_razorpay_key_id
   ```

### Database Setup

1. **Create PostgreSQL database**
   ```sql
   CREATE DATABASE wholesale_marketplace;
   ```

2. **Run database migrations** (if available)
   ```bash
   # Or manually create tables using the schema in server/src/config/db.js
   ```

### Running the Application

1. **Start the full application** (both client and server)
   ```bash
   npm run dev
   ```

2. **Or start individually**
   ```bash
   # Terminal 1 - Server
   cd server
   npm run dev

   # Terminal 2 - Client
   cd client
   npm run dev
   ```

3. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:5000

## 🔄 User Workflows

### Supplier Workflow
 ```
 Registration → Business Profile Setup → Add Products → 
 Receive Orders → Manage Inventory → Communicate with Buyers
 ```

### Buyer Workflow
 ```
 Registration → Browse Products → Compare Suppliers → 
 Add to Cart/Wishlist → Place Order → Complete Payment → 
 Track Order → Contact Suppliers via WhatsApp
 ```

## 🔐 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Role-based access control
- Input validation and sanitization
- Secure payment verification with Razorpay
- Protected API routes
- Environment variable management
- CORS configuration

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Products
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get product by ID
- `POST /api/products` - Create product (Supplier only)
- `GET /api/products/:id/contact` - Get WhatsApp contact link

### Orders
- `POST /api/orders/create` - Create new order
- `GET /api/orders/my-orders` - Get buyer's orders
- `GET /api/orders/supplier-orders` - Get supplier's orders
- `PUT /api/orders/:id/status` - Update order status

### Payments
- `POST /api/payment/create-order` - Create Razorpay order
- `POST /api/payment/verify` - Verify payment

## 🎨 UI/UX Features

- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Smooth Animations**: GSAP-powered transitions
- **Modern Components**: Clean, reusable component architecture
- **Loading States**: Skeleton loaders and spinners
- **Error Handling**: User-friendly error messages
- **Toast Notifications**: Real-time feedback with Sonner
- **Accessibility**: WCAG compliant design principles

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Ensure PostgreSQL is running
   - Check DATABASE_URL in server/.env
   - Verify database credentials

2. **Port Already in Use**
   - Change PORT in server/.env
   - Or kill the process using the port

3. **CORS Errors**
   - Check CORS configuration in server/src/app.js
   - Ensure frontend URL is allowed

4. **Payment Integration Issues**
   - Verify Razorpay credentials
   - Check RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET

## 📝 Development Notes

- The project uses PostgreSQL instead of MongoDB for better relational data management
- Authentication is JWT-based with role-based authorization
- The frontend uses React Context API for state management
- All API calls are made through a centralized Axios instance
- The project follows a component-based architecture for better maintainability

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 👥 Team

- **Developers**: [Your Team Name]
- **Project Type**: B2B Wholesale Marketplace Platform

## 📞 Support

For support and queries, please contact [your-email@example.com]

---

**Built with ❤️ for the wholesale community**
