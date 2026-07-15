import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2, Plus, X } from "lucide-react";

interface Category {
  id: string;
  name: string;
  slug: string;
}

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export default function Categories() {
  const [rows, setRows] = useState<Category[]>([]);
  const [editing, setEditing] = useState<Category | null>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const { toast } = useToast();

  const load = async () => {
    const { data, error } = await supabase.from("categories").select("*").order("created_at", { ascending: false });
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    setRows(data || []);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setName(""); setSlug(""); setOpen(true); };
  const openEdit = (c: Category) => { setEditing(c); setName(c.name); setSlug(c.slug); setOpen(true); };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { name, slug: slug || slugify(name) };
    const { error } = editing
      ? await supabase.from("categories").update(payload).eq("id", editing.id)
      : await supabase.from("categories").insert(payload);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    toast({ title: editing ? "Category updated" : "Category created" });
    setOpen(false); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this category?")) return;
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    toast({ title: "Category deleted" });
    load();
  };

  return (
    <div className="p-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-light">Categories</h1>
          <p className="text-sm text-muted-foreground mt-1">{rows.length} total</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm">
          <Plus className="w-4 h-4" /> New category
        </button>
      </div>

      <div className="border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Slug</th>
              <th className="px-4 py-3 font-medium w-32">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(c => (
              <tr key={c.id} className="border-t border-border">
                <td className="px-4 py-3">{c.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{c.slug}</td>
                <td className="px-4 py-3 flex gap-2">
                  <button onClick={() => openEdit(c)} className="p-2 hover:bg-muted"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => remove(c.id)} className="p-2 hover:bg-muted text-destructive"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={3} className="px-4 py-12 text-center text-muted-foreground">No categories yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-background w-full max-w-md p-6 relative">
            <button onClick={() => setOpen(false)} className="absolute top-4 right-4"><X className="w-4 h-4" /></button>
            <h2 className="text-xl font-light mb-6">{editing ? "Edit" : "New"} category</h2>
            <form onSubmit={save} className="space-y-4">
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Name</label>
                <input required value={name} onChange={e => { setName(e.target.value); if (!editing) setSlug(slugify(e.target.value)); }}
                  className="w-full mt-1 px-3 py-2 border border-border" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Slug</label>
                <input required value={slug} onChange={e => setSlug(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-border font-mono text-sm" />
              </div>
              <button type="submit" className="w-full py-2 bg-primary text-primary-foreground text-sm">Save</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
