import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2, Plus, X, MousePointerClick, GripVertical, Link2, CheckCircle2, Trophy } from "lucide-react";
import { ICON_NAMES } from "@/pages/LinkBio";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface BioLink {
  id: string;
  title: string;
  url: string;
  icon: string;
  order: number;
  is_active: boolean;
  clicks: number;
  last_click_at: string | null;
}

function formatLastClick(value: string | null) {
  if (!value) return "Never";
  return new Date(value).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

type Draft = {
  title: string;
  url: string;
  icon: string;
  is_active: boolean;
};

const empty: Draft = { title: "", url: "", icon: "Link2", is_active: true };

function SortableRow({
  l,
  onEdit,
  onRemove,
  onToggle,
}: {
  l: BioLink;
  onEdit: (l: BioLink) => void;
  onRemove: (id: string) => void;
  onToggle: (l: BioLink) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: l.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <tr ref={setNodeRef} style={style} className="border-t border-border bg-background">
      <td className="px-4 py-3 w-16">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted"
          aria-label="Drag to reorder"
        >
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </button>
      </td>
      <td className="px-4 py-3 w-16 text-muted-foreground">{l.order}</td>
      <td className="px-4 py-3">{l.title}</td>
      <td className="px-4 py-3 text-muted-foreground truncate max-w-xs">{l.url}</td>
      <td className="px-4 py-3 text-muted-foreground">{l.icon}</td>
      <td className="px-4 py-3 font-medium">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent/10 text-accent font-medium text-xs">
          <MousePointerClick className="w-3.5 h-3.5" />
          {l.clicks} clicks
        </span>
      </td>
      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
        {formatLastClick(l.last_click_at)}
      </td>
      <td className="px-4 py-3">
        <button
          onClick={() => onToggle(l)}
          className={`text-xs px-2 py-1 border ${l.is_active ? "border-accent text-accent" : "border-border text-muted-foreground"}`}
        >
          {l.is_active ? "Active" : "Hidden"}
        </button>
      </td>
      <td className="px-4 py-3 flex gap-2">
        <button onClick={() => onEdit(l)} className="p-2 hover:bg-muted"><Pencil className="w-4 h-4" /></button>
        <button onClick={() => onRemove(l.id)} className="p-2 hover:bg-muted text-destructive"><Trash2 className="w-4 h-4" /></button>
      </td>
    </tr>
  );
}

export default function AdminBioLinks() {
  const [rows, setRows] = useState<BioLink[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BioLink | null>(null);
  const [draft, setDraft] = useState<Draft>(empty);
  const { toast } = useToast();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const load = async () => {
    const { data, error } = await supabase
      .from("bio_links")
      .select("*")
      .order("order", { ascending: true });
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    setRows(data || []);
  };

  useEffect(() => {
    load();

    const channel = supabase
      .channel("admin-bio-links-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bio_links" },
        (payload) => {
          if (payload.eventType === "UPDATE") {
            const updated = payload.new as BioLink;
            setRows((prev) =>
              prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r))
            );
          } else {
            load();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const totalClicks = useMemo(() => {
    return rows.reduce((sum, link) => sum + (link.clicks || 0), 0);
  }, [rows]);

  const activeLinksCount = useMemo(() => {
    return rows.filter((link) => link.is_active).length;
  }, [rows]);

  const mostClickedLink = useMemo(() => {
    if (!rows.length) return null;
    const sorted = [...rows].sort((a, b) => (b.clicks || 0) - (a.clicks || 0));
    return sorted[0].clicks > 0 ? sorted[0] : null;
  }, [rows]);

  const openNew = () => {
    setEditing(null);
    setDraft({ ...empty });
    setOpen(true);
  };
  const openEdit = (l: BioLink) => {
    setEditing(l);
    setDraft({ title: l.title, url: l.url, icon: l.icon, is_active: l.is_active });
    setOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      const { error } = await supabase.from("bio_links").update(draft).eq("id", editing.id);
      if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      const nextOrder = rows.length + 1;
      const { error } = await supabase.from("bio_links").insert({ ...draft, order: nextOrder });
      if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    }
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

  const onDragEnd = async (e: DragEvent | DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = rows.findIndex(r => r.id === active.id);
    const newIdx = rows.findIndex(r => r.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    const reordered = arrayMove(rows, oldIdx, newIdx).map((r, i) => ({ ...r, order: i + 1 }));
    setRows(reordered);
    const updates = reordered.map(r =>
      supabase.from("bio_links").update({ order: r.order }).eq("id", r.id)
    );
    const results = await Promise.all(updates);
    const err = results.find(r => r.error)?.error;
    if (err) {
      toast({ title: "Error saving order", description: err.message, variant: "destructive" });
      load();
    } else {
      toast({ title: "Order updated" });
    }
  };

  return (
    <div className="p-4 md:p-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-light">Bio Links</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your bio links and track lead click engagement · public page at /links
          </p>
        </div>
        <button onClick={openNew} className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground text-sm">
          <Plus className="w-4 h-4" /> New link
        </button>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 md:mb-8">
        <div className="border border-border p-4 bg-background">
          <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider mb-2">
            <MousePointerClick className="w-4 h-4 text-accent" />
            <span>Total Leads Clicks</span>
          </div>
          <p className="text-3xl font-light">{totalClicks}</p>
        </div>
        <div className="border border-border p-4 bg-background">
          <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider mb-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Active Bio Links</span>
          </div>
          <p className="text-3xl font-light">{activeLinksCount}</p>
        </div>
        <div className="border border-border p-4 bg-background">
          <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider mb-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            <span>Most Clicked Link</span>
          </div>
          {mostClickedLink ? (
            <div>
              <p className="text-xl font-medium truncate">{mostClickedLink.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{mostClickedLink.clicks} clicks</p>
            </div>
          ) : (
            <p className="text-xl font-light text-muted-foreground">-</p>
          )}
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {rows.map(l => (
          <div key={l.id} className="border border-border p-3">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-muted-foreground font-mono">#{l.order}</span>
                  <span className="text-sm font-medium truncate">{l.title}</span>
                </div>
                <p className="text-xs text-muted-foreground truncate mb-2">{l.url}</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium text-xs">
                    <MousePointerClick className="w-3 h-3" /> {l.clicks} clicks
                  </span>
                  <span>{l.icon}</span>
                  <span>Last: {formatLastClick(l.last_click_at)}</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <button
                  onClick={() => toggleActive(l)}
                  className={`text-xs px-2 py-1 border ${l.is_active ? "border-accent text-accent" : "border-border text-muted-foreground"}`}
                >
                  {l.is_active ? "Active" : "Hidden"}
                </button>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(l)} className="p-2 hover:bg-muted"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => remove(l.id)} className="p-2 hover:bg-muted text-destructive"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          </div>
        ))}
        {rows.length === 0 && (
          <p className="border border-border py-10 text-center text-sm text-muted-foreground">No links yet.</p>
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left">
            <tr>
              <th className="px-4 py-3 font-medium w-16"></th>
              <th className="px-4 py-3 font-medium w-16">Order</th>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">URL</th>
              <th className="px-4 py-3 font-medium">Icon</th>
              <th className="px-4 py-3 font-medium">Clicks</th>
              <th className="px-4 py-3 font-medium">Last Clicked</th>
              <th className="px-4 py-3 font-medium">Active</th>
              <th className="px-4 py-3 font-medium w-28">Actions</th>
            </tr>
          </thead>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={rows.map(r => r.id)} strategy={verticalListSortingStrategy}>
              <tbody>
                {rows.map(l => (
                  <SortableRow key={l.id} l={l} onEdit={openEdit} onRemove={remove} onToggle={toggleActive} />
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">No links yet.</td></tr>
                )}
              </tbody>
            </SortableContext>
          </DndContext>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-background w-full max-w-md p-4 sm:p-6 relative my-4 sm:my-8">
            <button onClick={() => setOpen(false)} className="absolute top-4 right-4"><X className="w-4 h-4" /></button>
            <h2 className="text-lg sm:text-xl font-light mb-5">{editing ? "Edit" : "New"} link</h2>
            <form onSubmit={save} className="space-y-4">
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Title (name)</label>
                <input required value={draft.title} onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
                  className="w-full mt-1 px-3 py-2.5 border border-border" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">URL</label>
                <input required type="url" value={draft.url} onChange={e => setDraft(d => ({ ...d, url: e.target.value }))}
                  placeholder="https://…"
                  className="w-full mt-1 px-3 py-2.5 border border-border font-mono text-sm" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Icon</label>
                <select value={draft.icon} onChange={e => setDraft(d => ({ ...d, icon: e.target.value }))}
                  className="w-full mt-1 px-3 py-2.5 border border-border bg-background">
                  {ICON_NAMES.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={draft.is_active} onChange={e => setDraft(d => ({ ...d, is_active: e.target.checked }))} />
                Active (visible on public page)
              </label>
              <button type="submit" className="w-full py-2.5 bg-primary text-primary-foreground text-sm">Save</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
