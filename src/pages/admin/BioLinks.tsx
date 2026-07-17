import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2, Plus, X, MousePointerClick } from "lucide-react";
import { ICON_NAMES } from "@/pages/LinkBio";

interface BioLink {
  id: string;
  title: string;
  url: string;
  icon: string;
  order: number;
  is_active: boolean;
  clicks: number;
}

type Draft = {
  title: string;
  url: string;
  icon: string;
  order: number;
  is_active: boolean;
};

const empty: Draft = { title: "", url: "", icon: "Link2", order: 0, is_active: true };

export default function AdminBioLinks() {
  const [rows, setRows] = useState<BioLink[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BioLink | null>(null);
  const [draft, setDraft] = useState<Draft>(empty);
  const { toast } = useToast();

  const load = async () => {
    const { data, error } = await supabase
      .from("bio_links")
      .select("*")
      .order("order", { ascending: true });
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    setRows(data || []);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null);
    setDraft({ ...empty, order: rows.length + 1 });
    setOpen(true);
  };
  const openEdit = (l: BioLink) => {
    setEditing(l);
    setDraft({ title: l.title, url: l.url, icon: l.icon, order: l.order, is_active: l.is_active });
    setOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = editing
      ? await supabase.from("bio_links").update(draft).eq("id", editing.id)
      : await supabase.from("bio_links").insert(draft);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    toast({ title: editing ? "Link updated" : "Link created" });
    setOpen(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this link?")) return;
    const { error } = await supabase.from("bio_links").delete().eq("id", id);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    toast({ title: "Link deleted" });
    load();
  };

  const toggleActive = async (l: BioLink) => {
    const { error } = await supabase
      .from("bio_links")
      .update({ is_active: !l.is_active })
      .eq("id", l.id);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    load();
  };

  return (
    <div className="p-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-light">Bio Links</h1>
          <p className="text-sm text-muted-foreground mt-1">{rows.length} total · public page at /links</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm">
          <Plus className="w-4 h-4" /> New link
        </button>
      </div>

      <div className="border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left">
            <tr>
              <th className="px-4 py-3 font-medium w-16">Order</th>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">URL</th>
              <th className="px-4 py-3 font-medium">Icon</th>
              <th className="px-4 py-3 font-medium">Clicks</th>
              <th className="px-4 py-3 font-medium">Active</th>
              <th className="px-4 py-3 font-medium w-28">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(l => (
              <tr key={l.id} className="border-t border-border">
                <td className="px-4 py-3">{l.order}</td>
                <td className="px-4 py-3">{l.title}</td>
                <td className="px-4 py-3 text-muted-foreground truncate max-w-xs">{l.url}</td>
                <td className="px-4 py-3 text-muted-foreground">{l.icon}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <MousePointerClick className="w-3 h-3" /> {l.clicks}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleActive(l)}
                    className={`text-xs px-2 py-1 border ${l.is_active ? "border-accent text-accent" : "border-border text-muted-foreground"}`}
                  >
                    {l.is_active ? "Active" : "Hidden"}
                  </button>
                </td>
                <td className="px-4 py-3 flex gap-2">
                  <button onClick={() => openEdit(l)} className="p-2 hover:bg-muted"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => remove(l.id)} className="p-2 hover:bg-muted text-destructive"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">No links yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-background w-full max-w-md p-6 relative">
            <button onClick={() => setOpen(false)} className="absolute top-4 right-4"><X className="w-4 h-4" /></button>
            <h2 className="text-xl font-light mb-6">{editing ? "Edit" : "New"} link</h2>
            <form onSubmit={save} className="space-y-4">
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Title (name)</label>
                <input required value={draft.title} onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 border border-border" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">URL</label>
                <input required type="url" value={draft.url} onChange={e => setDraft(d => ({ ...d, url: e.target.value }))}
                  placeholder="https://…"
                  className="w-full mt-1 px-3 py-2 border border-border font-mono text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground">Order</label>
                  <input required type="number" value={draft.order} onChange={e => setDraft(d => ({ ...d, order: Number(e.target.value) }))}
                    className="w-full mt-1 px-3 py-2 border border-border" />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground">Icon</label>
                  <select value={draft.icon} onChange={e => setDraft(d => ({ ...d, icon: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 border border-border bg-background">
                    {ICON_NAMES.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={draft.is_active} onChange={e => setDraft(d => ({ ...d, is_active: e.target.checked }))} />
                Active (visible on public page)
              </label>
              <button type="submit" className="w-full py-2 bg-primary text-primary-foreground text-sm">Save</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
