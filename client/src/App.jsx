import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CartProvider } from "./context/CartContext";
import { WishlistProvider } from "./context/WishlistContext";
import MainLayout from "./layouts/MainLayout";
import MarketplaceHome from "./pages/MarketplaceHome";
import ProductDetails from "./pages/ProductDetails";
import Wishlist from "./pages/Wishlist";
// import WholesalerStore from "./pages/WholesalerStore";

const App = () => {
  return (
    <CartProvider>
      <WishlistProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<MainLayout />}>
              <Route index element={<MarketplaceHome />} />
              <Route path="product/:id" element={<ProductDetails />} />
              <Route path="wishlist" element={<Wishlist />} />
              {/* <Route path="store/:id" element={<WholesalerStore />} /> */}
            </Route>
          </Routes>
        </BrowserRouter>
      </WishlistProvider>
    </CartProvider>
  );
};

export default App;
