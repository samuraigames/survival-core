
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from 'framer-motion';
import { Rocket, Lock, Trophy, BarChart3, Medal } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import type { Level } from "@/lib/levels";
import { initialAchievements } from "@/lib/achievements";
import type { PlayerProgress } from "@/lib/types";
import { format } from 'date-fns';

interface StartScreenProps {
  onStart: (level: Level) => void;
  isGameInProgress: boolean;
  levels: Level[];
  playerProgress: PlayerProgress | null;
}

const StartScreen = ({ onStart, isGameInProgress, levels, playerProgress }: StartScreenProps) => {

  const unlockedAchievementsCount = playerProgress?.completedAchievementIds.length ?? 0;
  const totalAchievements = initialAchievements.length;
  const progressPercentage = (unlockedAchievementsCount / totalAchievements) * 100;

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
          </motion.div>

          <motion.div 
            className="w-full my-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          >
            <Tabs defaultValue="levels" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="levels"><Rocket className="w-4 h-4 mr-2"/>Levels</TabsTrigger>
                <TabsTrigger value="achievements"><Trophy className="w-4 h-4 mr-2"/>Achievements</TabsTrigger>
                <TabsTrigger value="progress"><BarChart3 className="w-4 h-4 mr-2"/>Progress</TabsTrigger>
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
            </Tabs>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default StartScreen;
