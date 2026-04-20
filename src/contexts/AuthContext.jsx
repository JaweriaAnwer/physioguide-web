import { createContext, useContext, useState, useEffect } from 'react';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail,
    onAuthStateChanged
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../utils/firebase';

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [therapistProfile, setTherapistProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    // Sign up a new therapist
    async function signup(email, password, name, specialization) {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        // Create therapist profile document in Firestore
        await setDoc(doc(db, 'therapists', result.user.uid), {
            name,
            email,
            specialization: specialization || '',
            createdAt: new Date().toISOString()
        });
        return result;
    }

    // Sign in existing therapist
    function login(email, password) {
        return signInWithEmailAndPassword(auth, email, password);
    }

    // Sign out
    function logout() {
        return signOut(auth);
    }

    // Send password reset email
    function resetPassword(email) {
        return sendPasswordResetEmail(auth, email);
    }

    // Listen for auth state changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setCurrentUser(user);
            if (user) {
                try {
                    const docRef = doc(db, 'therapists', user.uid);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        setTherapistProfile({ id: docSnap.id, ...docSnap.data() });
                    } else {
                        setTherapistProfile(null);
                    }
                } catch (error) {
                    console.error('Error fetching therapist profile:', error);
                    setTherapistProfile(null);
                }
            } else {
                setTherapistProfile(null);
            }
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    const value = {
        currentUser,
        therapistProfile,
        signup,
        login,
        logout,
        resetPassword,
        loading
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}
