import { Session, User } from '@supabase/supabase-js';
import * as AppleAuthentication from 'expo-apple-authentication';
import Constants from 'expo-constants';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';
import { identifyDevice } from 'vexo-analytics';
import { supabase } from '../lib/supabase';

interface UserContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (!__DEV__ && session?.user) {
        const identifier = session.user.email ?? session.user.id;
        identifyDevice(identifier);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // Identify user in Vexo analytics when signed in (production only)
      if (!__DEV__ && session?.user) {
        const identifier = session.user.email ?? session.user.id;
        identifyDevice(identifier);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithApple = async () => {
    try {
      if (Platform.OS !== 'ios') {
        Alert.alert('Error', 'Sign in with Apple is only available on iOS');
        return;
      }

      // Check if Supabase is configured
      const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL || '';
      if (!supabaseUrl) {
        Alert.alert(
          'Configuration Required',
          'Supabase credentials are not configured. Please add your Supabase URL and Anon Key to app.json or environment variables. See SUPABASE_SETUP.md for instructions.'
        );
        return;
      }

      // Check if Apple Authentication is available
      const isAvailable = await AppleAuthentication.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Error', 'Sign in with Apple is not available on this device');
        return;
      }

      // Request Apple ID credential
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      // Exchange the credential for a Supabase session
      if (credential.identityToken) {
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: credential.identityToken,
        });

        if (error) {
          throw error;
        }

        // If this is a new user and we have their name, update the profile
        if (data.user && credential.fullName) {
          const updates: { full_name?: string } = {};
          if (credential.fullName.givenName || credential.fullName.familyName) {
            updates.full_name = `${credential.fullName.givenName || ''} ${credential.fullName.familyName || ''}`.trim();
          }

          if (Object.keys(updates).length > 0) {
            await supabase.auth.updateUser({
              data: updates,
            });
          }
        }
      }
    } catch (error: any) {
      if (error.code === 'ERR_REQUEST_CANCELED') {
        // User canceled the sign-in, do nothing
        return;
      }
      console.error('Error signing in with Apple:', error);
      Alert.alert('Error', error.message || 'Failed to sign in with Apple');
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error: any) {
      console.error('Error signing out:', error);
      Alert.alert('Error', error.message || 'Failed to sign out');
    }
  };

  return (
    <UserContext.Provider
      value={{
        user,
        session,
        loading,
        signInWithApple,
        signOut,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}

