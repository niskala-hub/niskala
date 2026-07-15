import { useParams, Navigate, Link } from "react-router-dom";
import { useState } from "react";
import { getProductBySlug, getRelatedProducts } from "@/data/products";
import { useCart } from "@/context/CartContext";
import { useToast } from "@/hooks/use-toast";
import QuantitySelector from "@/components/QuantitySelector";
import ProductCard from "@/components/ProductCard";

export default function ProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const product = getProductBySlug(slug || "");
  const { addItem } = useCart();
  const { toast } = useToast();
  const [quantity, setQuantity] = useState(1);

  if (!product) return <Navigate to="/shop" replace />;

  const related = getRelatedProducts(product.slug, 3);
  const isSoldOut = product.badge === "sold-out";

  const handleAddToCart = () => {
    if (isSoldOut) return;
    addItem({ slug: product.slug, name: product.name, price: product.price, image: product.image }, quantity);
    toast({
      title: "Added to cart",
      description: `${quantity}× ${product.name} added to your cart.`,
    });
    setQuantity(1);
  };

  return (
    <>
      <section className="max-w-6xl mx-auto px-6 py-8">
        <nav className="text-sm text-muted-foreground mb-6">
          <Link to="/shop" className="hover:text-foreground transition-colors">Shop</Link>
          <span className="mx-2">›</span>
          <span className="text-foreground">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          {/* Image */}
          <div className="w-full aspect-[4/5] bg-warm-bg">
            <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
          </div>

          {/* Info */}
          <div className="flex flex-col">
            <h1 className="text-2xl md:text-3xl font-bold uppercase tracking-wide text-foreground mb-4">{product.name}</h1>
            <p className="text-4xl md:text-5xl font-bold text-foreground mb-6">${product.price.toFixed(2)}</p>
            {product.availability && (
              <p className="text-sm text-accent font-medium mb-4">{product.availability}</p>
            )}
            <p className="text-base leading-relaxed text-muted-foreground mb-8">{product.description}</p>

            {!isSoldOut ? (
              <div className="flex items-stretch gap-3">
                <QuantitySelector quantity={quantity} onChange={setQuantity} />
                <button
                  onClick={handleAddToCart}
                  className="flex-1 py-3 bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  Add To Cart
                </button>
              </div>
            ) : (
              <button
                disabled
                className="w-full py-3 bg-muted text-muted-foreground text-sm font-medium cursor-not-allowed"
              >
                Sold Out
              </button>
            )}
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 py-16">
          <h2 className="text-2xl font-light text-foreground mb-8">You Might Also Like</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {related.map(p => (
              <ProductCard key={p.slug} product={p} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}