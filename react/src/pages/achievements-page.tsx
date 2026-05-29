
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../hooks/use-theme';
import { mockAchievements, Achievement } from '../lib/mock-achievements';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { ArrowLeft, Moon, Sun, Lock, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { useLocation } from 'wouter';
import { useAuth } from '../hooks/use-auth';
import Navigation from '../components/navigation';
// Loader
const AchievementsLoader = () => (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            className="w-24 h-24 border-8 border-dashed border-yellow-400 rounded-full"
        />
    </div>
);

const tierColors = {
    bronze: { bg: 'bg-yellow-800/20 dark:bg-yellow-900/30', border: 'border-yellow-700/50', shadow: 'shadow-yellow-700/20', text: 'text-yellow-700 dark:text-yellow-600' },
    silver: { bg: 'bg-gray-400/20 dark:bg-gray-500/30', border: 'border-gray-400/50', shadow: 'shadow-gray-400/20', text: 'text-gray-500 dark:text-gray-300' },
    gold: { bg: 'bg-yellow-400/20 dark:bg-yellow-500/30', border: 'border-yellow-400/50', shadow: 'shadow-yellow-500/30', text: 'text-yellow-400' },
};

// Achievement Card Component
const AchievementCard = ({ achievement, index, onClick }: { achievement: Achievement, index: number, onClick: () => void }) => {
    const colors = tierColors[achievement.tier];

    return (
        <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: index * 0.05, type: 'spring', stiffness: 100, damping: 15 }}
            onClick={onClick}
        >
            <Card className={cn(
                "h-full text-center p-6 relative overflow-hidden transition-transform duration-300 ease-in-out transform hover:-translate-y-2",
                achievement.unlocked
                    ? `${colors.bg} ${colors.border} shadow-lg ${colors.shadow} cursor-pointer`
                    : 'bg-gray-200/50 dark:bg-gray-800/50 border-dashed border-gray-400/50 cursor-not-allowed'
            )}>
                {achievement.unlocked && (
                     <motion.div className="absolute -top-10 -right-10 w-24 h-24 text-yellow-400/10"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                     >
                        <achievement.icon />
                    </motion.div>
                )}
                <motion.div whileHover={{ scale: 1.2 }} className="relative w-20 h-20 mx-auto">
                    {achievement.unlocked ? (
                        <achievement.icon className={cn("w-full h-full", colors.text)} />
                    ) : (
                        <Lock className="w-full h-full text-gray-500" />
                    )}
                </motion.div>
                <h3 className={cn("text-xl font-bold mt-4", !achievement.unlocked && "text-gray-500")}>
                    {achievement.title}
                </h3>
                <p className={cn("text-sm mt-1", achievement.unlocked ? "text-gray-600 dark:text-gray-300" : "text-gray-400 dark:text-gray-500")}>
                    {achievement.description}
                </p>
                {achievement.unlocked && achievement.date && (
                    <p className="text-xs font-mono mt-3 text-green-500">
                        Unlocked: {achievement.date}
                    </p>
                )}
            </Card>
        </motion.div>
    );
};

// Achievement Modal
const AchievementDetailModal = ({ achievement, onClose }: { achievement: Achievement, onClose: () => void }) => {
    const colors = tierColors[achievement.tier];
    const Icon = achievement.icon;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.8, y: 50 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.8, y: 50 }}
                transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                className={cn("relative w-full max-w-lg p-8 rounded-2xl border text-center", colors.bg, colors.border)}
                onClick={(e) => e.stopPropagation()}
            >
                <Button variant="ghost" size="icon" className="absolute top-4 right-4" onClick={onClose}><X /></Button>
                <Icon className={cn("w-32 h-32 mx-auto mb-4", colors.text)} />
                <h2 className="text-4xl font-bold">{achievement.title}</h2>
                <p className={cn("text-lg mt-2 uppercase font-bold tracking-widest", colors.text)}>{achievement.tier} Tier</p>
                <p className="text-base text-gray-600 dark:text-gray-300 mt-6">{achievement.description}</p>
                <p className="text-sm font-mono mt-4 text-green-400">Unlocked: {achievement.date}</p>
            </motion.div>
        </motion.div>
    );
};


const AchievementsPage = () => {
    const [loading, setLoading] = useState(true);
    const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);
    const { theme, setTheme } = useTheme();
    const [, setLocation] = useLocation();
 const { userHeader } = useAuth();
  
    const [currentRole, setCurrentRole] = useState("student");
  
    useEffect(() => {
      if (userHeader?.role) {
        setCurrentRole(userHeader.role);
      }
    }, [userHeader]);

    const handleRoleChange = (newRole: string) => {
    setCurrentRole(newRole);
  };
    useEffect(() => {
        const timer = setTimeout(() => setLoading(false), 1500);
        return () => clearTimeout(timer);
    }, []);

    const unlockedCount = mockAchievements.filter(a => a.unlocked).length;
    const totalCount = mockAchievements.length;

    if (loading) {
        return <AchievementsLoader />;
    }

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300">
           <Navigation 
                        currentRole={currentRole} 
                        onRoleChange={handleRoleChange}
                      />
             <AnimatePresence>
                {selectedAchievement && <AchievementDetailModal achievement={selectedAchievement} onClose={() => setSelectedAchievement(null)} />}
            </AnimatePresence>

            <div className="fixed inset-0 -z-0 h-full w-full bg-white bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] dark:bg-black"></div>

            <header className="sticky top-0 z-10 p-4 bg-white/50 dark:bg-black/50 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800">
                <div className="container mx-auto flex items-center justify-between">
                    {/* <Button variant="ghost" onClick={() => setLocation('/dashboard')}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Dashboard
                    </Button> */}
                    <h1 className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-yellow-500 to-orange-500">
                        Your Achievements
                    </h1>
                    <Button variant="outline" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                        <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                        <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                        <span className="sr-only">Toggle theme</span>
                    </Button>
                </div>
            </header>

            <main className="container mx-auto p-4 md:p-8 relative z-1">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-center mb-12"
                >
                    <p className="text-xl text-gray-600 dark:text-gray-300">You've unlocked</p>
                    <p className="text-6xl font-extrabold my-2">
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-blue-500">{unlockedCount}</span>
                        <span className="text-4xl mx-2 text-gray-400">/</span>
                        <span className="text-gray-500">{totalCount}</span>
                    </p>
                    <p className="text-xl text-gray-600 dark:text-gray-300">achievements</p>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mt-4 max-w-md mx-auto">
                        <motion.div
                            className="bg-gradient-to-r from-green-400 to-blue-500 h-2.5 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${(unlockedCount / totalCount) * 100}%` }}
                            transition={{ duration: 1, delay: 0.5 }}
                        />
                    </div>
                </motion.div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {mockAchievements.map((ach, index) => (
                        <AchievementCard 
                            key={ach.id} 
                            achievement={ach} 
                            index={index} 
                            onClick={() => {
                                if(ach.unlocked) {
                                    setSelectedAchievement(ach)
                                }
                            }}
                        />
                    ))}
                </div>
            </main>
        </div>
    );
};

export default AchievementsPage;
