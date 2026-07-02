import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import CategoryGrid from "./components/CategoryGrid";
import FeaturedProducts from "./components/FeaturedProducts";
import Footer from "./components/Footer";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <>
              <Navbar />
              <Hero />
              <CategoryGrid />
              <FeaturedProducts />
              <Footer />
            </>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
