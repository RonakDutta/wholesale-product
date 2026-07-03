import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CartProvider } from "./context/CartContext";
import MainLayout from "./layouts/MainLayout";
import MarketplaceHome from "./pages/MarketplaceHome";
import ProductDetails from "./pages/ProductDetails";
// import WholesalerStore from "./pages/WholesalerStore";

const App = () => {
  return (
    <CartProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<MarketplaceHome />} />
            <Route path="product/:id" element={<ProductDetails />} />
            {/* <Route path="store/:id" element={<WholesalerStore />} /> */}
          </Route>
        </Routes>
      </BrowserRouter>
    </CartProvider>
  );
};

export default App;
