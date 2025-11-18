import db from "@repo/db/client";
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcrypt";
import { NextAuthOptions } from "next-auth";


export const authOptions: NextAuthOptions = {
    providers: [
      CredentialsProvider({
          name: 'Credentials',
          credentials: {
            email: { label: "Email", type: "text", placeholder: "test@test.com" },
            phone: { label: "Phone number", type: "text", placeholder: "1231231231" },
            password: { label: "Password", type: "password" }
          },
          async authorize(credentials: any) {

            console.log("Authorize called with:", { phone: credentials?.phone, hasPassword: !!credentials?.password });
            
            if (!credentials?.phone || !credentials?.password) {
                console.log("Missing phone or password");
                return null;
            }

            const existingUser = await db.user.findFirst({
                where: {
                    phone: credentials.phone
                }
            });

            if (existingUser) {
                // Login: compare plain password with hashed password in DB
                const passwordValidation = await bcrypt.compare(credentials.password, existingUser.password);
                if (passwordValidation) {
                    return {
                        id: existingUser.id.toString(),
                        name: existingUser.name,
                        email: existingUser.email,
                        phone: existingUser.phone
                    }
                }
                return null;
            }

            // Signup: create new user with hashed password
            try {
                console.log("Creating new user with phone:", credentials.phone);
                const hashedPassword = await bcrypt.hash(credentials.password, 10);
                const user = await db.user.create({
                    data: {
                        phone: credentials.phone,
                        password: hashedPassword,
                        email: credentials.email || null
                    }
                });

                console.log("User created successfully:", user.id);
                return {
                    id: user.id.toString(),
                    name: user.name,
                    email: user.email,
                    phone: user.phone
                }
            } catch(e) {
                console.error("Error creating user:", e);
                return null;
            }
          },
        })
    ],
    secret: process.env.NEXTAUTH_SECRET || "fallback-secret-for-development",
    session: {
        strategy: "jwt"
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.phone = (user as any).phone;
            }
            return token;
        },
        async session({ token, session }) {
            if (token && session.user) {
                (session.user as any).id = token.id as string;
                (session.user as any).phone = (token as any).phone;
            }
            return session;
        }
    },
    pages: {
        signIn: '/signin',
    }
}