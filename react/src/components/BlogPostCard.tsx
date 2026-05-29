import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { 
  Heart, MessageCircle, Share2, MoreHorizontal, 
  Trash2, Bookmark, Flame, CheckCircle2, 
  Clock, Eye, X, Maximize2, Download, Send, CornerDownRight
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from 'framer-motion';

// --- Interfaces ---
export interface BlogComment {
  id: string;
  author: {
    id: string;
    firstName: string;
    lastName: string;
    profileImage?: string;
  };
  content: string;
  createdAt: string;
  likes: number;
  likedByUser: boolean;
  replies?: BlogComment[];
}

export interface BlogPost {
  id: string;
  author: {
    id: string;
    firstName: string;
    lastName: string;
    profileImage?: string;
  };
  title: string;
  content: string;
  imageUrl?: string;
  likes: number;
  comments: BlogComment[];
  shares: number;
  createdAt: string;
  likedByUser: boolean;
}

interface BlogPostCardProps {
  post: BlogPost;
  onLike: (postId: string) => void;
  onComment: (postId: string, commentContent: string) => void;
  onLikeComment: (postId: string, commentId: string) => void;
  onReplyComment: (postId: string, parentCommentId: string, content: string) => void;
  onShare: (postId: string) => void;
  onDelete?: (postId: string) => void;
  currentUser?: {
    id: string;
    firstName: string;
    lastName: string;
    profileImage?: string;
  };
}

// --- Sub-component: Recursive Comment Item ---
const CommentItem: React.FC<{
  comment: BlogComment;
  onLikeComment: (commentId: string) => void;
  onReplySubmit: (parentId: string, content: string) => void;
  depth?: number;
  currentUser?: {
    id: string;
    firstName: string;
    lastName: string;
    profileImage?: string;
  };
}> = ({ comment, onLikeComment, onReplySubmit, depth = 0, currentUser }) => {
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');

  const handleReply = () => {
    if (replyText.trim()) {
      onReplySubmit(comment.id, replyText);
      setReplyText('');
      setIsReplying(false);
    }
  };

  return (
    <div className={`flex gap-3 group/comment ${depth > 0 ? 'ml-6 mt-4 border-l-2 border-gray-100 dark:border-gray-800 pl-4' : 'mt-6'}`}>
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarImage src={comment.author.profileImage} />
        <AvatarFallback className="bg-indigo-50 text-indigo-600 text-xs">
          {comment.author.firstName[0]}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-2.5 inline-block max-w-full">
          <p className="text-[13px] font-black text-gray-900 dark:text-gray-100 mb-0.5">
            {comment.author.firstName} {comment.author.lastName}
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-300 break-words leading-relaxed">
            {comment.content}
          </p>
        </div>

        <div className="flex items-center gap-4 mt-1.5 ml-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
          <button 
            onClick={() => onLikeComment(comment.id)}
            className={`transition-colors flex items-center gap-1 ${comment.likedByUser ? 'text-rose-500' : 'hover:text-indigo-600'}`}
          >
            <Heart className={`h-3 w-3 ${comment.likedByUser ? 'fill-current' : ''}`} />
            {comment.likes > 0 ? comment.likes : 'Like'}
          </button>
          
          <button 
            onClick={() => setIsReplying(!isReplying)}
            className="hover:text-indigo-600 transition-colors flex items-center gap-1"
          >
            <MessageCircle className="h-3 w-3" />
            Reply
          </button>
          
          <span className="font-normal lowercase italic text-gray-300">
            {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
          </span>
        </div>

        <AnimatePresence>
          {isReplying && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-4"
            >
              <div className="flex items-start gap-3">
                <Avatar className="h-8 w-8 shrink-0 mt-1">
                  <AvatarImage src={currentUser?.profileImage} />
                  <AvatarFallback className="text-xs">
                    {currentUser?.firstName[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 relative">
                  <textarea
                    autoFocus
                    placeholder={`Replying to ${comment.author.firstName}...`}
                    className="w-full bg-gray-100 dark:bg-gray-800 border-2 border-transparent focus:border-indigo-500 focus:bg-white dark:focus:bg-gray-900 rounded-2xl p-3 pr-12 text-sm transition-all resize-none shadow-inner"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleReply();
                      }
                    }}
                    rows={1}
                    style={{ overflow: 'hidden' }}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = 'auto';
                      target.style.height = `${target.scrollHeight}px`;
                    }}
                  />
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: -10 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={handleReply}
                    disabled={!replyText.trim()}
                    className="absolute top-1/2 right-2 -translate-y-1/2 bg-indigo-600 text-white rounded-full h-8 w-8 flex items-center justify-center disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    <Send className="h-4 w-4" />
                  </motion.button>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsReplying(false)}
                  className="h-8 w-8 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors mt-1"
                >
                  <X className="h-5 w-5" />
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Nested Replies Rendering */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="space-y-1">
            {comment.replies.map((reply) => (
              <CommentItem 
                key={reply.id} 
                comment={reply} 
                onLikeComment={onLikeComment} 
                onReplySubmit={onReplySubmit}
                depth={depth + 1}
                currentUser={currentUser}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// --- Main Component: BlogPostCard ---
const BlogPostCard: React.FC<BlogPostCardProps> = ({ 
  post, onLike, onComment, onLikeComment, onReplyComment, onShare, onDelete, currentUser 
}) => {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const readingTime = Math.max(1, Math.ceil(post.content.split(' ').length / 200));

  const handleCommentSubmit = () => {
    if (commentText.trim()) {
      onComment(post.id, commentText);
      setCommentText('');
    }
  };

  useEffect(() => {
    document.body.style.overflow = isLightboxOpen ? 'hidden' : 'unset';
  }, [isLightboxOpen]);

  return (
    <>
      <Card className="group bg-white dark:bg-gray-900 border-none shadow-sm hover:shadow-xl transition-all duration-500 rounded-3xl overflow-hidden">
        
        {/* 1. HEADER */}
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Avatar className="h-11 w-11 ring-2 ring-indigo-500/10 ring-offset-2 dark:ring-offset-gray-900 transition-transform group-hover:scale-105">
                <AvatarImage src={post.author.profileImage} />
                <AvatarFallback className="bg-indigo-100 text-indigo-700 font-bold">
                  {post.author.firstName[0]}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-0.5 -right-0.5 bg-emerald-500 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-gray-900" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="font-bold text-[15px] text-gray-900 dark:text-gray-100 hover:text-indigo-600 cursor-pointer transition-colors">
                  {post.author.firstName} {post.author.lastName}
                </p>
                <CheckCircle2 className="h-3.5 w-3.5 text-blue-500 fill-blue-500/10" />
              </div>
              <div className="flex items-center text-[11px] text-gray-400 font-medium">
                <Clock className="h-3 w-3 mr-1" />
                {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                <span className="mx-1.5">•</span>
                <span>{readingTime} min read</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" size="icon" 
              className={`rounded-full h-9 w-9 transition-colors ${isSaved ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' : 'text-gray-400'}`}
              onClick={() => setIsSaved(!isSaved)}
            >
              <Bookmark className={`h-4.5 w-4.5 ${isSaved ? 'fill-current' : ''}`} />
            </Button>
            {onDelete && currentUser?.id === post.author.id && (
              <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 text-rose-500 hover:bg-rose-50" onClick={() => onDelete(post.id)}>
                <Trash2 className="h-4.5 w-4.5" />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 text-gray-400">
              <MoreHorizontal className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* 2. MEDIA SECTION */}
        {post.imageUrl && (
          <div className="relative cursor-pointer overflow-hidden group/media" onClick={() => setIsLightboxOpen(true)}>
            <img
              src={post.imageUrl}
              alt={post.title}
              className="w-full aspect-video object-cover transition-transform duration-1000 group-hover/media:scale-105"
            />
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/media:opacity-100 transition-opacity flex items-center justify-center">
               <div className="bg-white/20 backdrop-blur-md p-3 rounded-full text-white scale-90 group-hover/media:scale-100 transition-transform">
                 <Maximize2 className="h-6 w-6" />
               </div>
            </div>
            <div className="absolute bottom-3 left-3">
              <Badge className="bg-black/50 backdrop-blur-md border-none text-[10px] uppercase tracking-widest font-bold">
                <Eye className="h-3 w-3 mr-1" /> View Gallery
              </Badge>
            </div>
          </div>
        )}

        {/* 3. CONTENT */}
        <CardContent className="p-5 sm:p-6">
          <h2 className="text-2xl font-black text-gray-900 dark:text-gray-50 mb-3 tracking-tight leading-tight">
            {post.title}
          </h2>
          <p className="text-gray-600 dark:text-gray-300 text-[16px] leading-relaxed mb-6 whitespace-pre-line">
            {post.content}
          </p>

          {/* 4. REACTION STATS */}
          <div className="flex items-center justify-between pb-4 border-b dark:border-gray-800">
            <div className="flex items-center -space-x-1.5">
              <div className="z-30 bg-rose-500 rounded-full p-1.5 ring-2 ring-white dark:ring-gray-900 shadow-sm">
                <Heart className="h-2.5 w-2.5 text-white fill-white" />
              </div>
              <div className="z-20 bg-amber-500 rounded-full p-1.5 ring-2 ring-white dark:ring-gray-900 shadow-sm">
                <Flame className="h-2.5 w-2.5 text-white fill-white" />
              </div>
              <span className="pl-4 text-xs font-bold text-gray-500 dark:text-gray-400">
                {post.likes + (post.likedByUser ? 1 : 0)} Likes
              </span>
            </div>
            <div className="text-xs font-bold text-gray-400 tracking-wide uppercase">
              {post.comments.length} Comments • {post.shares} Shares
            </div>
          </div>

          {/* 5. INTERACTIVE ACTIONS */}
          <div className="flex items-center gap-2 mt-4">
            <div className="relative flex-1">
              <Button
                variant="ghost"
                onMouseEnter={() => setShowReactions(true)}
                onClick={() => onLike(post.id)}
                className={`w-full rounded-xl gap-2 h-11 transition-all ${post.likedByUser ? 'text-rose-500 bg-rose-50 dark:bg-rose-500/10' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
              >
                <Heart className={`h-5 w-5 ${post.likedByUser ? 'fill-current' : ''}`} />
                <span className="font-bold text-xs uppercase tracking-widest">Like</span>
              </Button>

              <AnimatePresence>
                {showReactions && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.8 }}
                    animate={{ opacity: 1, y: -50, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.8 }}
                    onMouseLeave={() => setShowReactions(false)}
                    className="absolute bottom-full left-0 bg-white dark:bg-gray-800 shadow-2xl border dark:border-gray-700 rounded-full px-2 py-1.5 flex gap-3 z-50 mb-2"
                  >
                    {['❤️', '🔥', '😂', '😮', '👏'].map((emoji) => (
                      <button key={emoji} className="hover:scale-150 transition-transform text-2xl duration-200 active:scale-90">{emoji}</button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Button
              variant="ghost"
              onClick={() => setShowComments(!showComments)}
              className="flex-1 rounded-xl gap-2 h-11 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
            >
              <MessageCircle className="h-5 w-5" />
              <span className="font-bold text-xs uppercase tracking-widest">Discuss</span>
            </Button>

            <Button
              variant="ghost"
              onClick={() => onShare(post.id)}
              className="flex-1 rounded-xl gap-2 h-11 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
            >
              <Share2 className="h-5 w-5" />
              <span className="font-bold text-xs uppercase tracking-widest">Share</span>
            </Button>
          </div>

          {/* 6. COMMENTS AREA */}
          <AnimatePresence>
            {showComments && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-6 space-y-5 overflow-hidden"
              >
                {/* Input */}
                <div className="flex gap-3 items-center bg-gray-50 dark:bg-gray-800/50 p-2 rounded-2xl ring-1 ring-gray-200 dark:ring-gray-700 focus-within:ring-indigo-500 transition-all">
                  <Avatar className="h-8 w-8 ml-1">
                    <AvatarImage src={post.author.profileImage} />
                    <AvatarFallback>U</AvatarFallback>
                  </Avatar>
                  <input
                    placeholder="Write a public comment..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleCommentSubmit()}
                    className="flex-1 bg-transparent border-none focus:ring-0 text-sm placeholder:text-gray-400"
                  />
                  <Button 
                    size="icon" 
                    onClick={handleCommentSubmit}
                    className="rounded-xl h-8 w-8 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>

                {/* Recursive Comment List */}
                <div className="space-y-2 pt-2">
                  {post.comments.length > 0 ? (
                    post.comments.map((comment) => (
                      <CommentItem 
                        key={comment.id} 
                        comment={comment} 
                        onLikeComment={(commentId) => onLikeComment(post.id, commentId)}
                        onReplySubmit={(parentId, content) => onReplyComment(post.id, parentId, content)}
                        currentUser={currentUser}
                      />
                    ))
                  ) : (
                    <div className="text-center py-8 bg-gray-50 dark:bg-gray-800/30 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                      <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">No discussions yet</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* 7. LIGHTBOX */}
      <AnimatePresence>
        {isLightboxOpen && post.imageUrl && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-xl">
            <div className="absolute top-6 right-6 flex gap-3 z-[210]">
               <Button variant="ghost" size="icon" className="rounded-full bg-white/10 text-white hover:bg-white/20">
                 <Download className="h-5 w-5" />
               </Button>
               <Button 
                variant="ghost" size="icon" 
                className="rounded-full bg-white/10 text-white hover:bg-white/20"
                onClick={() => setIsLightboxOpen(false)}
               >
                 <X className="h-6 w-6" />
               </Button>
            </div>

            <div className="absolute bottom-10 left-10 right-10 z-[210] max-w-3xl">
               <Badge className="bg-indigo-600 mb-2">Original Content</Badge>
               <h2 className="text-white text-3xl font-black leading-tight drop-shadow-2xl">{post.title}</h2>
               <div className="text-gray-400 mt-2 flex items-center gap-2">
                 <Avatar className="h-6 w-6"><AvatarImage src={post.author.profileImage}/></Avatar>
                 By {post.author.firstName} {post.author.lastName}
               </div>
            </div>

            <motion.img 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              src={post.imageUrl} 
              className="max-w-full max-h-[85vh] object-contain shadow-2xl"
              alt="Lightbox Content"
            />
            
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 cursor-zoom-out" 
              onClick={() => setIsLightboxOpen(false)} 
            />
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default BlogPostCard;
