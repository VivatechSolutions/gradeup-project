import React, { useState, useRef, ChangeEvent, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Image as ImageIcon, Send, X, FileText, 
  Video, Smile, Globe, MapPin, Bold, Italic, 
  Link as LinkIcon, List, Camera, Paperclip, Loader2, 
  Eye, Edit3, Save, Trash2, History
} from 'lucide-react';

// UI Imports (Standard shadcn pattern)
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import { toast } from '../hooks/use-toast';
import BlogPostCard, { BlogPost, BlogComment } from './BlogPostCard';
import { mockBlogPosts } from '../lib/mock-blog-data';

const STORAGE_KEY = 'blog_post_draft';

interface BlogFeedProps {
  currentUser: {
    id: string;
    firstName: string;
    lastName: string;
    profileImage?: string;
  };
}

const BlogFeed: React.FC<BlogFeedProps> = ({ currentUser }) => {
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>(mockBlogPosts);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<any[]>([]);
  
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- 1. LOCAL STORAGE PERSISTENCE (AUTO-SAVE) ---
  useEffect(() => {
    const savedDraft = localStorage.getItem(STORAGE_KEY);
    if (savedDraft) {
      setHasDraft(true);
    }
  }, []);

  useEffect(() => {
    if (content.trim() || title.trim()) {
      const draft = JSON.stringify({ title, content });
      localStorage.setItem(STORAGE_KEY, draft);
      setHasDraft(true);
    }
  }, [title, content]);

  const loadDraft = () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const { title: dTitle, content: dContent } = JSON.parse(saved);
      setTitle(dTitle);
      setContent(dContent);
      setIsModalOpen(true);
      toast({ title: "Draft restored!" });
    }
  };

  const discardDraft = () => {
    localStorage.removeItem(STORAGE_KEY);
    setTitle('');
    setContent('');
    setHasDraft(false);
    toast({ title: "Draft deleted", variant: "destructive" });
  };

  // --- 2. FORMATTING LOGIC ---
  const applyRichText = (p: string, s: string = p) => {
    const el = textAreaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const newText = content.substring(0, start) + p + content.substring(start, end) + s + content.substring(end);
    setContent(newText);
    setTimeout(() => { el.focus(); el.setSelectionRange(start + p.length, end + p.length); }, 10);
  };

  // --- 3. PUBLISH LOGIC ---
  const handlePublish = async () => {
    setIsSubmitting(true);
    await new Promise(r => setTimeout(r, 1500));
    
    const newPost: BlogPost = {
      id: `post-${Date.now()}`,
      author: currentUser,
      title: title || "New Story",
      content: content,
      imageUrl: attachments[0]?.url,
      likes: 0,
      comments: [],
      shares: 0,
      createdAt: new Date().toISOString(),
      likedByUser: false,
    };

    setBlogPosts([newPost, ...blogPosts]);
    localStorage.removeItem(STORAGE_KEY); // Clear draft after success
    setIsSubmitting(false);
    setIsModalOpen(false);
    setTitle('');
    setContent('');
    setAttachments([]);
    toast({ title: "Post Live!", description: "Your post is now visible to everyone." });
  };
  
    const handleLikePost = (postId: string) => {
    setBlogPosts(prevPosts =>
      prevPosts.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            likedByUser: !post.likedByUser,
            likes: post.likedByUser ? post.likes - 1 : post.likes + 1,
          };
        }
        return post;
      })
    );
  };

  const handleLikeComment = (postId: string, commentId: string) => {
    const findAndLikeComment = (comments: BlogComment[]): BlogComment[] => {
      return comments.map(comment => {
        if (comment.id === commentId) {
          return {
            ...comment,
            likedByUser: !comment.likedByUser,
            likes: comment.likedByUser ? comment.likes - 1 : comment.likes + 1,
          };
        }
        if (comment.replies) {
          return {
            ...comment,
            replies: findAndLikeComment(comment.replies),
          };
        }
        return comment;
      });
    };

    setBlogPosts(prevPosts =>
      prevPosts.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            comments: findAndLikeComment(post.comments),
          };
        }
        return post;
      })
    );
  };

  const handleReplyComment = (postId: string, parentCommentId: string, content: string) => {
    const newReply: BlogComment = {
      id: `comment-${Date.now()}`,
      author: currentUser,
      content,
      createdAt: new Date().toISOString(),
      likes: 0,
      likedByUser: false,
      replies: [],
    };

    const findAndAddReply = (comments: BlogComment[]): BlogComment[] => {
      return comments.map(comment => {
        if (comment.id === parentCommentId) {
          return {
            ...comment,
            replies: [...(comment.replies || []), newReply],
          };
        }
        if (comment.replies) {
          return {
            ...comment,
            replies: findAndAddReply(comment.replies),
          };
        }
        return comment;
      });
    };

    setBlogPosts(prevPosts =>
      prevPosts.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            comments: findAndAddReply(post.comments),
          };
        }
        return post;
      })
    );
  };

  const handleComment = (postId: string, content: string) => {
    const newComment: BlogComment = {
      id: `comment-${Date.now()}`,
      author: currentUser,
      content,
      createdAt: new Date().toISOString(),
      likes: 0,
      likedByUser: false,
      replies: [],
    };

    setBlogPosts(prevPosts =>
      prevPosts.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            comments: [newComment, ...post.comments],
          };
        }
        return post;
      })
    );
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-8 space-y-6">
      
      {/* RESTORE DRAFT NOTIFICATION */}
      {hasDraft && !isModalOpen && (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 p-3 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 text-sm font-medium">
            <History className="h-4 w-4" /> You have an unsaved draft
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={discardDraft} className="text-gray-500 hover:text-red-500"><Trash2 className="h-4 w-4" /></Button>
            <Button size="sm" onClick={loadDraft} className="bg-indigo-600 text-white">Resume</Button>
          </div>
        </motion.div>
      )}

      {/* TRIGGER */}
      <Card className="rounded-xl border-none shadow-lg bg-white dark:bg-gray-800 p-4 transition-transform hover:scale-[1.01]">
        <div className="flex gap-4 items-center">
          <Avatar className="h-12 w-12 border-2 border-indigo-500 p-0.5">
            <AvatarImage src={currentUser.profileImage} className="rounded-full" />
            <AvatarFallback>{currentUser.firstName[0]}</AvatarFallback>
          </Avatar>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex-1 text-left px-5 py-3 bg-gray-50 dark:bg-gray-700/50 rounded-2xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all font-medium"
          >
            What's the story today, {currentUser.firstName}?
          </button>
        </div>
      </Card>

      {/* MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => setIsModalOpen(false)} />
            
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="relative w-full sm:max-w-2xl bg-white dark:bg-gray-900 sm:rounded-3xl shadow-2xl h-[95vh] sm:h-auto max-h-[95vh] flex flex-col overflow-hidden">
              
              {/* HEADER */}
              <div className="flex items-center justify-between p-4 border-b dark:border-gray-800">
                <Button variant="ghost" onClick={() => setIsModalOpen(false)}><X className="h-5 w-5" /></Button>
                <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                  <TabButton active={!isPreviewMode} onClick={() => setIsPreviewMode(false)} icon={<Edit3 className="h-4 w-4" />} label="Edit" />
                  <TabButton active={isPreviewMode} onClick={() => setIsPreviewMode(true)} icon={<Eye className="h-4 w-4" />} label="Preview" />
                </div>
                <Button onClick={handlePublish} disabled={isSubmitting || !content.trim()} className="bg-indigo-600 hover:bg-indigo-700 rounded-xl px-6">
                  {isSubmitting ? <Loader2 className="animate-spin h-4 w-4" /> : "Publish"}
                </Button>
              </div>

              {/* BODY */}
              <div className="flex-1 overflow-y-auto p-6">
                {!isPreviewMode ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                       <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-none">
                         <Save className="h-3 w-3 mr-1" /> Auto-saved to local
                       </Badge>
                    </div>
                    
                    <input 
                      placeholder="Post Title..." 
                      className="w-full text-3xl font-extrabold bg-transparent border-none focus:ring-0 placeholder:text-gray-200"
                      value={title} onChange={e => setTitle(e.target.value)}
                    />

                    {/* TOOLBAR */}
                    <div className="flex gap-2 p-1 border dark:border-gray-700 rounded-xl w-fit">
                      <ToolbarIcon onClick={() => applyRichText('**')} icon={<Bold className="h-4 w-4" />} />
                      <ToolbarIcon onClick={() => applyRichText('_')} icon={<Italic className="h-4 w-4" />} />
                      <ToolbarIcon onClick={() => applyRichText('- ')} icon={<List className="h-4 w-4" />} />
                    </div>

                    <textarea
                      ref={textAreaRef}
                      placeholder="Start writing your masterpiece..."
                      className="w-full min-h-[300px] text-lg bg-transparent border-none focus:ring-0 resize-none"
                      value={content} onChange={e => setContent(e.target.value)}
                    />
                  </div>
                ) : (
                  <div className="animate-in fade-in slide-in-from-bottom-4">
                    <div className="max-w-prose mx-auto py-4">
                       <h1 className="text-4xl font-extrabold mb-4">{title || "Untitled"}</h1>
                       <div className="flex items-center gap-3 mb-8">
                         <Avatar className="h-10 w-10"><AvatarImage src={currentUser.profileImage} /></Avatar>
                         <div>
                           <p className="font-bold">{currentUser.firstName} {currentUser.lastName}</p>
                           <p className="text-xs text-gray-500 font-mono">2 min read • Draft</p>
                         </div>
                       </div>
                       <div className="text-xl leading-relaxed text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                         {content || "No content to preview yet..."}
                       </div>
                    </div>
                  </div>
                )}
              </div>

              {/* FOOTER TOOLBAR */}
              {!isPreviewMode && (
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-t dark:border-gray-800">
                  <div className="flex items-center justify-around sm:justify-start gap-4">
                    <AttachmentBtn onClick={() => fileInputRef.current?.click()} icon={<ImageIcon className="text-green-500" />} label="Image" />
                    <AttachmentBtn icon={<Video className="text-red-500" />} label="Video" />
                    <AttachmentBtn icon={<Paperclip className="text-blue-500" />} label="File" />
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => {
        const file = e.target.files?.[0];
        if(file) setAttachments([{ url: URL.createObjectURL(file) }]);
      }} />

      {/* FEED */}
      <div className="space-y-8">
        {blogPosts.map(post => (
          <BlogPostCard 
            key={post.id} 
            post={post} 
            currentUserId={currentUser.id} 
            onLike={handleLikePost} 
            onComment={handleComment} 
            onLikeComment={handleLikeComment} 
            onReplyComment={handleReplyComment} 
            onShare={() => {}} 
            onDelete={() => {}}
            currentUser={currentUser} />
        ))}
      </div>
    </div>
  );
};

// --- STYLED SUBCOMPONENTS ---
const TabButton = ({ active, onClick, icon, label }: any) => (
  <button onClick={onClick} className={`flex items-center gap-2 px-4 py-1.5 text-sm font-bold rounded-lg transition-all ${active ? 'bg-white dark:bg-gray-700 shadow-md text-indigo-600' : 'text-gray-400'}`}>
    {icon} {label}
  </button>
);

const ToolbarIcon = ({ icon, onClick }: any) => (
  <button onClick={onClick} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 transition-colors">{icon}</button>
);

const AttachmentBtn = ({ icon, label, onClick }: any) => (
  <button onClick={onClick} className="flex items-center gap-2 px-4 py-2 hover:bg-white dark:hover:bg-gray-700 rounded-xl transition-all shadow-sm border border-transparent hover:border-gray-200 group">
    <span className="group-hover:scale-110 transition-transform">{icon}</span>
    <span className="text-sm font-bold text-gray-600 dark:text-gray-300">{label}</span>
  </button>
);

export default BlogFeed;