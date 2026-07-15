import { useState } from "react";
import NewsletterSignup from "@/components/NewsletterSignup";
import { useToast } from "@/hooks/use-toast";

export default function Contact() {
  const { toast } = useToast();
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", subject: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast({
      title: "Message sent!",
      description: "Thank you for reaching out. We'll get back to you within 24 hours.",
    });
    setForm({ firstName: "", lastName: "", email: "", subject: "", message: "" });
    setIsSubmitting(false);
  };

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  const labelClass = "block text-sm text-foreground mb-1";
  const requiredClass = "text-accent text-xs ml-1";
  const inputClass = "w-full px-0 py-2 border-0 border-b border-border bg-transparent text-foreground text-sm focus:outline-none focus:border-foreground transition-colors";

  return (
    <>
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1.2fr] gap-16 items-start">
          {/* Left — Info */}
          <div>
            <h1 className="text-4xl md:text-5xl font-light text-foreground mb-8 leading-tight">
              Get in touch.
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground mb-10">
              We'd love to hear from you — whether you have a question about our knitwear, need help with an order, or want to discuss a custom commission. Our small team typically responds within one business day.
            </p>
            <div className="space-y-1">
              <p className="text-lg text-foreground font-medium">
                <a href="mailto:email@example.com" className="hover:underline">email@example.com</a>
              </p>
              <p className="text-lg text-foreground font-medium">
                <a href="tel:+15555555555" className="hover:underline">(555) 555-5555</a>
              </p>
            </div>
          </div>

          {/* Right — Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <p className="text-sm font-medium text-foreground mb-2">Name</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className={labelClass}>
                  First Name<span className={requiredClass}>(required)</span>
                </label>
                <input id="firstName" required value={form.firstName} onChange={update("firstName")} className={inputClass} />
              </div>
              <div>
                <label htmlFor="lastName" className={labelClass}>
                  Last Name<span className={requiredClass}>(required)</span>
                </label>
                <input id="lastName" required value={form.lastName} onChange={update("lastName")} className={inputClass} />
              </div>
            </div>
            <div>
              <label htmlFor="email" className={labelClass}>
                Email<span className={requiredClass}>(required)</span>
              </label>
              <input id="email" required type="email" value={form.email} onChange={update("email")} className={inputClass} />
            </div>
            <div>
              <label htmlFor="subject" className={labelClass}>
                Subject<span className={requiredClass}>(required)</span>
              </label>
              <input id="subject" required value={form.subject} onChange={update("subject")} className={inputClass} />
            </div>
            <div>
              <label htmlFor="message" className={labelClass}>
                Message<span className={requiredClass}>(required)</span>
              </label>
              <textarea id="message" required value={form.message} onChange={update("message")} className={`${inputClass} h-28 resize-vertical`} />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-8 py-3 bg-accent text-accent-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Sending..." : "Submit"}
            </button>
          </form>
        </div>
      </section>

      <NewsletterSignup />
    </>
  );
}
