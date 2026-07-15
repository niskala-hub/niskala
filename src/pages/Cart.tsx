import { Link } from "react-router-dom";
import { useCart } from "@/context/CartContext";
import QuantitySelector from "@/components/QuantitySelector";
import { X } from "lucide-react";

export default function Cart() {
  const { items, updateQuantity, removeItem, subtotal } = useCart();

  if (items.length === 0) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-24">
        <h1 className="text-2xl font-medium text-foreground mb-4">Shopping Cart</h1>
        <p className="text-sm text-foreground mb-8">You have nothing in your shopping cart.</p>
        <Link
          to="/shop"
          className="inline-block px-8 py-4 bg-accent text-accent-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Continue Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-24">
      <h1 className="text-2xl font-medium text-foreground mb-12">Shopping Cart</h1>
      <div className="space-y-8">
        {items.map(item => (
          <div key={item.slug} className="flex gap-6 border-b border-border pb-8">
            <img src={item.image} alt={item.name} className="w-24 h-24 object-cover bg-[hsl(var(--warm-bg))]" />
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-base font-medium text-foreground">{item.name}</h3>
                  <p className="text-sm text-muted-foreground">${item.price.toFixed(2)}</p>
                </div>
                <button onClick={() => removeItem(item.slug)} aria-label="Remove item">
                  <X className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />
                </button>
              </div>
              <div className="mt-4">
                <QuantitySelector quantity={item.quantity} onChange={q => updateQuantity(item.slug, q)} />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-12 flex flex-col items-end gap-4">
        <p className="text-lg text-foreground">Subtotal: <span className="font-medium">${subtotal.toFixed(2)}</span></p>
        <button className="px-8 py-4 bg-accent text-accent-foreground text-sm font-medium hover:opacity-90 transition-opacity">
          Checkout
        </button>
      </div>
    </div>
  );
}
