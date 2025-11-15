
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
import { useAuth, useFirestore, setDocumentNonBlocking } from "@/firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, AuthError } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { motion } from 'framer-motion';

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

const signupSchema = z.object({
  username: z.string().min(3, { message: "Username must be at least 3 characters." }).max(20, { message: "Username cannot be longer than 20 characters." }).regex(/^[a-zA-Z0-9_]+$/, { message: "Username can only contain letters, numbers, and underscores." }),
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

type LoginFormValue = z.infer<typeof loginSchema>;
type SignupFormValue = z.infer<typeof signupSchema>;

export default function AuthScreen() {
  const [activeTab, setActiveTab] = useState("login");
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const auth = useAuth();
  const firestore = useFirestore();

  const loginForm = useForm<LoginFormValue>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const signupForm = useForm<SignupFormValue>({
    resolver: zodResolver(signupSchema),
    defaultValues: { username: "", email: "", password: "" },
  });

  const handleLogin = async (data: LoginFormValue) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      await signInWithEmailAndPassword(auth, data.email, data.password);
    } catch (error) {
      handleAuthError(error as AuthError);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (data: SignupFormValue) => {
    setIsLoading(true);
    setAuthError(null);

    if (!firestore) {
      setAuthError("Database connection not available.");
      setIsLoading(false);
      return;
    }
    
    try {
      // 1. Check for username uniqueness
      const usernameRef = doc(firestore, "usernames", data.username.toLowerCase());
      const usernameDoc = await getDoc(usernameRef);
      if (usernameDoc.exists()) {
        setAuthError("This username is already in use.");
        signupForm.setError("username", { type: "manual", message: "This username is already in use." });
        setIsLoading(false);
        return;
      }
      
      // 2. Create the user
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const user = userCredential.user;

      // 3. Update the user's profile with the username
      await updateProfile(user, { displayName: data.username });

      // 4. Create user profile and username documents in Firestore
      const userProfileRef = doc(firestore, "users", user.uid);
      const usernameDocRef = doc(firestore, "usernames", data.username.toLowerCase());

      const userProfileData = {
        username: data.username,
        email: data.email,
        createdAt: new Date().toISOString(),
      };
      
      // These are non-blocking writes
      setDocumentNonBlocking(userProfileRef, userProfileData, {});
      setDocumentNonBlocking(usernameDocRef, { uid: user.uid }, {});

    } catch (error) {
      handleAuthError(error as AuthError);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthError = (firebaseError: AuthError) => {
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
            signupForm.setError("email", { type: "manual", message: "This email is already in use." });
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
    
      <Tabs value={activeTab} onValueChange={(tab) => { setActiveTab(tab); setAuthError(null); }} className="w-full max-w-sm">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="login">Login</TabsTrigger>
          <TabsTrigger value="signup">Sign Up</TabsTrigger>
        </TabsList>
        <TabsContent value="login">
          <AuthCardContent 
            isLogin 
            onSubmit={handleLogin} 
            form={loginForm} 
            isLoading={isLoading} 
            authError={authError} 
          />
        </TabsContent>
        <TabsContent value="signup">
          <AuthCardContent 
            isLogin={false} 
            onSubmit={handleSignup} 
            form={signupForm} 
            isLoading={isLoading} 
            authError={authError} 
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface AuthCardContentProps {
    isLogin: boolean;
    onSubmit: (data: any) => void;
    form: any; // react-hook-form's `UseFormReturn` type
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
              {!isLogin && (
                 <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="player123"
                          disabled={isLoading}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
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

              {authError && form.formState.isSubmitted && (
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
