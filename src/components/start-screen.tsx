
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from 'framer-motion';
import { Rocket, Lock, Trophy, BarChart3, Medal, LogOut, ShieldCheck } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import type { Level } from "@/lib/levels";
import { initialAchievements } from "@/lib/achievements";
import type { PlayerProgress } from "@/lib/types";
import { format } from 'date-fns';
import { useAuth, useFirebase, useUser, setDocumentNonBlocking } from "@/firebase";
import { signOut } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { doc } from "firebase/firestore";

interface StartScreenProps {
  onStart: (level: Level) => void;
  isGameInProgress: boolean;
  levels: Level[];
  playerProgress: PlayerProgress | null;
  setPlayerProgress: (progress: PlayerProgress) => void;
}

// Admin UIDs are now defined directly in the component
const ADMIN_UIDS: string[] = [
    "5cZ5jWtyK5Z5gc3Afw5kRHb7sYC2",
    "zvDHJFKXb0VeGe6LUForw7ZyBsw2",
];

const StartScreen = ({ onStart, isGameInProgress, levels, playerProgress, setPlayerProgress }: StartScreenProps) => {

  const auth = useAuth();
  const { user } = useUser();
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const isUserAdmin = user ? ADMIN_UIDS.includes(user.uid) : false;

  const unlockedAchievementsCount = playerProgress?.completedAchievementIds.length ?? 0;
  const totalAchievements = initialAchievements.length;
  const progressPercentage = (unlockedAchievementsCount / totalAchievements) * 100;

  const handleSignOut = () => {
    if(auth) {
      signOut(auth);
    }
  }
  
  const handleUnlockAll = () => {
    if (!user || !firestore) return;
    
    const allLevelIds = levels.map(l => l.id);
    const allAchievementIds = initialAchievements.map(a => a.id);

    const completionDateTimes = allAchievementIds.reduce((acc, id) => {
      acc[id] = new Date().toISOString();
      return acc;
    }, {} as { [key: string]: string });

    const newProgress: PlayerProgress = {
      unlockedLevelIds: allLevelIds,
      completedAchievementIds: allAchievementIds,
      completionDateTimes: completionDateTimes,
      endCreditsUnlocked: true,
    };

    const progressRef = doc(firestore, 'users', user.uid, 'playerProgress', 'main');
    setDocumentNonBlocking(progressRef, newProgress, { merge: false });
    setPlayerProgress(newProgress); // Update local state immediately
    
    toast({
      title: "Admin Power!",
      description: "All levels and achievements have been unlocked.",
      className: "border-purple-500 bg-purple-500/10",
    });
  }

  return (
    <div className="relative w-full min-h-screen bg-background text-foreground">
      <div className="absolute inset-0 overflow-y-auto p-4 sm:p-8">
        <div className="flex flex-col items-center justify-start w-full max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mt-8 flex flex-col items-center"
          >
            <h1 className="text-6xl md:text-8xl font-headline font-bold text-accent tracking-tighter">
              SURVIVAL CORE
            </h1>
            <p className="mt-4 text-lg md:text-xl text-muted-foreground font-body max-w-2xl mx-auto">
              You were on a mission to the moon when an asteroid hit the ship. You had to go back to Earth. You have limited time. Get there quick!!
            </p>
          </motion.div>

          <motion.div 
            className="w-full my-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          >
            <Tabs defaultValue="levels" className="w-full">
              <TabsList className={`grid w-full ${isUserAdmin ? 'grid-cols-4' : 'grid-cols-3'}`}>
                <TabsTrigger value="levels"><Rocket className="w-4 h-4 mr-2"/>Levels</TabsTrigger>
                <TabsTrigger value="achievements"><Trophy className="w-4 h-4 mr-2"/>Achievements</TabsTrigger>
                <TabsTrigger value="progress"><BarChart3 className="w-4 h-4 mr-2"/>Progress</TabsTrigger>
                {isUserAdmin && <TabsTrigger value="admin"><ShieldCheck className="w-4 h-4 mr-2"/>Admin</TabsTrigger>}
              </TabsList>
              <TabsContent value="levels">
                <Card className="bg-card/50 border-primary">
                  <CardHeader>
                    <CardTitle className="font-headline text-accent">Select Mission</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-72 w-full">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-1">
                        {levels.map(level => {
                          const isUnlocked = playerProgress?.unlockedLevelIds.includes(level.id);
                          return (
                            <Button
                              key={level.id}
                              variant={isUnlocked ? "outline" : "secondary"}
                              className="h-auto p-4 text-left flex flex-col items-start"
                              disabled={!isUnlocked}
                              onClick={() => onStart(level)}
                            >
                              <div className="flex justify-between w-full items-center">
                                <h3 className="font-headline text-lg text-accent">{level.name}</h3>
                                {!isUnlocked && <Lock className="w-4 h-4" />}
                              </div>
                              <p className="text-sm text-muted-foreground whitespace-normal mt-1">{level.menuDescription}</p>
                            </Button>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="achievements">
                <Card className="bg-card/50 border-primary">
                  <CardHeader>
                    <CardTitle className="font-headline text-accent">Service Record</CardTitle>
                  </CardHeader>
                  <CardContent>
                     <ScrollArea className="h-72 w-full">
                        <div className="flex flex-col gap-4 p-1">
                          {initialAchievements.map(ach => {
                            const isUnlocked = playerProgress?.completedAchievementIds.includes(ach.id);
                            const badgeColor = isUnlocked ? 'hsl(48, 98%, 50%)' : 'hsl(var(--muted))'; // Gold color for unlocked
                            
                            return (
                              <div key={ach.id} className="flex items-center gap-4 p-2 rounded-lg bg-background/50">
                                <Medal className="w-10 h-10 flex-shrink-0" style={{ color: badgeColor }}/>
                                <div className="flex-grow text-left">
                                  <h4 className="font-bold">{ach.title}</h4>
                                  <p className="text-sm text-muted-foreground">{ach.description}</p>
                                </div>
                                {isUnlocked && playerProgress?.completionDateTimes?.[ach.id] && (
                                  <p className="text-xs text-muted-foreground self-center">
                                    {format(new Date(playerProgress.completionDateTimes[ach.id]), "PPpp")}
                                  </p>
                                )}
                              </div>
                            )
                          })}
                        </div>
                     </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="progress">
                 <Card className="bg-card/50 border-primary">
                  <CardHeader>
                    <CardTitle className="font-headline text-accent">Overall Progress</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center gap-4">
                     <div className="w-full">
                        <p className="text-center mb-2">{unlockedAchievementsCount} of {totalAchievements} achievements unlocked</p>
                        <Progress value={progressPercentage} className="w-full" />
                     </div>
                     {progressPercentage === 100 && (
                        <motion.div initial={{opacity: 0}} animate={{opacity: 1}} className="text-center mt-4">
                           <h3 className="text-lg font-bold text-green-400">You’ve completed all levels. Well done, Commander!</h3>
                           {/* Unlock End Credits button would go here */}
                        </motion.div>
                     )}
                     {playerProgress?.endCreditsUnlocked && (
                       <Button variant="outline">View Credits</Button>
                     )}
                  </CardContent>
                </Card>
              </TabsContent>
               {isUserAdmin && (
                <TabsContent value="admin">
                  <Card className="bg-card/50 border-purple-500">
                    <CardHeader>
                      <CardTitle className="font-headline text-purple-400">Admin Controls</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center gap-4">
                        <p className="text-muted-foreground">Use these powers wisely, Commander.</p>
                        <div className="flex gap-4">
                           <Button variant="destructive" onClick={handleUnlockAll}>Unlock All Achievements & Levels</Button>
                        </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}
            </Tabs>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="absolute top-4 right-4"
          >
            <Button variant="ghost" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4"/>
              Sign Out
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default StartScreen;
