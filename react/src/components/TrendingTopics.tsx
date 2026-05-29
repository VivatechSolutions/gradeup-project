import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import { Flame } from "lucide-react";

interface TrendingTopic {
  id: string;
  title: string;
  posts: number;
  icon: string; // Lucide icon name or emoji
  hashtags: string[]; // Added hashtags
}

export function TrendingTopics({ topics }: { topics: TrendingTopic[] }) {
  // Defensive check: Ensure topics is an array before mapping
  if (!topics || !Array.isArray(topics)) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Flame className="h-4 w-4 text-orange-500" />
            Trending Topics
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 p-0">
          <div className="p-4 text-gray-500 dark:text-gray-400">No trending topics available.</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Flame className="h-4 w-4 text-orange-500" />
          Trending Topics
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 p-0">
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3 p-4 pt-0">
            {topics.map((topic) => (
              <div key={topic.id} className="flex flex-col gap-1 p-2 rounded-md hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors cursor-pointer">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{topic.title}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {topic.hashtags && topic.hashtags.map((hashtag, i) => (
                    <Badge key={i} variant="secondary" className="w-fit text-xs px-2 py-0.5">
                      {hashtag}
                    </Badge>
                  ))}
                </div>
                <Badge variant="secondary" className="w-fit text-xs px-2 py-0.5">
                  {topic.posts} posts
                </Badge>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
