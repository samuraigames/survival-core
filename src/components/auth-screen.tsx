
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, AuthError } from "firebase/auth";
import { motion } from 'framer-motion';

const formSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

type UserFormValue = z.infer<typeof formSchema>;

export default function AuthScreen() {
  const [activeTab, setActiveTab] = useState("login");
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const auth = useAuth();

  const form = useForm<UserFormValue>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: UserFormValue) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      if (activeTab === "login") {
        await signInWithEmailAndPassword(auth, data.email, data.password);
      } else {
        await createUserWithEmailAndPassword(auth, data.email, data.password);
      }
      // onAuthStateChanged in page.tsx will handle navigation
    } catch (error) {
        const firebaseError = error as AuthError;
        let friendlyMessage = "An unexpected error occurred. Please try again.";
        switch (firebaseError.code) {
            case "auth/user-not-found":
                friendlyMessage = "No account found with this email address.";
                break;
            case "auth/wrong-password":
                friendlyMessage = "Incorrect password. Please try again.";
                break;
            case "auth/email-already-in-use":
                friendlyMessage = "This email is already in use by another account.";
                break;
            case "auth/invalid-email":
                friendlyMessage = "The email address is not valid.";
                break;
            case "auth/weak-password":
                friendlyMessage = "The password is too weak.";
                break;
            default:
                console.error("Firebase Auth Error:", firebaseError);
        }
        setAuthError(friendlyMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center mb-8"
      >
        <h1 className="text-6xl md:text-8xl font-headline font-bold text-accent tracking-tighter">
          SURVIVAL CORE
        </h1>
        <p className="mt-4 text-lg md:text-xl text-muted-foreground font-body max-w-2xl mx-auto">
          Create an account or sign in to save your progress.
        </p>
      </motion.div>
    
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-sm">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="login">Login</TabsTrigger>
          <TabsTrigger value="signup">Sign Up</TabsTrigger>
        </TabsList>
        <TabsContent value="login">
          <AuthCardContent isLogin onSubmit={onSubmit} form={form} isLoading={isLoading} authError={authError} />
        </TabsContent>
        <TabsContent value="signup">
          <AuthCardContent isLogin={false} onSubmit={onSubmit} form={form} isLoading={isLoading} authError={authError} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface AuthCardContentProps {
    isLogin: boolean;
    onSubmit: (data: UserFormValue) => void;
    form: any;
    isLoading: boolean;
    authError: string | null;
}

const AuthCardContent = ({ isLogin, onSubmit, form, isLoading, authError }: AuthCardContentProps) => {
    return (
        <Card className="bg-card/50 border-primary">
        <CardHeader>
          <CardTitle className="font-headline text-accent">{isLogin ? "Welcome Back" : "Create Account"}</CardTitle>
          <CardDescription>
            {isLogin ? "Sign in to resume your journey." : "Join the ranks to start your mission."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="player@example.com"
                        disabled={isLoading}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        disabled={isLoading}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {authError && (
                  <p className="text-sm font-medium text-destructive">{authError}</p>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Loading..." : (isLogin ? "Login" : "Sign Up")}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    )
}
