// src/lib/mock-blog-data.ts
import { BlogPost } from '../components/BlogPostCard';

export const mockBlogPosts: BlogPost[] = [
  {
    id: 'b1',
    author: {
      id: 'u1',
      firstName: 'Alice',
      lastName: 'Smith',
      profileImage: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Alice',
    },
    title: 'Mastering React Hooks for State Management',
    content: `React Hooks have revolutionized state management in functional components. This post dives deep into useState, useEffect, and useContext, showing how they can be used to build powerful and maintainable applications. We'll cover common pitfalls and best practices for optimizing performance and readability.`,
    imageUrl: 'https://images.unsplash.com/photo-1633356122544-cd360811e59c?q=80&w=2940&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    likes: 25,
    comments: [
      {
        id: 'c1-1',
        author: { id: 'u2', firstName: 'Bob', lastName: 'Johnson', profileImage: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Bob' },
        content: 'Great article, very insightful!',
        createdAt: new Date(Date.now() - 3600 * 1000 * 2).toISOString(), // 2 hours ago
        likes: 5,
        likedByUser: true,
        replies: [
          {
            id: 'c1-1-r1',
            author: { id: 'u4', firstName: 'Diana', lastName: 'Prince', profileImage: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Diana' },
            content: 'Totally agree! The Context API has been a game-changer for avoiding prop-drilling.',
            createdAt: new Date(Date.now() - 3600 * 1000 * 1).toISOString(), // 1 hour ago
            likes: 1,
            likedByUser: false,
            replies: [],
          }
        ],
      },
      {
        id: 'c1-2',
        author: { id: 'u3', firstName: 'Charlie', lastName: 'Brown', profileImage: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Charlie' },
        content: 'I always struggle with useEffect dependencies. Any tips for that?',
        createdAt: new Date(Date.now() - 3600 * 1000 * 1).toISOString(), // 1 hour ago
        likes: 2,
        likedByUser: false,
        replies: [],
      },
    ],
    shares: 8,
    createdAt: new Date(Date.now() - 3600 * 1000 * 24 * 3).toISOString(), // 3 days ago
    likedByUser: false,
  },
  {
    id: 'b2',
    author: {
      id: 'u4',
      firstName: 'Diana',
      lastName: 'Prince',
      profileImage: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Diana',
    },
    title: 'The Future of AI in Education',
    content: `Artificial intelligence is rapidly transforming the educational landscape. From personalized learning paths to automated grading, AI offers immense potential to enhance student engagement and outcomes. This post explores emerging trends and ethical considerations in AI-powered education.`,
    imageUrl: 'https://images.unsplash.com/photo-1596495578051-66774e1d3e23?q=80&w=2940&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    likes: 42,
    comments: [
      {
        id: 'c2-1',
        author: { id: 'u5', firstName: 'Eve', lastName: 'Adams', profileImage: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Eve' },
        content: 'Fascinating topic! I wonder about the impact on critical thinking skills.',
        createdAt: new Date(Date.now() - 3600 * 1000 * 5).toISOString(), // 5 hours ago
        likes: 10,
        likedByUser: false,
        replies: [],
      },
    ],
    shares: 15,
    createdAt: new Date(Date.now() - 3600 * 1000 * 24 * 7).toISOString(), // 7 days ago
    likedByUser: true,
  },
  {
    id: 'b3',
    author: {
      id: 'u1',
      firstName: 'Alice',
      lastName: 'Smith',
      profileImage: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Alice',
    },
    title: 'My Journey into Quantum Computing',
    content: `Just started exploring Quantum Computing and it's mind-blowing! The concepts are challenging but incredibly rewarding. Anyone else diving into this field? Share your resources!`,
    imageUrl: '', // No image for this post
    likes: 18,
    comments: [],
    shares: 3,
    createdAt: new Date(Date.now() - 3600 * 1000 * 24 * 1).toISOString(), // 1 day ago
    likedByUser: false,
  },
];
