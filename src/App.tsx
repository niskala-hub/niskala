import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/context/CartContext";
import { AuthProvider } from "@/hooks/useAuth";
import ComingSoonGate from "@/components/ComingSoonGate";
import ComingSoonPage from "./pages/ComingSoonPage";
import Layout from "@/components/Layout";
import Index from "./pages/Index";
import Shop from "./pages/Shop";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Cart from "./pages/Cart";
import ProductDetail from "./pages/ProductDetail";
import SleepDress from "./pages/SleepDress";
import LoungeSets from "./pages/LoungeSets";
import Auth from "./pages/Auth";
import AdminLayout from "./components/admin/AdminLayout";
import Dashboard from "./pages/admin/Dashboard";
import AdminCategories from "./pages/admin/Categories";
import AdminProducts from "./pages/admin/Products";
import AdminBioLinks from "./pages/admin/BioLinks";
import AdminUsers from "./pages/admin/Users";
import AdminAccounting from "./pages/admin/Accounting";
import AdminOrders from "./pages/admin/Orders";
import AdminProfile from "./pages/admin/Profile";
import LinkBio from "./pages/LinkBio";
import NotFound from "./pages/NotFound";
import ChangePassword from "./pages/ChangePassword";
import ConfirmInvite from "./pages/ConfirmInvite";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <CartProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ComingSoonGate>
            <Routes>
              <Route element={<Layout />}>
                <Route path="/" element={<Index />} />
                <Route path="/shop" element={<Shop />} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/product/:slug" element={<ProductDetail />} />
                <Route path="/collections/sleep-dress" element={<SleepDress />} />
                <Route path="/collections/lounge-sets" element={<LoungeSets />} />
              </Route>
              <Route path="/coming-soon" element={<ComingSoonPage />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/auth/change-password" element={<ChangePassword />} />
              <Route path="/auth/confirm-invite" element={<ConfirmInvite />} />
              <Route path="/dashboard" element={<Navigate to="/admin" replace />} />
              <Route path="/links" element={<LinkBio />} />
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="categories" element={<AdminCategories />} />
                <Route path="products" element={<AdminProducts />} />
                <Route path="bio-links" element={<AdminBioLinks />} />
                <Route path="accounting" element={<AdminAccounting />} />
                <Route path="orders" element={<AdminOrders />} />
                <Route path="profile" element={<AdminProfile />} />
                <Route path="users" element={<AdminUsers />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
            </ComingSoonGate>
          </BrowserRouter>
        </CartProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
