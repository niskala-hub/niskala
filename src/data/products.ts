import defaultImage from "@/assets/defaults/default-image.jpg";

export interface Product {
  slug: string;
  name: string;
  price: number;
  originalPrice?: number;
  original_price?: number;
  image: string;
  description: string;
  badge?: "sale" | "sold-out";
  availability?: string;
  status?: "ready" | "coming_soon" | "sold";
  price_status?: "active" | "coming_soon" | string | null;
  stock?: number;
}

export const products: Product[] = [
  {
    slug: "spring-blade",
    name: "Moss Stitch Cardigan",
    price: 350000,
    image: defaultImage,
    description:
      "Hand-knitted from locally sourced wool using a textured moss stitch pattern. The relaxed silhouette drapes naturally, with hand-carved wooden buttons and ribbed cuffs for a refined finish.",
  },
  {
    slug: "classic-set",
    name: "Cable Knit Sweater",
    price: 350000,
    image: defaultImage,
    description:
      "A timeless cable knit pullover crafted from undyed heritage wool. Each twist and braid is worked by hand, creating a rich surface texture that softens beautifully with wear.",
  },
  {
    slug: "country-feast-set",
    name: "Merino Wool Scarf Set",
    price: 350000,
    image: defaultImage,
    description:
      "A coordinated set of two generously sized scarves in complementary earth tones. Knitted from extra-fine merino for a soft hand feel, with hand-twisted fringe detailing.",
  },
  {
    slug: "earth-sky-planter",
    name: "Alpaca Blend Beanie",
    price: 280000,
    originalPrice: 350000,
    image: defaultImage,
    badge: "sale",
    description:
      "A cozy ribbed beanie knitted from a baby alpaca and wool blend. Lightweight yet warm, with a gently slouched crown and folded brim that fits all head sizes.",
  },
  {
    slug: "golden-blush-cup",
    name: "Ribbed Wool Vest",
    price: 350000,
    image: defaultImage,
    description:
      "A versatile layering piece in a deep rib knit, crafted from medium-weight lambswool. The V-neck and clean armholes make it perfect over a shirt or worn alone in warmer months.",
  },
  {
    slug: "harvest-moon-cup",
    name: "Chunky Knit Pullover",
    price: 350000,
    image: defaultImage,
    availability: "Only 4 available",
    description:
      "Our most substantial knit — a chunky-gauge pullover worked in a bold herringbone pattern. Made from hand-dyed wool in our signature rust colorway, with dropped shoulders and a relaxed fit.",
  },
  {
    slug: "milk-dip-cup",
    name: "Cashmere Wrap",
    price: 350000,
    image: defaultImage,
    description:
      "An oversized wrap knitted from pure Mongolian cashmere in a delicate stockinette stitch. Finished with a subtle fringe edge, this piece is as soft as it is elegant.",
  },
  {
    slug: "salt-spout",
    name: "Heritage Mittens",
    price: 350000,
    image: defaultImage,
    badge: "sold-out",
    description:
      "Traditional stranded colourwork mittens inspired by Nordic knitting heritage. Knitted from sturdy Shetland wool in natural undyed shades for a piece that tells a story.",
  },
  {
    slug: "golden-mist-pair",
    name: "Lambswool Socks Pair",
    price: 350000,
    image: defaultImage,
    description:
      "A pair of mid-calf socks knitted from brushed lambswool with reinforced heels and toes. The ribbed leg ensures a snug fit, while the soft fiber keeps feet warm all day.",
  },
];

export const featuredProducts = [
  products.find((p) => p.slug === "golden-mist-pair")!,
  products.find((p) => p.slug === "milk-dip-cup")!,
  products.find((p) => p.slug === "harvest-moon-cup")!,
];

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

export function getRelatedProducts(slug: string, count = 3): Product[] {
  return products
    .filter((p) => p.slug !== slug && p.badge !== "sold-out")
    .slice(0, count);
}
