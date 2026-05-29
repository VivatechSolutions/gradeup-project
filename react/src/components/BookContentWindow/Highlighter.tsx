import React, { useEffect, useState } from 'react';
import { Highlight } from './BookContentWindow';
import { Trash2, Edit3, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Label } from '../ui/label';

interface Props {
  highlights: Highlight[];
  setHighlights: React.Dispatch<React.SetStateAction<Highlight[]>>;
  editingHighlight: Highlight | null;
  setEditingHighlight: React.Dispatch<React.SetStateAction<Highlight | null>>;
}

const CSS = `
.hl-dialog-content {
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
}
.hl-dialog-content * {
  font-family: inherit;
  box-sizing: border-box;
}

/* Scrollable quote block */
.hl-quote-scroll {
  max-height: 130px;
  overflow-y: auto;
  background: rgba(139,92,246,.08);
  border: 1px solid rgba(139,92,246,.25);
  border-left: 3px solid #8b5cf6;
  border-radius: 0 10px 10px 0;
  padding: 10px 14px;
  font-size: 13px;
  font-style: italic;
  color: rgba(221,214,254,.9);
  line-height: 1.65;
  cursor: text;
  scrollbar-width: thin;
  scrollbar-color: rgba(139,92,246,.4) transparent;
}
.hl-quote-scroll::-webkit-scrollbar { width: 4px; }
.hl-quote-scroll::-webkit-scrollbar-thumb { background: rgba(139,92,246,.4); border-radius: 4px; }

.hl-label {
  font-size: 10.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .08em;
  color: rgba(167,139,250,.7);
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 7px;
}

.hl-textarea {
  width: 100%;
  min-height: 96px;
  padding: 10px 14px;
  border-radius: 12px;
  border: 1.5px solid rgba(139,92,246,.25);
  background: rgba(255,255,255,.05);
  color: #fff;
  font-size: 13.5px;
  resize: none;
  outline: none;
  line-height: 1.6;
  transition: border .18s, box-shadow .18s;
}
.hl-textarea:focus {
  border-color: rgba(139,92,246,.6);
  box-shadow: 0 0 0 3px rgba(139,92,246,.12);
}
.hl-textarea::placeholder { color: rgba(167,139,250,.4); }

/* Footer buttons */
.hl-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 4px;
}
.hl-btn-delete {
  display: flex; align-items: center; gap: 6px;
  padding: 9px 14px; border-radius: 12px;
  border: 1.5px solid rgba(239,68,68,.3);
  background: none; cursor: pointer;
  color: #f87171;
  font-size: 12.5px; font-weight: 700;
  font-family: inherit;
  transition: all .18s;
}
.hl-btn-delete:hover { background: rgba(239,68,68,.12); border-color: rgba(239,68,68,.5); color: #ef4444; }

.hl-btn-cancel {
  margin-left: auto;
  padding: 9px 16px; border-radius: 12px;
  border: 1.5px solid rgba(139,92,246,.25);
  background: none; cursor: pointer;
  color: rgba(167,139,250,.8);
  font-size: 12.5px; font-weight: 600;
  font-family: inherit;
  transition: all .18s;
}
.hl-btn-cancel:hover { background: rgba(139,92,246,.1); }

.hl-btn-save {
  padding: 9px 20px; border-radius: 12px;
  border: none; cursor: pointer;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #fff;
  font-size: 12.5px; font-weight: 700;
  font-family: inherit;
  box-shadow: 0 4px 14px rgba(99,102,241,.32);
  transition: all .2s;
}
.hl-btn-save:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(99,102,241,.45); }
`;

const Highlighter: React.FC<Props> = ({
  highlights,
  setHighlights,
  editingHighlight,
  setEditingHighlight,
}) => {
  const [editedComment, setEditedComment] = useState('');

  useEffect(() => {
    if (editingHighlight) setEditedComment(editingHighlight.comment || '');
  }, [editingHighlight]);

  const handleSave = () => {
    if (!editingHighlight) return;
    setHighlights(prev =>
      prev.map(h => h.id === editingHighlight.id ? { ...h, comment: editedComment } : h)
    );
    setEditingHighlight(null);
  };

  const handleDelete = () => {
    if (!editingHighlight) return;
    // Filter out this highlight. The useEffect in BookContentWindow
    // automatically syncs the updated array to localStorage.
    setHighlights(prev => prev.filter(h => h.id !== editingHighlight.id));
    setEditingHighlight(null);
  };

  const close = () => setEditingHighlight(null);

  return (
    <>
      <style>{CSS}</style>
      <Dialog open={!!editingHighlight} onOpenChange={open => !open && close()}>
        <DialogContent
          className="hl-dialog-content sm:max-w-[460px] p-0 overflow-hidden border-0 shadow-2xl"
          style={{
            background: "linear-gradient(145deg, #1e1b4b 0%, #0f172a 100%)",
            border: "1px solid rgba(139,92,246,.28)",
            borderRadius: 20,
            zIndex: 100000,  /* above book, AI panel, context menu */
          }}
        >
          {/* Header */}
          <DialogHeader style={{ padding: "20px 24px 16px", borderBottom: "1px solid rgba(139,92,246,.15)" }}>
            <DialogTitle style={{
              fontSize: 17, fontWeight: 800,
              background: "linear-gradient(135deg,#a78bfa,#f472b6)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <Edit3 size={16} style={{ color: "#a78bfa" }} />
              Edit Your Insight
            </DialogTitle>
            <DialogDescription style={{ fontSize: 12, color: "rgba(167,139,250,.6)", marginTop: 4 }}>
              Refine or remove your note for this highlighted passage.
            </DialogDescription>
          </DialogHeader>

          {/* Body */}
          <div style={{ padding: "16px 24px 20px", display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Highlighted text — scrollable */}
            {editingHighlight && (
              <div>
                <div className="hl-label">
                  <span style={{ fontSize: 12 }}>✏️</span>
                  Highlighted text
                </div>
                <div className="hl-quote-scroll">
                  "{editingHighlight.text}"
                </div>
                <div style={{ fontSize: 10, color: "rgba(148,163,184,.45)", marginTop: 4, textAlign: "right" }}>
                  {editingHighlight.text.length} characters
                </div>
              </div>
            )}

            {/* Note textarea */}
            <div>
              <div className="hl-label">
                <span style={{ fontSize: 12 }}>📝</span>
                Your note (optional)
              </div>
              <textarea
                className="hl-textarea"
                value={editedComment}
                onChange={e => setEditedComment(e.target.value)}
                placeholder="Why is this passage important to you…?"
              />
            </div>

            {/* Action buttons */}
            <div className="hl-footer">
              <button className="hl-btn-delete" onClick={handleDelete}>
                <Trash2 size={13} />
                Delete highlight
              </button>
              <button className="hl-btn-cancel" onClick={close}>
                Cancel
              </button>
              <button className="hl-btn-save" onClick={handleSave}>
                Save Changes ✦
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Highlighter;