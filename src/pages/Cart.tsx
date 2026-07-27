import { Link } from "react-router-dom";
import { useCart } from "@/context/CartContext";
import QuantitySelector from "@/components/QuantitySelector";
import { X } from "lucide-react";
import { formatIDR } from "@/lib/currency";

export default function Cart() {
  const { items, updateQuantity, removeItem, subtotal } = useCart();

  if (items.length === 0) {
    return (
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-16 md:py-24">
        <h1 className="text-xl md:text-2xl font-medium text-foreground mb-4">Shopping Cart</h1>
        <p className="text-sm text-foreground mb-8">You have nothing in your shopping cart.</p>
        <Link
          to="/shop"
          className="inline-block px-6 py-3 md:px-8 md:py-4 bg-accent text-accent-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Continue Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-16 md:py-24">
      <h1 className="text-xl md:text-2xl font-medium text-foreground mb-8 md:mb-12">Shopping Cart</h1>
      <div className="space-y-6 md:space-y-8">
        {items.map(item => (
          <div key={item.slug} className="flex gap-4 md:gap-6 border-b border-border pb-6 md:pb-8">
            <img src={item.image} alt={item.name} className="w-20 h-20 md:w-24 md:h-24 object-cover bg-[hsl(var(--warm-bg))] shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0">
                  <h3 className="text-sm md:text-base font-medium text-foreground truncate">{item.name}</h3>
                  <p className="text-sm text-muted-foreground">{formatIDR(item.price)}</p>
                </div>
                <button onClick={() => removeItem(item.slug)} aria-label="Remove item" className="shrink-0">
                  <X className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />
                </button>
              </div>
              <div className="mt-3 md:mt-4">
                <QuantitySelector quantity={item.quantity} onChange={q => updateQuantity(item.slug, q)} />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-8 md:mt-12 flex flex-col items-end gap-4">
        <p className="text-base md:text-lg text-foreground">Subtotal: <span className="font-medium">{formatIDR(subtotal)}</span></p>
        <button className="px-6 py-3 md:px-8 md:py-4 bg-accent text-accent-foreground text-sm font-medium hover:opacity-90 transition-opacity">
          Checkout
        </button>
      </div>
    </div>
  );
}
