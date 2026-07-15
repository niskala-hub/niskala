import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import newsletterBg from "@/assets/newsletter-bg.jpg";

export default function NewsletterSignup() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    console.log("Newsletter signup:", email);
    toast({
      title: "You're subscribed!",
      description: "Thank you for signing up for our Monthly Dispatch.",
    });
    setEmail("");
    setIsSubmitting(false);
  };

  return (
    <section
      className="relative py-28 px-6"
      style={{ backgroundImage: `url(${newsletterBg})`, backgroundSize: "cover", backgroundPosition: "center" }}
    >
      <div className="absolute inset-0 bg-foreground/40" />
      <div className="relative z-10 max-w-md mx-auto text-center text-white">
        <h2 className="text-3xl md:text-4xl font-light mb-3 tracking-wide">Monthly Dispatch</h2>
        <p className="text-sm mb-8 text-white/80">Sign up to receive news and updates.</p>
        <form onSubmit={handleSubmit} className="flex gap-0">
          <input
            type="email"
            required
            placeholder="Email Address"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="flex-1 px-4 py-3 bg-white text-foreground text-sm placeholder:text-muted-foreground focus:outline-none"
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-3 bg-accent text-accent-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isSubmitting ? "..." : "Sign Up"}
          </button>
        </form>
      </div>
    </section>
  );
}
