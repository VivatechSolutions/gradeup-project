import React, { useState, useMemo } from "react";
import { Loader2, Plus, Trash2, AlertCircle, Pin, PinOff } from "lucide-react";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { ChatHistory } from "../pages/ai-tutor-modern";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog";

interface ChatHistoryPanelProps {
  chatHistory: ChatHistory[];
  currentChatId: string | null;
  loadChat: (chat: ChatHistory) => void;
  startNewChat: () => void;
  deleteChat: (chatId: string) => void;
  clearAllHistory: () => void;
  isLoading?: boolean;
}

export function ChatHistoryPanel({
  chatHistory,
  currentChatId,
  loadChat,
  startNewChat,
  deleteChat,
  clearAllHistory,
  isLoading,
}: ChatHistoryPanelProps) {
  const [open, setOpen] = useState(false);
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);

  // Toggle pin status
  const togglePin = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setPinnedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [id, ...prev]
    );
  };

  // Sort: Pinned chats first
  const sortedHistory = useMemo(() => {
    return [...chatHistory].sort((a, b) => {
      const aPinned = pinnedIds.includes(a.id) ? 1 : 0;
      const bPinned = pinnedIds.includes(b.id) ? 1 : 0;
      return bPinned - aPinned;
    });
  }, [chatHistory, pinnedIds]);

  return (
    <div className="h-[390px] w-full max-w-full md:max-w-[340px] lg:max-w-[380px] mx-auto flex flex-col bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
      
      {/* HEADER */}
      <div className="p-2 px-3 flex flex-row justify-between items-center border-b border-slate-100 dark:border-slate-800 shrink-0 z-20 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
          History {pinnedIds.length > 0 && `(${pinnedIds.length} Pinned)`}
        </h3>
        <div className="flex gap-1">
          <Button onClick={startNewChat} size="sm" variant="ghost" className="h-6 w-6 p-0 hover:bg-blue-50 dark:hover:bg-blue-900/20">
            <Plus className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
          </Button>
          
          <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-400 hover:text-red-500">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="max-w-[300px] rounded-xl">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500" /> Clear History?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-xs">
                  Permanently delete all sessions.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-row gap-2">
                <AlertDialogCancel className="mt-0 flex-1 text-xs h-8">Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={clearAllHistory} className="bg-red-500 hover:bg-red-600 flex-1 text-xs h-8">
                  Delete All
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* BODY */}
      <div className="flex-1 min-h-0 relative">
        {isLoading && (
          <div className="absolute inset-0 bg-white/60 dark:bg-slate-950/60 flex items-center justify-center z-30 backdrop-blur-[1px]">
            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
          </div>
        )}

        <ScrollArea className="h-full w-full no-scrollbar">
          <div className="p-2 space-y-1">
            {sortedHistory.length > 0 ? (
              sortedHistory.map((chat) => {
                const isPinned = pinnedIds.includes(chat.id);
                return (
                  <div
                    key={chat.id}
                    onClick={() => loadChat(chat)}
                    className={`group relative flex flex-col justify-center px-2.5 py-1.5 rounded-lg cursor-pointer transition-all duration-200 ${
                      currentChatId === chat.id
                        ? "bg-blue-50/70 dark:bg-blue-900/20 ring-1 ring-blue-100 dark:ring-blue-800/40"
                        : "hover:bg-slate-50 dark:hover:bg-slate-900/40"
                    }`}
                    style={{ minHeight: '44px' }}
                  >
                    {/* COMPACT TEXT */}
                    <div className="chat-fade-mask" style={{ width: 'calc(100% - 45px)', overflow: 'hidden' }}>
                      <div className="whitespace-nowrap flex items-center gap-1.5">
                        {isPinned && <Pin className="h-2.5 w-2.5 text-blue-500 shrink-0 rotate-45" />}
                        <span className="font-medium text-[12.5px] text-slate-700 dark:text-slate-200 inline-block chat-marquee-target">
                          {chat.title || "Untitled Chat"}
                        </span>
                      </div>
                      <p className="text-[10.5px] text-slate-400 dark:text-slate-500 truncate mt-0.5 ml-0">
                        {chat.unit || chat.subject || "No details"}
                      </p>
                    </div>

                    {/* ACTIONS CONTAINER */}
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-all z-10">
                      <Button
                        onClick={(e) => togglePin(e, chat.id)}
                        size="icon"
                        variant="ghost"
                        className={`h-6 w-6 ${isPinned ? "text-blue-500" : "text-slate-300 hover:text-blue-400"}`}
                      >
                        {isPinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
                      </Button>
                      <Button
                        onClick={(e) => { e.stopPropagation(); deleteChat(chat.id); }}
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-slate-300 hover:text-red-400"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-12 opacity-40">
                <p className="text-[10px] font-semibold uppercase tracking-tighter">No chat history available</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .no-scrollbar [data-radix-scroll-area-viewport] {
          scrollbar-width: none !important;
          -ms-overflow-style: none !important;
        }
        .no-scrollbar [data-radix-scroll-area-viewport]::-webkit-scrollbar {
          display: none !important;
        }

        .chat-fade-mask {
          mask-image: linear-gradient(to right, black 88%, transparent 100%);
          -webkit-mask-image: linear-gradient(to right, black 88%, transparent 100%);
        }

        .group:hover .chat-marquee-target {
          transform: translateX(calc(-100% + 110px));
          transition: transform 4s linear;
        }
        
        .chat-marquee-target {
          transition: transform 0.4s ease-out;
        }

        @media (max-width: 768px) {
          .group .opacity-0 { opacity: 0.45; }
        }
      `}} />
    </div>
  );
}
